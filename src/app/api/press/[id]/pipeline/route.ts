import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStore } from "@/server/context";
import { runPressNotePipeline } from "@/lib/press-note/pipeline";
import { err, isOk, ok } from "@/lib/result/result";

interface RouteParams {
  readonly params: Promise<{ id: string }>;
}

/**
 * POST /api/press/[id]/pipeline — run OCR + STT + GPT in order, then persist.
 * Body: { ministryEn?, releaseDateEn? }. Never writes synthetic evidence:
 * any stage failure returns 422 with the failed stage, no revision saved.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (orgRole === "org:auditor") {
    return NextResponse.json({ error: "Auditors are read-only" }, { status: 403 });
  }
  const { id } = await params;
  const store = getStore();
  // Same lazy-provisioning as the status route: an active org session proves
  // belonging, so backfill the membership row instead of 403ing.
  const provisionedRole =
    orgRole === "org:admin" ? "approver" : orgRole === "org:auditor" ? "auditor" : "contributor";
  const existingMembership = await store.getMembership({ userId, tenantId: orgId });
  if (!existingMembership) {
    try {
      await store.addMembership({ userId, tenantId: orgId, role: provisionedRole });
    } catch {
      // Concurrent provision won the race — proceed.
    }
  }
  const doc = await store.get({ id, tenantId: orgId });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let body: { ministryEn?: string; releaseDateEn?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const ministryEn =
    typeof body.ministryEn === "string" && body.ministryEn.trim().length > 0
      ? body.ministryEn.trim()
      : "Ministry of Statistics and Programme Implementation";
  const releaseDateEn =
    typeof body.releaseDateEn === "string" && body.releaseDateEn.trim().length > 0
      ? body.releaseDateEn.trim()
      : new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  const result = await runPressNotePipeline({
    documentTitle: doc.title,
    ministryEn,
    releaseDateEn,
    sources: doc.sources.map((s) => ({ id: s.id, kind: s.kind as "pdf" | "image" | "audio" | "form", textHint: undefined })),
    onStage: async (stageName, status, detail) => {
      try {
        const { getProgressTracker } = await import("@/lib/press-note/progress");
        getProgressTracker().mark(doc.id, stageName, status, detail);
      } catch {
        // Progress is advisory; the pipeline result is authoritative.
      }
    },
    engines: {
      ocrDocument: async (source) => {
        try {
          const meta = doc.sources.find((s) => s.id === source.id);
          const r2Key = meta?.r2Key;
          if (!r2Key) return err(`No stored file for source ${source.id}`);
          const endpoint = process.env.R2_S3_ENDPOINT;
          const accessKeyId = process.env.R2_ACCESS_KEY_ID;
          const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
          const bucket = process.env.R2_BUCKET || "samvaad-ai";
          if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.MISTRAL_API_KEY) {
            return err("OCR service unconfigured (R2/Mistral keys missing)");
          }
          const s3 = new S3Client({
            region: "auto",
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
          });
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: r2Key }),
            { expiresIn: 600 },
          );
          const { createMistralOcrEngine } = await import("@/lib/ocr/mistral");
          const engine = createMistralOcrEngine({ apiKey: process.env.MISTRAL_API_KEY });
          const ocrRes = await engine.ocr({ documentUrl: url });
          if (!isOk(ocrRes)) return err("OCR engine rejected the document");
          if (ocrRes.value.fullMarkdown.trim().length === 0) {
            return err("OCR returned empty text");
          }
          return ok(ocrRes.value.fullMarkdown);
        } catch (e) {
          return err(e instanceof Error ? e.message : "OCR failed");
        }
      },
      transcribeAudio: async (source) => {
        try {
          const meta = doc.sources.find((s) => s.id === source.id);
          const r2Key = meta?.r2Key;
          if (!r2Key) return err(`No stored file for source ${source.id}`);
          const endpoint = process.env.R2_S3_ENDPOINT;
          const accessKeyId = process.env.R2_ACCESS_KEY_ID;
          const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
          const bucket = process.env.R2_BUCKET || "samvaad-ai";
          const sarvamKey = process.env.SARVAM_API_KEY;
          if (!endpoint || !accessKeyId || !secretAccessKey) {
            return err("Audio storage unconfigured (R2 keys missing)");
          }
          if (!sarvamKey) return err("Transcription unconfigured (Sarvam key missing)");
          const { GetObjectCommand: GetAudioCommand, HeadObjectCommand: HeadAudioCommand } = await import(
            "@aws-sdk/client-s3"
          );
          const audioS3 = new S3Client({
            region: "auto",
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
          });
          const { transcribeAudioFromStorage } = await import("@/lib/stt/audio-source");
          const { createSarvamTranscriber } = await import("@/lib/stt/sarvam");
          const res = await transcribeAudioFromStorage(
            {
              head: async (key) => {
                const out = await audioS3.send(
                  new HeadAudioCommand({ Bucket: bucket, Key: key }),
                );
                return { sizeBytes: out.ContentLength ?? 0, contentType: out.ContentType ?? null };
              },
              getBytes: async (key, opts) => {
                const out = await audioS3.send(
                  new GetAudioCommand({ Bucket: bucket, Key: key }),
                  { abortSignal: opts?.signal },
                );
                if (!out.Body) throw new Error("audio body empty");
                return new Uint8Array(await out.Body.transformToByteArray());
              },
            },
            createSarvamTranscriber({ apiKey: sarvamKey }),
            r2Key,
            {
              expectedPrefix: `tenants/${orgId}/docs/${doc.id}/`,
              languageCode: "hi-IN",
            },
          );
          if (!isOk(res)) {
            if (res.error.kind === "not-found") return err("Audio file not found in storage");
            if (res.error.kind === "too-large") {
              return err(`Audio exceeds transcription limit (${res.error.maxBytes} bytes)`);
            }
            if (res.error.kind === "unauthorized") return err("Transcription rejected credentials");
            if (res.error.kind === "parse-error") return err(res.error.message);
            if (res.error.kind === "invalid-input") return err(res.error.issues.join(", "));
            return err(res.error.message);
          }
          return ok(res.value.timestampedTranscript || res.value.transcript);
        } catch (e) {
          return err(e instanceof Error ? e.message : "Audio transcription failed");
        }
      },
      synthesizePress: async ({ documentTitle, evidence }) => {
        try {
          if (!process.env.LITELLM_API_KEY) {
            return err("Press synthesis unconfigured (LLM key missing)");
          }
          const { createGptPressNoteGenerator } = await import("@/lib/ai/press-generator");
          const generator = createGptPressNoteGenerator({
            apiKey: process.env.LITELLM_API_KEY,
            baseUrl: process.env.LITELLM_BASE_URL,
            model: process.env.LITELLM_PRESS_MODEL ?? "gpt-5.4",
          });
          const genRes = await generator.generate({
            documentId: doc.id,
            tenantId: orgId,
            documentTitle,
            evidenceSnippets: evidence.map((e) => ({ sourceId: e.sourceId, kind: "pdf" as const, text: e.text })),
          });
          if (!isOk(genRes)) return err("Press synthesis failed");
          return ok({
            headline1: genRes.value.headline1,
            headline2: genRes.value.headline2,
            headline3: genRes.value.headline3,
            summary: genRes.value.summary,
            detail: genRes.value.detail,
            secondaryHeadline: genRes.value.secondaryHeadline,
            secondarySummary: genRes.value.secondarySummary,
            keyFindings: [...genRes.value.keyFindings],
            sections: genRes.value.sections.map((s) => ({
              heading: s.heading,
              paragraphs: [...s.paragraphs],
            })),
            evidenceAnalysis: [...genRes.value.evidenceAnalysis],
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : "Press synthesis failed");
        }
      },
    },
  });

  if (!isOk(result)) {
    return NextResponse.json(
      { error: result.error.message, stage: result.error.stage, stages: result.error.stages },
      { status: 422 },
    );
  }

  // Preserve user-inserted visual annexures across regenerations: AI output
  // never owns figures/tables, the officer does.
  const latestDiff = (doc.revisions[doc.revisions.length - 1]?.diff ?? {}) as Record<string, unknown>;
  const latestPib = (latestDiff["pib"] ?? {}) as Record<string, unknown>;
  const carriedPib = {
    ...result.value.pib,
    figures: Array.isArray(latestPib["figures"]) ? latestPib["figures"] : undefined,
    tables: Array.isArray(latestPib["tables"]) ? latestPib["tables"] : undefined,
  };

  const nextRevNumber = doc.revisions.length + 1;
  const revision = await store.addRevision({
    documentId: doc.id,
    revisionNumber: nextRevNumber,
    authorId: `system:press-pipeline:${userId}`,
    reason: "Full pipeline synthesis: OCR + STT + GPT press note",
    diff: {
      pib: carriedPib,
      warnings: result.value.warnings,
      evidenceCount: result.value.evidence.length,
    },
    factsSnapshot: { evidence: result.value.evidence },
    bundleSnapshot: { pib: carriedPib },
  });

  return NextResponse.json({
    pib: carriedPib,
    stages: result.value.stages,
    warnings: result.value.warnings,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
  });
}
