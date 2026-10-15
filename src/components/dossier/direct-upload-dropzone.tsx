"use client";

import * as React from "react";
import { Upload, FileText, Music, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mintUploadTicketAction, completeUploadAction } from "@/app/actions";
import { cn } from "@/lib/utils";

type FileKind = "pdf" | "image" | "audio";
type ItemStatus = "queued" | "minting" | "uploading" | "completing" | "done" | "error";

interface QueueItem {
  readonly id: string;
  readonly file: File;
  readonly kind: FileKind;
  status: ItemStatus;
  progress: number;
  error: string | null;
  sourceId: string | null;
}

interface DirectUploadDropzoneProps {
  documentId: string;
  tenantId: string;
  onUploadSuccess?: (sourceId: string, kind: string) => void;
  onAllComplete?: (results: readonly { sourceId: string; kind: string }[]) => void;
  className?: string;
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg";
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_OTHER_BYTES = 500 * 1024 * 1024;

function detectKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(name)) return "image";
  if (type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/.test(name)) return "audio";
  return null;
}

function kindIcon(kind: FileKind) {
  if (kind === "audio") return <Music className="size-4 text-sky-700 dark:text-sky-400" />;
  if (kind === "image") return <ImageIcon className="size-4 text-emerald-700 dark:text-emerald-400" />;
  return <FileText className="size-4 text-foreground" />;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function uploadOneFile(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage rejected upload with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network transport failure during upload."));
    xhr.send(file);
  });
}

