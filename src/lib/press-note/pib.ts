/**
 * pib press-note module - GOI PIB-style press-note renderer (deep module).
 *
 * Interface: {@link buildPibPressNote} validates caller input into a
 * {@link PibPressNote}, and {@link renderPibHtml} turns a validated note plus
 * an injected {@link PibPhrases} pack into print-ready HTML with inline
 * styles. Everything a caller must know: validation never throws - it returns
 * `invalid-input` carrying every issue at once; rendering is pure string
 * building with HTML escaping, no network, no side effects.
 *
 * Phrase packs keep display wording injectable: this file contains no
 * non-English literals. {@link ENGLISH_PIB_PHRASES} is the English-only pack;
 * callers (UI layer) pass a bilingual pack when Hindi display lines are
 * wanted. Optional Hindi content lines (titleHi, ministryHi, ...) travel in
 * the input data, never as literals here.
 */

import { err, ok, type Result } from "@/lib/result/result";

export interface PibSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface PibFigure {
  readonly id: string;
  readonly caption: string;
  readonly imageUrl: string;
  readonly alt: string | null;
}

export interface PibTable {
  readonly id: string;
  readonly caption: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export interface PibPressNoteInput {
  readonly titleEn: string;
  readonly titleHi?: string;
  readonly ministryEn: string;
  readonly ministryHi?: string;
  readonly departmentEn?: string;
  readonly departmentHi?: string;
  readonly placeDateLine?: string;
  readonly referencePeriod?: string;
  readonly keyFindings: readonly string[];
  readonly bodyParagraphs: readonly string[];
  /** Headed body sections (pages 3-5). Optional; falls back to bodyParagraphs. */
  readonly sections?: readonly PibSection[];
  /** Evidence-analysis annex paragraphs (closing page). Optional. */
  readonly evidenceNotes?: readonly string[];
  /** User-inserted visual annexures (graphs, photos). Rendered before the seal page. */
  readonly figures?: readonly PibFigure[];
  /** User-inserted data tables. Rendered after figures, before the seal page. */
  readonly tables?: readonly PibTable[];
  readonly endnote?: string;
  readonly pageNumber?: number;
  readonly releaseDateEn: string;
}

export interface PibPressNote {
  readonly titleEn: string;
  readonly titleHi: string | null;
  readonly ministryEn: string;
  readonly ministryHi: string | null;
  readonly departmentEn: string | null;
  readonly departmentHi: string | null;
  readonly placeDateLine: string | null;
  readonly referencePeriod: string | null;
  readonly keyFindings: readonly string[];
  readonly bodyParagraphs: readonly string[];
  readonly sections: readonly PibSection[];
  readonly evidenceNotes: readonly string[];
  readonly figures: readonly PibFigure[];
  readonly tables: readonly PibTable[];
  readonly endnote: string | null;
  readonly pageNumber: number;
  readonly releaseDateEn: string;
}

export interface PibIssue {
  readonly field: string;
  readonly reason: string;
}

export interface PibInvalidInput {
  readonly kind: "invalid-input";
  readonly issues: readonly PibIssue[];
}

export interface PibPhrases {
  readonly emblemCaption: string;
  readonly governmentLine: string;
  readonly pressNoteTitle: string;
  readonly pageWord: string;
}

export const ENGLISH_PIB_PHRASES: PibPhrases = {
  emblemCaption: "National Emblem of India",
  governmentLine: "Government of India",
  pressNoteTitle: "PRESS NOTE",
  pageWord: "Page",
};

const MAX_KEY_FINDINGS = 6;
const MAX_BODY_PARAGRAPHS = 20;
const MAX_SECTIONS = 6;
const MAX_SECTION_PARAGRAPHS = 5;
const MAX_EVIDENCE_NOTES = 6;
const MAX_FIGURES = 8;
const MAX_TABLES = 6;
const MAX_TABLE_COLS = 8;
const MAX_TABLE_ROWS = 20;
const MAX_CELL_CHARS = 300;
const MAX_URL_CHARS = 2000;
const DEFAULT_PAGE_NUMBER = 2;

function cleanSection(value: unknown): PibSection | null {
  if (typeof value !== "object" || value === null) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec["heading"] !== "string" || rec["heading"].trim().length === 0) return null;
  const paras = cleanList(rec["paragraphs"] as readonly string[] | undefined).slice(0, MAX_SECTION_PARAGRAPHS);
  if (paras.length === 0) return null;
  return { heading: (rec["heading"] as string).trim(), paragraphs: paras };
}

