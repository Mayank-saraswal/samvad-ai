import { describe, expect, test, vi } from "vitest";
import { isErr, isOk } from "@/lib/result/result";
import { createGeminiOcrEngine } from "./gemini";

describe("Gemini OCR Module", () => {
  test("transcribes PDF successfully using mock Gemini API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "# PRESS NOTE\n\nAnnual Survey of Enterprises\n\n---\n\n## Section 2\n\nTable of results",
                },
              ],
            },
          },
        ],
      }),
    });

    const engine = createGeminiOcrEngine({
      apiKey: "test-gemini-key",
      fetchFn: mockFetch,
    });

    const result = await engine.ocr({
      base64DataUrl: "data:application/pdf;base64,JVBERi0xLjQK...",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.model).toBe("gemini-flash-latest");
      expect(result.value.fullMarkdown).toContain("PRESS NOTE");
      expect(result.value.pages).toHaveLength(2);
      expect(result.value.pages[0]?.markdown).toContain("PRESS NOTE");
    }
  });

  test("returns unauthorized error when API key is missing", async () => {
    const engine = createGeminiOcrEngine({ apiKey: "" });
    const result = await engine.ocr({ base64DataUrl: "data:application/pdf;base64,abc" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("unauthorized");
    }
  });

  test("maps 429 response to rate-limited error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
    });

    const engine = createGeminiOcrEngine({
      apiKey: "test-key",
      fetchFn: mockFetch,
    });

    const result = await engine.ocr({ base64DataUrl: "data:application/pdf;base64,abc" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("rate-limited");
    }
  });

  test("rejects when no document is provided", async () => {
    const engine = createGeminiOcrEngine({ apiKey: "test-key" });
    const result = await engine.ocr({});

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("invalid-input");
    }
  });
});