export function DirectUploadDropzone({
  documentId,
  tenantId,
  onUploadSuccess,
  onAllComplete,
  className,
}: DirectUploadDropzoneProps): React.JSX.Element {
  const [dragOver, setDragOver] = React.useState(false);
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const patchItem = (id: string, patch: Partial<Pick<QueueItem, "status" | "progress" | "error" | "sourceId">>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: QueueItem[] = [];
    for (const file of arr) {
      const kind = detectKind(file);
      if (!kind) {
        next.push({
          id: `${Date.now()}-${file.name}`,
          file,
          kind: "pdf",
          status: "error",
          progress: 0,
          error: `Unsupported file type: ${file.name}`,
          sourceId: null,
        });
        continue;
      }
      const cap = kind === "pdf" ? MAX_PDF_BYTES : MAX_OTHER_BYTES;
      if (file.size > cap) {
        next.push({
          id: `${Date.now()}-${file.name}`,
          file,
          kind,
          status: "error",
          progress: 0,
          error: `${file.name}: ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds ${Math.round(cap / (1024 * 1024))} MB limit.`,
          sourceId: null,
        });
        continue;
      }
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
        file,
        kind,
        status: "queued",
        progress: 0,
        error: null,
        sourceId: null,
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const processItem = async (item: QueueItem): Promise<{ sourceId: string; kind: string } | null> => {
    try {
      patchItem(item.id, { status: "minting", progress: 5, error: null });
      const parts = item.file.name.split(".");
      const ext = (parts.length > 1 ? parts[parts.length - 1] : "bin")?.toLowerCase() ?? "bin";
      const contentType = item.file.type || "application/octet-stream";

      const mintRes = await mintUploadTicketAction({
        tenantId,
        documentId,
        extension: ext,
        contentType,
        contentLengthBytes: item.file.size,
      });
      if (!mintRes.success || !mintRes.data) {
        patchItem(item.id, { status: "error", error: mintRes.error ?? "Failed to obtain upload ticket." });
        return null;
      }

      patchItem(item.id, { status: "uploading", progress: 15 });
      await uploadOneFile(mintRes.data.uploadUrl, item.file, contentType, (pct) =>
        patchItem(item.id, { progress: 15 + Math.round(pct * 0.7) }),
      );

      patchItem(item.id, { status: "completing", progress: 90 });
      const hash = await sha256Hex(item.file);
      const completeRes = await completeUploadAction({
        tenantId,
        documentId,
        key: mintRes.data.key,
        kind: item.kind,
        sha256: hash,
      });
      if (!completeRes.success || !completeRes.data) {
        patchItem(item.id, {
          status: "error",
          error: completeRes.error ?? "Upload succeeded but pipeline registration failed.",
        });
        return null;
      }

      patchItem(item.id, { status: "done", progress: 100, sourceId: completeRes.data.sourceId });
      onUploadSuccess?.(completeRes.data.sourceId, item.kind);
      return { sourceId: completeRes.data.sourceId, kind: item.kind };
    } catch (e) {
      patchItem(item.id, { status: "error", error: e instanceof Error ? e.message : "Upload failed." });
      return null;
    }
  };

  const handleUploadAll = async () => {
    const pending = items.filter((i) => i.status === "queued" || i.status === "error");
    if (pending.length === 0 || busy) return;
    setBusy(true);
    try {
      // Route by format: OCR-able docs first, then audio — max 3 concurrent.
      const order = [...pending].sort((a, b) => {
        const rank = (k: FileKind) => (k === "pdf" || k === "image" ? 0 : 1);
        return rank(a.kind) - rank(b.kind);
      });
      const results: { sourceId: string; kind: string }[] = [];
      const CONCURRENCY = 3;
      for (let i = 0; i < order.length; i += CONCURRENCY) {
        const batch = order.slice(i, i + CONCURRENCY);
        const out = await Promise.all(batch.map((it) => processItem(it)));
        for (const r of out) if (r) results.push(r);
      }
      if (results.length > 0) onAllComplete?.(results);
    } finally {
      setBusy(false);
    }
  };

  const queuedCount = items.filter((i) => i.status === "queued").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-card/40 text-center",
          dragOver ? "border-brand bg-brand-soft/20 scale-[1.01]" : "border-border/70 hover:border-brand/60 hover:bg-card/70",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-2">
          <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center shadow-xs">
            <Upload className="size-6 text-foreground" />
          </div>
        </div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground mt-3">
          Select or drag multiple evidence files
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          FIR documents (PDF, JPG, PNG) go through OCR · audio debriefs (WAV, MP3, M4A) go through speech-to-text · PDFs up to 50 MB, others up to 500 MB.
        </p>
        {items.length > 0 && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground" aria-live="polite">
            {items.length} file(s) queued · {doneCount} sealed
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="p-3 rounded-xl border border-border/70 bg-card space-y-2 shadow-soft">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  {kindIcon(item.kind)}
                  <span className="truncate">{item.file.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-[0.65rem]">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                  <Badge variant={item.kind === "audio" ? "sky" : item.kind === "image" ? "sage" : "gold"} className="text-[0.65rem]">
                    {item.kind === "pdf" ? "PDF → OCR" : item.kind === "image" ? "IMAGE → OCR" : "AUDIO → STT"}
                  </Badge>
                  <button
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                {item.status === "uploading" && <Loader2 className="size-3.5 animate-spin text-brand" />}
                {item.status === "done" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                {item.status === "error" && <AlertCircle className="size-3.5 text-destructive" />}
                <span className="font-medium" aria-live="polite">
                  {item.status === "queued" && "Queued — will route by format"}
                  {item.status === "minting" && "Authorizing upload ticket…"}
                  {item.status === "uploading" && `Uploading to R2 (${item.progress}%)`}
                  {item.status === "completing" && "Hashing + registering pipeline…"}
                  {item.status === "done" && "Sealed & dispatched to AI queues"}
                  {item.status === "error" && (item.error ?? "Failed")}
                </span>
                <span className="ml-auto font-mono text-muted-foreground">{item.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={cn(
                    "h-full transition-all duration-300 rounded-full",
                    item.status === "error" ? "bg-destructive" : item.status === "done" ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setItems([])}>
              Clear all
            </Button>
            <Button size="sm" disabled={busy || queuedCount === 0} onClick={handleUploadAll} className="gap-1.5">
              <Upload className="size-3.5" />
              {busy ? "Uploading…" : `Start Direct Upload (${queuedCount})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
