import { describe, expect, it } from "vitest";
import { runPressNotePipeline } from "./pipeline";
import { err, isOk, isErr, ok } from "@/lib/result/result";

const engines = {
  ocrDocument: async () => ok("Crime No. 12 recorded on 14-Oct-2026 at Jaipur."),
  transcribeAudio: async () => ok("Officer briefing confirms two arrests made."),
  synthesizePress: async () =>
    ok({
      headline1: "Two arrests in online fraud case",
      headline2: "Recovery and seizure update",
      headline3: "Proceedings under legal protocol",
      summary: "Two arrests were made.\n\nThe investigation is underway.",
      detail: "Crime No. 12 was recorded.\n\nTwo arrests were made.\n\nFurther details awaited.",
      secondaryHeadline: "Secondary headline",
      secondarySummary: "Secondary summary",
    }),
};

describe("runPressNotePipeline", () => {
  it("runs ocr, stt, facts, draft in order", async () => {
    const res = await runPressNotePipeline({
      documentTitle: "Cyber fraud case",
      ministryEn: "Ministry of Testing",
      releaseDateEn: "15 October 2026",
      sources: [
        { id: "src-1", kind: "pdf" },
        { id: "src-2", kind: "audio" },
      ],
      engines,
    });
    expect(isOk(res)).toBe(true);
    if (!isOk(res)) return;
    expect(res.value.stages.map((s: { stage: string }) => s.stage)).toEqual(["ocr", "stt", "facts", "draft"]);
    expect(res.value.stages.every((s: { status: string }) => s.status === "ready")).toBe(true);
    expect(res.value.pib.titleEn).toContain("arrests");
  });

  it("fails loudly when OCR fails, no synthetic evidence", async () => {
    const res = await runPressNotePipeline({
      documentTitle: "Case",
      ministryEn: "Ministry",
      releaseDateEn: "Today",
      sources: [{ id: "src-1", kind: "pdf" }],
      engines: { ...engines, ocrDocument: async () => err("OCR offline") },
    });
    expect(isErr(res)).toBe(true);
    if (!isErr(res)) return;
    expect(res.error.stage).toBe("ocr");
  });

  it("fails when no evidence exists", async () => {
    const res = await runPressNotePipeline({
      documentTitle: "Case",
      ministryEn: "Ministry",
      releaseDateEn: "Today",
      sources: [],
      engines,
    });
    expect(isErr(res)).toBe(true);
  });
});
