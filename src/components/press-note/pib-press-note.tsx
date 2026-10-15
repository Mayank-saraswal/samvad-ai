"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPibPressNote,
  ENGLISH_PIB_PHRASES,
  renderPibHtml,
  type PibPhrases,
  type PibPressNoteInput,
} from "@/lib/press-note/pib";
import { isErr } from "@/lib/result/result";
import { cn } from "@/lib/utils";

interface PibPressNoteProps {
  input: PibPressNoteInput;
  /** Display wording pack (injected at runtime; defaults to English). */
  phrases?: PibPhrases;
  /** When set, shows a Download .pdf button hitting the server-rendered PDF. */
  pdfUrl?: string;
  className?: string;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 60) : "press-note";
}

export function PibPressNote({ input, phrases = ENGLISH_PIB_PHRASES, pdfUrl, className }: PibPressNoteProps): React.JSX.Element {
  const built = React.useMemo(() => buildPibPressNote(input), [input]);

  const html = React.useMemo(() => {
    if (isErr(built)) return null;
    const body = renderPibHtml(built.value, phrases);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>Press Note</title></head><body style="margin:0;">${body}</body></html>`;
  }, [built, phrases]);

  function handlePrint(): void {
    window.print();
  }

  function handleDownload(): void {
    if (html === null) return;
    const title = isErr(built) ? "press-note" : slugify(built.value.titleEn);
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isErr(built)) {
    return (
      <div className={cn("rounded-xl border border-destructive/40 bg-destructive/5 p-4", className)}>
        <p className="text-sm font-semibold text-destructive">Invalid press-note input</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {built.error.issues.map((issue, index) => (
            <li key={`${issue.field}-${String(index)}`}>
              <span className="font-mono font-semibold">{issue.field}</span>: {issue.reason}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="no-print flex items-center justify-end gap-2">
        <Button variant="outline" size="xs" onClick={handlePrint} className="gap-1.5 text-[11px]">
          <Printer className="size-3" />
          Print
        </Button>
        {pdfUrl && (
          <a href={pdfUrl} download>
            <Button variant="outline" size="xs" className="gap-1.5 text-[11px]">
              <Download className="size-3" />
              Download .pdf
            </Button>
          </a>
        )}
        <Button variant="outline" size="xs" onClick={handleDownload} className="gap-1.5 text-[11px]">
          <Download className="size-3" />
          Download .html
        </Button>
      </div>
      <div
        className="overflow-auto rounded-xl border border-border/70 bg-white"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    </div>
  );
}
