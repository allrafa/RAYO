// Task #236 — CRUD do CMS por kind + matriz de ownership.
//
// Exercita o SERVICE direto (não HTTP) — é onde mora a checagem de
// ownership (`assertCanMutate`). Cobre os 7 kinds suportados
// (audio, video, reels, serie, curso, livro, artigo) e a matriz:
//   * owner (producer) edita o próprio → OK
//   * outro producer tenta editar → 403 NOT_OWNER
//   * moderator override → OK
//   * admin override → OK
//   * unauth (null) → 401 UNAUTHORIZED
//
// Também valida o "soft-delete" via status='archived' (a plataforma
// NÃO usa coluna `hidden` — `archived` é o estado de retirada
// editorial; `DELETE` físico existe mas é raro/admin).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createContent,
  updateContent,
  setContentStatus,
  deleteContent,
  CmsError,
  VALID_KINDS,
  type ContentKind,
} from "../../../server/features/cms/service.js";
import type { SafeUser } from "../../../server/features/auth/service.js";
import {
  closeDbPool,
  ensureSchema,
  truncateAll,
  makeUser,
} from "../helpers/db.js";

function asSafeUser(u: { id: number; email: string; name: string }, role: SafeUser["role"]): SafeUser {
  // O service só lê id + role do SafeUser. Demais campos não importam.
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    email_verified: true,
    avatar_url: null,
    segments: [],
    created_at: new Date(),
  } as unknown as SafeUser;
}

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("CMS CRUD por kind (Task #236)", () => {
  it("cria conteúdo válido para cada um dos 7 kinds", async () => {
    const u = await makeUser({ role: "producer" });
    const user = asSafeUser(u, "producer");
    for (const kind of VALID_KINDS as ContentKind[]) {
      const { item } = await createContent(user, {
        kind,
        title: `Teste ${kind}`,
        short_description: "x",
      });
      assert.equal(item.kind, kind);
      assert.equal(item.created_by, u.id);
      assert.equal(item.status, "draft");
      assert.ok(item.slug, "slug deve ser gerado a partir do título");
    }
  });

  it("rejeita kind inválido com INVALID_KIND", async () => {
    const u = await makeUser({ role: "producer" });
    await assert.rejects(
      () =>
        createContent(asSafeUser(u, "producer"), {
          // @ts-expect-error — intencional pra disparar a validação.
          kind: "foo",
          title: "x",
        }),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "INVALID_KIND");
        assert.equal((err as CmsError).statusCode, 400);
        return true;
      },
    );
  });
});

