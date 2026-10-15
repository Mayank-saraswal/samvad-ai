import { describe, expect, it } from "vitest";
import { fetchAudioBytes, transcribeAudioFromStorage, type AudioObjectStore } from "./audio-source";
import { createFakeTranscriber } from "./sarvam";
import { ok } from "@/lib/result/result";

function storeWith(opts: {
  head: { sizeBytes: number; contentType: string | null } | null;
  bytes?: Uint8Array;
  headThrows?: boolean;
}): AudioObjectStore {
  return {
    head: async () => {
      if (opts.headThrows) throw new Error("boom");
      return opts.head;
    },
    getBytes: async () => opts.bytes ?? new Uint8Array([1, 2, 3]),
  };
}

const PREFIX = "tenants/t1/docs/d1/";
const KEY = `${PREFIX}source.mp3`;

describe("fetchAudioBytes", () => {
  it("returns bytes for a valid audio key", async () => {
    const res = await fetchAudioBytes(
      storeWith({ head: { sizeBytes: 3, contentType: "audio/mpeg" } }),
      KEY,
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("ok");
  });

  it("rejects keys outside the tenant prefix", async () => {
    const res = await fetchAudioBytes(
      storeWith({ head: { sizeBytes: 3, contentType: "audio/mpeg" } }),
      "tenants/evil/docs/d1/source.mp3",
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("error");
  });

  it("rejects non-audio extensions", async () => {
    const res = await fetchAudioBytes(
      storeWith({ head: { sizeBytes: 3, contentType: "audio/mpeg" } }),
      `${PREFIX}source.exe`,
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("error");
  });

  it("returns not-found when head is null", async () => {
    const res = await fetchAudioBytes(storeWith({ head: null }), KEY, { expectedPrefix: PREFIX });
    expect(res.status).toBe("error");
    if (res.status === "error") expect(res.error.kind).toBe("not-found");
  });

  it("rejects oversize objects at head time without downloading", async () => {
    let downloaded = false;
    const store: AudioObjectStore = {
      head: async () => ({ sizeBytes: 100 * 1024 * 1024, contentType: "audio/mpeg" }),
      getBytes: async () => {
        downloaded = true;
        return new Uint8Array([1]);
      },
    };
    const res = await fetchAudioBytes(store, KEY, { expectedPrefix: PREFIX });
    expect(res.status).toBe("error");
    if (res.status === "error") expect(res.error.kind).toBe("too-large");
    expect(downloaded).toBe(false);
  });

  it("rejects unexpected content types", async () => {
    const res = await fetchAudioBytes(
      storeWith({ head: { sizeBytes: 3, contentType: "application/pdf" } }),
      KEY,
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("error");
  });
});

describe("transcribeAudioFromStorage", () => {
  it("transcribes fetched bytes and passes fileName through", async () => {
    let seenName = "";
    const fake = createFakeTranscriber((input) => {
      seenName = input.fileName ?? "";
      return ok({ transcript: "two arrests made", languageCode: "hi-IN" });
    });
    const res = await transcribeAudioFromStorage(
      storeWith({ head: { sizeBytes: 3, contentType: "audio/mpeg" } }),
      fake,
      KEY,
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("ok");
    expect(seenName).toContain(".mp3");
  });

  it("rejects empty transcripts", async () => {
    const fake = createFakeTranscriber(() => ok({ transcript: "   " }));
    const res = await transcribeAudioFromStorage(
      storeWith({ head: { sizeBytes: 3, contentType: "audio/mpeg" } }),
      fake,
      KEY,
      { expectedPrefix: PREFIX },
    );
    expect(res.status).toBe("error");
  });
});
