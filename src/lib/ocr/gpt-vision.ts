/**
 * GPT-5.4 Vision OCR module — high-accuracy optical character recognition and visual inspection
 * for FIR photographs, scanned evidence, and diagrams using GPT-5.4.
 */
import { err, ok, type Result } from "@/lib/result/result";
import type { DocumentOcrEngine, OcrEngineInput, OcrEngineOutput, OcrError } from "./mistral";

export interface GptVisionOcrConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly fetchFn?: typeof fetch;
}

export function createGptVisionOcrEngine(config: GptVisionOcrConfig): DocumentOcrEngine {
  const apiKey = config.apiKey.trim();
  const baseUrl = (config.baseUrl ?? "https://llm.corsair.dev/v1").replace(/\/+$/, "");
  const model = config.model ?? "gpt-5.4";
  const customFetch = config.fetchFn ?? fetch;

  return {
    async ocr(input: OcrEngineInput): Promise<Result<OcrEngineOutput, OcrError>> {
      if (!apiKey) {
        return err({ kind: "unauthorized", message: "LITELLM_API_KEY is not configured" });
      }

      let imageUrl = input.imageUrl || input.base64DataUrl;

      // If documentUrl was passed, convert bytes to a base64 image data URL
      if (!imageUrl && input.documentUrl) {
        try {
          const fetchRes = await customFetch(input.documentUrl);
          if (!fetchRes.ok) {
            return err({
              kind: "transport",
              message: `Failed to download image from URL: HTTP ${fetchRes.status}`,
            });
          }
          const arrayBuffer = await fetchRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
          imageUrl = `data:${contentType};base64,${base64}`;
        } catch (e) {
          return err({
            kind: "transport",
            message: e instanceof Error ? e.message : "Failed to fetch image URL",
          });
        }
      }

      if (!imageUrl) {
        return err({
          kind: "invalid-input",
          issues: ["Either imageUrl, base64DataUrl, or documentUrl must be provided for image OCR."],
        });
      }

      const endpoint = `${baseUrl}/chat/completions`;

      try {
        const res = await customFetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: [
                  "You are an expert forensic document and evidence photo OCR vision engine.",
                  "Transcribe all readable text, handwritten notes, stamps, seals, tables, and numeric identifiers verbatim.",
                  "If there are diagrams, charts, crime scene photographs, or physical evidence objects, describe them thoroughly under a '[Visual Evidence: ...]' section.",
                  "Format output in clear, clean Markdown.",
                ].join("\n"),
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract all text, signatures, tables, and visual evidence from this case image.",
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageUrl },
                  },
                ],
              },
            ],
            temperature: 0.1,
          }),
        });

        if (res.status === 401 || res.status === 403) {
          return err({ kind: "unauthorized", message: "Invalid or unauthorized LiteLLM API key" });
        }
        if (res.status === 429) {
          return err({ kind: "rate-limited", message: "GPT-5.4 rate limit exceeded" });
        }
        if (!res.ok) {
          const text = await res.text();
          return err({
            kind: "transport",
            message: `LiteLLM returned HTTP ${res.status}: ${text.slice(0, 300)}`,
          });
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
            };
          }>;
        };

        const markdown = data.choices?.[0]?.message?.content?.trim() ?? "";

        if (!markdown) {
          return err({
            kind: "transport",
            message: "GPT-5.4 vision returned empty content",
          });
        }

        return ok({
          pages: [{ index: 0, markdown, images: [] }],
          fullMarkdown: markdown,
          model,
          pageCount: 1,
        });
      } catch (e) {
        return err({
          kind: "transport",
          message: e instanceof Error ? e.message : "Network error calling GPT-5.4 vision API",
        });
      }
    },
  };
}
