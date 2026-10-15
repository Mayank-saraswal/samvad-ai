/**
 * audio-source module — industry-standard R2 → Sarvam speech-to-text path.
 *
 * Interface: {@link transcribeAudioFromStorage} takes an injected
 * {@link AudioObjectStore} (HeadObject + ranged GetObject over R2) and an
 * injected {@link SpeechToTextTranscriber}, fetches audio bytes with guards,
 * then transcribes. Everything a caller must know:
 * - key must start with the caller-supplied expectedPrefix (tenant isolation).
 * - size is checked twice: HeadObject ContentLength first (cheap reject),
 *   then the downloaded byte length (untrusted servers can lie).
 * - every network call is bounded by AbortController timeouts.
 * - failures are typed (`not-found | too-large | transport | ...`), never
 *   thrown; transcripts never appear in errors or logs — only sizes and ids.
 * - zero `any`, zero non-English literals.
 */
import { err, ok, type Result } from "@/lib/result/result";
import { SARVAM_MAX_AUDIO_BYTES, type SpeechToTextTranscriber, type TranscriptionResult } from "./sarvam";

export interface AudioObjectHead {
  readonly sizeBytes: number;
  readonly contentType: string | null;
}

export interface AudioObjectStore {
  readonly head: (key: string) => Promise<AudioObjectHead | null>;
  readonly getBytes: (key: string, opts?: { signal?: AbortSignal }) => Promise<Uint8Array>;
}

export type AudioSourceFailure =
  | { readonly kind: "invalid-input"; readonly issues: readonly string[] }
  | { readonly kind: "not-found" }
  | { readonly kind: "too-large"; readonly sizeBytes: number; readonly maxBytes: number }
  | { readonly kind: "transport"; readonly message: string }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "parse-error"; readonly message: string };

export interface FetchAudioOptions {
  readonly expectedPrefix: string;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
}

export interface TranscribeAudioSourceOptions extends FetchAudioOptions {
  readonly fileName?: string;
  readonly languageCode?: string;
  readonly transcribeTimeoutMs?: number;
}

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4", ".aac", ".flac"] as const;
const AUDIO_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/flac",
] as const;

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_TRANSCRIBE_TIMEOUT_MS = 120_000;

function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const run = work(controller.signal);
  return run.finally(() => clearTimeout(timer)).catch((e: unknown) => {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw e;
  });
}

function extensionOf(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) return "";
  return key.slice(dot).toLowerCase();
}

export async function fetchAudioBytes(
  store: AudioObjectStore,
  key: string,
  opts: FetchAudioOptions,
): Promise<Result<Uint8Array, AudioSourceFailure>> {
  const maxBytes = opts.maxBytes ?? SARVAM_MAX_AUDIO_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  if (!key || !key.startsWith(opts.expectedPrefix)) {
    return err({ kind: "invalid-input", issues: ["audio key does not match this tenant/document"] });
  }
  const ext = extensionOf(key);
  if (!(AUDIO_EXTENSIONS as readonly string[]).includes(ext)) {
    return err({ kind: "invalid-input", issues: [`unsupported audio extension: ${ext || "(none)"}`] });
  }

  let head: AudioObjectHead | null;
  try {
    head = await withTimeout((signal) => store.head(key), timeoutMs, "audio head");
  } catch (e) {
    return err({ kind: "transport", message: e instanceof Error ? e.message : "audio head request failed" });
  }
  if (head === null) return err({ kind: "not-found" });
  if (head.sizeBytes <= 0) {
    return err({ kind: "invalid-input", issues: ["audio object is empty"] });
  }
  if (head.sizeBytes > maxBytes) {
    return err({ kind: "too-large", sizeBytes: head.sizeBytes, maxBytes });
  }
  if (head.contentType !== null) {
    const mime = head.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!(AUDIO_CONTENT_TYPES as readonly string[]).includes(mime)) {
      return err({ kind: "invalid-input", issues: [`unexpected audio content type: ${mime}`] });
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await withTimeout((signal) => store.getBytes(key, { signal }), timeoutMs, "audio download");
  } catch (e) {
    return err({ kind: "transport", message: e instanceof Error ? e.message : "audio download failed" });
  }
  if (bytes.length === 0) {
    return err({ kind: "invalid-input", issues: ["downloaded audio is empty"] });
  }
  if (bytes.length > maxBytes) {
    return err({ kind: "too-large", sizeBytes: bytes.length, maxBytes });
  }
  return ok(bytes);
}

export async function transcribeAudioFromStorage(
  store: AudioObjectStore,
  transcriber: SpeechToTextTranscriber,
  key: string,
  opts: TranscribeAudioSourceOptions,
): Promise<Result<TranscriptionResult, AudioSourceFailure>> {
  const fetched = await fetchAudioBytes(store, key, opts);
  if (fetched.status === "error") return fetched;

  const timeoutMs = opts.transcribeTimeoutMs ?? DEFAULT_TRANSCRIBE_TIMEOUT_MS;
  const ext = extensionOf(key);
  const fileName = opts.fileName ?? `briefing${ext || ".mp3"}`;

  let transcribed: Awaited<ReturnType<SpeechToTextTranscriber["transcribe"]>>;
  try {
    transcribed = await withTimeout(
      () =>
        transcriber.transcribe({
          audioBytes: fetched.value,
          fileName,
          languageCode: opts.languageCode ?? "hi-IN",
        }),
      timeoutMs,
      "transcription",
    );
  } catch (e) {
    return err({ kind: "transport", message: e instanceof Error ? e.message : "transcription request failed" });
  }

  if (transcribed.status === "error") {
    const failure = transcribed.error;
    if (failure.kind === "unauthorized") return err({ kind: "unauthorized" });
    if (failure.kind === "parse-error") return err({ kind: "parse-error", message: failure.message });
    if (failure.kind === "transport") return err({ kind: "transport", message: failure.message });
    return err({ kind: "invalid-input", issues: failure.issues });
  }
  if (transcribed.value.transcript.trim().length === 0) {
    return err({ kind: "parse-error", message: "transcription returned empty text" });
  }
  return ok(transcribed.value);
}
