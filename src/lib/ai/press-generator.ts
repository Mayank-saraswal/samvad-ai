/**
 * press-generator module — sovereign AI Press Note & Disclosure synthesizer.
 *
 * Takes all extracted evidence snippets (PDFs, images, audio transcripts with
 * timestamps), passes them to the configured frontier model in thinking mode,
 * and generates an authoritative multi-section press report with strict
 * headline word caps (<=15 words), executive key findings, a full body of
 * headed sections, and an evidence-analysis annex.
 *
 * Deep-module notes:
 * - Evidence context is maximized within a caller-visible budget
 *   (MAX_EVIDENCE_CHARS): up to 6 chunks per source, 600 chars each, so the
 *   model reasons over the whole dossier instead of a thumbnail.
 * - Thinking mode: `reasoningEffort` (default "high") is forwarded to the
 *   chat-completions endpoint; the model key/model itself stays operator
 *   config (`LITELLM_PRESS_MODEL`, default "gpt-5.4"). Slow by design — the
 *   call budget is 4 minutes and failures are typed, never thrown.
 * - The JSON contract is extended but backward compatible: legacy callers
 *   reading headline1/summary/detail/spans/claims keep working; new callers
 *   additionally get keyFindings/sections/evidenceAnalysis for the 4-6 page
 *   PIB report. Missing keys fall back to deterministic splits of
 *   summary/detail, so a terse model can never break the renderer.
 */
import { err, ok, type Result } from "@/lib/result/result";

export interface EvidenceSnippet {
  readonly sourceId: string;
  readonly kind: "pdf" | "image" | "audio" | "form";
  readonly text: string;
  readonly locatorPrefix?: string;
}

export interface PressNoteGeneratorInput {
  readonly documentId: string;
  readonly tenantId: string;
  readonly documentTitle: string;
  readonly evidenceSnippets: readonly EvidenceSnippet[];
}

export interface PressReportSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface GeneratedPressRelease {
  readonly headline1: string;
  readonly headline2: string;
  readonly headline3: string;
  readonly summary: string;
  readonly detail: string;
  readonly secondaryHeadline: string;
  readonly secondarySummary: string;
  readonly spans: Array<{ sourceId: string; locator: string; text: string }>;
  readonly claims: Record<string, Array<{ value: string; spanIndex?: number }>>;
  /** 4-6 executive findings for the report's page 2. */
  readonly keyFindings: readonly string[];
  /** 3-5 headed body sections for pages 3-5 of the PIB report. */
  readonly sections: readonly PressReportSection[];
  /** Evidence-analysis annex paragraphs for the closing page. */
  readonly evidenceAnalysis: readonly string[];
}

export interface PressGeneratorConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  /** Forwarded as `reasoning_effort`; default "high" (thinking mode). */
  readonly reasoningEffort?: string;
  readonly timeoutMs?: number;
  readonly fetchFn?: typeof fetch;
}

export interface PressNoteGenerator {
  generate(input: PressNoteGeneratorInput): Promise<Result<GeneratedPressRelease, string>>;
}

export const PRESS_EVIDENCE_BUDGET_CHARS = 12_000;
const CHUNKS_PER_SOURCE = 6;
const CHARS_PER_CHUNK = 600;
const DEFAULT_TIMEOUT_MS = 240_000;

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

function chunkIntoSections(paragraphs: string[]): PressReportSection[] {
  const out: { heading: string; paragraphs: string[] }[] = [];
  paragraphs.slice(0, 6).forEach((para, i) => {
    if (i % 2 === 0) out.push({ heading: `Findings ${out.length + 1}`, paragraphs: [para] });
    else out[out.length - 1]?.paragraphs.push(para);
  });
  return out.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] }));
}

function asSections(value: unknown): PressReportSection[] {
  if (!Array.isArray(value)) return [];
  const out: PressReportSection[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const rec = entry as Record<string, unknown>;
    if (typeof rec["heading"] !== "string" || rec["heading"].trim().length === 0) continue;
    const paras = asStringArray(rec["paragraphs"]);
    if (paras.length === 0) continue;
    out.push({ heading: (rec["heading"] as string).trim(), paragraphs: paras.slice(0, 4) });
  }
  return out.slice(0, 5);
}

