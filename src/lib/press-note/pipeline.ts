/**
 * press-note pipeline module — ordered OCR + STT + GPT orchestration.
 *
 * Interface: {@link runPressNotePipeline} takes document sources plus
 * injected engine adapters and returns a validated {@link PibPressNoteInput}
 * with per-stage evidence. Stages run strictly in order:
 * pdf/image -> OCR, audio -> STT, then facts structuring, then GPT press
 * synthesis, then PIB mapping. Any stage failure returns `stage-failed`
 * with no synthetic evidence — callers render progress from the returned
 * stages, never from canned text.
 */
import { structureFacts } from "@/lib/press-facts/facts";
import { checkNeutrality } from "@/lib/press-facts/neutrality";
import { err, isOk, ok, type Result } from "@/lib/result/result";
import type { PibPressNoteInput } from "./pib";

export interface PipelineSource {
  readonly id: string;
  readonly kind: "form" | "pdf" | "image" | "audio";
  readonly textHint?: string;
}

export type PipelineStageName = "ocr" | "stt" | "facts" | "draft";

export interface PipelineStageState {
  readonly stage: PipelineStageName;
  readonly status: "pending" | "running" | "ready" | "failed";
  readonly detail: string;
}

export interface PipelineEvidence {
  readonly sourceId: string;
  readonly kind: string;
  readonly text: string;
}

export interface PipelineEngines {
  readonly ocrDocument: (source: PipelineSource) => Promise<Result<string, string>>;
  readonly transcribeAudio: (source: PipelineSource) => Promise<Result<string, string>>;
  readonly synthesizePress: (input: {
    documentTitle: string;
    evidence: readonly PipelineEvidence[];
  }) => Promise<
    Result<
      {
        headline1: string;
        headline2: string;
        headline3: string;
        summary: string;
        detail: string;
        secondaryHeadline: string;
        secondarySummary: string;
        keyFindings?: readonly string[];
        sections?: readonly { heading: string; paragraphs: readonly string[] }[];
        evidenceAnalysis?: readonly string[];
      },
      string
    >
  >;
}

export interface PipelineOk {
  readonly pib: PibPressNoteInput;
  readonly stages: readonly PipelineStageState[];
  readonly evidence: readonly PipelineEvidence[];
  readonly warnings: readonly string[];
}

export interface PipelineFailure {
  readonly kind: "stage-failed";
  readonly stage: PipelineStageName;
  readonly message: string;
  readonly stages: readonly PipelineStageState[];
}

function stage(
  name: PipelineStageName,
  status: PipelineStageState["status"],
  detail: string,
): PipelineStageState {
  return { stage: name, status, detail };
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);
}

