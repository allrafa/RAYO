import { request, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";

export interface TestUser {
  id: number;
  email: string;
  name: string;
  password: string;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não definido — Playwright precisa do banco de dev pra cleanup.");
}

let pool = new Pool({ connectionString: databaseUrl, max: 4 });

function getPool(): Pool {
  // Reabre o pool se algum spec anterior (mesmo worker) já chamou
  // `closeDbPool()` no afterAll. Sem isso, a 2ª spec do worker explode
  // com "Cannot use a pool after calling end on the pool".
  if ((pool as unknown as { ended?: boolean }).ended) {
    pool = new Pool({ connectionString: databaseUrl, max: 4 });
  }
  return pool;
}

export async function closeDbPool() {
  await pool.end().catch(() => {});
}

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Prefixo escopado por worker do Playwright. Em paralelo (CI), cada worker
 * recebe um índice via `TEST_WORKER_INDEX` — usar isso no e-mail garante
 * que o cleanup `deleteAllTestUsersByEmailPrefix()` de um worker NUNCA
 * apague usuários ainda em uso por outro worker.
 */
export function workerEmailPrefix(): string {
  const idx = process.env.TEST_WORKER_INDEX ?? "0";
  return `test-w${idx}-`;
}

export function makeTestEmail(prefix: string): string {
  // Normaliza: se o caller passou algo começando com "test-", troca pelo
  // prefixo do worker; caso contrário, prepende o prefixo do worker.
  const wp = workerEmailPrefix();
  const normalized = prefix.startsWith("test-")
    ? prefix.replace(/^test-/, wp)
    : `${wp}${prefix}`;
  return `${uniqueSlug(normalized)}@rayo.test`;
}

/**
 * Pre-marca o e-mail como verificado direto no DB pra pular o fluxo
 * de envio de código (Resend) que não roda em teste. Idempotente.
 */
async function markEmailVerified(email: string): Promise<void> {
  await getPool().query(
    `INSERT INTO email_verification_codes (email, code, verified, expires_at)
     VALUES ($1, '000000', TRUE, NOW() + INTERVAL '1 hour')`,
    [email],
  );
}

export async function registerUser(
  api: APIRequestContext,
  input: { email?: string; name: string; password?: string; segments?: string[] } = { name: "Teste" },
): Promise<TestUser> {
  const email = input.email ?? makeTestEmail("test");
  const password = input.password ?? "Senha!Forte123";
  await markEmailVerified(email);
  const res = await api.post("/api/auth/register", {
    data: {
      email,
      password,
      name: input.name,
      segments: input.segments ?? ["solteiro"],
      interests: [],
    },
  });
  if (!res.ok()) {
    throw new Error(`registerUser falhou (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  const user = body?.data?.user;
  if (!user?.id || !user?.email) {
    throw new Error(`registerUser: resposta inesperada: ${JSON.stringify(body)}`);
  }
  return { id: user.id, email: user.email, name: user.name ?? input.name, password };
}

export async function loginViaApi(
  context: BrowserContext,
  baseURL: string,
  user: { email: string; password: string },
): Promise<void> {
  const apiCtx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const res = await apiCtx.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  if (!res.ok()) {
    await apiCtx.dispose();
    throw new Error(`loginViaApi falhou (${res.status()}): ${await res.text()}`);
  }
  const cookies = (await apiCtx.storageState()).cookies;
  await context.addCookies(cookies);
  await apiCtx.dispose();
}

/**
 * Task #206 — variante de `registerUser` que deixa o usuário SEM e-mail
 * verificado. Reusa o /api/auth/register normal (que exige uma linha
 * verified pra passar) e em seguida apaga TODAS as linhas de
 * email_verification_codes do e-mail. Resultado: user existe, sessão
 * funciona, mas `isUserEmailVerified(userId)` devolve false — exatamente
 * o estado pre-confirmação que o gating de criar comunidade exige.
 */
export async function registerUnverifiedUser(
  api: APIRequestContext,
  input: { email?: string; name: string; password?: string; segments?: string[] } = { name: "Teste" },
): Promise<TestUser> {
  const user = await registerUser(api, input);
  await getPool().query(
    `DELETE FROM email_verification_codes WHERE LOWER(email) = LOWER($1)`,
    [user.email],
  );
  return user;
}

/**
 * Task #206 — insere uma linha NÃO verificada com `code` conhecido,
 * simulando o que o backend gravaria após `POST /api/auth/resend-verification`.
 * Usado pelo spec do fluxo inline pra que o usuário consiga digitar um
 * código real e bater na rota /api/auth/verify-code sem depender do Resend.
 * Apaga linhas anteriores pro mesmo e-mail (mesma semântica de `sendVerificationCode`).
 */
export async function insertUnverifiedCode(email: string, code = "123456"): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const pool = getPool();
  await pool.query(`DELETE FROM email_verification_codes WHERE LOWER(email) = LOWER($1)`, [normalized]);
  await pool.query(
    `INSERT INTO email_verification_codes (email, code, verified, expires_at)
     VALUES ($1, $2, FALSE, NOW() + INTERVAL '10 minutes')`,
    [normalized, code],
  );
}

/**
 * Task #206 — cria um usuário "OAuth-only" replicando exatamente o que
 * `findOrCreateOAuthUser` faz no caminho de criação:
 *   - INSERT users com `google_id` setado e `password_hash NULL`.
 *   - INSERT email_verification_codes com `verified=TRUE` (espelho do
 *     trust do provider — `markEmailVerifiedFromTrustedProvider`).
 * Em seguida cria uma sessão direta no DB e devolve o token (pra o spec
 * gravar como cookie `session_token` no contexto). Retorna também o id
 * do user pra cleanup.
 */
export async function createOAuthUserWithSession(input: {
  email?: string;
  name?: string;
  provider?: "google" | "facebook";
}): Promise<TestUser & { sessionToken: string }> {
  const email = (input.email ?? makeTestEmail("test-oauth")).toLowerCase();
  const name = input.name ?? "OAuth Tester";
  const providerCol = (input.provider ?? "google") === "google" ? "google_id" : "facebook_id";
  const providerId = `oauth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const pool = getPool();
  // Espelho de markEmailVerifiedFromTrustedProvider — verified=TRUE.
  // CAST ::text pra evitar "inconsistent types deduced for parameter $1"
  // (mesma armadilha que pegamos no service na Task #206).
  await pool.query(
    `INSERT INTO email_verification_codes (email, code, verified, expires_at)
     SELECT $1::text, 'oauth', TRUE, NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM email_verification_codes
        WHERE LOWER(email) = LOWER($1::text) AND verified = TRUE
     )`,
    [email],
  );
  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO users (email, password_hash, name, ${providerCol}, segments)
     VALUES ($1, NULL, $2, $3, ARRAY[]::text[])
     RETURNING id`,
    [email, name, providerId],
  );
  const id = inserted.rows[0].id;

  // Sessão direta — token raw + sha256 (mesma rotina de createSession).
  const crypto = await import("node:crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [id, tokenHash],
  );

  return { id, email, name, password: "(oauth-no-password)", sessionToken: token };
}

/**
 * Apaga usuários de teste por id. Usa CASCADE/manuals em ordem segura.
 * Como o schema do RAYO tem várias FKs de user_id sem ON DELETE CASCADE
 * declarado uniformemente, fazemos o cleanup defensivamente: apaga
 * mensagens/conversas/posts/etc. ligados ao usuário e por fim o user.
 * Se uma tabela não existir, ignora silenciosamente.
 */
export async function deleteUsersById(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const tables: { sql: string; params?: unknown[] }[] = [
      { sql: `DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE sender_id = ANY($1))`, params: [ids] },
      { sql: `DELETE FROM messages WHERE sender_id = ANY($1)`, params: [ids] },
      { sql: `DELETE FROM conversations WHERE user_a_id = ANY($1) OR user_b_id = ANY($1)`, params: [ids] },
      { sql: `DELETE FROM notifications WHERE user_id = ANY($1)`, params: [ids] },
      { sql: `DELETE FROM sessions WHERE user_id = ANY($1)`, params: [ids] },
      { sql: `DELETE FROM users WHERE id = ANY($1)`, params: [ids] },
    ];
    for (const t of tables) {
      try {
        await client.query(t.sql, t.params);
      } catch (err: unknown) {
        // 42P01 = undefined_table (tabela opcional num schema mais antigo) — segue.
        // Qualquer outro erro (FK, etc.) é falha real: aborta pra não vazar usuário.
        const code = (err as { code?: string } | null)?.code;
        if (code === "42P01") continue;
        throw err;
      }
    }
    // Verifica que os usuários sumiram mesmo (defesa contra deleção parcial).
    const { rows: leftovers } = await client.query<{ id: number }>(
      `SELECT id FROM users WHERE id = ANY($1)`,
      [ids],
    );
    if (leftovers.length > 0) {
      throw new Error(`Cleanup incompleto: usuários remanescentes ${leftovers.map((r) => r.id).join(",")}`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Limpa restos de execuções anteriores (safety net por prefix de email).
 *
 * Default: usa o prefixo do worker atual (`test-w<idx>-`) — seguro em paralelo.
 * Caller pode passar um prefixo explícito; nesse caso prefixe com `test-w<idx>-`
 * pra preservar o isolamento por worker, ou use `"test-"` SOMENTE em runs
 * single-worker (local) pra varrer leftovers globais.
 */
export async function deleteAllTestUsersByEmailPrefix(prefix?: string): Promise<void> {
  const effective = prefix ?? workerEmailPrefix();
  const { rows } = await getPool().query<{ id: number }>(
    `SELECT id FROM users WHERE email LIKE $1 || '%' AND email LIKE '%@rayo.test'`,
    [effective],
  );
  await deleteUsersById(rows.map((r) => r.id));
}

// ── Task #241 helpers ────────────────────────────────────────────────

/**
 * Insere um token de reset de senha direto no DB com hash sha256 conhecido.
 * Espelha exatamente o que `createPasswordResetToken` faz no service:
 *   - hash sha256 hex do token raw
 *   - TTL 30 min (mesmo do service)
 * Devolve o token raw pra usar na URL `/?reset_token=XXX` que o App.tsx
 * intercepta em src/App.tsx:262.
 */
export async function insertPasswordResetToken(userId: number): Promise<string> {
  const crypto = await import("node:crypto");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await getPool().query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
    [userId, tokenHash],
  );
  return rawToken;
}

/**
 * Promove um user diretamente no DB pra um role específico. Usado pelos
 * specs de admin pra montar o cenário "admin loga e modera/promove" sem
 * depender de outro admin pré-existente no seed.
 */
export async function setUserRole(
  userId: number,
  role: "client" | "producer" | "moderator" | "admin",
): Promise<void> {
  await getPool().query(`UPDATE users SET role = $1 WHERE id = $2`, [role, userId]);
}

/**
 * Cria um post via API REST autenticada (usado por admin.spec pra ter
 * algo pra moderar). Devolve o id do post + slug do fórum (default 1
 * = "Solteiros & Preparação", sempre existe por seed).
 */
export async function createPostAsUser(
  baseURL: string,
  user: TestUser,
  body: { title: string; content: string; forum_id?: number },
): Promise<{ id: number; forumSlug: string }> {
  const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const loginRes = await api.post("/api/auth/login", {
    data: { email: user.email, password: user.password },
  });
  if (!loginRes.ok()) throw new Error(`login falhou: ${loginRes.status()} ${await loginRes.text()}`);
  const res = await api.post("/api/community/posts", {
    data: {
      forum_id: body.forum_id ?? 1,
      title: body.title,
      content: body.content,
      category: "discussao",
    },
  });
  if (!res.ok()) throw new Error(`createPost falhou: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  const post = json?.data?.post;
  if (!post?.id) throw new Error(`createPost: resposta inesperada: ${JSON.stringify(json)}`);
  const forumsRes = await api.get("/api/community/forums");
  const forums = (await forumsRes.json())?.data?.forums ?? [];
  const forum = forums.find((f: { id: number }) => f.id === (body.forum_id ?? 1));
  await api.dispose();
  return { id: post.id, forumSlug: forum?.slug ?? "solteiros-preparacao" };
}

// ── Task #242 helpers ────────────────────────────────────────────────

/**
 * Cria uma trilha + 1 curso + vínculo em trail_courses direto no DB.
 * Trilha tem `stripe_*_id` NULL — basta pro gating (`requireTrailAccess`)
 * funcionar (que lê só `subscriptions` + `trail_courses`). Pra um checkout
 * real exigiria os Price IDs, mas o spec mocka o pós-checkout via DB.
 * Devolve ids pra cleanup.
 */
export async function createTrailWithCourse(input: {
  slugPrefix?: string;
  trailTitle?: string;
  courseTitle?: string;
  monthlyPriceCents?: number;
}): Promise<{ trailId: number; trailSlug: string; courseId: number }> {
  const pool = getPool();
  const slug = uniqueSlug(input.slugPrefix ?? "test-trail");
  const trailTitle = input.trailTitle ?? "Trilha Teste E2E";
  const courseTitle = input.courseTitle ?? "Turma Teste E2E";
  const price = input.monthlyPriceCents ?? 4990;

  const trailIns = await pool.query<{ id: number }>(
    `INSERT INTO trails (slug, title, life_stage, description, monthly_price_cents, yearly_price_cents, active)
     VALUES ($1, $2, 'solteiro', 'desc teste', $3, $4, TRUE)
     RETURNING id`,
    [slug, trailTitle, price, price * 10],
  );
  const trailId = trailIns.rows[0].id;

  const courseIns = await pool.query<{ id: number }>(
    `INSERT INTO courses (title, description, life_context, is_premium, price, is_active)
     VALUES ($1, 'curso teste', 'solteiro', TRUE, 49.90, TRUE)
     RETURNING id`,
    [courseTitle],
  );
  const courseId = courseIns.rows[0].id;

  await pool.query(
    `INSERT INTO trail_courses (trail_id, course_id, sort_order) VALUES ($1, $2, 0)`,
    [trailId, courseId],
  );

  return { trailId, trailSlug: slug, courseId };
}

/**
 * Cleanup de trilhas/cursos criados por `createTrailWithCourse`. O
 * `trail_courses` CASCADE deleta os vínculos junto. `subscriptions`
 * também CASCADE quando trail é deletada.
 */
export async function deleteTrailAndCourse(input: { trailId?: number; courseId?: number }): Promise<void> {
  const pool = getPool();
  if (input.trailId) {
    await pool.query(`DELETE FROM subscriptions WHERE trail_id = $1`, [input.trailId]).catch(() => {});
    await pool.query(`DELETE FROM trails WHERE id = $1`, [input.trailId]).catch(() => {});
  }
  if (input.courseId) {
    await pool.query(`DELETE FROM courses WHERE id = $1`, [input.courseId]).catch(() => {});
  }
}

/**
 * Mock do "pós-checkout": insere row em `subscriptions` com status=active
 * direto no DB. Espelha exatamente o que `upsertSubscriptionRow` faz
 * via webhook. `stripe_subscription_id` único é gerado random pra
 * permitir múltiplos specs sem colisão.
 */
export async function createSubscription(input: {
  userId: number;
  trailId: number;
  status?: "active" | "trialing" | "past_due" | "canceled";
  interval?: "month" | "year";
}): Promise<{ id: number; stripeSubscriptionId: string }> {
  const crypto = await import("node:crypto");
  const stripeSubId = `sub_test_${crypto.randomBytes(8).toString("hex")}`;
  const stripeCustId = `cus_test_${crypto.randomBytes(8).toString("hex")}`;
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO subscriptions
       (user_id, trail_id, stripe_subscription_id, stripe_customer_id,
        status, interval, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days', FALSE)
     RETURNING id`,
    [
      input.userId,
      input.trailId,
      stripeSubId,
      stripeCustId,
      input.status ?? "active",
      input.interval ?? "month",
    ],
  );
  return { id: rows[0].id, stripeSubscriptionId: stripeSubId };
}

/**
 * Cria um `content_item` direto no DB. Usado pelo spec de SEO
 * pra garantir um artigo de blog publicado sem depender de seed.
 * Devolve id + slug pra cleanup.
 */
export async function createContentItem(input: {
  kind?: "audio" | "video" | "reels" | "serie" | "curso" | "livro" | "artigo";
  title?: string;
  slugPrefix?: string;
  status?: "draft" | "published" | "archived";
  body?: string;
  createdBy?: number | null;
}): Promise<{ id: number; slug: string }> {
  const slug = uniqueSlug(input.slugPrefix ?? "test-art");
  const kind = input.kind ?? "artigo";
  const status = input.status ?? "published";
  const title = input.title ?? "Artigo de teste E2E";
  const body = input.body ?? "Corpo do artigo de teste.";
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO content_items
       (kind, title, slug, short_description, long_description, status, published_at, created_by, segments)
     VALUES ($1, $2, $3, $4, $5, $6,
             CASE WHEN $6 = 'published' THEN NOW() ELSE NULL END,
             $7, ARRAY[]::text[])
     RETURNING id`,
    [kind, title, slug, body.slice(0, 200), body, status, input.createdBy ?? null],
  );
  return { id: rows[0].id, slug };
}

export async function deleteContentItem(id: number): Promise<void> {
  await getPool().query(`DELETE FROM content_items WHERE id = $1`, [id]).catch(() => {});
}

/**
 * Inicia uma conversa entre A e B via API + manda uma mensagem inicial.
 * Devolve o id da conversa e da mensagem. Espelha o fluxo do composer
 * (POST /api/messages/conversations + POST .../messages).
 */
export async function startConversationWithMessage(
  baseURL: string,
  sender: TestUser,
  recipient: TestUser,
  text: string,
): Promise<{ conversationId: number; messageId: number }> {
  const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const loginRes = await api.post("/api/auth/login", {
    data: { email: sender.email, password: sender.password },
  });
  if (!loginRes.ok()) throw new Error(`login falhou: ${loginRes.status()} ${await loginRes.text()}`);
  const convRes = await api.post("/api/messages/conversations", {
    data: { other_user_id: recipient.id },
  });
  if (!convRes.ok()) throw new Error(`createConv falhou: ${convRes.status()} ${await convRes.text()}`);
  const conv = (await convRes.json())?.data?.conversation;
  if (!conv?.id) throw new Error(`createConv: resposta inesperada`);
  const msgRes = await api.post(`/api/messages/conversations/${conv.id}/messages`, {
    data: { content: text },
  });
  if (!msgRes.ok()) throw new Error(`sendMsg falhou: ${msgRes.status()} ${await msgRes.text()}`);
  const msg = (await msgRes.json())?.data?.message;
  await api.dispose();
  return { conversationId: conv.id, messageId: msg.id };
}
