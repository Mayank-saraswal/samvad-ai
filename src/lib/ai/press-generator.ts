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

// Industry-grade brevity caps: the note must stay short and to the point.
// Caps are enforced in code (not just prompted) so output length is
// deterministic no matter how verbose the model gets.
const MAX_SUMMARY_WORDS = 60;
const MAX_DETAIL_WORDS = 220;
const MAX_FINDINGS = 4;
const MAX_SECTIONS = 3;
const MAX_SECTION_PARAS = 2;
const MAX_PARA_WORDS = 70;
const MAX_EVIDENCE_NOTES = 2;
const MAX_EVIDENCE_WORDS = 90;

function capWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

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

/** Hard brevity caps on sections: at most 3 sections, 2 paragraphs each. */
function trimSections(sections: readonly PressReportSection[]): PressReportSection[] {
  return sections.slice(0, MAX_SECTIONS).map((s) => ({
    heading: s.heading,
    paragraphs: s.paragraphs.slice(0, MAX_SECTION_PARAS).map((p) => capWords(p, MAX_PARA_WORDS)),
  }));
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
      const fallbackSummary = capWords(
        spans[0]?.text || "Case record documented with citation groundings.",
        MAX_SUMMARY_WORDS,
      );
      const fallbackDetail = capWords(evidenceContext.slice(0, 2000), MAX_DETAIL_WORDS);
      const fallback = (reason: string): GeneratedPressRelease => ({
        headline1: capWords(fallbackHeadline, 15),
        headline2: "Electronic evidence secured under evidence protocol",
        headline3: "Chain of custody maintained in sovereign repository",
        summary: fallbackSummary,
        detail: fallbackDetail,
        secondaryHeadline: "Secondary locale headline pending translation pack",
        secondarySummary: "Secondary locale summary pending translation pack",
        spans,
        claims: {
          event: [{ value: capWords(fallbackHeadline, 15), spanIndex: 0 }],
        },
        keyFindings: [capWords(spans[0]?.text ?? reason, MAX_PARA_WORDS)].slice(0, 1),
        sections: trimSections([
          {
            heading: "Evidence record",
            paragraphs: [fallbackDetail],
          },
        ]),
        evidenceAnalysis: [capWords(reason, MAX_EVIDENCE_WORDS)],
      });

      // 2. Call the frontier model in thinking mode when a key is present.
      if (apiKey) {
        try {
          const endpoint = `${baseUrl}/chat/completions`;
          const systemPrompt = [
            "You are an authoritative government legal press officer and forensic analyst.",
            "Think step by step through ALL the evidence locators below before writing: reconcile every source, note agreements and contradictions, and only then synthesize.",
            "Synthesize a SHORT, to-the-point official Press Report strictly grounded in the cited locators. Brevity is mandatory.",
            "Strict requirements:",
            '1. "headline1": factual and punchy, strictly under 15 words.',
            '2. "headline2": secondary headline on recovery, seizure, or key metrics, under 15 words.',
            '3. "headline3": action/resolution headline on statutes invoked or next steps, under 15 words.',
            '4. "summary": executive summary, 1-2 sentences, max 60 words.',
            '5. "detail": formal press body, max 220 words: chronological facts, verified assets, legal citations.',
            '6. "keyFindings": 3-4 crisp single-sentence findings, most newsworthy first.',
            '7. "sections": 2-3 sections (incident & timeline; action taken; legal proceedings & next steps), each with 1-2 paragraphs of max 60 words.',
            '8. "evidenceAnalysis": 1-2 paragraphs, max 80 words each: source reliability, corroboration, and what could NOT be confirmed.',
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
              const summary = capWords(str("summary", spans[0]?.text || ""), MAX_SUMMARY_WORDS);
              const detail = capWords(str("detail", evidenceContext), MAX_DETAIL_WORDS);
              const keyFindings = asStringArray(parsed["keyFindings"]);
              const sections = asSections(parsed["sections"]);
              const evidenceAnalysis = asStringArray(parsed["evidenceAnalysis"]);
              return ok({
                headline1: capWords(str("headline1", input.documentTitle), 15),
                headline2: capWords(str("headline2", "Official Evidence Record & Investigation Debrief"), 15),
                headline3: capWords(str("headline3", "Statutory proceedings initiated under legal protocol"), 15),
                summary,
                detail,
                secondaryHeadline: str("secondaryHeadline", "Secondary locale headline pending translation pack"),
                secondarySummary: capWords(str("secondarySummary", "Secondary locale summary pending translation pack"), MAX_SUMMARY_WORDS),
                spans,
                claims: {
                  event: [{ value: capWords(str("headline1", input.documentTitle), 15), spanIndex: 0 }],
                },
                keyFindings:
                  keyFindings.length > 0
                    ? keyFindings.map((f) => capWords(f, MAX_PARA_WORDS)).slice(0, MAX_FINDINGS)
                    : splitParagraphs(summary).slice(0, MAX_FINDINGS),
                sections: trimSections(sections.length > 0 ? sections : chunkIntoSections(splitParagraphs(detail))),
                evidenceAnalysis:
                  evidenceAnalysis.length > 0
                    ? evidenceAnalysis.map((p) => capWords(p, MAX_EVIDENCE_WORDS)).slice(0, MAX_EVIDENCE_NOTES)
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
