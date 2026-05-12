// Task #186 — Testes de `autoFillFromYouTube` (Task #183).
//
// Estes testes blindam o guard "preserva valor manual": o auto-fill SÓ
// preenche cover_url/duration_seconds quando estão vazios, e devolve
// `failed=true` quando o fetch externo não traz dado utilizável.
//
// `fetchYouTubeMetadata` é injetado por parâmetro (não vai à rede).
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { autoFillFromYouTube } from "../../server/features/cms/service.js";
import type { YouTubeMetadata } from "../../server/lib/youtubeMetadata.js";

const YT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

// Constrói um objeto compatível com o retorno interno de `buildPayload`.
// Mantemos só os campos que `autoFillFromYouTube` lê/escreve — qualquer
// novo campo lido pela função vai aparecer como type-error aqui (bom).
type Payload = Parameters<typeof autoFillFromYouTube>[0];
function makePayload(overrides: Partial<Payload> = {}): Payload {
  return {
    kind: "video",
    title: "Teste",
    short_description: null,
    long_description: null,
    cover_url: null,
    segments: [],
    interests: [],
    tags: [],
    status: "draft",
    is_premium: false,
    price: 0,
    media_url: null,
    external_url: YT_URL,
    duration_seconds: null,
    transcript: null,
    hook: null,
    cta: null,
    author: null,
    pages: null,
    course_id: null,
    ...overrides,
  } as Payload;
}

function fakeFetcher(meta: YouTubeMetadata | null) {
  return async () => meta;
}

describe("autoFillFromYouTube", () => {
  it("does nothing for non-video kinds", async () => {
    const payload = makePayload({ kind: "audio" });
    const before = { ...payload };
    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "x",
        thumbnailUrl: "https://img.youtube.com/vi/x/hqdefault.jpg",
        durationSeconds: 120,
        title: "t",
      }),
    );
    assert.equal(result.attempted, false);
    assert.equal(result.coverFilled, false);
    assert.equal(result.durationFilled, false);
    assert.deepEqual(payload, before);
  });

  it("does nothing without external_url", async () => {
    const payload = makePayload({ external_url: null });
    const result = await autoFillFromYouTube(payload, fakeFetcher(null));
    assert.equal(result.attempted, false);
  });

  it("does nothing for non-YouTube external URLs", async () => {
    const payload = makePayload({ external_url: "https://vimeo.com/123456789" });
    let called = false;
    const result = await autoFillFromYouTube(payload, async () => {
      called = true;
      return null;
    });
    assert.equal(result.attempted, false);
    assert.equal(called, false, "fetcher must not be called for non-YouTube URLs");
  });

  it("fills both cover_url and duration_seconds when empty", async () => {
    const payload = makePayload();
    assert.equal(payload.cover_url, null);
    assert.equal(payload.duration_seconds, null);

    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "dQw4w9WgXcQ",
        thumbnailUrl: "https://img.example/cover.jpg",
        durationSeconds: 213,
        title: "Never Gonna Give You Up",
      }),
    );

    assert.equal(result.attempted, true);
    assert.equal(result.coverFilled, true);
    assert.equal(result.durationFilled, true);
    assert.equal(result.failed, false);
    assert.equal(payload.cover_url, "https://img.example/cover.jpg");
    assert.equal(payload.duration_seconds, 213);
  });

  it("does NOT overwrite a manually-set cover_url", async () => {
    const payload = makePayload({
      cover_url: "https://manual.example/my-cover.jpg",
    });
    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "dQw4w9WgXcQ",
        thumbnailUrl: "https://img.youtube.com/auto.jpg",
        durationSeconds: 100,
        title: "t",
      }),
    );
    assert.equal(payload.cover_url, "https://manual.example/my-cover.jpg");
    assert.equal(result.coverFilled, false);
    assert.equal(result.durationFilled, true);
    assert.equal(payload.duration_seconds, 100);
  });

  it("does NOT overwrite a manually-set duration_seconds (> 0)", async () => {
    const payload = makePayload({ duration_seconds: 999 });
    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "dQw4w9WgXcQ",
        thumbnailUrl: "https://img.youtube.com/auto.jpg",
        durationSeconds: 100,
        title: "t",
      }),
    );
    assert.equal(payload.duration_seconds, 999);
    assert.equal(result.durationFilled, false);
    assert.equal(result.coverFilled, true);
    assert.equal(payload.cover_url, "https://img.youtube.com/auto.jpg");
  });

  it("treats duration_seconds=0 as empty (auto-fills)", async () => {
    const payload = makePayload({ duration_seconds: 0 });
    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "dQw4w9WgXcQ",
        thumbnailUrl: "https://img.youtube.com/auto.jpg",
        durationSeconds: 100,
        title: "t",
      }),
    );
    assert.equal(payload.duration_seconds, 100);
    assert.equal(result.durationFilled, true);
  });

  it("does nothing when both cover and duration already set", async () => {
    const payload = makePayload({
      cover_url: "https://manual.example/cover.jpg",
      duration_seconds: 500,
    });
    let called = false;
    const result = await autoFillFromYouTube(payload, async () => {
      called = true;
      return null;
    });
    assert.equal(result.attempted, false);
    assert.equal(called, false);
    assert.equal(payload.cover_url, "https://manual.example/cover.jpg");
    assert.equal(payload.duration_seconds, 500);
  });

  it("returns failed=true when fetcher returns null", async () => {
    const payload = makePayload();
    const result = await autoFillFromYouTube(payload, fakeFetcher(null));
    assert.equal(result.attempted, true);
    assert.equal(result.failed, true);
    assert.equal(result.coverFilled, false);
    assert.equal(result.durationFilled, false);
    assert.equal(payload.cover_url, null);
    assert.equal(payload.duration_seconds, null);
  });

  it("returns failed=true when metadata is incomplete (missing duration)", async () => {
    const payload = makePayload();
    const result = await autoFillFromYouTube(
      payload,
      fakeFetcher({
        videoId: "dQw4w9WgXcQ",
        thumbnailUrl: "https://img.youtube.com/cover.jpg",
        durationSeconds: null,
        title: null,
      }),
    );
    // Cover veio, duration não — produtor precisa ser avisado.
    assert.equal(result.attempted, true);
    assert.equal(result.coverFilled, true);
    assert.equal(result.durationFilled, false);
    assert.equal(result.failed, true);
    assert.equal(payload.cover_url, "https://img.youtube.com/cover.jpg");
    assert.equal(payload.duration_seconds, null);
  });

  it("returns failed=true when fetcher throws", async () => {
    const payload = makePayload();
    const result = await autoFillFromYouTube(payload, async () => {
      throw new Error("network down");
    });
    assert.equal(result.attempted, true);
    assert.equal(result.failed, true);
    assert.equal(payload.cover_url, null);
    assert.equal(payload.duration_seconds, null);
  });
});
