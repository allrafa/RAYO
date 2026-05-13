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
