// Task #236 — Resolução de sentinels em leitura pública do CMS.
//
// O servidor armazena `objstore://<key>` (Object Storage) e
// `bunny://<libraryId>/<guid>` (Bunny Stream). Em leitura, esses
// sentinels viram URLs absolutas que o cliente pode buscar:
//   * `objstore://…` → signed URL (passada por resolveStoredMediaUrl)
//   * `bunny://…`    → derivados via withResolvedBunnyFields:
//                       `video_embed_url` e `video_hls_url`.
//   * URL absoluta `https://…` → pass-through sem modificação.
//
// O contrato é: o sentinel cru NUNCA escapa pra resposta da API.
// Esse spec exercita `GET /api/content/:id` (público) — mesmo path
// que o frontend usa pra hidratar detalhes de conteúdo.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";

interface PublicContentResponse {
  success: boolean;
  data: { item: Record<string, unknown> };
}

// `resolveBunnyVideo()` retorna null se Bunny não estiver configurado
// (LIBRARY_ID + API_KEY + CDN_HOSTNAME). Como o objetivo desse spec é
// validar a RESOLUÇÃO do sentinel, populamos os 3 antes do schema init.
process.env.BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID ?? "99999";
process.env.BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY ?? "test-key";
process.env.BUNNY_STREAM_CDN_HOSTNAME =
  process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "vz-test.b-cdn.net";

// A resolução `objstore://` → signed URL HTTPS depende do sidecar do
// Object Storage (`PUBLIC_OBJECT_SEARCH_PATHS` + endpoint local de
// assinatura), presente no Replit mas AUSENTE no GitHub Actions. Sem ele,
// `resolveStoredMediaUrl` degrada graciosamente devolvendo o sentinel cru
// (o servidor segue 200). Usamos a presença do env var como proxy: quando
// o Object Storage está configurado, exigimos a URL assinada de verdade;
// no CI (sem bucket) pulamos essa asserção específica.
const OBJECT_STORAGE_CONFIGURED = Boolean(process.env.PUBLIC_OBJECT_SEARCH_PATHS);

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

async function insertPublishedContent(
  ownerId: number,
  overrides: Record<string, unknown>,
): Promise<number> {
  const base = {
    kind: "audio",
    title: "T",
    slug: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "published",
    cover_url: null,
    media_url: null,
    external_url: null,
    video_provider: null,
    video_external_id: null,
    video_thumbnail_url: null,
    ...overrides,
  };
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items
       (kind, title, slug, status, cover_url, media_url, external_url,
        video_provider, video_external_id, video_thumbnail_url,
        created_by, published_at, segments, interests, tags)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),
             ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[])
     RETURNING id`,
    [
      base.kind, base.title, base.slug, base.status, base.cover_url,
      base.media_url, base.external_url, base.video_provider,
      base.video_external_id, base.video_thumbnail_url, ownerId,
    ],
  );
  return rows[0].id;
}

describe("Public CMS detail — resolução de sentinels (Task #236)", () => {
  it("bunny:// → preenche video_embed_url e video_hls_url derivados", async () => {
    const owner = await makeUser({ role: "producer" });
    const guid = "abcdef12-3456-7890-abcd-ef1234567890";
    const id = await insertPublishedContent(owner.id, {
      kind: "video",
      title: "Vídeo Bunny",
      video_provider: "bunny",
      video_external_id: `bunny://12345/${guid}`,
    });

    await withServer(createTestApp(), async (base) => {
      const r = await request<PublicContentResponse>(base, {
        method: "GET",
        path: `/api/content/${id}`,
      });
      assert.equal(r.status, 200);
      const item = r.body.data.item as Record<string, unknown>;
      assert.equal(typeof item.video_embed_url, "string");
      assert.match(String(item.video_embed_url), new RegExp(guid));
      assert.equal(typeof item.video_hls_url, "string");
    });
  });

  it("objstore:// em media_url é resolvido pra signed URL HTTPS", {
    skip: OBJECT_STORAGE_CONFIGURED
      ? false
      : "Object Storage indisponível (sem sidecar/bucket, ex.: CI) — resolução assinada não é exercitável",
  }, async () => {
    // Object Storage está INSTALLED no Replit (integration ativa). O
    // resolver `resolveStoredMediaUrl` chama `signPublicObjectUrl` que
    // posta no sidecar `/object-storage/signed-object-url` e devolve
    // uma URL HTTPS assinada. O sidecar assina mesmo chaves que não
    // existem fisicamente — só a leitura da URL é que 404'a.
    //
    // Contrato testado: o cliente NUNCA vê `objstore://...` cru no
    // JSON, e o que vê é uma string HTTPS válida.
    const owner = await makeUser({ role: "producer" });
    const id = await insertPublishedContent(owner.id, {
      kind: "audio",
      title: "Áudio Object Storage",
      media_url: "objstore://test-audio/track.mp3",
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<PublicContentResponse>(base, {
        method: "GET",
        path: `/api/content/${id}`,
      });
      assert.equal(r.status, 200);
      const item = r.body.data.item;
      const mediaUrl = item.media_url;
      assert.equal(typeof mediaUrl, "string", "media_url deve ser uma string signed");
      const str = String(mediaUrl);
      assert.ok(
        !str.startsWith("objstore://"),
        `media_url vazou sentinel cru: ${str}`,
      );
      assert.match(str, /^https?:\/\//, `media_url deve ser HTTP(S): ${str}`);
    });
  });

  it("URL absoluta em media_url passa direto (pass-through)", async () => {
    const owner = await makeUser({ role: "producer" });
    const absUrl = "https://cdn.example.com/audio/track.mp3";
    const id = await insertPublishedContent(owner.id, {
      kind: "audio",
      title: "Áudio com URL absoluta",
      media_url: absUrl,
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<PublicContentResponse>(base, {
        method: "GET",
        path: `/api/content/${id}`,
      });
      assert.equal(r.status, 200);
      const item = r.body.data.item;
      assert.equal(item.media_url, absUrl);
    });
  });

  it("conteúdo em draft NÃO aparece via /api/content/:id (404)", async () => {
    const owner = await makeUser({ role: "producer" });
    const id = await insertPublishedContent(owner.id, {
      kind: "audio",
      title: "Não publicado",
      status: "draft",
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ error?: { code?: string } }>(base, {
        method: "GET",
        path: `/api/content/${id}`,
      });
      assert.equal(r.status, 404);
    });
  });

  it("conteúdo archived NÃO aparece via /api/content/:id (404)", async () => {
    const owner = await makeUser({ role: "producer" });
    const id = await insertPublishedContent(owner.id, {
      kind: "audio",
      title: "Arquivado",
      status: "archived",
    });
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { method: "GET", path: `/api/content/${id}` });
      assert.equal(r.status, 404);
    });
  });

  it("ID inválido devolve INVALID_ID (400)", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ error?: { code?: string } }>(base, {
        method: "GET",
        path: `/api/content/abc`,
      });
      assert.equal(r.status, 400);
      assert.equal(r.body.error?.code, "INVALID_ID");
    });
  });
});
