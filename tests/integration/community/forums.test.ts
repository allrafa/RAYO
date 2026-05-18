// Task #237 — Forums CRUD + subscribe (Reddit-style).
//
// Service-level: cria community via `createForumByUser` (criador vira mod
// local + subscriber em transação), valida slug único (race → SLUG_TAKEN),
// listForums com member_count derivado de COUNT(*), follow/unfollow
// idempotente (ON CONFLICT DO NOTHING).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createForumByUser,
  listForums,
  getForumBySlug,
  setForumSubscription,
  isForumModerator,
} from "../../../server/features/community/service.js";
import { AppError } from "../../../server/features/academia/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
  getPool,
} from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Community / Forums (Task #237)", () => {
  it("createForumByUser cria fórum + criador vira mod local + subscriber", async () => {
    const u = await makeUser();
    const forum = await createForumByUser(u.id, {
      category: "geral",
      cover_url: "objstore://forums/c.jpg",
      name: "Casados RAYO",
      description: "Comunidade de casados",
      icon: "💍",
    });
    assert.equal(forum.name, "Casados RAYO");
    assert.equal(forum.created_by, u.id);
    assert.equal(forum.is_official, false);
    assert.match(forum.slug, /^casados-rayo/);
    assert.equal(await isForumModerator(forum.id, u.id), true,
      "criador precisa estar em forum_moderators");
    // member_count deriva de forum_subscriptions
    assert.equal(Number(forum.member_count), 1, "criador também vira subscriber");
  });

  it("slug único — segunda comunidade com mesmo nome ganha sufixo numérico", async () => {
    const u1 = await makeUser();
    const u2 = await makeUser();
    const a = await createForumByUser(u1.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Pais Conscientes" });
    const b = await createForumByUser(u2.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Pais Conscientes" });
    assert.notEqual(a.slug, b.slug, "slugs colidem se não houver dedup");
    assert.match(b.slug, /^pais-conscientes-\d+$/);
  });

  it("listForums devolve apenas comunidades ativas, ordenadas por sort_order ASC", async () => {
    const u = await makeUser();
    // sort_order é MAX+1 a cada criação → ordem de criação = ordem de retorno.
    const alfa = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Alfa" });
    const beta = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Beta" });
    const gama = await createForumByUser(u.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Gama" });
    // Desativa o "Beta" direto no banco — listForums NÃO deve retornar.
    await getPool().query(`UPDATE forums SET is_active = FALSE WHERE id = $1`, [beta.id]);
    const all = await listForums(u.id);
    const ids = all.map((f) => f.id);
    // Asserção forte: ativos em ordem de sort_order; Beta desativado some.
    const idxAlfa = ids.indexOf(alfa.id);
    const idxGama = ids.indexOf(gama.id);
    assert.ok(idxAlfa >= 0 && idxGama >= 0, "alfa e gama presentes");
    assert.ok(idxAlfa < idxGama, "Alfa (sort_order menor) vem antes de Gama");
    assert.ok(!ids.includes(beta.id), "comunidade inativa não aparece");
  });

  it("getForumBySlug com slug inexistente → FORUM_NOT_FOUND 404", async () => {
    await assert.rejects(
      () => getForumBySlug("nao-existe"),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORUM_NOT_FOUND");
        assert.equal((err as AppError).statusCode, 404);
        return true;
      },
    );
  });

  it("setForumSubscription é idempotente — segundo subscribe não duplica", async () => {
    const creator = await makeUser();
    const visitor = await makeUser();
    const forum = await createForumByUser(creator.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Idem" });

    await setForumSubscription(forum.id, visitor.id, true);
    await setForumSubscription(forum.id, visitor.id, true); // duplo clique

    const { rows } = await getPool().query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM forum_subscriptions
        WHERE forum_id = $1 AND user_id = $2`,
      [forum.id, visitor.id],
    );
    assert.equal(rows[0].cnt, "1", "ON CONFLICT DO NOTHING garante uma linha só");
  });

  it("setForumSubscription false remove a linha (unsubscribe)", async () => {
    const creator = await makeUser();
    const visitor = await makeUser();
    const forum = await createForumByUser(creator.id, { category: "geral", cover_url: "objstore://forums/c.jpg", name: "Toggle" });

    await setForumSubscription(forum.id, visitor.id, true);
    await setForumSubscription(forum.id, visitor.id, false);

    const { rows } = await getPool().query(
      `SELECT 1 FROM forum_subscriptions WHERE forum_id = $1 AND user_id = $2`,
      [forum.id, visitor.id],
    );
    assert.equal(rows.length, 0);
  });

  it("setForumSubscription em forum inexistente → FORUM_NOT_FOUND", async () => {
    const u = await makeUser();
    await assert.rejects(
      () => setForumSubscription(999_999, u.id, true),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).code, "FORUM_NOT_FOUND");
        return true;
      },
    );
  });
});
