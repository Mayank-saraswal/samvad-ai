import { describe, expect, test } from "vitest";
import { isErr, isOk } from "@/lib/result/result";
import {
  createFakeTranscriber,
  createSarvamTranscriber,
  type TranscriptionResult,
} from "./sarvam";

describe("sarvam speech-to-text module", () => {
  test("validates audio buffer before calling network", async () => {
    let called = false;
    const transcriber = createSarvamTranscriber({
      apiKey: "dummy-key",
      maxBytes: 100,
      post: async () => {
        called = true;
        return {};
      },
    });

    const empty = await transcriber.transcribe({ audioBytes: new Uint8Array(0) });
    expect(isErr(empty)).toBe(true);
    if (isErr(empty)) {
      expect(empty.error.kind).toBe("invalid-input");
    }

    const oversize = await transcriber.transcribe({ audioBytes: new Uint8Array(200) });
    expect(isErr(oversize)).toBe(true);
    if (isErr(oversize)) {
      expect(oversize.error.kind).toBe("invalid-input");
    }

    expect(called).toBe(false);
  });

  test("parses successful transcript response", async () => {
    const transcriber = createSarvamTranscriber({
      apiKey: "dummy-key",
      post: async (_url, apiKey, formData) => {
        expect(apiKey).toBe("dummy-key");
        expect(formData.get("model")).toBe("saaras:v4");
        expect(formData.get("mode")).toBe("codemix");
        return {
          transcript: "FIR number 12 registered at cyber crime police station.",
          language_code: "en-IN",
        };
      },
    });

    const res = await transcriber.transcribe({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      fileName: "incident-briefing.wav",
    });

    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.value.transcript).toBe("FIR number 12 registered at cyber crime police station.");
      expect(res.value.languageCode).toBe("en-IN");
    }
  });

  test("handles missing transcript with parse-error", async () => {
    const transcriber = createSarvamTranscriber({
      apiKey: "dummy-key",
      post: async () => ({ wrongField: "something" }),
    });

    const res = await transcriber.transcribe({
      audioBytes: new Uint8Array([1, 2, 3]),
    });

    expect(isErr(res)).toBe(true);
    if (isErr(res)) {
      expect(res.error.kind).toBe("parse-error");
    }
  });

  test("fake transcriber works deterministically offline", async () => {
    const preset: TranscriptionResult = {
      transcript: "Station officer briefing audio transcript",
      languageCode: "hi-IN",
    };
    const fake = createFakeTranscriber(preset);
    const res = await fake.transcribe({ audioBytes: new Uint8Array([1, 2, 3]) });

    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.value).toEqual(preset);
    }
  });

  test("generates timestamped transcript segments for audio depositions", async () => {
    const transcriber = createSarvamTranscriber({
      apiKey: "dummy-key",
      post: async () => ({
        transcript: "Accused was apprehended at transit checkpost. Forty seven mobile devices recovered.",
        language_code: "en-IN",
      }),
    });

    const res = await transcriber.transcribe({
      audioBytes: new Uint8Array([1, 2, 3]),
    });

    expect(isOk(res)).toBe(true);
    if (isOk(res)) {
      expect(res.value.timestampedTranscript).toContain("[00:00 - 00:06]");
      expect(res.value.segments).toBeDefined();
      expect(res.value.segments!.length).toBeGreaterThan(0);
    }
  });
});
