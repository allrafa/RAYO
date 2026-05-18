// Task #240 — Dashboard / Home feed.
//
// Cobre três superfícies declaradas em `Done looks like` da task:
//
// 1) "Hoje no RAYO" — `GET /api/home/today` + `POST /today/complete`:
//    determinismo por (epochDay+userId), filtragem por segments,
//    XP idempotente, INVALID_TODAY_ITEM, ITEM_NOT_FOUND.
//
// 2) `GET /api/home-feed` — agrupa cards ativos nas 4 seções fixas
//    (recently_played, made_for_you, trending, podcasts), ordenadas
//    por sort_order, e oculta cards cujo conteúdo linkado não está
//    publicado.
//
// 3) `GET /api/dashboard` — `recommendedSectionOrder` reflete o
//    primeiro segmento do user (Task #43); fallback DEFAULT_RAIL_ORDER
//    quando user não tem segment definido.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";

interface TodayOk { success: true; data: { item: { id: number; title: string } | null }; error: null }
interface CompleteOk { success: true; data: { alreadyCompleted: boolean; xpAwarded: number }; error: null }
interface ApiErr { success: false; data: null; error: { code: string; message: string } }

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

async function insertContent(opts: {
  kind?: string;
  title?: string;
  status?: string;
  segments?: string[];
}) {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items (kind, title, status, segments)
     VALUES ($1, $2, $3, $4::text[])
     RETURNING id`,
    [
      opts.kind ?? "audio",
      opts.title ?? `T-${Date.now()}-${Math.random()}`,
      opts.status ?? "published",
      opts.segments ?? [],
    ],
  );
  return rows[0].id;
}

describe("Dashboard / Home (Task #240)", () => {
  it("GET /api/home/today 401 sem cookie", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/home/today" });
      assert.equal(r.status, 401);
    });
  });

  it("ITEM_NOT_FOUND no complete quando não existe conteúdo publicado", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<ApiErr>(base, {
        method: "POST",
        path: "/api/home/today/complete",
        cookie: u.sessionCookie,
        body: { itemId: 999 },
      });
      assert.equal(r.status, 404);
      assert.equal(r.body.error.code, "ITEM_NOT_FOUND");
    });
  });

  it("GET /api/home/today é determinístico — duas chamadas devolvem o mesmo item", async () => {
    const u = await makeUser();
    // 3 itens publicados sem filtro de segmento → fallback usa universo todo.
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) ids.push(await insertContent({ title: `A${i}` }));

    await withServer(createTestApp(), async (base) => {
      const r1 = await request<TodayOk>(base, { path: "/api/home/today", cookie: u.sessionCookie });
      const r2 = await request<TodayOk>(base, { path: "/api/home/today", cookie: u.sessionCookie });
      assert.equal(r1.status, 200);
      assert.ok(r1.body.data.item, "deveria ter um item de hoje");
      assert.ok(ids.includes(r1.body.data.item!.id), "id pickado deve estar no conjunto");
      assert.equal(r1.body.data.item!.id, r2.body.data.item!.id, "pick determinístico por (epochDay+userId)");
    });
  });

  it("filtra por segments: user solteiro só vê item de segmento que cruza", async () => {
    const u = await makeUser();
    await getPool().query(
      `UPDATE users SET segments = ARRAY['solteiro']::text[] WHERE id = $1`, [u.id],
    );
    const solteiroId = await insertContent({ title: "Solo", segments: ["solteiro"] });
    await insertContent({ title: "Casados", segments: ["casados"] });

    await withServer(createTestApp(), async (base) => {
      const r = await request<TodayOk>(base, { path: "/api/home/today", cookie: u.sessionCookie });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.item!.id, solteiroId, "deveria pular o item de casados");
    });
  });

  it("complete: 1ª chamada concede +15 XP; 2ª é idempotente", async () => {
    const u = await makeUser();
    await insertContent({ title: "Único", kind: "audio" });

    await withServer(createTestApp(), async (base) => {
      const today = await request<TodayOk>(base, { path: "/api/home/today", cookie: u.sessionCookie });
      const itemId = today.body.data.item!.id;

      const c1 = await request<CompleteOk>(base, {
        method: "POST",
        path: "/api/home/today/complete",
        cookie: u.sessionCookie,
        body: { itemId },
      });
      assert.equal(c1.status, 200);
      assert.equal(c1.body.data.alreadyCompleted, false);
      assert.equal(c1.body.data.xpAwarded, 15);

      const c2 = await request<CompleteOk>(base, {
        method: "POST",
        path: "/api/home/today/complete",
        cookie: u.sessionCookie,
        body: { itemId },
      });
      assert.equal(c2.status, 200);
      assert.equal(c2.body.data.alreadyCompleted, true);
      assert.equal(c2.body.data.xpAwarded, 0);

      // users.xp ganhou 15 (e mais XP por updateStreak na 1ª chamada).
      const { rows } = await getPool().query<{ xp: number }>(
        `SELECT xp FROM users WHERE id = $1`, [u.id],
      );
      assert.ok(rows[0].xp >= 15, `xp deveria ser >= 15, foi ${rows[0].xp}`);
    });
  });

  it("INVALID_TODAY_ITEM quando itemId não é o pickado pra hoje", async () => {
    const u = await makeUser();
    const idA = await insertContent({ title: "A" });
    const idB = await insertContent({ title: "B" });

    await withServer(createTestApp(), async (base) => {
      const today = await request<TodayOk>(base, { path: "/api/home/today", cookie: u.sessionCookie });
      const pickedId = today.body.data.item!.id;
      const wrong = pickedId === idA ? idB : idA;

      const r = await request<ApiErr>(base, {
        method: "POST",
        path: "/api/home/today/complete",
        cookie: u.sessionCookie,
        body: { itemId: wrong },
      });
      assert.equal(r.status, 409);
      assert.equal(r.body.error.code, "INVALID_TODAY_ITEM");
    });
  });
});

// ── /api/home-feed (publicHomeFeedRouter) ────────────────────────────
// Cards de destaque curados em `home_feed_items` (não confundir com
// /api/home/today, que é o "Hoje no RAYO"). Mounted em /api/home-feed.

interface FeedOk {
  success: true;
  data: {
    sections: {
      recently_played: Array<{ id: number; title: string; sort_order: number }>;
      made_for_you: Array<{ id: number; title: string; sort_order: number }>;
      trending: Array<{ id: number; title: string; sort_order: number }>;
      podcasts: Array<{ id: number; title: string; sort_order: number }>;
    };
  };
  error: null;
}

async function insertFeedItem(opts: {
  section: "recently_played" | "made_for_you" | "trending" | "podcasts";
  title: string;
  sort_order?: number;
  is_active?: boolean;
  content_item_id?: number | null;
}) {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO home_feed_items (section, title, sort_order, is_active, content_item_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [opts.section, opts.title, opts.sort_order ?? 0, opts.is_active ?? true, opts.content_item_id ?? null],
  );
  return rows[0].id;
}

describe("Dashboard / GET /api/home-feed (Task #240)", () => {
  // Default truncation entre testes; sem auth (optionalAuth) — feed é público.
  it("retorna 4 seções fixas com cards ativos ordenados por sort_order", async () => {
    // Seed do migrate.ts já pode ter inserido cards. Apagamos pra ter um
    // universo controlado por este teste (truncateAll do afterEach NÃO
    // limpa o seed, que é re-executado a cada boot do schema).
    await getPool().query(`DELETE FROM home_feed_items`);

    await insertFeedItem({ section: "trending", title: "T-segundo", sort_order: 20 });
    await insertFeedItem({ section: "trending", title: "T-primeiro", sort_order: 10 });
    await insertFeedItem({ section: "made_for_you", title: "MFY-A", sort_order: 5 });
    await insertFeedItem({ section: "podcasts", title: "PC-A", sort_order: 1 });

    await withServer(createTestApp(), async (base) => {
      const r = await request<FeedOk>(base, { path: "/api/home-feed" });
      assert.equal(r.status, 200);
      const s = r.body.data.sections;
      // 4 chaves esperadas, sempre presentes (mesmo vazias).
      assert.deepEqual(Object.keys(s).sort(), [
        "made_for_you", "podcasts", "recently_played", "trending",
      ]);
      assert.equal(s.recently_played.length, 0);
      assert.equal(s.trending.length, 2);
      // trending ordenado por sort_order ASC
      assert.equal(s.trending[0].title, "T-primeiro");
      assert.equal(s.trending[1].title, "T-segundo");
      assert.equal(s.made_for_you[0].title, "MFY-A");
      assert.equal(s.podcasts[0].title, "PC-A");
    });
  });

  it("oculta card cujo content_item linkado não está publicado", async () => {
    await getPool().query(`DELETE FROM home_feed_items`);
    const draftId = await insertContent({ title: "Draft", status: "draft" });
    const pubId = await insertContent({ title: "Pub", status: "published" });
    await insertFeedItem({ section: "trending", title: "Visivel-Pub", content_item_id: pubId });
    await insertFeedItem({ section: "trending", title: "Oculto-Draft", content_item_id: draftId });
    // Card SEM link permanece visível (curadoria estática).
    await insertFeedItem({ section: "trending", title: "Visivel-SemLink", content_item_id: null });

    await withServer(createTestApp(), async (base) => {
      const r = await request<FeedOk>(base, { path: "/api/home-feed" });
      assert.equal(r.status, 200);
      const titles = r.body.data.sections.trending.map((c) => c.title).sort();
      assert.deepEqual(titles, ["Visivel-Pub", "Visivel-SemLink"]);
    });
  });

  it("oculta card com is_active=false", async () => {
    await getPool().query(`DELETE FROM home_feed_items`);
    await insertFeedItem({ section: "podcasts", title: "Ativo", is_active: true });
    await insertFeedItem({ section: "podcasts", title: "Inativo", is_active: false });

    await withServer(createTestApp(), async (base) => {
      const r = await request<FeedOk>(base, { path: "/api/home-feed" });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.sections.podcasts.length, 1);
      assert.equal(r.body.data.sections.podcasts[0].title, "Ativo");
    });
  });
});

// ── /api/dashboard ───────────────────────────────────────────────────
// Endpoint agregado consumido pela HomePage. Cobre apenas a parte
// declarada no escopo da task: `recommendedSectionOrder` por segmento.

interface DashboardOk {
  success: true;
  data: { recommendedSectionOrder: string[]; greeting: { segments: string[] } };
  error: null;
}

describe("Dashboard / GET /api/dashboard recommendedSectionOrder (Task #240)", () => {
  it("user sem segments → DEFAULT_RAIL_ORDER (começa com 'continue')", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const r = await request<DashboardOk>(base, {
        path: "/api/dashboard",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.recommendedSectionOrder[0], "continue");
      // DEFAULT_RAIL_ORDER tem 9 entradas
      assert.equal(r.body.data.recommendedSectionOrder.length, 9);
    });
  });

  it("user com primary segment='solteiro' → ordem começa com 'quizzes'", async () => {
    const u = await makeUser();
    await getPool().query(
      `UPDATE users SET segments = ARRAY['solteiro']::text[] WHERE id = $1`, [u.id],
    );
    await withServer(createTestApp(), async (base) => {
      const r = await request<DashboardOk>(base, {
        path: "/api/dashboard",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      const order = r.body.data.recommendedSectionOrder;
      assert.equal(order[0], "quizzes");
      assert.equal(order[1], "recommended");
      assert.deepEqual(r.body.data.greeting.segments, ["solteiro"]);
    });
  });

  it("user com primary segment='casados' → ordem começa com 'continue'", async () => {
    const u = await makeUser();
    await getPool().query(
      `UPDATE users SET segments = ARRAY['casados','pais']::text[] WHERE id = $1`, [u.id],
    );
    await withServer(createTestApp(), async (base) => {
      const r = await request<DashboardOk>(base, {
        path: "/api/dashboard",
        cookie: u.sessionCookie,
      });
      assert.equal(r.status, 200);
      const order = r.body.data.recommendedSectionOrder;
      // 'casados' (primary) tem 'continue' como primeira rail.
      assert.equal(order[0], "continue");
      assert.equal(order[1], "recommended");
      assert.equal(order[2], "discussoes");
    });
  });
});
