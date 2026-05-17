// Task #235 — POST /api/lgpd/data-deletion.
//
// Contrato (server/features/lgpd/service.ts:deleteUserData):
//  - Anonimiza o user (email vira deleted_<id>_<ts>@removed.lgpd,
//    name='Usuário Removido', password_hash='DELETED').
//  - Apaga sessões, badges, xp_log, lesson/course/mission progress,
//    post_likes, comment_likes.
//  - Anonimiza posts (title='[removido]', content='[conteúdo removido...]')
//    e comments do user — preserva integridade referencial (FKs vivas).
//  - analytics_events viram user_id NULL.
//  - Cookie de sessão limpo. Toda re-tentativa com cookie antigo → 401.
//  - lgpd_requests ganha linha request_type='deletion' status='completed'.
//
// O test cria user + um analytics_event próprio, dispara o delete, e
// valida que: (1) email/nome/hash foram anonimizados; (2) sessão sumiu;
// (3) /api/auth/me com cookie antigo → 401; (4) analytics_event teve
// user_id zerado; (5) linha de lgpd_requests gravada.

import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { closeDbPool, ensureSchema, getPool, makeUser, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("LGPD data deletion (Task #235)", () => {
  it("anônimo → 401", async () => {
    const app = createTestApp();
    await withServer(app, async (base) => {
      const r = await request(base, { method: "POST", path: "/api/lgpd/data-deletion" });
      assert.equal(r.status, 401);
    });
  });

  it("anonimiza posts e comments do user, preserva linhas (FK integrity)", async () => {
    const user = await makeUser({ name: "Autor a Deletar" });
    const pool = getPool();
    // truncateAll esvazia forums entre specs — criamos inline.
    const { rows: fRows } = await pool.query<{ id: number }>(
      `INSERT INTO forums (name, description, life_context, category)
       VALUES ('LGPD Test Forum', 'desc', 'solteiro', 'geral') RETURNING id`,
    );
    const forumId = fRows[0].id;
    // 1 post + 1 comentário do user.
    const { rows: pRows } = await pool.query<{ id: number }>(
      `INSERT INTO posts (forum_id, user_id, title, content)
       VALUES ($1, $2, 'Título original', 'Conteúdo original do post')
       RETURNING id`,
      [forumId, user.id],
    );
    const postId = pRows[0].id;
    const { rows: cRows } = await pool.query<{ id: number }>(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, 'Comentário original') RETURNING id`,
      [postId, user.id],
    );
    const commentId = cRows[0].id;

    const app = createTestApp();
    await withServer(app, async (base) => {
      const del = await request<{ success: boolean }>(base, {
        method: "POST", path: "/api/lgpd/data-deletion", cookie: user.sessionCookie,
      });
      assert.equal(del.status, 200);
    });

    // Post: linha sobrevive (FK preservada), título e content anonimizados.
    const { rows: postAfter } = await pool.query<{
      id: number; user_id: number; title: string; content: string;
    }>(`SELECT id, user_id, title, content FROM posts WHERE id = $1`, [postId]);
    assert.equal(postAfter.length, 1, "post não foi deletado (preserva FK)");
    assert.equal(postAfter[0].title, "[removido]");
    assert.match(postAfter[0].content, /\[conteúdo removido por solicitação LGPD\]/);
    // user_id continua apontando pro user anonimizado (não vira NULL).
    assert.equal(postAfter[0].user_id, user.id);

    // Comment idem.
    const { rows: commentAfter } = await pool.query<{
      id: number; user_id: number; content: string;
    }>(`SELECT id, user_id, content FROM comments WHERE id = $1`, [commentId]);
    assert.equal(commentAfter.length, 1, "comment não foi deletado (preserva FK)");
    assert.match(commentAfter[0].content, /\[conteúdo removido por solicitação LGPD\]/);
    assert.equal(commentAfter[0].user_id, user.id);
  });

  it("autenticado: anonimiza user, derruba sessão, preserva FKs", async () => {
    const user = await makeUser({ name: "Para Deletar" });
    const pool = getPool();
    // Cria 1 analytics_event do user.
    const { rows: evRows } = await pool.query<{ id: number }>(
      `INSERT INTO analytics_events (user_id, event_name, metadata)
       VALUES ($1, 'pre_delete', '{}'::jsonb) RETURNING id`,
      [user.id],
    );
    const eventId = evRows[0].id;

    const app = createTestApp();
    await withServer(app, async (base) => {
      const del = await request<{ success: boolean }>(base, {
        method: "POST", path: "/api/lgpd/data-deletion", cookie: user.sessionCookie,
      });
      assert.equal(del.status, 200);
      assert.equal(del.body.success, true);
      // Cookie de sessão é limpo na resposta.
      assert.match(del.headers.get("set-cookie") ?? "", /session_token=;/);

      // Cookie antigo agora é inválido (sessão foi DELETADA no service).
      const me = await request<{ error: { code: string } }>(base, {
        path: "/api/auth/me", cookie: user.sessionCookie,
      });
      assert.equal(me.status, 401);
      assert.equal(me.body.error.code, "SESSION_EXPIRED");
    });

    // (1) Anonimização: row ainda existe (preserva FK), email/nome/hash trocados.
    const { rows: userRows } = await pool.query<{
      email: string; name: string; password_hash: string;
    }>(`SELECT email, name, password_hash FROM users WHERE id = $1`, [user.id]);
    assert.equal(userRows.length, 1, "user row preservada pra integridade referencial");
    assert.match(userRows[0].email, /^deleted_\d+_\d+@removed\.lgpd$/);
    assert.equal(userRows[0].name, "Usuário Removido");
    assert.equal(userRows[0].password_hash, "DELETED");

    // (2) Sessões removidas.
    const { rows: sessRows } = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM sessions WHERE user_id = $1`, [user.id],
    );
    assert.equal(sessRows[0].c, "0");

    // (3) Analytics events ficam, mas com user_id = NULL.
    const { rows: evAfter } = await pool.query<{ user_id: number | null }>(
      `SELECT user_id FROM analytics_events WHERE id = $1`, [eventId],
    );
    assert.equal(evAfter.length, 1);
    assert.equal(evAfter[0].user_id, null);

    // (4) Pedido LGPD registrado como completed.
    const { rows: reqRows } = await pool.query<{ status: string; request_type: string }>(
      `SELECT status, request_type FROM lgpd_requests
       WHERE user_id = $1 AND request_type = 'deletion'`,
      [user.id],
    );
    assert.equal(reqRows.length, 1);
    assert.equal(reqRows[0].status, "completed");
  });
});
