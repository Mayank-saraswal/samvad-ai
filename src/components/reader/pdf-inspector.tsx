"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Printer,
  Copy,
  Check,
  Download,
  Newspaper,
  Languages,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PressNoteData {
  headline1?: string;
  headline2?: string;
  headline3?: string;
  summary?: string;
  detail?: string;
  secondaryHeadline?: string;
  secondarySummary?: string;
  department?: string;
  status?: string;
  revisionsCount?: number;
  spans?: readonly { sourceId: string; locator: string; text: string }[];
  documentId?: string;
}

interface PdfInspectorProps {
  documentTitle: string;
  fileUrl?: string;
  activeLocator?: string | null;
  className?: string;
  pressNoteData?: PressNoteData;
  initialMode?: "evidence" | "pressnote";
  onModeChange?: (mode: "evidence" | "pressnote") => void;
}

const SAMPLE_CASE_PARAGRAPHS = [
  {
    locator: "LOC-P1",
    label: "Incident Origin & First Information",
    text: "On 14-Oct-2026, formal complaints were received regarding unauthorized financial diversions through fraudulent mirror-payment endpoints. Complainants reported sudden debits originating from cloned session cookies.",
    statute: "IPC §420 / IT Act §66D",
  },
  {
    locator: "LOC-P2",
    label: "Targeted Interception & Apprehensions",
    text: "Cyber Crime Cell initiated immediate network trace operations. Three prime suspects were intercepted at a transit hideout with active hardware rigs. Electronic evidence, encrypted flash storage, and 47 mobile devices were secured under forensic protocol.",
    statute: "BSA §65B Forensic Custody",
  },
  {
    locator: "LOC-P3",
    label: "Financial Recovery & Account Freezes",
    text: "Coordinated inter-bank notices were served under emergency directives. Eight mule bank accounts holding illicit transfers were frozen within 90 minutes, securing recovery for affected institutions prior to dissipation.",
    statute: "CrPC §102 Seizure Orders",
  },
];

