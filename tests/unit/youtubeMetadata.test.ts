// Task #186 — Unit tests pra `extractYouTubeVideoId`.
// Cobre as variantes de URL aceitas pelo CMS (Task #183) e protege contra
// regressões de hosts não-YouTube e strings inválidas.
//
// Roda com `npm run test:unit` (tsx --test). Não toca rede nem banco.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractYouTubeVideoId,
  youTubeThumbnailUrl,
} from "../../server/lib/youtubeMetadata.js";

describe("extractYouTubeVideoId", () => {
  it("extracts from youtube.com/watch?v=", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("preserves the v param even with extra query params (t=21s)", () => {
    assert.equal(
      extractYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=21s&feature=share",
      ),
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from youtu.be short links", () => {
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from youtu.be with timestamp", () => {
    assert.equal(
      extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42"),
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from /shorts/", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/shorts/abc123XYZ_-"),
      "abc123XYZ_-",
    );
  });

  it("extracts from /embed/", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from /v/", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/v/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("extracts from /live/", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("accepts m.youtube.com and music.youtube.com hosts", () => {
    assert.equal(
      extractYouTubeVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
    assert.equal(
      extractYouTubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });

  it("returns null for non-YouTube hosts", () => {
    assert.equal(
      extractYouTubeVideoId("https://vimeo.com/123456789"),
      null,
    );
    assert.equal(
      extractYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ"),
      null,
    );
    // Ataque clássico: subdomain disfarçado.
    assert.equal(
      extractYouTubeVideoId("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"),
      null,
    );
  });

  it("returns null for invalid strings", () => {
    assert.equal(extractYouTubeVideoId(""), null);
    assert.equal(extractYouTubeVideoId("   "), null);
    assert.equal(extractYouTubeVideoId("not a url"), null);
    assert.equal(extractYouTubeVideoId(null), null);
    assert.equal(extractYouTubeVideoId(undefined), null);
    // URL parseável mas sem id reconhecível.
    assert.equal(extractYouTubeVideoId("https://www.youtube.com/"), null);
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/feed/trending"),
      null,
    );
  });

  it("returns null when v param is too short to be a valid id", () => {
    assert.equal(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=short"),
      null,
    );
  });

  it("trims surrounding whitespace before parsing", () => {
    assert.equal(
      extractYouTubeVideoId("  https://youtu.be/dQw4w9WgXcQ  "),
      "dQw4w9WgXcQ",
    );
  });
});

describe("youTubeThumbnailUrl", () => {
  it("returns the deterministic hqdefault URL", () => {
    assert.equal(
      youTubeThumbnailUrl("dQw4w9WgXcQ"),
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
});
