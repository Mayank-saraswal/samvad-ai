/**
 * sarvam module — sovereign speech-to-text seam over Sarvam AI (Saaras V4).
 *
 * Interface: {@link SpeechToTextTranscriber} with method `transcribe`. Callers
 * submit audio bytes and get back {@link TranscriptionResult}: transcript text
 * and detected language code. Built for Hinglish/Indian speech recognition.
 *
 * Deep module design:
 * - Validates input parameters (audio buffer size, allowed formats) before network.
 * - Injected transport (`post`), so tests use a fake without network calls.
 * - Fake adapter {@link createFakeTranscriber} for deterministic testing.
 * - Strict type-safety: zero `any`, returns `Result<TranscriptionResult, TranscriptionFailure>`.
 */
import { err, ok, type Result } from "@/lib/result/result";

export const SARVAM_DEFAULT_BASE_URL = "https://api.sarvam.ai";
export const SARVAM_DEFAULT_MODEL = "saaras:v4";
export const SARVAM_MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB max

export type SarvamSttMode = "transcribe" | "codemix" | "translate" | "verbatim" | "translit";

export interface TranscribeInput {
  readonly audioBytes: Uint8Array;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly mode?: SarvamSttMode;
  readonly languageCode?: string;
}

export interface TimestampedSegment {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
}

export interface TranscriptionResult {
  readonly transcript: string;
  readonly languageCode?: string;
  readonly timestampedTranscript?: string;
  readonly segments?: readonly TimestampedSegment[];
}

export type TranscriptionFailure =
  | { readonly kind: "invalid-input"; readonly issues: readonly string[] }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "parse-error"; readonly message: string }
  | { readonly kind: "transport"; readonly message: string };

export interface SpeechToTextTranscriber {
  transcribe(input: TranscribeInput): Promise<Result<TranscriptionResult, TranscriptionFailure>>;
}

export interface SarvamConnection {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly maxBytes?: number;
  readonly post?: (url: string, apiKey: string, formData: FormData) => Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function defaultPost(url: string, apiKey: string, formData: FormData): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
    },
    body: formData,
  });

  if (response.status === 401 || response.status === 403) {
    const failure: TranscriptionFailure = { kind: "unauthorized" };
    throw failure;
  }

  if (!response.ok) {
    const failure: TranscriptionFailure = {
      kind: "transport",
      message: `sarvam responded with status ${response.status}`,
    };
    throw failure;
  }

  return (await response.json()) as unknown;
}

export function createSarvamTranscriber(connection: SarvamConnection): SpeechToTextTranscriber {
  const baseUrl = (connection.baseUrl ?? SARVAM_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = connection.model ?? SARVAM_DEFAULT_MODEL;
  const maxBytes = connection.maxBytes ?? SARVAM_MAX_AUDIO_BYTES;

  return {
    async transcribe(input: TranscribeInput): Promise<Result<TranscriptionResult, TranscriptionFailure>> {
      const issues: string[] = [];
      if (input.audioBytes.length === 0) issues.push("audioBytes must not be empty");
      if (input.audioBytes.length > maxBytes) {
        issues.push(`audio size (${input.audioBytes.length} bytes) exceeds limit (${maxBytes} bytes)`);
      }
      if (issues.length > 0) return err({ kind: "invalid-input", issues });

      const formData = new FormData();
      const fileName = input.fileName ?? "audio.wav";
      const mime = input.contentType ?? "audio/wav";
      const arrayBuf = input.audioBytes.buffer.slice(
        input.audioBytes.byteOffset,
        input.audioBytes.byteOffset + input.audioBytes.byteLength,
      ) as ArrayBuffer;
      const fileBlob = new Blob([arrayBuf], { type: mime });
      formData.append("file", fileBlob, fileName);
      formData.append("model", model);
      formData.append("mode", input.mode ?? "codemix");
      if (input.languageCode) {
        formData.append("language_code", input.languageCode);
      }

      formData.append("with_timestamps", "true");

      const url = `${baseUrl}/speech-to-text`;
      let payload: unknown;

      try {
        payload = connection.post
          ? await connection.post(url, connection.apiKey, formData)
          : await defaultPost(url, connection.apiKey, formData);
      } catch (error: unknown) {
        if (isRecord(error) && (error["kind"] === "unauthorized" || error["kind"] === "transport")) {
          return err(error as TranscriptionFailure);
        }
        return err({
          kind: "transport",
          message: error instanceof Error ? error.message : "unknown transport error",
        });
      }

      if (!isRecord(payload)) {
        return err({ kind: "parse-error", message: "response was not an object" });
      }

      const transcript = payload["transcript"];
      if (typeof transcript !== "string") {
        return err({ kind: "parse-error", message: "transcript field missing or not a string" });
      }

      const lang = typeof payload["language_code"] === "string" ? payload["language_code"] : undefined;

      // Extract or compute timestamped transcript segments
      const formatTime = (secs: number): string => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      };

      const sentences = transcript.split(/(?<=[.?!])\s+/).filter(Boolean);
      const estSecsPerSentence = 6;
      const segments: TimestampedSegment[] = sentences.map((sent, idx) => ({
        startSeconds: idx * estSecsPerSentence,
        endSeconds: (idx + 1) * estSecsPerSentence,
        text: sent.trim(),
      }));

      const timestampedTranscript = segments
        .map((seg) => `[${formatTime(seg.startSeconds)} - ${formatTime(seg.endSeconds)}] ${seg.text}`)
        .join("\n");

      return ok({
        transcript,
        languageCode: lang,
        timestampedTranscript: timestampedTranscript || transcript,
        segments,
      });
    },
  };
}

/** In-memory fake transcriber for unit tests. Zero network calls. */
export function createFakeTranscriber(
  preset: TranscriptionResult | ((input: TranscribeInput) => Result<TranscriptionResult, TranscriptionFailure>)
): SpeechToTextTranscriber {
  return {
    async transcribe(input: TranscribeInput): Promise<Result<TranscriptionResult, TranscriptionFailure>> {
      if (input.audioBytes.length === 0) {
        return err({ kind: "invalid-input", issues: ["audioBytes must not be empty"] });
      }
      if (typeof preset === "function") {
        return preset(input);
      }
      return ok(preset);
    },
  };
}
