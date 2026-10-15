/**
 * Gemini OCR module — high-fidelity optical character recognition for PDFs,
 * tables, diagrams, and bilingual official documents using Google Gemini.
 */
import { err, ok, type Result } from "@/lib/result/result";
import type { DocumentOcrEngine, OcrEngineInput, OcrEngineOutput, OcrError } from "./mistral";

export interface GeminiOcrConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export function createGeminiOcrEngine(config: GeminiOcrConfig): DocumentOcrEngine {
  const apiKey = config.apiKey.trim();
  const model = config.model ?? "gemini-flash-latest";
  const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  const customFetch = config.fetchFn ?? fetch;

  return {
    async ocr(input: OcrEngineInput): Promise<Result<OcrEngineOutput, OcrError>> {
      if (!apiKey) {
        return err({ kind: "unauthorized", message: "GEMINI_API_KEY is not configured" });
      }

      let base64Pdf: string | undefined;

      // 1. Extract base64 from base64DataUrl if provided
      if (input.base64DataUrl) {
        const commaIdx = input.base64DataUrl.indexOf(",");
        base64Pdf = commaIdx !== -1 ? input.base64DataUrl.slice(commaIdx + 1) : input.base64DataUrl;
      } else if (input.documentUrl) {
        // 2. Fetch document bytes from URL
        try {
          const fetchRes = await customFetch(input.documentUrl);
          if (!fetchRes.ok) {
            return err({
              kind: "transport",
              message: `Failed to download document from URL: HTTP ${fetchRes.status}`,
            });
          }
          const arrayBuffer = await fetchRes.arrayBuffer();
          base64Pdf = Buffer.from(arrayBuffer).toString("base64");
        } catch (e) {
          return err({
            kind: "transport",
            message: e instanceof Error ? e.message : "Failed to fetch document URL",
          });
        }
      }

      if (!base64Pdf) {
        return err({
          kind: "invalid-input",
          issues: ["Either documentUrl or base64DataUrl must be provided for Gemini PDF OCR."],
        });
      }

      const candidateModels = [
        model,
        ...(model !== "gemini-3.5-flash" ? ["gemini-3.5-flash"] : []),
        ...(model !== "gemini-3.7-flash" ? ["gemini-3.7-flash"] : []),
      ];

      try {
        let lastRes: Response | null = null;
        let lastErrorText = "";
        let successfulModel = model;

        for (const targetModel of candidateModels) {
          const endpoint = `${baseUrl}/models/${targetModel}:generateContent?key=${apiKey}`;

          for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }

            const res = await customFetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: [
                          "You are an authoritative legal and government OCR and document transcription engine.",
                          "Exhaustively transcribe all content from this PDF into clean, well-formatted Markdown.",
                          "- Transcribe all titles, headings, and body paragraphs verbatim in original languages (English, Hindi, etc.).",
                          "- Reconstruct any data tables using standard Markdown table syntax.",
                          "- For any charts, diagrams, flowcharts, or visual figures, transcribe their labels and provide an accurate descriptive summary labeled '[Diagram: <description>]'.",
                          "- Preserve legal references (e.g. IPC, BNS, BSA §65B, IT Act, CrPC).",
                          "- Separate distinct pages with horizontal rule '---'.",
                        ].join("\n"),
                      },
                      {
                        inlineData: {
                          mimeType: "application/pdf",
                          data: base64Pdf,
                        },
                      },
                    ],
                  },
                ],
              }),
            });

            lastRes = res;

            if (res.status === 503) {
              lastErrorText = await res.text();
              continue;
            }

            successfulModel = targetModel;
            break;
          }

          if (lastRes && lastRes.ok) {
            break;
          }
        }

        if (!lastRes) {
          return err({ kind: "transport", message: "Failed to obtain response from Gemini API" });
        }

        if (lastRes.status === 401 || lastRes.status === 403) {
          return err({ kind: "unauthorized", message: "Invalid or unauthorized Gemini API key" });
        }
        if (lastRes.status === 429) {
          return err({ kind: "rate-limited", message: "Gemini API rate limit or quota exceeded" });
        }
        if (!lastRes.ok) {
          const text = lastErrorText || (await lastRes.text());
          return err({
            kind: "transport",
            message: `Gemini API returned HTTP ${lastRes.status}: ${text.slice(0, 300)}`,
          });
        }

        const data = (await lastRes.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const fullMarkdown =
          data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";

        if (!fullMarkdown.trim()) {
          return err({
            kind: "transport",
            message: "Gemini returned empty transcription content",
          });
        }

        // Split by page separators if present
        const rawPages = fullMarkdown.split(/\n---\n/);
        const pages = rawPages.map((pg, idx) => ({
          index: idx,
          markdown: pg.trim(),
          images: [],
        }));

        return ok({
          pages,
          fullMarkdown: fullMarkdown.trim(),
          model,
          pageCount: pages.length || 1,
        });
      } catch (e) {
        return err({
          kind: "transport",
          message: e instanceof Error ? e.message : "Network error calling Gemini API",
        });
      }
    },
  };
}
