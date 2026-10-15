import { describe, expect, it } from "vitest";
import {
  createMemoryProgressTracker,
  emptyStages,
  percentFromStages,
} from "./progress";

describe("percentFromStages", () => {
  it("starts at 0 with everything pending", () => {
    expect(percentFromStages(emptyStages())).toBe(0);
  });

  it("counts ready and skipped fully, running half", () => {
    const stages = emptyStages();
    expect(
      percentFromStages({
        ...stages,
        ocr: { ...stages.ocr, status: "ready" },
        stt: { ...stages.stt, status: "skipped" },
        facts: { ...stages.facts, status: "running" },
      }),
    ).toBe(62);
  });

  it("reaches 100 only when every stage is done or skipped", () => {
    const stages = emptyStages();
    expect(
      percentFromStages({
        ocr: { ...stages.ocr, status: "ready" },
        stt: { ...stages.stt, status: "skipped" },
        facts: { ...stages.facts, status: "ready" },
        draft: { ...stages.draft, status: "ready" },
      }),
    ).toBe(100);
  });
});

describe("memory progress tracker", () => {
  it("returns null when nothing was marked", () => {
    expect(createMemoryProgressTracker().read("missing")).toBeNull();
  });

  it("marks and reads stages back", () => {
    const tracker = createMemoryProgressTracker();
    tracker.mark("doc-1", "ocr", "running", "Reading 2 documents");
    const read = tracker.read("doc-1");
    expect(read?.ocr.status).toBe("running");
    expect(read?.ocr.detail).toBe("Reading 2 documents");
    expect(read?.draft.status).toBe("pending");
  });

  it("expires stale marks so crashed runs never pin the bar", () => {
    const tracker = createMemoryProgressTracker(-1);
    tracker.mark("doc-1", "ocr", "running");
    expect(tracker.read("doc-1")).toBeNull();
  });

  it("clears marks on demand", () => {
    const tracker = createMemoryProgressTracker();
    tracker.mark("doc-1", "ocr", "ready");
    tracker.clear("doc-1");
    expect(tracker.read("doc-1")).toBeNull();
  });
});
