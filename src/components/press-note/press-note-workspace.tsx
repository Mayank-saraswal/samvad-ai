"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Download,
  FileText,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Printer,
  ScanText,
  Sparkles,
  Database,
  CircleAlert,
  ShieldCheck,
  Table,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DirectUploadDropzone } from "@/components/dossier/direct-upload-dropzone";
import { PibPressNote } from "@/components/press-note/pib-press-note";
import type { PibFigure, PibPressNoteInput, PibTable } from "@/lib/press-note/pib";
import { approveDocumentAction, saveRevisionAction, uploadFigureAction } from "@/app/actions";

type StageStatus = "pending" | "indexing" | "ready" | "skipped" | "failed";

const STAGE_LABEL: Record<StageStatus, string> = {
  pending: "Queued",
  indexing: "Working…",
  ready: "Done",
  skipped: "Skipped",
  failed: "Failed",
};

interface PressStatus {
  doc: {
    id: string;
    tenantId: string;
    title: string;
    status: string;
    sources: readonly { id: string; kind: string; r2Key: string | null }[];
    revisionsCount: number;
    latestRevisionNumber: number;
  };
  pib: PibPressNoteInput | null;
  pipeline: Record<"ocr" | "stt" | "facts" | "draft", StageStatus> & {
    percent: number;
    detail?: Partial<Record<"ocr" | "stt" | "facts" | "draft", string>>;
  };
}

const STAGES = [
  { key: "ocr", label: "Reading documents", icon: ScanText },
  { key: "stt", label: "Transcribing audio", icon: FileText },
  { key: "facts", label: "Verifying facts", icon: Database },
  { key: "draft", label: "Writing press note", icon: Sparkles },
] as const;

/**
 * FigureManager — upload graphs/photos and attach them to the press note as
 * numbered Figure annexures. Files go to R2 under figures/; only the
 * caption + storage URL enter the revision.
 */
