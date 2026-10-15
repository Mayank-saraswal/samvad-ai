import { describe, expect, test, vi } from "vitest";
import { isOk } from "@/lib/result/result";
import { createGptPressNoteGenerator } from "./press-generator";

describe("Press Note Generator Module", () => {
  test("generates press note from evidence snippets with mock LLM", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                headline1: "Cyber Crime Cell neutralizes payment clone syndicate",
                headline2: "47 mobile devices and hardware rigs recovered",
                headline3: "Accused booked under IPC §420 and IT Act §66D",
                summary: "A coordinated raid in the transit hub resulted in the apprehension of three suspects.",
                detail: "Network traces initiated after formal consumer alerts led investigators to the hideout.",
                secondaryHeadline: "साइबर क्राइम सेल ने पेमेंट क्लोन सिंडिकेट का किया पर्दाफाश",
                secondarySummary: "ट्रांजिट हब में समन्वित छापेमारी के बाद तीन संदिग्धों को गिरफ्तार किया गया।",
              }),
            },
          },
        ],
      }),
    });

    const generator = createGptPressNoteGenerator({
      apiKey: "test-key",
      fetchFn: mockFetch,
    });

    const result = await generator.generate({
      documentId: "doc-1",
      tenantId: "tenant-1",
      documentTitle: "FIR 402/2026",
      evidenceSnippets: [
        {
          sourceId: "src-1",
          kind: "pdf",
          text: "FIR registered for cloned session cookies. Three prime suspects intercepted with 47 phones.",
        },
      ],
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.headline1).toContain("Cyber Crime Cell");
      expect(result.value.headline1.split(/\s+/).length).toBeLessThanOrEqual(15);
      expect(result.value.secondaryHeadline).toContain("साइबर क्राइम");
      expect(result.value.spans).toHaveLength(1);
      expect(result.value.spans[0]?.locator).toBe("LOC-P1");
    }
  });

  test("uses deterministic fallback when LLM is unconfigured", async () => {
    const generator = createGptPressNoteGenerator({ apiKey: "" });
    const result = await generator.generate({
      documentId: "doc-1",
      tenantId: "tenant-1",
      documentTitle: "Traffic Incident Report",
      evidenceSnippets: [
        {
          sourceId: "src-2",
          kind: "audio",
          text: "[00:00 - 00:15] Officer on patrol reported vehicular collision at intersection.",
        },
      ],
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.headline1).toContain("Traffic Incident Report");
      expect(result.value.spans[0]?.locator).toBe("LOC-A1");
    }
  });

  test("caps verbose model output to short industry-grade lengths", async () => {
    const longText = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                headline1: `${longText} extra headline words beyond the limit here`,
                headline2: "Second headline",
                headline3: "Third headline",
                summary: longText,
                detail: longText,
                secondaryHeadline: "Secondary",
                secondarySummary: "Secondary summary",
                keyFindings: [longText, longText, longText, longText, longText, longText],
                sections: [1, 2, 3, 4, 5].map((n) => ({
                  heading: `Section ${n}`,
                  paragraphs: [longText, longText, longText, longText],
                })),
                evidenceAnalysis: [longText, longText, longText],
              }),
            },
          },
        ],
      }),
    });

    const generator = createGptPressNoteGenerator({ apiKey: "test-key", fetchFn: mockFetch });
    const result = await generator.generate({
      documentId: "doc-9",
      tenantId: "tenant-9",
      documentTitle: "Brevity Case",
      evidenceSnippets: [{ sourceId: "src-9", kind: "pdf", text: "FIR notes a single verified recovery of two phones." }],
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
      expect(count(result.value.headline1)).toBeLessThanOrEqual(15);
      expect(count(result.value.summary)).toBeLessThanOrEqual(60);
      expect(count(result.value.detail)).toBeLessThanOrEqual(220);
      expect(result.value.keyFindings.length).toBeLessThanOrEqual(4);
      expect(result.value.sections.length).toBeLessThanOrEqual(3);
      for (const section of result.value.sections) {
        expect(section.paragraphs.length).toBeLessThanOrEqual(2);
      }
      expect(result.value.evidenceAnalysis.length).toBeLessThanOrEqual(2);
    }
  });
});
