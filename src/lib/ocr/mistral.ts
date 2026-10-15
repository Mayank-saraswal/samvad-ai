/**
 * Mistral OCR module — optical character recognition seam for scanned documents.
 *
 * Interface: {@link DocumentOcrEngine}. Consumed by Trigger.dev durable tasks
 * and background pipelines. Callers get parsed markdown pages and image references.
 * Never throws on HTTP status errors — maps 400/401/429/500 to typed errors.
 */
import { err, ok, type Result } from "@/lib/result/result";

export interface OcrImageReference {
  readonly id: string;
  readonly top?: number;
  readonly left?: number;
  readonly bottom?: number;
  readonly right?: number;
}

export interface OcrPageResult {
  readonly index: number;
  readonly markdown: string;
  readonly images: readonly OcrImageReference[];
}

export interface OcrEngineOutput {
  readonly pages: readonly OcrPageResult[];
  readonly fullMarkdown: string;
  readonly model: string;
  readonly pageCount: number;
}

export type OcrError =
  | { readonly kind: "invalid-input"; readonly issues: readonly string[] }
  | { readonly kind: "unauthorized"; readonly message: string }
  | { readonly kind: "rate-limited"; readonly message: string }
  | { readonly kind: "transport"; readonly message: string };

export interface OcrEngineInput {
  readonly documentUrl?: string;
  readonly imageUrl?: string;
  readonly base64DataUrl?: string;
}

export interface DocumentOcrEngine {
  ocr(input: OcrEngineInput): Promise<Result<OcrEngineOutput, OcrError>>;
}

export interface MistralOcrConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

const DEFAULT_OCR_TIMEOUT_MS = 120_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

interface RawMistralOcrImage {
  readonly id?: unknown;
  readonly top_left_y?: unknown;
  readonly top_left_x?: unknown;
  readonly bottom_right_y?: unknown;
  readonly bottom_right_x?: unknown;
}

interface RawMistralOcrPage {
  readonly index?: unknown;
  readonly markdown?: unknown;
  readonly images?: unknown;
}

interface RawMistralOcrResponse {
  readonly pages?: unknown;
  readonly model?: unknown;
  readonly usage_info?: unknown;
}

export function createFakeOcrEngine(canned?: Partial<OcrEngineOutput>): DocumentOcrEngine {
  return {
    async ocr(input: OcrEngineInput): Promise<Result<OcrEngineOutput, OcrError>> {
      if (!input.documentUrl && !input.imageUrl && !input.base64DataUrl) {
        return err({
          kind: "invalid-input",
          issues: ["One of documentUrl, imageUrl, or base64DataUrl must be provided"],
        });
      }

      const defaultPages: readonly OcrPageResult[] = [
        {
          index: 0,
          markdown: "FIR No: 142/2026\nPolice Station: Cyber Crime Jaipur\nDate: 12-04-2026",
          images: [],
        },
      ];

      const pages = canned?.pages ?? defaultPages;
      const fullMarkdown = canned?.fullMarkdown ?? pages.map((p) => p.markdown).join("\n\n");
      const model = canned?.model ?? "mistral-ocr-fake";
      const pageCount = canned?.pageCount ?? pages.length;

      return ok({
        pages,
        fullMarkdown,
        model,
        pageCount,
      });
    },
  };
}

export function createMistralOcrEngine(config: MistralOcrConfig): DocumentOcrEngine {
  const baseUrl = config.baseUrl ?? "https://api.mistral.ai";
  const model = config.model ?? "mistral-ocr-latest";
  const timeoutMs = config.timeoutMs ?? DEFAULT_OCR_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? 1;

  return {
    async ocr(input: OcrEngineInput): Promise<Result<OcrEngineOutput, OcrError>> {
      if (!input.documentUrl && !input.imageUrl && !input.base64DataUrl) {
        return err({
          kind: "invalid-input",
          issues: ["One of documentUrl, imageUrl, or base64DataUrl must be provided"],
        });
      }

      let documentPayload: Record<string, string>;

      if (input.documentUrl) {
        documentPayload = {
          type: "document_url",
          document_url: input.documentUrl,
        };
      } else if (input.imageUrl) {
        documentPayload = {
          type: "image_url",
          image_url: input.imageUrl,
        };
      } else if (input.base64DataUrl) {
        documentPayload = {
          type: "image_url",
          image_url: input.base64DataUrl,
        };
      } else {
        return err({
          kind: "invalid-input",
          issues: ["Missing document source"],
        });
      }

      let lastError: OcrError = { kind: "transport", message: "OCR request failed" };
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) await sleep(2000 * attempt);
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          let response: Response;
          try {
            response = await fetch(`${baseUrl}/v1/ocr`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                document: documentPayload,
              }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }

          if (response.status === 401) {
            return err({ kind: "unauthorized", message: "Invalid or expired Mistral API key" });
          }

          if (response.status === 429) {
            lastError = {
              kind: "rate-limited",
              message: "Mistral OCR rate limit or quota exceeded",
            };
            continue;
          }

          if (RETRYABLE_STATUS.has(response.status)) {
            const bodyText = await response.text().catch(() => "");
            lastError = {
              kind: "transport",
              message: `Mistral OCR returned status ${response.status}: ${bodyText.slice(0, 200)}`,
            };
            continue;
          }

          if (!response.ok) {
            const bodyText = await response.text();
            return err({
              kind: "transport",
              message: `Mistral OCR returned status ${response.status}: ${bodyText.slice(0, 200)}`,
            });
          }

          const data = (await response.json()) as RawMistralOcrResponse;
        const rawPages = Array.isArray(data.pages) ? (data.pages as readonly RawMistralOcrPage[]) : [];

        const parsedPages: OcrPageResult[] = [];
        for (let i = 0; i < rawPages.length; i++) {
          const rawPage = rawPages[i];
          if (!rawPage) continue;

          const pageIndex = typeof rawPage.index === "number" ? rawPage.index : i;
          const markdown = typeof rawPage.markdown === "string" ? rawPage.markdown : "";

          const images: OcrImageReference[] = [];
          if (Array.isArray(rawPage.images)) {
            for (const img of rawPage.images as readonly RawMistralOcrImage[]) {
              if (typeof img.id === "string") {
                images.push({
                  id: img.id,
                  top: typeof img.top_left_y === "number" ? img.top_left_y : undefined,
                  left: typeof img.top_left_x === "number" ? img.top_left_x : undefined,
                  bottom: typeof img.bottom_right_y === "number" ? img.bottom_right_y : undefined,
                  right: typeof img.bottom_right_x === "number" ? img.bottom_right_x : undefined,
                });
              }
            }
          }

          parsedPages.push({
            index: pageIndex,
            markdown,
            images,
          });
        }

        const fullMarkdown = parsedPages.map((p) => p.markdown).join("\n\n");
        const resolvedModel = typeof data.model === "string" ? data.model : model;

        if (fullMarkdown.trim().length === 0) {
          lastError = {
            kind: "transport",
            message: "Mistral OCR returned no readable text (blank pages or unreadable scan)",
          };
          continue;
        }

        return ok({
          pages: parsedPages,
          fullMarkdown,
          model: resolvedModel,
          pageCount: parsedPages.length,
        });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          lastError = { kind: "transport", message };
        }
      }
      return err(lastError);
    },
  };
}
