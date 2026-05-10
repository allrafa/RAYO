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

const pool = new Pool({ connectionString: databaseUrl, max: 4 });

export async function closeDbPool() {
  await pool.end().catch(() => {});
}

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeTestEmail(prefix: string): string {
  return `${uniqueSlug(prefix)}@rayo.test`;
}

/**
 * Pre-marca o e-mail como verificado direto no DB pra pular o fluxo
 * de envio de código (Resend) que não roda em teste. Idempotente.
 */
async function markEmailVerified(email: string): Promise<void> {
  await pool.query(
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
 * Apaga usuários de teste por id. Usa CASCADE/manuals em ordem segura.
 * Como o schema do RAYO tem várias FKs de user_id sem ON DELETE CASCADE
 * declarado uniformemente, fazemos o cleanup defensivamente: apaga
 * mensagens/conversas/posts/etc. ligados ao usuário e por fim o user.
 * Se uma tabela não existir, ignora silenciosamente.
 */
export async function deleteUsersById(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const client = await pool.connect();
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
      } catch (err: any) {
        // 42P01 = undefined_table (tabela opcional num schema mais antigo) — segue.
        // Qualquer outro erro (FK, etc.) é falha real: aborta pra não vazar usuário.
        if (err?.code === "42P01") continue;
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

/** Limpa restos de qualquer execução anterior (safety net por prefix de email). */
export async function deleteAllTestUsersByEmailPrefix(prefix = "test-"): Promise<void> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM users WHERE email LIKE $1 || '%' AND email LIKE '%@rayo.test'`,
    [prefix],
  );
  await deleteUsersById(rows.map((r) => r.id));
}
