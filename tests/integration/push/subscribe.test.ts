// Web Push (UX_PLAN.md estrutural) — rotas de inscrição de dispositivos.
// O envio real depende de VAPID (desligado nos testes); aqui cobrimos o
// contrato de armazenamento: auth obrigatória, upsert por endpoint,
// reatribuição de dono e remoção.
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { getPool, closeDbPool, ensureSchema, makeUser, truncateAll } from "../helpers/db.js";

const SUB = {
  endpoint: "https://push.example.com/sub/abc123",
  keys: { p256dh: "p256dh-fake", auth: "auth-fake" },
};

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Push / rotas de subscription", () => {
  it("GET /api/push/public-key responde com enabled=false sem VAPID", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request<{ success: boolean; data: { enabled: boolean } }>(base, {
        path: "/api/push/public-key",
      });
      assert.equal(r.status, 200);
      assert.equal(r.body.data.enabled, false, "sem VAPID nas envs de teste, enabled deve ser false");
    });
  });

  it("subscribe exige auth, faz upsert por endpoint e reatribui dono", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const anon = await request(base, { method: "POST", path: "/api/push/subscribe", body: SUB });
      assert.equal(anon.status, 401);

      const first = await request(base, {
        method: "POST", path: "/api/push/subscribe", cookie: u1.sessionCookie, body: SUB,
      });
      assert.equal(first.status, 200, first.rawBody);

      // Mesmo endpoint de novo (mesmo usuário) → continua 1 linha.
      await request(base, {
        method: "POST", path: "/api/push/subscribe", cookie: u1.sessionCookie, body: SUB,
      });
      let { rows } = await getPool().query(
        `SELECT user_id FROM push_subscriptions WHERE endpoint = $1`, [SUB.endpoint],
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, u1.id);

      // Outro usuário no mesmo navegador → endpoint muda de dono.
      await request(base, {
        method: "POST", path: "/api/push/subscribe", cookie: u2.sessionCookie, body: SUB,
      });
      ({ rows } = await getPool().query(
        `SELECT user_id FROM push_subscriptions WHERE endpoint = $1`, [SUB.endpoint],
      ));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, u2.id, "endpoint deve ser reatribuído ao usuário atual");
    });
  });

  it("rejeita subscription malformada e DELETE remove a inscrição", async () => {
    const u = await makeUser();
    await withServer(createTestApp(), async (base) => {
      const bad = await request(base, {
        method: "POST", path: "/api/push/subscribe", cookie: u.sessionCookie,
        body: { endpoint: "http://inseguro", keys: {} },
      });
      assert.equal(bad.status, 400);

      await request(base, {
        method: "POST", path: "/api/push/subscribe", cookie: u.sessionCookie, body: SUB,
      });
      const del = await request(base, {
        method: "DELETE", path: "/api/push/subscribe", cookie: u.sessionCookie,
        body: { endpoint: SUB.endpoint },
      });
      assert.equal(del.status, 200);
      const { rows } = await getPool().query(
        `SELECT 1 FROM push_subscriptions WHERE endpoint = $1`, [SUB.endpoint],
      );
      assert.equal(rows.length, 0);
    });
  });
});