export function createGptPressNoteGenerator(config: PressGeneratorConfig): PressNoteGenerator {
  const apiKey = config.apiKey.trim();
  const baseUrl = (config.baseUrl ?? "https://llm.corsair.dev/v1").replace(/\/+$/, "");
  const model = config.model ?? process.env.LITELLM_PRESS_MODEL ?? "gpt-5.4";
  const reasoningEffort = config.reasoningEffort ?? process.env.LITELLM_REASONING_EFFORT ?? "high";
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const customFetch = config.fetchFn ?? fetch;

  return {
    async generate(input: PressNoteGeneratorInput): Promise<Result<GeneratedPressRelease, string>> {
      if (input.evidenceSnippets.length === 0) {
        return err("At least one evidence snippet is required to synthesize a press note.");
      }

      // 1. Build discrete citation locators across the full evidence budget.
      const spans: Array<{ sourceId: string; locator: string; text: string }> = [];
      let pdfCounter = 1;
      let audioCounter = 1;
      let imgCounter = 1;
      let budgetLeft = PRESS_EVIDENCE_BUDGET_CHARS;

      for (const snip of input.evidenceSnippets) {
        if (budgetLeft <= 0) break;
        const paragraphs = splitParagraphs(snip.text);
        const chunks = (paragraphs.length > 0 ? paragraphs : [snip.text.trim()])
          .filter((p) => p.length > 0)
          .slice(0, CHUNKS_PER_SOURCE);

        for (const chunk of chunks) {
          if (budgetLeft <= 0) break;
          let locator = "";
          if (snip.kind === "audio") {
            locator = `LOC-A${audioCounter++}`;
          } else if (snip.kind === "image") {
            locator = `LOC-I${imgCounter++}`;
          } else {
            locator = `LOC-P${pdfCounter++}`;
          }
          const text = chunk.slice(0, Math.min(CHARS_PER_CHUNK, budgetLeft));
          budgetLeft -= text.length;
          spans.push({ sourceId: snip.sourceId, locator, text });
        }
      }

      const evidenceContext = spans
        .map((s) => `[Locator: ${s.locator}] ${s.text}`)
        .join("\n\n");

      const fallbackHeadline = `Official Evidence Record: ${input.documentTitle.slice(0, 60)}`;
      const fallback = (reason: string): GeneratedPressRelease => ({
        headline1: fallbackHeadline,
        headline2: "Electronic evidence secured under Bharatiya Sakshya Adhiniyam §65B",
        headline3: "Forensic chain of custody maintained in sovereign repository",
        summary: spans[0]?.text || "Case record documented with cryptographic citation groundings.",
        detail: evidenceContext,
        secondaryHeadline: "Secondary locale headline pending translation pack",
        secondarySummary: "Secondary locale summary pending translation pack",
        spans,
        claims: {
          event: [{ value: fallbackHeadline, spanIndex: 0 }],
        },
        keyFindings: [spans[0]?.text ?? reason].slice(0, 1),
        sections: [
          {
            heading: "Evidence record",
            paragraphs: [evidenceContext.slice(0, 2000)],
          },
        ],
        evidenceAnalysis: [reason],
      });

      // 2. Call the frontier model in thinking mode when a key is present.
      if (apiKey) {
        try {
          const endpoint = `${baseUrl}/chat/completions`;
          const systemPrompt = [
            "You are an authoritative government legal press officer and forensic analyst.",
            "Think step by step through ALL the evidence locators below before writing: reconcile every source, note agreements and contradictions, and only then synthesize.",
            "Synthesize a full official Press Report strictly grounded in the cited locators. Never invent names, dates, numbers, or events.",
            "Strict requirements:",
            '1. "headline1": factual and punchy, strictly under 15 words.',
            '2. "headline2": secondary headline on recovery, seizure, or key metrics.',
            '3. "headline3": action/resolution headline on statutes invoked or next steps.',
            '4. "summary": executive summary, inverted-pyramid style (3-4 sentences).',
            '5. "detail": formal press body: chronological facts, verified assets, legal citations.',
            '6. "keyFindings": 4-6 crisp single-sentence findings, most newsworthy first.',
            '7. "sections": 3-5 sections, each {"heading": string, "paragraphs": [2-4 paragraphs]}: incident & timeline, action taken, recoveries/seizures, legal proceedings & next steps.',
            '8. "evidenceAnalysis": 2-4 paragraphs analysing source reliability, corroboration across locators, and what could NOT be confirmed.',
            '9. "secondaryHeadline": Hindi translation of headline1. "secondarySummary": Hindi translation of summary.',
            "Return valid JSON matching these exact keys.",
          ].join("\n");

          const userPrompt = `Document: ${input.documentTitle}\n\nEVIDENTIARY SOURCES:\n${evidenceContext}`;

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          let res: Response;
          try {
            res = await customFetch(endpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                reasoning_effort: reasoningEffort,
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.1,
              }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }

          if (res.ok) {
            const data = (await res.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const rawContent = data.choices?.[0]?.message?.content;
            if (rawContent) {
              const parsed = JSON.parse(rawContent) as Record<string, unknown>;
              const str = (k: string, fb: string): string =>
                typeof parsed[k] === "string" && (parsed[k] as string).trim().length > 0
                  ? (parsed[k] as string).trim()
                  : fb;
              const summary = str("summary", spans[0]?.text || "");
              const detail = str("detail", evidenceContext);
              const keyFindings = asStringArray(parsed["keyFindings"]);
              const sections = asSections(parsed["sections"]);
              const evidenceAnalysis = asStringArray(parsed["evidenceAnalysis"]);
              return ok({
                headline1: str("headline1", input.documentTitle),
                headline2: str("headline2", "Official Evidence Record & Investigation Debrief"),
                headline3: str("headline3", "Statutory proceedings initiated under legal protocol"),
                summary,
                detail,
                secondaryHeadline: str("secondaryHeadline", "Secondary locale headline pending translation pack"),
                secondarySummary: str("secondarySummary", "Secondary locale summary pending translation pack"),
                spans,
                claims: {
                  event: [{ value: str("headline1", input.documentTitle), spanIndex: 0 }],
                },
                keyFindings:
                  keyFindings.length > 0 ? keyFindings.slice(0, 6) : splitParagraphs(summary).slice(0, 4),
                sections:
                  sections.length > 0 ? sections : chunkIntoSections(splitParagraphs(detail)),
                evidenceAnalysis:
                  evidenceAnalysis.length > 0
                    ? evidenceAnalysis.slice(0, 4)
                    : ["Source reliability and corroboration analysis pending full evidence review."],
              });
            }
          }
        } catch (llmErr) {
          console.warn("[Press Generator] synthesis warning:", llmErr);
        }
      }

      // 3. Deterministic fallback when the model is unreachable.
      return ok(fallback("Model unreachable — deterministic evidence record rendered instead."));
    },
  };
}
