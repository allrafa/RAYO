// Task #208 — Lock-in: nenhum outro gate autenticado da plataforma
// (criar post, criar comentário, iniciar DM) pode regredir bloqueando
// usuários OAuth com `EMAIL_NOT_VERIFIED`. Hoje só `createForumByUser`
// chama `isUserEmailVerified`; este spec garante que se alguém adicionar
// um gate novo nessas rotas sem passar pelo trust do provider OAuth, a
// suíte falha imediatamente.
//
// Modelo: replica o estado pós-callback OAuth via helper de DB
// (`createOAuthUserWithSession`) — não depende do provider real.
import { request } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  createOAuthUserWithSession,
  deleteUsersById,
  deleteAllTestUsersByEmailPrefix,
  closeDbPool,
  makeTestEmail,
} from "./helpers/api";

test.describe("OAuth user passa em todos os gates autenticados (Task #208)", () => {
  const cleanupIds: number[] = [];

  test.beforeAll(async () => {
    await deleteAllTestUsersByEmailPrefix();
  });

  test.afterEach(async () => {
    if (cleanupIds.length > 0) {
      await deleteUsersById(cleanupIds.splice(0));
    }
  });

  test.afterAll(async () => {
    await closeDbPool();
  });

  test("OAuth user cria post, comenta e inicia DM sem ver EMAIL_NOT_VERIFIED", async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();

    // Dois usuários OAuth: autor (faz tudo) e alvo (recebe a DM).
    const author = await createOAuthUserWithSession({
      email: makeTestEmail("test-oauth-author"),
      name: "Olivia Author",
    });
    cleanupIds.push(author.id);
    const target = await createOAuthUserWithSession({
      email: makeTestEmail("test-oauth-target"),
      name: "Tomás Target",
      provider: "facebook",
    });
    cleanupIds.push(target.id);

    const api = await request.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        Cookie: `session_token=${author.sessionToken}`,
      },
    });

    // Sanity: sessão OAuth reconhecida.
    const me = await api.get("/api/auth/me");
    expect(me.status()).toBe(200);

    const stamp = Date.now();

    // 1) Cria post no fórum 1 (seed "Solteiros & Preparação" sempre existe).
    const postRes = await api.post("/api/community/posts", {
      data: {
        forum_id: 1,
        title: `Post OAuth ${stamp}`,
        content: `Conteúdo OAuth ${stamp}`,
        category: "discussao",
      },
    });
    expect(
      postRes.status(),
      `criar post: esperava 201; veio ${postRes.status()} body=${await postRes.text()}`,
    ).toBe(201);
    const postBody = await postRes.json();
    const postId = postBody?.data?.post?.id;
    expect(postId, "post id deve voltar do create").toBeTruthy();

    // 2) Comenta no próprio post.
    const commentRes = await api.post(`/api/community/posts/${postId}/comments`, {
      data: { content: `Comentário OAuth ${stamp}` },
    });
    expect(
      commentRes.status(),
      `comentar: esperava 201; veio ${commentRes.status()} body=${await commentRes.text()}`,
    ).toBe(201);

    // 3) Inicia DM com o segundo usuário OAuth.
    const convRes = await api.post("/api/messages/conversations", {
      data: { user_id: target.id },
    });
    expect(
      [200, 201].includes(convRes.status()),
      `iniciar conversa: esperava 200/201; veio ${convRes.status()} body=${await convRes.text()}`,
    ).toBe(true);
    const convBody = await convRes.json();
    const conversationId = convBody?.data?.conversation?.id;
    expect(conversationId, "conversation id deve voltar").toBeTruthy();

    // E manda mensagem (gate real do envio).
    const msgRes = await api.post(`/api/messages/conversations/${conversationId}/messages`, {
      data: { kind: "text", content: `Olá do OAuth ${stamp}` },
    });
    expect(
      msgRes.status(),
      `enviar mensagem: esperava 201; veio ${msgRes.status()} body=${await msgRes.text()}`,
    ).toBe(201);

    // Defesa explícita: nenhuma das respostas pode ter sido o erro do gate.
    for (const [label, res] of [
      ["post", postRes],
      ["comment", commentRes],
      ["conversation", convRes],
      ["message", msgRes],
    ] as const) {
      const text = await res.text().catch(() => "");
      expect(
        text.includes("EMAIL_NOT_VERIFIED"),
        `${label} não pode devolver EMAIL_NOT_VERIFIED pra OAuth user`,
      ).toBe(false);
    }

    await api.dispose();
  });
});