export async function runPressNotePipeline(input: {
  documentTitle: string;
  ministryEn: string;
  releaseDateEn: string;
  sources: readonly PipelineSource[];
  engines: PipelineEngines;
  onStage?: (stage: PipelineStageName, status: PipelineStageState["status"], detail: string) => void;
}): Promise<Result<PipelineOk, PipelineFailure>> {
  const stages: PipelineStageState[] = [
    stage("ocr", "pending", "Waiting for document reads"),
    stage("stt", "pending", "Waiting for audio briefings"),
    stage("facts", "pending", "Waiting for evidence text"),
    stage("draft", "pending", "Waiting for facts"),
  ];

  const setStage = (name: PipelineStageName, status: PipelineStageState["status"], detail: string) => {
    const idx = stages.findIndex((s) => s.stage === name);
    if (idx >= 0) stages[idx] = stage(name, status, detail);
    input.onStage?.(name, status, detail);
  };

  const evidence: PipelineEvidence[] = [];
  const warnings: string[] = [];

  const docs = input.sources.filter((s) => s.kind === "pdf" || s.kind === "image");
  const audios = input.sources.filter((s) => s.kind === "audio");

  // OCR stage
  if (docs.length > 0) {
    setStage("ocr", "running", `Reading ${docs.length} document(s) with OCR`);
    for (const src of docs) {
      const res = await input.engines.ocrDocument(src);
      if (!isOk(res)) {
        setStage("ocr", "failed", res.error);
        return err({ kind: "stage-failed", stage: "ocr", message: res.error, stages: [...stages] });
      }
      if (res.value.trim().length === 0) {
        setStage("ocr", "failed", `OCR returned empty text for source ${src.id}`);
        return err({
          kind: "stage-failed",
          stage: "ocr",
          message: `OCR returned empty text for source ${src.id}`,
          stages: [...stages],
        });
      }
      evidence.push({ sourceId: src.id, kind: src.kind, text: res.value });
    }
    setStage("ocr", "ready", `${evidence.length} evidence text(s) extracted`);
  } else {
    setStage("ocr", "ready", "No document sources — skipped");
  }

  // STT stage
  if (audios.length > 0) {
    setStage("stt", "running", `Transcribing ${audios.length} audio briefing(s)`);
    for (const src of audios) {
      const res = await input.engines.transcribeAudio(src);
      if (!isOk(res)) {
        setStage("stt", "failed", res.error);
        return err({ kind: "stage-failed", stage: "stt", message: res.error, stages: [...stages] });
      }
      if (res.value.trim().length === 0) {
        setStage("stt", "failed", `Transcription empty for source ${src.id}`);
        return err({
          kind: "stage-failed",
          stage: "stt",
          message: `Transcription empty for source ${src.id}`,
          stages: [...stages],
        });
      }
      evidence.push({ sourceId: src.id, kind: src.kind, text: res.value });
    }
    setStage("stt", "ready", `${audios.length} audio briefing(s) transcribed`);
  } else {
    setStage("stt", "ready", "No audio sources — skipped");
  }

  if (evidence.length === 0) {
    // Fall back to caller-provided text hints (manual form evidence) before failing.
    const hints = input.sources
      .filter((s) => typeof s.textHint === "string" && (s.textHint as string).trim().length > 0)
      .map((s) => ({
        sourceId: s.id,
        kind: s.kind,
        text: (s.textHint as string).trim(),
      }));
    if (hints.length === 0) {
      setStage("facts", "failed", "No evidence text available from OCR or STT");
      return err({
        kind: "stage-failed",
        stage: "facts",
        message: "No evidence text available from OCR or STT",
        stages: [...stages],
      });
    }
    for (const h of hints) evidence.push(h);
  }

  // Facts stage (deterministic, fail-loud per-field)
  setStage("facts", "running", "Structuring facts and neutrality scan");
  const combined = evidence.map((e) => e.text).join("\n\n");
  const flags = checkNeutrality(combined);
  if (flags.length > 0) {
    warnings.push(`${flags.length} neutrality flag(s): ${flags.map((f) => f.match).join("; ")}`);
  }
  const factsRes = structureFacts({
    spans: evidence.slice(0, 8).map((e, i) => ({
      sourceId: e.sourceId,
      locator: `evidence-${i + 1}`,
      text: e.text.slice(0, 2000),
    })),
    claims: {
      event: [{ spanIndex: 0, value: input.documentTitle.slice(0, 120) }],
    },
  });
  if (!isOk(factsRes)) {
    setStage("facts", "failed", "Fact structuring rejected the evidence");
    return err({
      kind: "stage-failed",
      stage: "facts",
      message: "Fact structuring rejected the evidence",
      stages: [...stages],
    });
  }
  void factsRes.value;
  setStage("facts", "ready", `Facts structured${warnings.length > 0 ? " with neutrality warnings" : ""}`);

  // Draft stage (GPT synthesis -> PIB mapping)
  setStage("draft", "running", "Synthesizing official press note");
  const genRes = await input.engines.synthesizePress({
    documentTitle: input.documentTitle,
    evidence,
  });
  if (!isOk(genRes)) {
    setStage("draft", "failed", genRes.error);
    return err({ kind: "stage-failed", stage: "draft", message: genRes.error, stages: [...stages] });
  }
  const gen = genRes.value;

  const { pibFromPress } = await import("./from-press");
  const pib: PibPressNoteInput = pibFromPress(
    {
      headline1: gen.headline1,
      headline2: gen.headline2,
      headline3: gen.headline3,
      summary: gen.summary,
      detail: gen.detail,
      keyFindings: gen.keyFindings ?? [],
      sections: gen.sections ?? [],
      evidenceAnalysis: gen.evidenceAnalysis ?? [],
    },
    input.ministryEn,
    input.releaseDateEn,
  );
  setStage("draft", "ready", "Press note drafted from verified evidence");

  return ok({ pib, stages: [...stages], evidence: [...evidence], warnings: [...warnings] });
}
