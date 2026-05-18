// Task #240 — Dashboard / Home: "Hoje no RAYO" + complete.
//
// Cobre:
//   * 401 sem cookie.
//   * GET /api/home/today devolve item determinístico por (epochDay+userId)
//     — chamadas repetidas pelo mesmo user retornam o mesmo item.
//   * Filtragem por segments: user com segments=['solteiro'] só vê itens
//     com segmento que cruza (Postgres &&).
//   * POST /api/home/today/complete: 1ª chamada concede +15 XP + 200,
//     2ª chamada vira { alreadyCompleted: true, xpAwarded: 0 }.
//   * INVALID_TODAY_ITEM quando body.itemId não é o pickado pra hoje.
//   * ITEM_NOT_FOUND quando não existe nenhum item publicado.
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
