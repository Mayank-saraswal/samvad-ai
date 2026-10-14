"use client";

import * as React from "react";
import { Upload, FileText, Music, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mintUploadTicketAction, completeUploadAction } from "@/app/actions";
import { cn } from "@/lib/utils";

interface DirectUploadDropzoneProps {
  documentId: string;
  tenantId: string;
  onUploadSuccess?: (sourceId: string, kind: string) => void;
  className?: string;
}

export function DirectUploadDropzone({
  documentId,
  tenantId,
  onUploadSuccess,
  className,
}: DirectUploadDropzoneProps): React.JSX.Element {
  const [dragOver, setDragOver] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileKind, setFileKind] = React.useState<"pdf" | "image" | "audio">("pdf");
  const [status, setStatus] = React.useState<"idle" | "minting" | "uploading" | "completing" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const detectKind = (file: File): "pdf" | "image" | "audio" => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return "pdf";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav")) return "audio";
    return "pdf";
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const kind = detectKind(file);
    setFileKind(kind);
    setStatus("idle");
    setErrorMessage(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    const first = files[0];
    if (first) {
      handleFile(first);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus("minting");
      setErrorMessage(null);
      setProgress(10);

      const parts = selectedFile.name.split(".");
      const ext = (parts.length > 1 ? parts[parts.length - 1] : "pdf")?.toLowerCase() ?? "pdf";

      // 1. Mint short-lived S3 upload ticket
      const mintRes = await mintUploadTicketAction({
        tenantId,
        documentId,
        extension: ext,
        contentType: selectedFile.type || "application/octet-stream",
        contentLengthBytes: selectedFile.size,
      });

      if (!mintRes.success || !mintRes.data) {
        setStatus("error");
        setErrorMessage(mintRes.error ?? "Failed to obtain upload ticket.");
        return;
      }

      const { uploadUrl, key } = mintRes.data;

      // 2. Direct browser-to-R2 upload
      setStatus("uploading");
      setProgress(35);

      const uploadPromise = new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", selectedFile.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 50) + 35;
            setProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage rejected upload with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network transport failure during upload."));
        xhr.send(selectedFile);
      });

      await uploadPromise;
      setProgress(90);

      // 3. Mark complete & dispatch Inngest event
      setStatus("completing");
      const completeRes = await completeUploadAction({
        tenantId,
        documentId,
        key,
        kind: fileKind,
      });

      if (!completeRes.success || !completeRes.data) {
        setStatus("error");
        setErrorMessage(completeRes.error ?? "Upload succeeded but failed to register with event pipeline.");
        return;
      }

      setProgress(100);
      setStatus("done");
      if (onUploadSuccess) {
        onUploadSuccess(completeRes.data.sourceId, fileKind);
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-card/40 text-center",
          dragOver ? "border-brand bg-brand-soft/20 scale-[1.01]" : "border-border/70 hover:border-brand/60 hover:bg-card/70",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center mb-3 shadow-xs">
          {fileKind === "audio" ? (
            <Music className="size-6 text-sky-700 dark:text-sky-400" />
          ) : (
            <FileText className="size-6 text-foreground" />
          )}
        </div>

        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {selectedFile ? selectedFile.name : "Select or drag case evidence"}
        </h3>

        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Supports FIR documents (PDF, JPG, PNG) and audio debriefs (WAV, MP3, M4A) up to 500 MB.
        </p>

        {selectedFile && (
          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <Badge variant="outline" className="font-mono text-[0.65rem]">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Badge>
            <Badge variant={fileKind === "audio" ? "sky" : "sage"} className="text-[0.65rem]">
              {fileKind.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {/* Progress Bar & Actions */}
      {selectedFile && (
        <div className="p-4 rounded-xl border border-border/70 bg-card space-y-3 shadow-soft">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-2">
              {status === "uploading" && <Loader2 className="size-3.5 animate-spin text-brand" />}
              {status === "done" && <CheckCircle2 className="size-4 text-emerald-500" />}
              {status === "error" && <AlertCircle className="size-4 text-destructive" />}
              {status === "idle" && "Ready to transmit to Cloudflare R2"}
              {status === "minting" && "Authorizing S3 Presigned Ticket..."}
              {status === "uploading" && `Uploading to R2 (${progress}%)`}
              {status === "completing" && "Registering with Inngest Fanout Pipeline..."}
              {status === "done" && "Evidence Sealed & Dispatched to AI Queues"}
              {status === "error" && (errorMessage || "Upload failed")}
            </span>
            <span className="font-mono text-muted-foreground">{progress}%</span>
          </div>

          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                status === "error" ? "bg-destructive" : status === "done" ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={status === "uploading" || status === "minting"}
              onClick={() => {
                setSelectedFile(null);
                setStatus("idle");
                setProgress(0);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={status !== "idle" && status !== "error"}
              onClick={handleUpload}
              className="gap-1.5"
            >
              <Upload className="size-3.5" /> Start Direct Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
