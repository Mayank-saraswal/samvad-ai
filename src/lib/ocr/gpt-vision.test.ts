import { describe, expect, test, vi } from "vitest";
import { isErr, isOk } from "@/lib/result/result";
import { createGptVisionOcrEngine } from "./gpt-vision";

describe("GPT-5.4 Vision OCR Module", () => {
  test("transcribes image successfully using mock LiteLLM API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "### Scanned Evidence Photo\n\nRecovered 47 mobile devices.\n[Visual Evidence: Hardware rig and encrypted drive]",
            },
          },
        ],
      }),
    });

    const engine = createGptVisionOcrEngine({
      apiKey: "test-litellm-key",
      fetchFn: mockFetch,
    });

    const result = await engine.ocr({
      imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.model).toBe("gpt-5.4");
      expect(result.value.fullMarkdown).toContain("Scanned Evidence Photo");
      expect(result.value.fullMarkdown).toContain("[Visual Evidence:");
    }
  });

  test("returns unauthorized error when API key is missing", async () => {
    const engine = createGptVisionOcrEngine({ apiKey: "" });
    const result = await engine.ocr({ imageUrl: "data:image/jpeg;base64,abc" });

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

    const engine = createGptVisionOcrEngine({
      apiKey: "test-key",
      fetchFn: mockFetch,
    });

    const result = await engine.ocr({ imageUrl: "data:image/jpeg;base64,abc" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("rate-limited");
    }
  });
});