describe("CMS ownership matrix (Task #236)", () => {
  it("owner producer edita o próprio conteúdo", async () => {
    const u = await makeUser({ role: "producer" });
    const user = asSafeUser(u, "producer");
    const { item } = await createContent(user, { kind: "audio", title: "Meu áudio" });
    const updated = await updateContent(user, item.id, { title: "Áudio editado" });
    assert.equal(updated.item.title, "Áudio editado");
  });

  it("producer diferente NÃO pode editar (403 NOT_OWNER)", async () => {
    const owner = await makeUser({ role: "producer" });
    const intruso = await makeUser({ role: "producer" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "video",
      title: "Vídeo do dono",
    });
    await assert.rejects(
      () =>
        updateContent(asSafeUser(intruso, "producer"), item.id, {
          title: "intruso tentou",
        }),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "NOT_OWNER");
        assert.equal((err as CmsError).statusCode, 403);
        return true;
      },
    );
  });

  it("moderator override edita conteúdo de terceiros", async () => {
    const owner = await makeUser({ role: "producer" });
    const mod = await makeUser({ role: "moderator" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "artigo",
      title: "Post original",
    });
    const updated = await updateContent(asSafeUser(mod, "moderator"), item.id, {
      title: "Post moderado",
    });
    assert.equal(updated.item.title, "Post moderado");
  });

  it("admin override edita conteúdo de terceiros", async () => {
    const owner = await makeUser({ role: "producer" });
    const admin = await makeUser({ role: "admin" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "livro",
      title: "Livro original",
    });
    const updated = await updateContent(asSafeUser(admin, "admin"), item.id, {
      title: "Livro editado por admin",
    });
    assert.equal(updated.item.title, "Livro editado por admin");
  });

  it("producer diferente NÃO pode deletar (403 NOT_OWNER)", async () => {
    const owner = await makeUser({ role: "producer" });
    const intruso = await makeUser({ role: "producer" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "reels",
      title: "Reels do dono",
    });
    await assert.rejects(
      () => deleteContent(asSafeUser(intruso, "producer"), item.id),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "NOT_OWNER");
        return true;
      },
    );
  });

  it("moderator pode deletar conteúdo de terceiros (hard delete)", async () => {
    const owner = await makeUser({ role: "producer" });
    const mod = await makeUser({ role: "moderator" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "curso",
      title: "Curso a remover",
    });
    const result = await deleteContent(asSafeUser(mod, "moderator"), item.id);
    assert.equal(result.id, item.id);
  });

  it("role 'client' tentando editar conteúdo de producer → 403 NOT_OWNER", async () => {
    // RBAC: cliente comum (`role='client'`, nível mais baixo) NÃO tem
    // override sobre conteúdo alheio. A hierarquia é
    // client < producer < moderator < admin e `assertCanMutate` só
    // libera owner OU `moderator+`. Esse caso é importante porque
    // representa o usuário típico autenticado — não basta validar
    // unauth (null) e producer alheio.
    const owner = await makeUser({ role: "producer" });
    const client = await makeUser({ role: "client" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "audio",
      title: "Áudio do producer",
    });
    await assert.rejects(
      () =>
        updateContent(asSafeUser(client, "client"), item.id, {
          title: "cliente tentou mexer",
        }),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "NOT_OWNER");
        assert.equal((err as CmsError).statusCode, 403);
        return true;
      },
    );
  });

  it("unauth (user=null) em updateContent → 401 UNAUTHORIZED", async () => {
    const owner = await makeUser({ role: "producer" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "audio",
      title: "Sem dono pode mexer?",
    });
    await assert.rejects(
      // @ts-expect-error — null user simula chamada sem sessão.
      () => updateContent(null, item.id, { title: "x" }),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "UNAUTHORIZED");
        assert.equal((err as CmsError).statusCode, 401);
        return true;
      },
    );
  });

  it("unauth (user=null) em setContentStatus → 401 UNAUTHORIZED", async () => {
    const owner = await makeUser({ role: "producer" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "audio",
      title: "Estado sem dono",
    });
    await assert.rejects(
      // @ts-expect-error — null user simula chamada sem sessão.
      () => setContentStatus(null, item.id, "published"),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "UNAUTHORIZED");
        return true;
      },
    );
  });

  it("updateContent em ID inexistente devolve CONTENT_NOT_FOUND (404)", async () => {
    const u = await makeUser({ role: "moderator" });
    await assert.rejects(
      () => updateContent(asSafeUser(u, "moderator"), 999_999, { title: "x" }),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "CONTENT_NOT_FOUND");
        assert.equal((err as CmsError).statusCode, 404);
        return true;
      },
    );
  });
});

describe("CMS status transitions / soft-archive (Task #236)", () => {
  it("publica e despublica, fecha em archived (soft-retire)", async () => {
    const u = await makeUser({ role: "producer" });
    const user = asSafeUser(u, "producer");
    const { item } = await createContent(user, { kind: "audio", title: "Ciclo" });
    assert.equal(item.status, "draft");

    const published = await setContentStatus(user, item.id, "published");
    assert.equal(published.item.status, "published");
    assert.ok(published.item.published_at);

    const archived = await setContentStatus(user, item.id, "archived");
    assert.equal(archived.item.status, "archived");
  });

  it("moderator override pode arquivar (soft-delete) conteúdo alheio", async () => {
    // Soft-delete via `status='archived'` é o caminho real de retirada
    // editorial (deleteContent físico é raro/admin). Validamos que
    // moderator+ aplica `archived` em conteúdo de terceiros — o caso
    // típico de moderação editorial.
    const owner = await makeUser({ role: "producer" });
    const mod = await makeUser({ role: "moderator" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "artigo",
      title: "Post a moderar",
    });
    // Owner publica primeiro pra exercitar a transição published→archived
    // (que é o ciclo real: moderator arquiva algo que estava no ar).
    await setContentStatus(asSafeUser(owner, "producer"), item.id, "published");
    const archived = await setContentStatus(
      asSafeUser(mod, "moderator"),
      item.id,
      "archived",
    );
    assert.equal(archived.item.status, "archived");
  });

  it("setContentStatus exige ownership (producer alheio → NOT_OWNER)", async () => {
    const owner = await makeUser({ role: "producer" });
    const intruso = await makeUser({ role: "producer" });
    const { item } = await createContent(asSafeUser(owner, "producer"), {
      kind: "serie",
      title: "Série",
    });
    await assert.rejects(
      () => setContentStatus(asSafeUser(intruso, "producer"), item.id, "published"),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "NOT_OWNER");
        return true;
      },
    );
  });

  it("status inválido devolve INVALID_STATUS (400)", async () => {
    const u = await makeUser({ role: "producer" });
    const user = asSafeUser(u, "producer");
    const { item } = await createContent(user, { kind: "audio", title: "x" });
    await assert.rejects(
      // @ts-expect-error — intencional.
      () => setContentStatus(user, item.id, "weird"),
      (err: unknown) => {
        assert.ok(err instanceof CmsError);
        assert.equal((err as CmsError).code, "INVALID_STATUS");
        return true;
      },
    );
  });
});
