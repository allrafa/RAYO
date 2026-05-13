// Task #206 — Trava o comportamento corrigido na Task #205: todo login
// social grava (idempotente) uma linha verified=TRUE em
// email_verification_codes pro e-mail do usuário. Sem isso, o gating de
// criar comunidade volta a pedir "Confirme seu e-mail" pra quem entra
// pelo Google, regredindo o bug original.
//
// Esses testes precisam de um Postgres real (mesmo da suíte E2E). Quando
// `DATABASE_URL` não está setada, a suíte é pulada — mantém o `npm run
// test:unit` funcionando offline (regra do tests/unit/README.md).
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb("OAuth → markEmailVerifiedFromTrustedProvider (Task #205)", () => {
  let pool: Pool;
  let mod: typeof import("../../server/features/auth/service.js");
  const createdUserIds: number[] = [];
  const createdEmails: string[] = [];

  before(async () => {
    pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    mod = await import("../../server/features/auth/service.js");
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await pool.query(`DELETE FROM sessions WHERE user_id = ANY($1)`, [createdUserIds]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
    }
    if (createdEmails.length > 0) {
      await pool.query(
        `DELETE FROM email_verification_codes WHERE LOWER(email) = ANY($1)`,
        [createdEmails.map((e) => e.toLowerCase())],
      );
    }
    await pool.end();
  });

  beforeEach(() => {
    // Cleanup defensivo entre testes — cada teste cria suas próprias rows.
  });

  function uniqueEmail(prefix: string): string {
    const e = `unit-${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}@rayo.test`;
    createdEmails.push(e);
    return e;
  }

  async function countVerifiedRows(email: string): Promise<number> {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM email_verification_codes
        WHERE LOWER(email) = LOWER($1) AND verified = TRUE`,
      [email],
    );
    return parseInt(rows[0]?.n ?? "0", 10);
  }

  it("findOrCreateOAuthUser (creation path) marks the email as verified", async () => {
    const email = uniqueEmail("create");
    const user = await mod.findOrCreateOAuthUser({
      provider: "google",
      providerId: `gid-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: "Create Path",
    });
    createdUserIds.push(user.id);

    assert.equal(user.email, email.toLowerCase());
    assert.equal(await countVerifiedRows(email), 1);
    // E o gating efetivo (mesma query usada por createForumByUser) passa:
    const { isUserEmailVerified } = await import(
      "../../server/features/community/service.js"
    );
    assert.equal(await isUserEmailVerified(user.id), true);
  });

  it("findOrCreateOAuthUser (link path) marks the email as verified for legacy email-only user", async () => {
    const email = uniqueEmail("link");
    // Cria conta só-email (sem verified row) — simula usuário legado que
    // se cadastrou por e-mail mas nunca confirmou.
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, name, segments)
       VALUES ($1, 'x', 'Link Path', ARRAY[]::text[]) RETURNING id`,
      [email],
    );
    const preExistingId = rows[0].id;
    createdUserIds.push(preExistingId);

    assert.equal(await countVerifiedRows(email), 0, "precondition: not verified");

    const user = await mod.findOrCreateOAuthUser({
      provider: "google",
      providerId: `gid-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: "Link Path",
    });
    assert.equal(user.id, preExistingId, "should link, not create");
    assert.equal(await countVerifiedRows(email), 1);
  });

  it("markEmailVerifiedFromTrustedProvider is idempotent (no duplicate rows)", async () => {
    const email = uniqueEmail("idem");
    await mod.markEmailVerifiedFromTrustedProvider(email);
    await mod.markEmailVerifiedFromTrustedProvider(email);
    await mod.markEmailVerifiedFromTrustedProvider(email);
    assert.equal(await countVerifiedRows(email), 1);
  });

  // Task #208 — o helper engole exceptions de DB pra NUNCA derrubar o
  // login OAuth (a verificação de e-mail é um nice-to-have do callback,
  // não pode quebrar o auth). Forçamos o erro com um e-mail acima do
  // limite de VARCHAR(255) — o INSERT bate "value too long for type
  // character varying(255)" e o try/catch absorve sem propagar.
  it("markEmailVerifiedFromTrustedProvider engole erro de DB sem lançar", async () => {
    const oversizedEmail = `${"a".repeat(300)}@rayo.test`;
    // Não adiciona em createdEmails porque a row não existe (insert falha).
    await assert.doesNotReject(
      () => mod.markEmailVerifiedFromTrustedProvider(oversizedEmail),
      "helper deve engolir erro do DB pra não derrubar o login OAuth",
    );
    // E confirma que de fato nada foi gravado.
    const { rows } = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM email_verification_codes WHERE email = $1`,
      [oversizedEmail],
    );
    assert.equal(parseInt(rows[0]?.n ?? "0", 10), 0);
  });

  // Task #208 — entrada vazia/whitespace é no-op silencioso (early return),
  // sem tentar tocar no DB. Trava esse contrato pra que callers OAuth com
  // email faltante nunca passem por uma exception.
  it("markEmailVerifiedFromTrustedProvider trata e-mail vazio como no-op", async () => {
    await assert.doesNotReject(() => mod.markEmailVerifiedFromTrustedProvider(""));
    await assert.doesNotReject(() => mod.markEmailVerifiedFromTrustedProvider("   "));
  });

  it("backfillOAuthVerifiedEmails fixes a pre-existing OAuth user with no verified row", async () => {
    const email = uniqueEmail("backfill");
    // Simula usuário OAuth criado ANTES da Task #205 — google_id setado
    // mas sem linha verified=TRUE.
    const providerId = `gid-backfill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, name, google_id, segments)
       VALUES ($1, NULL, 'Backfill Test', $2, ARRAY[]::text[]) RETURNING id`,
      [email, providerId],
    );
    createdUserIds.push(rows[0].id);
    assert.equal(await countVerifiedRows(email), 0, "precondition: no verified row");

    const fixed = await mod.backfillOAuthVerifiedEmails();
    assert.ok(fixed >= 1, `backfill devia consertar pelo menos 1 user, voltou ${fixed}`);
    assert.equal(await countVerifiedRows(email), 1);

    // Idempotente: rodar de novo não duplica nem regride.
    await mod.backfillOAuthVerifiedEmails();
    assert.equal(await countVerifiedRows(email), 1);
  });
});