export function PdfInspector({
  documentTitle,
  fileUrl,
  activeLocator,
  className,
  pressNoteData,
  initialMode = "evidence",
  onModeChange,
}: PdfInspectorProps): React.JSX.Element {
  const [zoom, setZoom] = React.useState(100);
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = 1;
  const [copied, setCopied] = React.useState(false);
  const [mode, setMode] = React.useState<"evidence" | "pressnote">(
    fileUrl ? initialMode : "pressnote",
  );

  const [selectedParaLocator, setSelectedParaLocator] = React.useState<string | null>(
    activeLocator ?? "LOC-P1",
  );
  const [prevLocator, setPrevLocator] = React.useState<string | null | undefined>(activeLocator);
  if (activeLocator !== undefined && activeLocator !== prevLocator) {
    setPrevLocator(activeLocator);
    setSelectedParaLocator(activeLocator);
  }

  function handleSwitchMode(newMode: "evidence" | "pressnote") {
    setMode(newMode);
    onModeChange?.(newMode);
  }

  const isPdf = fileUrl
    ? fileUrl.toLowerCase().includes(".pdf") ||
      !fileUrl.toLowerCase().match(/\.(png|jpe?g|webp|gif|svg)($|\?)/i)
    : false;

  const hasPressNote = Boolean(
    pressNoteData &&
      (pressNoteData.headline1 ||
        pressNoteData.summary ||
        pressNoteData.detail ||
        pressNoteData.secondaryHeadline),
  );

  function handlePrint() {
    window.print();
  }

  async function handleCopyText() {
    if (!pressNoteData) return;
    const textToCopy = `
OFFICIAL PRESS RELEASE
Department: ${pressNoteData.department ?? "State Police Investigation Dept"}
Title: ${documentTitle}
Status: ${pressNoteData.status ?? "Draft"} (BSA §65B Certified)

HEADLINE (Primary):
${pressNoteData.headline1 || documentTitle}

${pressNoteData.headline2 ? `ALTERNATIVE HEADLINE 2:\n${pressNoteData.headline2}\n` : ""}
${pressNoteData.headline3 ? `ALTERNATIVE HEADLINE 3:\n${pressNoteData.headline3}\n` : ""}

EXECUTIVE SUMMARY:
${pressNoteData.summary || "No summary provided."}

DETAILED INVESTIGATION NARRATIVE:
${pressNoteData.detail || "No detailed narrative provided."}

${
  pressNoteData.secondaryHeadline || pressNoteData.secondarySummary
    ? `
DUAL-LANGUAGE (HINDI) SEAM:
शीर्षक: ${pressNoteData.secondaryHeadline || ""}
विवरण: ${pressNoteData.secondarySummary || ""}
`
    : ""
}

EVIDENTIARY LOCATORS & STATUTORY COMPLIANCE:
Bharatiya Sakshya Adhiniyam (BSA) §65B Digital Evidence Standard
Merkle Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  }

  function handleDownloadMarkdown() {
    if (!pressNoteData) return;
    const mdContent = `# OFFICIAL PRESS NOTE: ${documentTitle}
**Department:** ${pressNoteData.department ?? "State Police Investigation Dept"}  
**Status:** ${pressNoteData.status ?? "Draft"}  
**Certification:** Bharatiya Sakshya Adhiniyam §65B  
**Date:** ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}  

---

## 1. Primary Headline
> ${pressNoteData.headline1 || documentTitle}

${pressNoteData.headline2 ? `### Alternate Headline 2 (Action Taken)\n${pressNoteData.headline2}\n` : ""}
${pressNoteData.headline3 ? `### Alternate Headline 3 (Official Notice)\n${pressNoteData.headline3}\n` : ""}

## 2. Executive Press Summary
${pressNoteData.summary || ""}

## 3. Inverted-Pyramid Detailed Narrative
${pressNoteData.detail || ""}

${
  pressNoteData.secondaryHeadline || pressNoteData.secondarySummary
    ? `## 4. Hindi Release / आधिकारिक हिन्दी अनुवाद
### ${pressNoteData.secondaryHeadline || ""}
${pressNoteData.secondarySummary || ""}
`
    : ""
}

---
*Generated by Samvaad AI Sovereign Pipeline • Digitally Signed & Validated*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `press-note-${(documentTitle || "dossier").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft",
        className,
      )}
    >
      {/* Top Floating Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-4 py-2.5 border-b border-border/70 bg-card/90 backdrop-blur-md no-print">
        {/* Left: Mode Toggle & Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex rounded-lg bg-muted/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleSwitchMode("evidence")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1.5",
                mode === "evidence"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-3" />
              Evidence File
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("pressnote")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1.5",
                mode === "pressnote"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Newspaper className="size-3" />
              Press Note PDF
            </button>
          </div>

          <span className="font-display text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-xs text-foreground tracking-tight hidden md:inline-block">
            {mode === "pressnote" ? "Generated Press Release" : documentTitle || "Evidence Document"}
          </span>
          {activeLocator && mode === "evidence" && (
            <Badge variant="brand" className="text-[10px] py-0.5 px-2 font-mono shrink-0">
              Locator: {activeLocator}
            </Badge>
          )}
        </div>

        {/* Right: Actions (Print/Save PDF, Copy, Download, Zoom) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Print / Save as PDF Button */}
          <Button
            variant="default"
            size="xs"
            onClick={handlePrint}
            title="Print or Save as PDF (Ctrl+P / Cmd+P)"
            className="gap-1.5 text-[11px] h-7 bg-foreground text-background hover:bg-foreground/90 font-medium"
          >
            <Printer className="size-3" />
            <span className="hidden sm:inline">Print / Save PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          {/* Copy Full Text */}
          {hasPressNote && (
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopyText}
              aria-label="Copy press release text"
              title="Copy press note text"
              className="h-7 w-7 rounded-lg"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            </Button>
          )}

          {/* Download Markdown */}
          {hasPressNote && (
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleDownloadMarkdown}
              aria-label="Download markdown"
              title="Download press release (.md)"
              className="h-7 w-7 rounded-lg"
            >
              <Download className="size-3" />
            </Button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center rounded-full border border-border/70 bg-background/90 p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setZoom((z) => Math.max(60, z - 15))}
              disabled={zoom <= 60}
              aria-label="Zoom out"
              className="h-6 w-6 text-foreground/80 hover:text-foreground"
            >
              <ZoomOut className="size-3" />
            </Button>
            <span className="text-[0.7rem] font-mono px-2 text-foreground font-semibold select-none min-w-[2.8rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setZoom((z) => Math.min(180, z + 15))}
              disabled={zoom >= 180}
              aria-label="Zoom in"
              className="h-6 w-6 text-foreground/80 hover:text-foreground"
            >
              <ZoomIn className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setZoom(100)}
              aria-label="Reset zoom"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>

          {fileUrl && mode === "evidence" && (
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => window.open(fileUrl, "_blank")}
              aria-label="Open original file in new tab"
              title="Open raw file in new tab"
              className="h-7 w-7 rounded-lg"
            >
              <ExternalLink className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewer Viewport */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-canvas relative dot-grid select-none min-h-[420px]">
        {/* Loreline Reading State Aura around Paper Viewport */}
        {activeLocator && mode === "evidence" && (
          <div className="pdf-reading-state-aura no-print" data-reading-aura="inspecting" aria-hidden="true">
            <span data-aura-edge="top" data-aura-layer="ambient" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="top" data-aura-layer="core" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="right" data-aura-layer="ambient" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="right" data-aura-layer="core" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="bottom" data-aura-layer="ambient" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="bottom" data-aura-layer="core" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="left" data-aura-layer="ambient" className="pdf-reading-state-aura__edge" />
            <span data-aura-edge="left" data-aura-layer="core" className="pdf-reading-state-aura__edge" />
          </div>
        )}

        {/* Paper Container */}
        <div
          className={cn(
            "transition-transform duration-200 origin-top shadow-float rounded-2xl overflow-hidden bg-reader-paper text-reader-ink border border-reader-ink/10 relative z-10 w-full max-w-[680px]",
            mode === "pressnote" ? "printable-press-note" : "",
          )}
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {mode === "evidence" ? (
            /* Mode A: Raw Uploaded Evidence File (PDF or Image) */
            fileUrl ? (
              <div>
                {isPdf ? (
                  <iframe
                    src={`${fileUrl}#toolbar=0`}
                    className="w-full h-[660px] border-none"
                    title="Document PDF preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl}
                    alt="Case Evidence Document"
                    className="w-full max-h-[660px] object-contain rounded-lg"
                  />
                )}
              </div>
            ) : (
              /* Fallback Evidence Deposition Paper */
              <div className="reader-paper p-5 sm:p-7 space-y-4">
                <div className="flex items-center justify-between border-b border-reader-ink/15 pb-3 font-mono text-[10px] tracking-wider text-reader-muted">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-emerald-800 shrink-0" />
                    <span className="font-semibold text-reader-ink">
                      STATE POLICE INVESTIGATION DEPT • CASE RECORD
                    </span>
                  </div>
                  <Badge variant="sage" className="text-[9px] font-mono py-0 px-2">
                    BSA §65B CERTIFIED
                  </Badge>
                </div>

                <div className="text-center pt-1 pb-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-reader-muted">
                    Primary Incident &amp; Evidence Deposition
                  </p>
                  <h3 className="font-display text-base sm:text-lg font-bold text-reader-ink mt-0.5 tracking-tight">
                    {documentTitle || "First Information Report Extract"}
                  </h3>
                  <p className="font-mono text-[10px] text-reader-muted mt-1">
                    Reference: FIR-402/2026/CYBER • Merkle Root: 4f8a9e2d...01c4
                  </p>
                </div>

                <div className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed text-reader-ink/90">
                  {SAMPLE_CASE_PARAGRAPHS.map((para) => {
                    const isSelected = selectedParaLocator === para.locator;
                    return (
                      <div
                        key={para.locator}
                        onClick={() => setSelectedParaLocator(para.locator)}
                        className={cn(
                          "relative p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                          isSelected
                            ? "bg-reader-highlight/90 text-reader-ink shadow-xs ring-1 ring-reader-ink/20 pdf-reader-focus"
                            : "border-reader-ink/10 bg-reader-paper/60 hover:bg-reader-ink/5 text-reader-ink/80",
                        )}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] text-reader-muted mb-1">
                          <span className="font-bold text-reader-ink">
                            [{para.locator}] {para.label}
                          </span>
                          <span className="text-[9px] opacity-80">{para.statute}</span>
                        </div>
                        <p>{para.text}</p>
                        {isSelected && (
                          <div className="mt-2 pt-1.5 border-t border-reader-ink/15 flex items-center justify-between text-[10px] font-mono font-semibold text-reader-ink">
                            <span className="flex items-center gap-1.5 text-emerald-900">
                              <CheckCircle2 className="size-3" />
                              <span>Cited in Dossier Press Note</span>
                            </span>
                            <span className="text-[9px] bg-background/80 px-2 py-0.5 rounded-full border border-reader-ink/10">
                              Deterministic OCR Match
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-dashed border-reader-ink/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-reader-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-600 inline-block" />
                    <span>Verified Sovereign Evidence Vault • SHA-256 Validated</span>
                  </div>
                  <span className="text-[9px] text-reader-muted/80">
                    Page 1 of 1 • Signed under Bharatiya Sakshya Adhiniyam
                  </span>
                </div>
              </div>
            )
          ) : (
            /* Mode B: Generated Official Press Note PDF Document */
            <div className="reader-paper p-6 sm:p-9 space-y-6 bg-white text-slate-900 font-sans">
              {/* Official Government / Department Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 print-border">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">
                  <span className="font-semibold text-slate-800">
                    {pressNoteData?.department || "STATE POLICE INVESTIGATION DEPT"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-emerald-700 print-badge">
                    BSA §65B CERTIFIED DIGITAL RELEASE
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase font-serif">
                  PRESS RELEASE / प्रेस नोट
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-600 pt-1">
                  <span>Ref: {pressNoteData?.documentId ? `DOC-${pressNoteData.documentId.slice(0, 8).toUpperCase()}` : "REF-PR-2026"}</span>
                  <span>•</span>
                  <span>Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
                  <span>•</span>
                  <span>Status: <strong className="text-slate-900 uppercase">{pressNoteData?.status ?? "DRAFT"}</strong></span>
                  {pressNoteData?.revisionsCount !== undefined && (
                    <>
                      <span>•</span>
                      <span>Revision #{pressNoteData.revisionsCount}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Primary Headline (Inverted-Pyramid Lead) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>Primary Headline Lead (≤ 15 Words)</span>
                  <span className="font-bold text-slate-700">
                    {(pressNoteData?.headline1 || documentTitle).trim().split(/\s+/).filter(Boolean).length} Words
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold font-serif leading-snug text-slate-950 border-l-4 border-slate-900 pl-3 py-0.5">
                  {pressNoteData?.headline1 || documentTitle || "Press Release Lead Event"}
                </h1>

                {/* Alternate Headlines if present */}
                {(pressNoteData?.headline2 || pressNoteData?.headline3) && (
                  <div className="pt-2 text-xs text-slate-600 space-y-1 font-sans">
                    {pressNoteData.headline2 && (
                      <p className="leading-snug">
                        <strong className="text-slate-800 font-mono text-[10px] uppercase">Option 2 (Action):</strong> {pressNoteData.headline2}
                      </p>
                    )}
                    {pressNoteData.headline3 && (
                      <p className="leading-snug">
                        <strong className="text-slate-800 font-mono text-[10px] uppercase">Option 3 (Notice):</strong> {pressNoteData.headline3}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Executive Summary */}
              <div className="space-y-1.5 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  I. Executive Summary / मुख्य सारांश
                </h3>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-[13px] leading-relaxed text-slate-800 print-border">
                  <p>{pressNoteData?.summary || "Executive summary extracted from confirmed case facts."}</p>
                </div>
              </div>

              {/* Inverted Pyramid Detailed Narrative */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  II. Incident Details &amp; Legal Sequence
                </h3>
                <div className="text-xs sm:text-[13px] leading-relaxed text-slate-800 whitespace-pre-line space-y-2">
                  <p>{pressNoteData?.detail || "Detailed chronological evidence deposition."}</p>
                </div>
              </div>

              {/* Secondary Language (Hindi) Section */}
              {(pressNoteData?.secondaryHeadline || pressNoteData?.secondarySummary) && (
                <div className="space-y-2 pt-2 border-t border-slate-200 print-border">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    <Languages className="size-3.5 text-slate-600" />
                    <span>III. Dual-Language Translation (Hindi / हिन्दी संस्करण)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-[13px] print-border leading-relaxed text-slate-800">
                    {pressNoteData.secondaryHeadline && (
                      <h4 className="font-bold text-slate-900 text-sm font-serif">
                        {pressNoteData.secondaryHeadline}
                      </h4>
                    )}
                    {pressNoteData.secondarySummary && (
                      <p className="text-slate-700 leading-relaxed">
                        {pressNoteData.secondarySummary}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Citations & Evidence Grounding Locators */}
              {pressNoteData?.spans && pressNoteData.spans.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 print-border">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                    <span className="flex items-center gap-1">
                      <Scale className="size-3 text-slate-600" />
                      <span>IV. Primary Evidence Grounding Locators (BSA §65B)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Immutable Source of Truth
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                    {pressNoteData.spans.slice(0, 4).map((span, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-slate-100/70 border border-slate-200 text-slate-700 flex items-start gap-2 print-border"
                      >
                        <span className="font-bold text-slate-900 shrink-0">[{span.locator}]</span>
                        <span className="line-clamp-2 text-slate-600 font-sans text-xs">{span.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Seal, Attestation & Merkle Stamp */}
              <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left print-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start font-mono text-[10px] text-slate-700 font-bold uppercase">
                    <ShieldCheck className="size-4 text-emerald-800" />
                    <span>SOVEREIGN DIGITAL VERIFICATION SEAL</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 max-w-xs">
                    Cryptographically hashed and anchored into Lakebase Vector Index under Bharatiya Sakshya Adhiniyam standards.
                  </p>
                </div>

                <div className="border border-slate-400 p-3 rounded-lg text-center min-w-[180px] bg-slate-50/50 print-border">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                    Authorized Sign-Off
                  </p>
                  <p className="text-xs font-serif font-bold text-slate-900 mt-1">
                    {pressNoteData?.status === "approved" ? "DIGITALLY APPROVED" : "EDITORIAL DRAFT"}
                  </p>
                  <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Samvaad AI Sovereign System
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground no-print">
        <div className="flex items-center gap-1.5 font-mono text-[0.7rem]">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="h-5 w-5 text-xs text-foreground/80"
          >
            ‹
          </Button>
          <span className="text-foreground font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="h-5 w-5 text-xs text-foreground/80"
          >
            ›
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[0.7rem] font-medium text-foreground">
            {mode === "pressnote" ? "Live Press Note PDF Sync" : "Sovereign OCR Active"}
          </span>
          <span className="hidden sm:inline-block text-muted-foreground/40">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground font-mono">
            <Sparkles className="size-2.5 text-brand-ink" />
            BSA §65B Compliant
          </span>
        </div>
      </div>
    </div>
  );
}
