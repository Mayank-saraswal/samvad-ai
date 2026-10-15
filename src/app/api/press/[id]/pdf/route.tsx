import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getStore } from "@/server/context";
import { buildPibPressNote } from "@/lib/press-note/pib";
import { isOk } from "@/lib/result/result";

interface RouteParams {
  readonly params: Promise<{ id: string }>;
}

const MAX_FIGURE_BYTES = 5 * 1024 * 1024;
const FIGURE_TIMEOUT_MS = 15_000;

/**
 * GET /api/press/[id]/pdf — industry-grade PIB PDF, rendered server-side
 * with @react-pdf/renderer (no headless browser, no third-party service, so
 * evidence never leaves sovereign infrastructure).
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  const role =
    orgRole === "org:admin" ? "approver" : orgRole === "org:auditor" ? "auditor" : "contributor";
  const existing = await store.getMembership({ userId, tenantId: orgId });
  if (!existing) {
    try {
      await store.addMembership({ userId, tenantId: orgId, role });
    } catch {
      // Concurrent provision — proceed.
    }
  }
  const doc = await store.get({ id, tenantId: orgId });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const latest = doc.revisions[doc.revisions.length - 1];
  const rawPib = ((latest?.diff ?? {}) as Record<string, unknown>)["pib"];
  if (!rawPib) {
    return NextResponse.json({ error: "Press note not generated yet" }, { status: 409 });
  }
  const built = buildPibPressNote(rawPib as never);
  if (!isOk(built)) {
    return NextResponse.json({ error: "Stored press note failed validation" }, { status: 422 });
  }
  const note = built.value;

  // Resolve figure images to data URLs (R2 direct, or capped https fetch).
  const figureData: Record<string, string> = {};
  const endpoint = process.env.R2_S3_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || "samvaad-ai";
  const s3 =
    endpoint && accessKeyId && secretAccessKey
      ? new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } })
      : null;

  const withTimeout = async <T,>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FIGURE_TIMEOUT_MS);
    try {
      return await work(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  };

  for (const fig of note.figures) {
    try {
      if (fig.imageUrl.startsWith("/api/storage/file?key=")) {
        const key = decodeURIComponent(fig.imageUrl.split("key=")[1] ?? "");
        const prefix = `tenants/${orgId}/docs/${doc.id}/`;
        if (!key.startsWith(prefix) || !s3) continue;
        const head = await withTimeout((signal) =>
          s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal }),
        );
        const size = head.ContentLength ?? 0;
        if (size <= 0 || size > MAX_FIGURE_BYTES) continue;
        const out = await withTimeout((signal) =>
          s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: signal }),
        );
        if (!out.Body) continue;
        const bytes = await out.Body.transformToByteArray();
        if (bytes.length === 0 || bytes.length > MAX_FIGURE_BYTES) continue;
        const mime = out.ContentType ?? "image/png";
        figureData[fig.id] = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
      } else if (fig.imageUrl.startsWith("https://")) {
        const res = await withTimeout((signal) => fetch(fig.imageUrl, { signal }));
        if (!res.ok) continue;
        const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!mime.startsWith("image/")) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0 || buf.length > MAX_FIGURE_BYTES) continue;
        figureData[fig.id] = `data:${mime};base64,${buf.toString("base64")}`;
      }
    } catch {
      // Caption-only fallback is rendered by the document; never fail the PDF.
    }
  }

  try {
    const [{ renderToBuffer }, { PibPdfDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/press-note/pdf-document"),
    ]);
    const { createElement } = await import("react");
    const element = createElement(PibPdfDocument, { note, figureData }) as unknown as Parameters<
      typeof renderToBuffer
    >[0];
    const pdf = await renderToBuffer(element);
    const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "press-note";
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${slug}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[Press PDF] render failed:", e);
    return NextResponse.json({ error: "Failed to render PDF" }, { status: 500 });
  }
}
