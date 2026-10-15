/**
 * from-press mapper — turns a {@link GeneratedPressRelease} into a
 * {@link PibPressNoteInput} for the 4-6 page PIB report. Single owner of this
 * mapping so the Inngest background worker and the combined pipeline route
 * render byte-identical PDFs from the same synthesis.
 */
import type { PibPressNoteInput } from "./pib";

interface PressLike {
  readonly headline1: string;
  readonly headline2: string;
  readonly headline3: string;
  readonly summary: string;
  readonly detail: string;
  readonly keyFindings?: readonly string[];
  readonly sections?: readonly { heading: string; paragraphs: readonly string[] }[];
  readonly evidenceAnalysis?: readonly string[];
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function pibFromPress(
  gen: PressLike,
  ministryEn: string,
  releaseDateEn: string,
): PibPressNoteInput {
  const keyFindings =
    gen.keyFindings !== undefined && gen.keyFindings.length > 0
      ? [...gen.keyFindings]
      : splitParagraphs(gen.summary).slice(0, 4);
  const sections =
    gen.sections !== undefined && gen.sections.length > 0
      ? gen.sections.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] }))
      : splitParagraphs(gen.detail)
          .slice(0, 6)
          .reduce<{ heading: string; paragraphs: string[] }[]>((acc, para, i) => {
            if (i % 2 === 0) acc.push({ heading: `Findings ${acc.length + 1}`, paragraphs: [para] });
            else acc[acc.length - 1]?.paragraphs.push(para);
            return acc;
          }, []);
  return {
    titleEn: gen.headline1,
    ministryEn,
    releaseDateEn,
    keyFindings: keyFindings.length > 0 ? keyFindings : [gen.summary.slice(0, 300)],
    bodyParagraphs: splitParagraphs(gen.detail).slice(0, 8),
    sections,
    evidenceNotes:
      gen.evidenceAnalysis !== undefined && gen.evidenceAnalysis.length > 0
        ? [...gen.evidenceAnalysis]
        : undefined,
    endnote: `Headlines: ${gen.headline2} / ${gen.headline3}`,
  };
}