function clean(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const item of values) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (trimmed.length > 0) out.push(trimmed);
  }
  return out;
}

export function buildPibPressNote(
  input: PibPressNoteInput,
): Result<PibPressNote, PibInvalidInput> {
  const issues: PibIssue[] = [];

  const titleEn = clean(input.titleEn);
  if (titleEn === null) {
    issues.push({ field: "titleEn", reason: "titleEn must contain at least 1 non-blank character" });
  }

  const ministryEn = clean(input.ministryEn);
  if (ministryEn === null) {
    issues.push({ field: "ministryEn", reason: "ministryEn must contain at least 1 non-blank character" });
  }

  const releaseDateEn = clean(input.releaseDateEn);
  if (releaseDateEn === null) {
    issues.push({
      field: "releaseDateEn",
      reason: "releaseDateEn must contain at least 1 non-blank character",
    });
  }

  const rawFindings = Array.isArray(input.keyFindings) ? input.keyFindings : [];
  const blankFindingCount = rawFindings.filter(
    (item) => typeof item !== "string" || item.trim().length === 0,
  ).length;
  if (blankFindingCount > 0) {
    issues.push({
      field: "keyFindings",
      reason: `${String(blankFindingCount)} key finding(s) are blank`,
    });
  }
  const keyFindings = cleanList(input.keyFindings);
  if (keyFindings.length < 1) {
    issues.push({ field: "keyFindings", reason: "keyFindings needs at least 1 entry" });
  }
  if (rawFindings.length > MAX_KEY_FINDINGS) {
    issues.push({
      field: "keyFindings",
      reason: `keyFindings allows at most ${String(MAX_KEY_FINDINGS)} entries`,
    });
  }

  const rawBody = Array.isArray(input.bodyParagraphs) ? input.bodyParagraphs : [];
  const blankBodyCount = rawBody.filter(
    (item) => typeof item !== "string" || item.trim().length === 0,
  ).length;
  if (blankBodyCount > 0) {
    issues.push({
      field: "bodyParagraphs",
      reason: `${String(blankBodyCount)} body paragraph(s) are blank`,
    });
  }
  const bodyParagraphs = cleanList(input.bodyParagraphs);
  if (bodyParagraphs.length < 1) {
    issues.push({ field: "bodyParagraphs", reason: "bodyParagraphs needs at least 1 entry" });
  }
  if (rawBody.length > MAX_BODY_PARAGRAPHS) {
    issues.push({
      field: "bodyParagraphs",
      reason: `bodyParagraphs allows at most ${String(MAX_BODY_PARAGRAPHS)} entries`,
    });
  }

  let pageNumber = DEFAULT_PAGE_NUMBER;
  if (input.pageNumber !== undefined) {
    if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1) {
      issues.push({ field: "pageNumber", reason: "pageNumber must be an integer of at least 1" });
    } else {
      pageNumber = input.pageNumber;
    }
  }

  const sections: PibSection[] = [];
  if (input.sections !== undefined) {
    if (!Array.isArray(input.sections)) {
      issues.push({ field: "sections", reason: "sections must be an array" });
    } else {
      if (input.sections.length > MAX_SECTIONS) {
        issues.push({
          field: "sections",
          reason: `sections allows at most ${String(MAX_SECTIONS)} entries`,
        });
      }
      for (const entry of input.sections.slice(0, MAX_SECTIONS)) {
        const cleaned = cleanSection(entry);
        if (cleaned) sections.push(cleaned);
      }
    }
  }

  const evidenceNotes = cleanList(input.evidenceNotes).slice(0, MAX_EVIDENCE_NOTES);

  const figures: PibFigure[] = [];
  if (input.figures !== undefined) {
    if (!Array.isArray(input.figures)) {
      issues.push({ field: "figures", reason: "figures must be an array" });
    } else {
      if (input.figures.length > MAX_FIGURES) {
        issues.push({ field: "figures", reason: `figures allows at most ${String(MAX_FIGURES)} entries` });
      }
      for (const entry of input.figures.slice(0, MAX_FIGURES)) {
        const cleaned = cleanFigure(entry);
        if (cleaned) figures.push(cleaned);
        else issues.push({ field: "figures", reason: "each figure needs an id, caption and imageUrl" });
      }
    }
  }

  const tables: PibTable[] = [];
  if (input.tables !== undefined) {
    if (!Array.isArray(input.tables)) {
      issues.push({ field: "tables", reason: "tables must be an array" });
    } else {
      if (input.tables.length > MAX_TABLES) {
        issues.push({ field: "tables", reason: `tables allows at most ${String(MAX_TABLES)} entries` });
      }
      for (const entry of input.tables.slice(0, MAX_TABLES)) {
        const cleaned = cleanTable(entry);
        if (cleaned) tables.push(cleaned);
        else issues.push({ field: "tables", reason: "each table needs an id, caption, headers and rows" });
      }
    }
  }

  if (issues.length > 0 || titleEn === null || ministryEn === null || releaseDateEn === null) {
    return err({ kind: "invalid-input", issues });
  }

  return ok({
    titleEn,
    titleHi: clean(input.titleHi),
    ministryEn,
    ministryHi: clean(input.ministryHi),
    departmentEn: clean(input.departmentEn),
    departmentHi: clean(input.departmentHi),
    placeDateLine: clean(input.placeDateLine),
    referencePeriod: clean(input.referencePeriod),
    keyFindings,
    bodyParagraphs,
    sections,
    evidenceNotes,
    figures,
    tables,
    endnote: clean(input.endnote),
    pageNumber,
    releaseDateEn,
  });
}

