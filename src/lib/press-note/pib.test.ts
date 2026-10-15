import { describe, expect, it } from "vitest";
import {
  buildPibPressNote,
  ENGLISH_PIB_PHRASES,
  renderPibHtml,
  type PibPhrases,
  type PibPressNoteInput,
} from "./pib";
import { isErr, isOk } from "@/lib/result/result";

function validInput(): PibPressNoteInput {
  return {
    titleEn: "Consumer Price Index for Rural and Urban Areas, September 2026",
    titleHi: "TITLE_HI_PLACEHOLDER",
    ministryEn: "Ministry of Statistics and Programme Implementation",
    ministryHi: "MINISTRY_HI_PLACEHOLDER",
    departmentEn: "National Statistics Office",
    placeDateLine: "New Delhi, 14 October 2026",
    referencePeriod: "Base Year 2012 = 100",
    keyFindings: ["Headline inflation eased to 4.2 percent in September 2026."],
    bodyParagraphs: ["The National Statistics Office released the Consumer Price Index for September 2026."],
    endnote: "The next release is scheduled for November 2026.",
    pageNumber: 2,
    releaseDateEn: "14 October 2026",
  };
}

describe("buildPibPressNote validation", () => {
  it("rejects a blank English title", () => {
    const result = buildPibPressNote({ ...validInput(), titleEn: "   " });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("invalid-input");
      expect(result.error.issues.some((issue) => issue.field === "titleEn")).toBe(true);
    }
  });

  it("rejects an empty keyFindings list", () => {
    const result = buildPibPressNote({ ...validInput(), keyFindings: [] });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.some((issue) => issue.field === "keyFindings")).toBe(true);
    }
  });

  it("rejects more than 6 key findings", () => {
    const result = buildPibPressNote({
      ...validInput(),
      keyFindings: ["a", "b", "c", "d", "e", "f", "g"],
    });
    expect(isErr(result)).toBe(true);
  });

  it("rejects more than 20 body paragraphs", () => {
    const result = buildPibPressNote({
      ...validInput(),
      bodyParagraphs: Array.from({ length: 21 }, (_, i) => `Paragraph ${String(i + 1)}`),
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.issues.some((issue) => issue.field === "bodyParagraphs")).toBe(true);
    }
  });

  it("accepts valid input and normalises optional blanks to null", () => {
    const result = buildPibPressNote({ ...validInput(), titleHi: "   ", endnote: undefined });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.titleHi).toBeNull();
      expect(result.value.pageNumber).toBe(2);
    }
  });

  it("escapes HTML in rendered output", () => {
    const built = buildPibPressNote({
      ...validInput(),
      bodyParagraphs: ["<script>alert(1)</script>"],
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    }
  });
});

describe("renderPibHtml", () => {
  it("renders bilingual title and ministry blocks", () => {
    const built = buildPibPressNote(validInput());
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("TITLE_HI_PLACEHOLDER");
      expect(html).toContain("Consumer Price Index");
      expect(html).toContain("MINISTRY_HI_PLACEHOLDER");
      expect(html).toContain("National Statistics Office");
    }
  });

  it("renders key findings in italic and body justified", () => {
    const built = buildPibPressNote(validInput());
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("font-style:italic");
      expect(html).toContain("text-align:justify");
    }
  });

  it("renders the page number footer", () => {
    const built = buildPibPressNote({ ...validInput(), pageNumber: 5 });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("Page 5");
    }
  });

  it("uses injected phrases instead of built-in wording", () => {
    const phrases: PibPhrases = {
      emblemCaption: "CUSTOM EMBLEM",
      governmentLine: "CUSTOM GOVERNMENT",
      pressNoteTitle: "CUSTOM NOTE",
      pageWord: "CUSTOM PAGE",
    };
    const built = buildPibPressNote(validInput());
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, phrases);
      expect(html).toContain("CUSTOM NOTE");
      expect(html).toContain("CUSTOM PAGE 2");
      expect(html).not.toContain("PRESS NOTE");
    }
  });
});

describe("visual annexures", () => {
  it("accepts figures and renders a numbered Figure annexure page", () => {
    const built = buildPibPressNote({
      ...validInput(),
      figures: [
        { id: "fig-1", caption: "Seizure tally by station", imageUrl: "/api/storage/file?key=abc", alt: null },
      ],
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      expect(built.value.figures).toHaveLength(1);
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("Figure 1");
      expect(html).toContain("Seizure tally by station");
      expect(html).toContain("<img");
    }
  });

  it("rejects figures with external or blank image URLs", () => {
    const built = buildPibPressNote({
      ...validInput(),
      figures: [{ id: "fig-1", caption: "Bad", imageUrl: "javascript:alert(1)", alt: null }],
    });
    expect(isErr(built)).toBe(true);
  });

  it("accepts tables and renders a numbered Table annexure page", () => {
    const built = buildPibPressNote({
      ...validInput(),
      tables: [
        {
          id: "tbl-1",
          caption: "Recovery summary",
          headers: ["Item", "Count"],
          rows: [["Phones", "47"]],
        },
      ],
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("Table 1");
      expect(html).toContain("Recovery summary");
      expect(html).toContain("<table");
      expect(html).toContain("47");
    }
  });

  it("rejects tables without headers or rows", () => {
    const built = buildPibPressNote({
      ...validInput(),
      tables: [{ id: "tbl-1", caption: "Empty", headers: [], rows: [] }],
    });
    expect(isErr(built)).toBe(true);
  });

  it("defaults figure sizing and clamps out-of-range widths", () => {
    const built = buildPibPressNote({
      ...validInput(),
      figures: [
        { id: "fig-1", caption: "Wide", imageUrl: "/api/storage/file?key=abc", alt: null, widthPct: 500, align: "top" as never },
      ],
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      expect(built.value.figures[0]?.widthPct).toBe(100);
      expect(built.value.figures[0]?.align).toBe("center");
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("width:100%");
    }
  });

  it("renders figure alignment and custom widths", () => {
    const built = buildPibPressNote({
      ...validInput(),
      figures: [
        { id: "fig-1", caption: "Half", imageUrl: "/api/storage/file?key=abc", alt: null, widthPct: 50, align: "right" },
      ],
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("width:50%");
      expect(html).toContain("text-align:right");
    }
  });

  it("accepts a signature and renders it on the seal page", () => {
    const built = buildPibPressNote({
      ...validInput(),
      signature: {
        imageUrl: "/api/storage/file?key=sig",
        name: "A. Officer",
        designation: "Superintendent of Police",
        dateText: null,
      },
    });
    expect(isOk(built)).toBe(true);
    if (isOk(built)) {
      expect(built.value.signature?.name).toBe("A. Officer");
      const html = renderPibHtml(built.value, ENGLISH_PIB_PHRASES);
      expect(html).toContain("A. Officer");
      expect(html).toContain("Superintendent of Police");
    }
  });

  it("rejects a signature without a signer name", () => {
    const built = buildPibPressNote({
      ...validInput(),
      signature: { imageUrl: "/api/storage/file?key=sig", name: "   ", designation: null, dateText: null },
    });
    expect(isErr(built)).toBe(true);
  });
});
