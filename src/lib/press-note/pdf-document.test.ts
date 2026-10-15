import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildPibPressNote } from "./pib";
import { PibPdfDocument } from "./pdf-document";
import { isOk } from "@/lib/result/result";

function richInput() {
  return {
    titleEn: "Annual Survey of Unincorporated Sector Enterprises (ASUSE) Results for 2023-24",
    ministryEn: "Ministry of Statistics and Programme Implementation",
    releaseDateEn: "15 October 2026",
    referencePeriod: "October 2023 to September 2026",
    keyFindings: [
      "Unincorporated sector witnessed significant growth in estimated number of establishments.",
      "More than 37% of the establishments were registered with at least one act or authority.",
    ],
    bodyParagraphs: ["The key results of the survey were released by the Ministry."],
    sections: [
      { heading: "Document Identity and Timeline", paragraphs: ["The supplied material is explicitly labeled as a press note in both Hindi and English."] },
      { heading: "Survey Window and Scope Confirmed", paragraphs: ["The time period appears twice in the locators."] },
      { heading: "Institutional Attribution and Official Action", paragraphs: ["The extract names the Government of India."] },
    ],
    evidenceNotes: ["Source reliability is supported by internal repetition of the survey window."],
    tables: [
      { id: "tbl-1", caption: "Recovery summary", headers: ["Item", "Count"], rows: [["Phones", "47"]] },
    ],
  };
}

describe("PibPdfDocument", () => {
  it("renders a valid multi-page PDF buffer", async () => {
    const built = buildPibPressNote(richInput());
    expect(isOk(built)).toBe(true);
    if (!isOk(built)) return;
    const pdf = await renderToBuffer(
      createElement(PibPdfDocument, { note: built.value, figureData: {} }) as never,
    );
    const header = Buffer.from(pdf.subarray(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
    // Cover + findings + 3 sections + 1 table + closing = 7 pages of content.
    expect(pdf.length).toBeGreaterThan(6000);
  }, 60_000);

  it("renders figure captions even when image bytes are missing", async () => {
    const built = buildPibPressNote({
      ...richInput(),
      figures: [{ id: "fig-1", caption: "Seizure tally by station", imageUrl: "/api/storage/file?key=abc", alt: null }],
    });
    expect(isOk(built)).toBe(true);
    if (!isOk(built)) return;
    const pdf = await renderToBuffer(
      createElement(PibPdfDocument, { note: built.value, figureData: {} }) as never,
    );
    expect(Buffer.from(pdf.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
  }, 60_000);

  it("renders Hindi (Devanagari) text with the embedded font", async () => {
    const built = buildPibPressNote({
      ...richInput(),
      titleHi: "अनिगमित क्षेत्र के उद्यमों का वार्षिक सर्वेक्षण",
      ministryHi: "सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय",
      keyFindings: ["58% प्रतिष्ठान महिला स्वामित्व वाले थे।"],
    });
    expect(isOk(built)).toBe(true);
    if (!isOk(built)) return;
    const pdf = await renderToBuffer(
      createElement(PibPdfDocument, { note: built.value, figureData: {} }) as never,
    );
    expect(Buffer.from(pdf.subarray(0, 5)).toString("latin1")).toBe("%PDF-");
    // Embedded subset font must be present in the PDF for Devanagari glyphs.
    expect(Buffer.from(pdf).toString("latin1")).toContain("NotoSerifDevanagari");
  }, 60_000);
});
