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
});