function cleanFigure(value: unknown): PibFigure | null {
  if (typeof value !== "object" || value === null) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec["id"] !== "string" || rec["id"].trim().length === 0) return null;
  if (typeof rec["caption"] !== "string" || rec["caption"].trim().length === 0) return null;
  if (typeof rec["imageUrl"] !== "string" || rec["imageUrl"].trim().length === 0) return null;
  const url = (rec["imageUrl"] as string).trim();
  if (url.length > MAX_URL_CHARS) return null;
  if (!url.startsWith("/") && !url.startsWith("https://")) return null;
  const alt = typeof rec["alt"] === "string" && rec["alt"].trim().length > 0 ? (rec["alt"] as string).trim() : null;
  return { id: (rec["id"] as string).trim(), caption: (rec["caption"] as string).trim(), imageUrl: url, alt };
}

function cleanTable(value: unknown): PibTable | null {
  if (typeof value !== "object" || value === null) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec["id"] !== "string" || rec["id"].trim().length === 0) return null;
  if (typeof rec["caption"] !== "string" || rec["caption"].trim().length === 0) return null;
  if (!Array.isArray(rec["headers"])) return null;
  const headers = (rec["headers"] as unknown[])
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .map((h) => h.trim().slice(0, MAX_CELL_CHARS))
    .slice(0, MAX_TABLE_COLS);
  if (headers.length === 0) return null;
  if (!Array.isArray(rec["rows"])) return null;
  const rows = (rec["rows"] as unknown[]).slice(0, MAX_TABLE_ROWS).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return headers.map((_, i) => {
      const cell = cells[i];
      return typeof cell === "string" ? cell.trim().slice(0, MAX_CELL_CHARS) : "";
    });
  });
  if (rows.length === 0) return null;
  return { id: (rec["id"] as string).trim(), caption: (rec["caption"] as string).trim(), headers, rows };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SERIF = "Georgia, 'Times New Roman', Times, serif";

function ministryBlock(note: PibPressNote): string {
  const lines: string[] = [];
  if (note.ministryHi !== null) {
    lines.push(
      `<div style="font-size:15px;font-weight:bold;margin:0;">${escapeHtml(note.ministryHi)}</div>`,
    );
  }
  lines.push(
    `<div style="font-size:15px;font-weight:bold;margin:0;">${escapeHtml(note.ministryEn)}</div>`,
  );
  if (note.departmentHi !== null) {
    lines.push(
      `<div style="font-size:13px;margin:2px 0 0;">${escapeHtml(note.departmentHi)}</div>`,
    );
  }
  if (note.departmentEn !== null) {
    lines.push(
      `<div style="font-size:13px;margin:2px 0 0;">${escapeHtml(note.departmentEn)}</div>`,
    );
  }
  return lines.join("");
}

