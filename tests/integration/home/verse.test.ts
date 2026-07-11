// ENGAGEMENT_PLAN.md E1 — Palavra do dia + amém comunitário.
//
// Cobre:
// 1) GET /api/home/verse — 401 sem cookie; versículo global determinístico
//    (mesmo pra dois users no mesmo dia); amens=0 e amened=false no início.
// 2) POST /api/home/verse/amen — 1ª chamada concede +5 XP e marca amened;
//    2ª chamada é idempotente (alreadyAmened=true, xpAwarded=0, contador
//    não incrementa).
// 3) Contador comunitário — améns de users distintos somam no total e o
//    GET reflete amened por usuário.
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
import { verseForDate } from "../../../server/features/home/verses.js";

interface VerseOk {
  success: true;
  data: {
    verse: { ref: string; text: string; theme: string; amens: number; amened: boolean };
  };
  error: null;
}
interface AmenOk {
  success: true;
  data: {
    amened: boolean;
    alreadyAmened: boolean;
    amens: number;
    xpAwarded: number;
    leveledUp: boolean;
  };
  error: null;
}

before(async () => { await ensureSchema(); });
afterEach(async () => {
  await truncateAll();
  __resetRateLimitersForTest();
});
after(async () => { await closeDbPool(); });

describe("Home / Palavra do dia (ENGAGEMENT_PLAN E1)", () => {
  it("GET /api/home/verse 401 sem cookie", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/home/verse" });
      assert.equal(r.status, 401);
    });
  });

  it("versículo é global e determinístico: mesmo ref pra dois users, amens=0 inicial", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const expected = verseForDate(new Date());

    await withServer(createTestApp(), async (base) => {
      const r1 = await request<VerseOk>(base, { path: "/api/home/verse", cookie: u1.sessionCookie });
      const r2 = await request<VerseOk>(base, { path: "/api/home/verse", cookie: u2.sessionCookie });
      assert.equal(r1.status, 200);
      assert.equal(r1.body.data.verse.ref, expected.ref, "ref deve bater com verseForDate(hoje)");
      assert.equal(r1.body.data.verse.ref, r2.body.data.verse.ref, "versículo é o mesmo pra todo mundo");
      assert.ok(r1.body.data.verse.text.length > 0);
      assert.ok(r1.body.data.verse.theme.length > 0);
      assert.equal(r1.body.data.verse.amens, 0);
      assert.equal(r1.body.data.verse.amened, false);
    });
  });

  it("amém: 1ª chamada +5 XP; 2ª idempotente sem XP nem incremento", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const a1 = await request<AmenOk>(base, {
        method: "POST",
        path: "/api/home/verse/amen",
        cookie: u.sessionCookie,
        body: {},
      });
      assert.equal(a1.status, 200);
      assert.equal(a1.body.data.alreadyAmened, false);
      assert.equal(a1.body.data.xpAwarded, 5);
      assert.equal(a1.body.data.amens, 1);

      const a2 = await request<AmenOk>(base, {
        method: "POST",
        path: "/api/home/verse/amen",
        cookie: u.sessionCookie,
        body: {},
      });
      assert.equal(a2.status, 200);
      assert.equal(a2.body.data.alreadyAmened, true);
      assert.equal(a2.body.data.xpAwarded, 0);
      assert.equal(a2.body.data.amens, 1, "2º amém do mesmo user não incrementa");

      // users.xp ganhou exatamente os 5 do amém (nenhuma outra ação no teste).
      const { rows } = await getPool().query<{ xp: number }>(
        `SELECT xp FROM users WHERE id = $1`, [u.id],
      );
      assert.equal(rows[0].xp, 5);

      // GET reflete o estado.
      const v = await request<VerseOk>(base, { path: "/api/home/verse", cookie: u.sessionCookie });
      assert.equal(v.body.data.verse.amened, true);
      assert.equal(v.body.data.verse.amens, 1);
    });
  });

  it("contador comunitário soma améns de users distintos", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    await withServer(createTestApp(), async (base) => {
      await request<AmenOk>(base, {
        method: "POST", path: "/api/home/verse/amen", cookie: u1.sessionCookie, body: {},
      });
      const a2 = await request<AmenOk>(base, {
        method: "POST", path: "/api/home/verse/amen", cookie: u2.sessionCookie, body: {},
      });
      assert.equal(a2.body.data.amens, 2, "total comunitário do dia");

      // u1 vê amened=true e amens=2; um 3º user vê amened=false e amens=2.
      const u3 = await makeUser();
      const v1 = await request<VerseOk>(base, { path: "/api/home/verse", cookie: u1.sessionCookie });
      const v3 = await request<VerseOk>(base, { path: "/api/home/verse", cookie: u3.sessionCookie });
      assert.equal(v1.body.data.verse.amened, true);
      assert.equal(v1.body.data.verse.amens, 2);
      assert.equal(v3.body.data.verse.amened, false);
      assert.equal(v3.body.data.verse.amens, 2);
    });
  });
});
