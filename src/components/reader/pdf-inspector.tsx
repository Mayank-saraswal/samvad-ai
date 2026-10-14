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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PdfInspectorProps {
  documentTitle: string;
  fileUrl?: string;
  activeLocator?: string | null;
  className?: string;
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
}: PdfInspectorProps): React.JSX.Element {
  const [zoom, setZoom] = React.useState(100);
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = 1;
  const [selectedParaLocator, setSelectedParaLocator] = React.useState<string | null>(
    activeLocator ?? "LOC-P1",
  );

  React.useEffect(() => {
    if (activeLocator) {
      setSelectedParaLocator(activeLocator);
    }
  }, [activeLocator]);

  const isPdf = fileUrl ? fileUrl.toLowerCase().includes(".pdf") : false;

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-soft",
        className,
      )}
    >
      {/* Top Floating Toolbar */}
      <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 border-b border-border/70 bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-7 place-items-center rounded-lg bg-foreground/5 text-foreground shrink-0 border border-border/60">
            <FileText className="size-3.5 text-foreground" />
          </span>
          <span className="font-display text-sm font-semibold truncate max-w-[180px] sm:max-w-xs text-foreground tracking-tight">
            {documentTitle || "Evidence Document"}
          </span>
          {activeLocator && (
            <Badge variant="brand" className="text-[10px] py-0.5 px-2 font-mono shrink-0">
              Locator: {activeLocator}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom controls matching Loreline */}
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
            <span className="text-[0.7rem] font-mono px-2 text-foreground font-semibold select-none min-w-[3rem] text-center">
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

          {fileUrl && (
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => window.open(fileUrl, "_blank")}
              aria-label="Open in new tab"
              className="h-7 w-7 rounded-lg"
            >
              <ExternalLink className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Viewer Viewport with Canvas Background & Dot Grid */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-canvas relative dot-grid select-none min-h-[380px]">
        {/* Loreline Reading State Aura around Paper Viewport */}
        {activeLocator && (
          <div className="pdf-reading-state-aura" data-reading-aura="inspecting" aria-hidden="true">
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
          className="transition-transform duration-200 origin-top shadow-float rounded-2xl overflow-hidden bg-reader-paper text-reader-ink border border-reader-ink/10 relative z-10 w-full max-w-[620px]"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {fileUrl ? (
            <div>
              {isPdf ? (
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  className="w-full h-[620px] border-none"
                  title="Document PDF preview"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl}
                  alt="Case Evidence Document"
                  className="w-full max-h-[620px] object-contain rounded-lg"
                />
              )}
            </div>
          ) : (
            /* Authentic Sovereign State Case Record Paper (Loreline-Styled Document) */
            <div className="reader-paper p-5 sm:p-7 space-y-4">
              {/* Sovereign Official Header */}
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

              {/* Title & Case Meta */}
              <div className="text-center pt-1 pb-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-reader-muted">
                  Primary Incident & Evidence Deposition
                </p>
                <h3 className="font-display text-base sm:text-lg font-bold text-reader-ink mt-0.5 tracking-tight">
                  {documentTitle || "First Information Report Extract"}
                </h3>
                <p className="font-mono text-[10px] text-reader-muted mt-1">
                  Reference: FIR-402/2026/CYBER • Merkle Root: 4f8a9e2d...01c4
                </p>
              </div>

              {/* Document Paragraphs with Interactive Citation Locators */}
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
                      {/* Locator tag pill */}
                      <div className="flex items-center justify-between font-mono text-[10px] text-reader-muted mb-1">
                        <span className="font-bold text-reader-ink">
                          [{para.locator}] {para.label}
                        </span>
                        <span className="text-[9px] opacity-80">{para.statute}</span>
                      </div>
                      <p>{para.text}</p>

                      {/* Glowing Inspection Target Indicator */}
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

              {/* Paper Footnote & Sovereign Certification Stamp */}
              <div className="pt-3 border-t border-dashed border-reader-ink/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-reader-muted">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-600 inline-block" />
                  <span>Verified Sovereign Evidence Vault • SHA-256 Validated</span>
                </div>
                <span className="text-[9px] text-reader-muted/80">
                  Page 1 of 1 • Signed under Indian Evidence Act
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground">
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
            Sovereign Mistral OCR Active
          </span>
          <span className="hidden sm:inline-block text-muted-foreground/40">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground font-mono">
            <Sparkles className="size-2.5 text-brand-ink" />
            Merkle Anchored
          </span>
        </div>
      </div>
    </div>
  );
}