function pageHeader(note: PibPressNote, phrases: PibPhrases): string {
  return (
    `<div style="display:flex;justify-content:space-between;gap:16px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;border-bottom:2px solid #111;padding-bottom:10px;">` +
    `<div><div style="font-weight:bold;">${escapeHtml(phrases.governmentLine)}</div><div>${escapeHtml(note.ministryEn)}</div></div>` +
    `<div style="text-align:right;white-space:nowrap;">${escapeHtml(note.releaseDateEn)}</div>` +
    `</div>`
  );
}

function pageFooter(phrases: PibPhrases, pageNumber: number): string {
  return `<div style="text-align:center;font-size:11px;letter-spacing:0.6px;margin-top:32px;border-top:1px solid #111;padding-top:10px;">${escapeHtml(phrases.pageWord)} ${String(pageNumber)}</div>`;
}

export function renderPibHtml(note: PibPressNote, phrases: PibPhrases): string {
  const titleHi = note.titleHi !== null ? `<h1 style="font-size:20px;font-weight:bold;margin:10px 0 0;">${escapeHtml(note.titleHi)}</h1>` : "";
  const referencePeriod =
    note.referencePeriod !== null
      ? `<div style="font-size:13px;margin-top:10px;">${escapeHtml(note.referencePeriod)}</div>`
      : "";
  const placeDateLine =
    note.placeDateLine !== null
      ? `<div style="font-size:13px;margin-top:6px;">${escapeHtml(note.placeDateLine)}</div>`
      : "";

  const keyFindings = note.keyFindings
    .map(
      (finding, i) =>
        `<p style="font-style:italic;text-align:justify;font-size:14px;line-height:1.75;margin:10px 0;">${escapeHtml(`${i + 1}. ${finding}`)}</p>`,
    )
    .join("");

  const body = note.bodyParagraphs
    .map(
      (para) =>
        `<p style="text-align:justify;font-size:14px;line-height:1.75;margin:10px 0;">${escapeHtml(para)}</p>`,
    )
    .join("");

  const sectionPages = note.sections
    .map(
      (section, i) =>
        `<div style="page-break-before:always;">` +
        pageHeader(note, phrases) +
        `<h2 style="font-size:17px;font-weight:bold;margin:20px 0 10px;line-height:1.4;">${escapeHtml(`${i + 1}. ${section.heading}`)}</h2>` +
        section.paragraphs
          .map(
            (para) =>
              `<p style="text-align:justify;font-size:14px;line-height:1.75;margin:10px 0;">${escapeHtml(para)}</p>`,
          )
          .join("") +
        pageFooter(phrases, note.pageNumber + 1 + i) +
        `</div>`,
    )
    .join("");

  const figurePages = note.figures
    .map(
      (fig, i) =>
        `<div style="page-break-before:always;">` +
        pageHeader(note, phrases) +
        `<h2 style="font-size:17px;font-weight:bold;margin:20px 0 10px;line-height:1.4;">${escapeHtml(`Figure ${i + 1} — ${fig.caption}`)}</h2>` +
        `<div style="text-align:center;margin:14px 0;">` +
        `<img src="${escapeHtml(fig.imageUrl)}" alt="${escapeHtml(fig.alt ?? fig.caption)}" style="max-width:100%;max-height:640px;border:1px solid #111;" />` +
        `</div>` +
        pageFooter(phrases, note.pageNumber + 1 + note.sections.length + i) +
        `</div>`,
    )
    .join("");

  const tablePages = note.tables
    .map(
      (table, i) =>
        `<div style="page-break-before:always;">` +
        pageHeader(note, phrases) +
        `<h2 style="font-size:17px;font-weight:bold;margin:20px 0 10px;line-height:1.4;">${escapeHtml(`Table ${i + 1} — ${table.caption}`)}</h2>` +
        `<table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.6;margin:14px 0;">` +
        `<thead><tr>` +
        table.headers.map((h) => `<th style="border:1px solid #111;padding:9px;text-align:left;background:#f5f5f5;">${escapeHtml(h)}</th>`).join("") +
        `</tr></thead><tbody>` +
        table.rows
          .map(
            (row) =>
              `<tr>` +
              row.map((cell) => `<td style="border:1px solid #111;padding:9px;vertical-align:top;">${escapeHtml(cell)}</td>`).join("") +
              `</tr>`,
          )
          .join("") +
        `</tbody></table>` +
        pageFooter(phrases, note.pageNumber + 1 + note.sections.length + note.figures.length + i) +
        `</div>`,
    )
    .join("");

  const evidenceBlock =
    note.evidenceNotes.length > 0
      ? `<h2 style="font-size:17px;font-weight:bold;margin:20px 0 10px;line-height:1.4;">Evidence Analysis</h2>` +
        note.evidenceNotes
          .map(
            (para) =>
              `<p style="text-align:justify;font-size:14px;line-height:1.75;margin:10px 0;">${escapeHtml(para)}</p>`,
          )
          .join("")
      : "";

  const endnote =
    note.endnote !== null
      ? `<p style="font-size:12px;color:#333;margin-top:14px;">${escapeHtml(note.endnote)}</p>`
      : "";

  const closingPageNumber = note.pageNumber + 1 + note.sections.length + note.figures.length + note.tables.length;

  return (
    `<div style="font-family:${SERIF};color:#111;background:#ffffff;max-width:820px;margin:0 auto;padding:48px 44px;">` +
    // Page 1 — cover
    `<div style="text-align:center;">` +
    `<div style="width:92px;height:92px;border:2px solid #111;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1.4;padding:8px;box-sizing:border-box;">${escapeHtml(phrases.emblemCaption)}</div>` +
    `<div style="font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(phrases.governmentLine)}</div>` +
    `<div style="margin-top:8px;">${ministryBlock(note)}</div>` +
    `<div style="font-size:22px;font-weight:bold;text-decoration:underline;text-underline-offset:4px;margin:22px 0 6px;">${escapeHtml(phrases.pressNoteTitle)}</div>` +
    `${titleHi}` +
    `<h2 style="font-size:19px;font-weight:bold;margin:10px 0 0;line-height:1.5;">${escapeHtml(note.titleEn)}</h2>` +
    `${referencePeriod}` +
    `${placeDateLine}` +
    `<div style="font-size:13px;margin-top:6px;">${escapeHtml(note.releaseDateEn)}</div>` +
    `</div>` +
    `<hr style="border:none;border-top:1px solid #111;margin:32px 0;" />` +
    // Page 2 — headline + key findings
    `<div style="page-break-before:always;">` +
    pageHeader(note, phrases) +
    `<div style="text-align:center;font-size:16px;font-weight:bold;text-decoration:underline;text-underline-offset:4px;margin:16px 0;">${escapeHtml(phrases.pressNoteTitle)}</div>` +
    (note.titleHi !== null
      ? `<p style="text-align:center;font-style:italic;font-size:15px;margin:6px 0;">${escapeHtml(note.titleHi)}</p>`
      : "") +
    `<p style="text-align:center;font-style:italic;font-weight:bold;font-size:15px;margin:6px 0 12px;">${escapeHtml(note.titleEn)}</p>` +
    `${keyFindings}` +
    `${body}` +
    pageFooter(phrases, note.pageNumber) +
    `</div>` +
    // Pages 3+ — headed body sections
    `${sectionPages}` +
    // Visual annexures — figures then tables, one per page
    `${figurePages}` +
    `${tablePages}` +
    // Closing page — evidence analysis + seal
    `<div style="page-break-before:always;">` +
    pageHeader(note, phrases) +
    `${evidenceBlock}` +
    `${endnote}` +
    `<div style="margin-top:28px;border:1px solid #111;padding:16px;text-align:center;">` +
    `<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">Digitally verified release</div>` +
    `<div style="font-size:12px;margin-top:6px;">${escapeHtml(note.ministryEn)} — ${escapeHtml(note.releaseDateEn)}</div>` +
    `</div>` +
    pageFooter(phrases, closingPageNumber) +
    `</div>` +
    `</div>`
  );
}
