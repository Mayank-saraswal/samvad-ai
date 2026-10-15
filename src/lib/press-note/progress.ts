/**
 * progress module — live pipeline progress tracking.
 *
 * Interface: {@link ProgressTracker} with `mark` and `read`. The pipeline
 * route marks each stage as it actually executes; the status route reads the
 * freshest marks so the progress bar measures real work instead of guessing
 * from revision counts. Marks expire via TTL so a crashed run can never pin
 * the UI at a stale percentage — readers fall back to DB-derived state.
 */
export type LiveStageStatus = "pending" | "running" | "ready" | "failed" | "skipped";

export interface LiveStage {
  readonly status: LiveStageStatus;
  readonly detail: string;
  readonly at: number;
}

export type LiveStages = Record<"ocr" | "stt" | "facts" | "draft", LiveStage>;

export interface ProgressTracker {
  readonly mark: (
    documentId: string,
    stage: keyof LiveStages,
    status: LiveStageStatus,
    detail?: string,
  ) => void;
  readonly read: (documentId: string) => LiveStages | null;
  readonly clear: (documentId: string) => void;
}

const STAGE_KEYS = ["ocr", "stt", "facts", "draft"] as const;

export function emptyStages(now = Date.now()): LiveStages {
  return {
    ocr: { status: "pending", detail: "Waiting for document reads", at: now },
    stt: { status: "pending", detail: "Waiting for audio briefings", at: now },
    facts: { status: "pending", detail: "Waiting for evidence text", at: now },
    draft: { status: "pending", detail: "Waiting for facts", at: now },
  };
}

/** Measured percentage: ready/skipped count fully, running counts half. */
export function percentFromStages(stages: Pick<LiveStages, keyof LiveStages>): number {
  let score = 0;
  for (const key of STAGE_KEYS) {
    const status = stages[key]?.status;
    if (status === "ready" || status === "skipped") score += 25;
    else if (status === "running") score += 12;
  }
  return Math.min(100, Math.round(score));
}

export function createMemoryProgressTracker(ttlMs = 10 * 60 * 1000): ProgressTracker {
  const marks = new Map<string, LiveStages>();
  return {
    mark(documentId, stage, status, detail) {
      const current = marks.get(documentId) ?? emptyStages();
      marks.set(documentId, {
        ...current,
        [stage]: { status, detail: detail ?? current[stage].detail, at: Date.now() },
      });
    },
    read(documentId) {
      const current = marks.get(documentId);
      if (!current) return null;
      const freshest = Math.max(current.ocr.at, current.stt.at, current.facts.at, current.draft.at);
      if (Date.now() - freshest > ttlMs) {
        marks.delete(documentId);
        return null;
      }
      return current;
    },
    clear(documentId) {
      marks.delete(documentId);
    },
  };
}

const GLOBAL_KEY = "__samvaad_press_progress__";

export function getProgressTracker(): ProgressTracker {
  const globalScope = globalThis as unknown as Record<string, ProgressTracker | undefined>;
  const existing = globalScope[GLOBAL_KEY];
  if (existing) return existing;
  const created = createMemoryProgressTracker();
  globalScope[GLOBAL_KEY] = created;
  return created;
}