function FigureManager({
  documentId,
  tenantId,
  figures,
  onChange,
}: {
  documentId: string;
  tenantId: string;
  figures: readonly PibFigure[];
  onChange: (next: PibFigure[]) => void;
}): React.JSX.Element {
  const [caption, setCaption] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    if (!caption.trim()) {
      setError("Write a caption first — every figure needs one.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("tenantId", tenantId);
      fd.set("documentId", documentId);
      fd.set("caption", caption.trim());
      fd.set("file", file);
      const res = await uploadFigureAction(fd);
      if (!res.success || !res.data) throw new Error(res.error ?? "Figure upload failed");
      onChange([...figures, { id: res.data.id, caption: res.data.caption, imageUrl: res.data.imageUrl, alt: null }]);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Figure upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-3.5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Figures & graphs ({figures.length}/8)
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Figure caption, e.g. Seizure tally by station"
          aria-label="Figure caption"
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button variant="outline" size="sm" disabled={uploading || figures.length >= 8} onClick={() => fileRef.current?.click()} className="gap-1.5">
          {uploading ? <LoaderCircle className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {uploading ? "Uploading…" : "Insert image"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {figures.map((fig, i) => (
        <div key={fig.id} className="flex items-center gap-3 rounded-lg border bg-card p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fig.imageUrl} alt={fig.caption} className="size-14 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] text-muted-foreground">Figure {i + 1}</p>
            <Input
              value={fig.caption}
              onChange={(e) => {
                const next = [...figures];
                next[i] = { ...fig, caption: e.target.value };
                onChange(next);
              }}
              aria-label={`Figure ${i + 1} caption`}
              className="h-8 text-xs"
            />
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove figure ${i + 1}`} onClick={() => onChange(figures.filter((f) => f.id !== fig.id))}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * TableManager — build data tables cell by cell; rendered as numbered
 * Table annexures in the PDF.
 */
function TableManager({
  tables,
  onChange,
}: {
  tables: readonly PibTable[];
  onChange: (next: PibTable[]) => void;
}): React.JSX.Element {
  function addTable() {
    if (tables.length >= 6) return;
    onChange([
      ...tables,
      {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tbl-${Date.now()}`,
        caption: "Untitled table",
        headers: ["Column 1", "Column 2"],
        rows: [["", ""]],
      },
    ]);
  }

  return (
    <div className="space-y-3 rounded-xl border p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Data tables ({tables.length}/6)
        </p>
        <Button variant="outline" size="sm" disabled={tables.length >= 6} onClick={addTable} className="gap-1.5">
          <Table className="size-3.5" /> Insert table
        </Button>
      </div>
      {tables.map((table, ti) => (
        <div key={table.id} className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] text-muted-foreground">Table {ti + 1}</p>
            <Input
              value={table.caption}
              onChange={(e) => {
                const next = [...tables];
                next[ti] = { ...table, caption: e.target.value };
                onChange(next);
              }}
              aria-label={`Table ${ti + 1} caption`}
              className="h-8 flex-1 text-xs"
            />
            <Button variant="ghost" size="icon-sm" aria-label={`Remove table ${ti + 1}`} onClick={() => onChange(tables.filter((t) => t.id !== table.id))}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {table.headers.map((h, ci) => (
                    <th key={ci} className="border bg-muted/60 p-1">
                      <input
                        value={h}
                        onChange={(e) => {
                          const next = [...tables];
                          const headers = [...table.headers];
                          headers[ci] = e.target.value;
                          next[ti] = { ...table, headers };
                          onChange(next);
                        }}
                        aria-label={`Header ${ci + 1}`}
                        className="w-full min-w-20 bg-transparent font-semibold outline-none"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border p-1">
                        <input
                          value={cell}
                          onChange={(e) => {
                            const next = [...tables];
                            const rows = table.rows.map((r) => [...r]);
                            const target = rows[ri];
                            if (target) target[ci] = e.target.value;
                            next[ti] = { ...table, rows };
                            onChange(next);
                          }}
                          aria-label={`Row ${ri + 1} column ${ci + 1}`}
                          className="w-full min-w-20 bg-transparent outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              disabled={table.rows.length >= 20}
              onClick={() => {
                const next = [...tables];
                next[ti] = { ...table, rows: [...table.rows, table.headers.map(() => "")] };
                onChange(next);
              }}
            >
              + Row
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              disabled={table.headers.length >= 8}
              onClick={() => {
                const next = [...tables];
                next[ti] = {
                  ...table,
                  headers: [...table.headers, `Column ${table.headers.length + 1}`],
                  rows: table.rows.map((r) => [...r, ""]),
                };
                onChange(next);
              }}
            >
              + Column
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              disabled={table.rows.length <= 1}
              onClick={() => {
                const next = [...tables];
                next[ti] = { ...table, rows: table.rows.slice(0, -1) };
                onChange(next);
              }}
            >
              − Row
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Press workspace — the only screen the officer needs. Three states:
 * 1. upload evidence 2. generating (background AI pipelines) 3. final
 * editable press-note PDF. Internal machinery (locators, fact matrix,
 * audit trail, vector details) is intentionally not rendered here.
 */
export function PressNoteWorkspace({
  documentId,
  canApprove = false,
}: {
  documentId: string;
  canApprove?: boolean;
}): React.JSX.Element {
  const [data, setData] = React.useState<PressStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [attested, setAttested] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [form, setForm] = React.useState<PibPressNoteInput | null>(null);
  const autoStarted = React.useRef(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/press/${documentId}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as PressStatus;
      setData((prev) => {
        if (json.pib && !form && !prev?.pib) setForm(json.pib);
        return json;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load press note");
    }
  }, [documentId, form]);

  React.useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Auto-start the combined pipeline exactly once per fresh dossier.
  React.useEffect(() => {
    if (!data || data.pib || data.doc.sources.length === 0 || autoStarted.current) return;
    autoStarted.current = true;
    void (async () => {
      try {
        await fetch(`/api/press/${documentId}/pipeline`, { method: "POST" });
      } catch {
        // Polling surfaces the failure state; never throw.
      } finally {
        await fetchStatus();
      }
    })();
  }, [data, documentId, fetchStatus]);

  // Poll every 2s while generating.
  React.useEffect(() => {
    if (!data || data.pib) return;
    if (data.doc.sources.length === 0) return;
    const t = setInterval(() => void fetchStatus(), 2000);
    return () => clearInterval(t);
  }, [data, fetchStatus]);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/press/${documentId}/pipeline`, { method: "POST" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Pipeline ${res.status}`);
      setEditing(false);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveEdits() {
    if (!form || !data) return;
    setSaving(true);
    try {
      const res = await saveRevisionAction({
        documentId: data.doc.id,
        revisionNumber: data.doc.revisionsCount + 1,
        reason: "Officer edit from press workspace",
        diff: { pib: form },
        bundleSnapshot: { pib: form },
      });
      if (!res.success) throw new Error(res.error ?? "Save failed");
      setEditing(false);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!data || !attested) return;
    setApproving(true);
    try {
      const res = await approveDocumentAction({
        documentId: data.doc.id,
        tenantId: data.doc.tenantId,
        attestationConfirmed: true,
      });
      if (!res.success) throw new Error(res.error ?? "Approval failed");
      setApproveOpen(false);
      setAttested(false);
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  }

  const pib = form ?? data?.pib ?? null;
  const percent = data?.pipeline.percent ?? 5;
  const isGenerating = Boolean(data && !data.pib && data.doc.sources.length > 0);
  const isUploadState = Boolean(data && data.doc.sources.length === 0);
  const isApproved = data?.doc.status === "approved";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dossiers">
            <Button variant="ghost" size="icon-sm" aria-label="Back to dossiers">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <p className="truncate text-sm font-semibold">{data?.doc.title ?? "Press note"}</p>
          {isApproved ? (
            <Badge variant="sage" className="gap-1 text-[10px]">
              <ShieldCheck className="size-3" /> Approved
            </Badge>
          ) : (
            data && (
              <Badge variant="gold" className="text-[10px]">
                Draft
              </Badge>
            )
          )}
        </div>
        {pib && !isGenerating && (
          <div className="flex items-center gap-1.5">
            {!isApproved && (
              <Button variant="ghost" size="sm" onClick={() => setShowUpload((v) => !v)} className="gap-1.5">
                <Upload className="size-3.5" /> {showUpload ? "Hide upload" : "Add evidence"}
              </Button>
            )}
            {!isApproved && (
              <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)} className="gap-1.5">
                <Pencil className="size-3.5" /> {editing ? "Preview" : "Edit PDF"}
              </Button>
            )}
            {canApprove && !isApproved && (
              <Button variant="default" size="sm" onClick={() => setApproveOpen(true)} className="gap-1.5">
                <ShieldCheck className="size-3.5" /> Approve & Seal
              </Button>
            )}
            <Button variant={canApprove && !isApproved ? "outline" : "default"} size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="size-3.5" /> Print
            </Button>
            <a href={`/api/press/${documentId}/pdf`} download>
              <Button variant="default" size="sm" className="gap-1.5">
                <Download className="size-3.5" /> PDF
              </Button>
            </a>
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
        <div className="w-full max-w-[720px] space-y-4">
          {/* STATE 1 — upload evidence */}
          {isUploadState && data && (
            <Card>
              <CardHeader>
                <CardTitle>Upload case evidence</CardTitle>
                <CardDescription>
                  Add FIR PDFs, photos and voice briefings. The press note generates automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DirectUploadDropzone
                  documentId={documentId}
                  tenantId={data.doc.tenantId}
                  onAllComplete={() => {
                    autoStarted.current = false;
                    void fetchStatus();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* STATE 2 — generating */}
          {isGenerating && (
            <Card aria-live="polite">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
                  <LoaderCircle className="size-6 animate-spin" />
                </div>
                <CardTitle>Generating your press note…</CardTitle>
                <CardDescription>
                  Running OCR, speech-to-text, fact checks and drafting. This takes a minute — you can wait here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CloudUpload className="size-3.5" /> Overall progress
                  </span>
                  <span className="font-mono">{percent}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full animate-pulse rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="space-y-2">
                  {STAGES.map(({ key, label, icon: Icon }) => {
                    const st = (data?.pipeline[key] ?? "pending") as StageStatus;
                    const detail = data?.pipeline.detail?.[key];
                    return (
                      <div key={key} className="flex items-center gap-2.5 rounded-xl border bg-card p-3 text-xs">
                        {st === "ready" ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : st === "failed" ? (
                          <CircleAlert className="size-4 text-destructive" />
                        ) : st === "skipped" ? (
                          <span className="size-4 rounded-full border border-border" />
                        ) : (
                          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <Icon className="size-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{label}</span>
                          {detail && st !== "ready" && st !== "skipped" && (
                            <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">{STAGE_LABEL[st]}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add-evidence panel (available after first generation) */}
          {pib && !isGenerating && showUpload && data && !isApproved && (
            <Card>
              <CardHeader>
                <CardTitle>Add more evidence</CardTitle>
                <CardDescription>Upload additional files, then regenerate the press note.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DirectUploadDropzone
                  documentId={documentId}
                  tenantId={data.doc.tenantId}
                  onAllComplete={() => void fetchStatus()}
                />
                <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" className="w-full gap-1.5">
                  {regenerating ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {regenerating ? "Regenerating…" : "Regenerate press note from all evidence"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STATE 3 — final editable PDF */}
          {pib && !isGenerating && (
            editing && !isApproved ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit press note</CardTitle>
                  <CardDescription>Saving creates a new sealed revision.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={pib.titleEn} onChange={(e) => setForm({ ...pib, titleEn: e.target.value })} aria-label="Title" />
                  <Input value={pib.ministryEn} onChange={(e) => setForm({ ...pib, ministryEn: e.target.value })} aria-label="Ministry" />
                  {pib.keyFindings.map((f, i) => (
                    <Textarea
                      key={i}
                      value={f}
                      rows={2}
                      onChange={(e) => {
                        const next = [...pib.keyFindings];
                        next[i] = e.target.value;
                        setForm({ ...pib, keyFindings: next });
                      }}
                      aria-label={`Key finding ${i + 1}`}
                    />
                  ))}
                  {pib.bodyParagraphs.map((b, i) => (
                    <Textarea
                      key={i}
                      value={b}
                      rows={3}
                      onChange={(e) => {
                        const next = [...pib.bodyParagraphs];
                        next[i] = e.target.value;
                        setForm({ ...pib, bodyParagraphs: next });
                      }}
                      aria-label={`Body paragraph ${i + 1}`}
                    />
                  ))}
                  {data && (
                    <FigureManager
                      documentId={data.doc.id}
                      tenantId={data.doc.tenantId}
                      figures={pib.figures ?? []}
                      onChange={(figures) => setForm({ ...pib, figures })}
                    />
                  )}
                  <TableManager
                    tables={pib.tables ?? []}
                    onChange={(tables) => setForm({ ...pib, tables })}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdits} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setForm(data?.pib ?? null); }}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-2xl border bg-white shadow-float">
                <PibPressNote input={pib} pdfUrl={`/api/press/${documentId}/pdf`} />
              </div>
            )
          )}

          {!data && !error && (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {error && <p className="mt-3 text-center text-xs text-destructive" role="alert">{error}</p>}
        </div>
      </main>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve & seal press note</DialogTitle>
            <DialogDescription>
              Sealing locks the note permanently. Confirm every claim against primary evidence first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border p-3.5">
            <Checkbox
              id="press-attestation"
              checked={attested}
              onCheckedChange={(checked) => setAttested(checked === true)}
            />
            <label htmlFor="press-attestation" className="cursor-pointer text-xs leading-relaxed select-none">
              <strong>Mandatory attestation:</strong> I have cross-checked all casualty, crime and
              suspect claims against primary case evidence.
            </label>
          </div>
          <DialogFooter>
            <Button variant="default" disabled={!attested || approving} onClick={handleApprove} className="w-full sm:w-auto">
              {approving ? "Sealing…" : "Digitally Seal & Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
