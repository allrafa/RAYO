// Task #234 — Helpers de banco pra specs de integration tests.
//
// Padrões:
//   * `ensureSchema()` chama `initializeSchema()` UMA vez por processo —
//     idempotente, seguro de chamar em cada spec.
//   * `truncateAll()` esvazia todas as tabelas de dados do usuário em
//     ordem de FK. NÃO toca em tabelas de seed (badges, missions).
//   * `makeUser({ role })` cria user já com email verificado + sessão
//     ativa, retornando `{ id, email, sessionCookie }` pronto pra usar
//     no header `Cookie:` das requests.
//
// Isolamento entre specs: cada `afterEach` deve chamar `truncateAll()`.
// Rodadas em paralelo (CI) precisam de DBs distintos por worker — o
// `tests/integration/README.md` documenta o trade-off (mesmo padrão dos
// e2e specs).
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import pg from "pg";
import { initializeSchema } from "../../../server/db/schema.js";
import { closeDb as closeAppPool } from "../../../server/db/index.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não definido — integration tests precisam de um Postgres.",
  );
}

let pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });

export function getPool(): pg.Pool {
  if ((pool as unknown as { ended?: boolean }).ended) {
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  // Fecha tanto o pool dos helpers quanto o pool global compartilhado por
  // `server/db/index.ts` (usado pelas rotas). Sem fechar o global, o
  // processo de teste fica preso ~30s aguardando `idleTimeoutMillis`.
  await Promise.all([
    pool.end().catch(() => {}),
    closeAppPool(),
  ]);
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initializeSchema();
  }
  return schemaReady;
}

// Ordem importa: filhos antes dos pais. Tabelas opcionais (ainda não
// criadas em algum schema legado) são toleradas via try/catch 42P01.
const TRUNCATE_ORDER: ReadonlyArray<string> = [
  "message_reactions",
  "messages",
  "conversation_user_state",
  "conversations",
  "dm_email_sent",
  "notifications",
  "comment_likes",
  "comment_reactions",
  "comments",
  "post_likes",
  "post_reactions",
  "post_saves",
  "posts",
  "stripe_webhook_events",
  "subscriptions",
  "trail_courses",
  "trails",
  "forum_subscriptions",
  "forum_moderators",
  "forums",
  "user_follows",
  "user_mission_progress",
  "user_lesson_progress",
  "user_course_progress",
  "course_reviews",
  "course_lessons",
  "course_modules",
  "courses",
  "class_interest_email_sent",
  "class_interests",
  "content_episodes",
  "content_items",
  "home_today_completions",
  "home_feed_items",
  "media_assets",
  "lgpd_requests",
  "mod_actions",
  "analytics_events",
  "user_badges",
  "xp_log",
  "user_xp",
  "password_reset_tokens",
  "email_verification_codes",
  "sessions",
  "users",
];

export async function truncateAll(): Promise<void> {
  const client = await getPool().connect();
  try {
    // Único TRUNCATE com CASCADE + RESTART IDENTITY é mais rápido do que
    // 40 DELETEs sequenciais. Tabelas opcionais ausentes são filtradas.
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [TRUNCATE_ORDER as string[]],
    );
    const present = new Set(rows.map((r) => r.tablename));
    const list = TRUNCATE_ORDER.filter((t) => present.has(t));
    if (list.length === 0) return;
    await client.query(
      `TRUNCATE TABLE ${list.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  } finally {
    client.release();
  }
}

export type UserRole = "client" | "producer" | "moderator" | "admin";

export interface MadeUser {
  id: number;
  email: string;
  name: string;
  password: string;
  sessionCookie: string;
}

/**
 * Cria user com email verificado + sessão ativa em uma única transação.
 * O `sessionCookie` retornado é o header `Cookie:` completo (`session_token=…`).
 *
 * `role` opcional escreve em `users.role` quando a coluna existir; caso o
 * schema use uma tabela separada, ajustar quando essa task chegar (#240).
 */
export async function makeUser(
  input: { email?: string; name?: string; password?: string; role?: UserRole } = {},
): Promise<MadeUser> {
  await ensureSchema();
  const rand = crypto.randomBytes(4).toString("hex");
  const email = (input.email ?? `it-${Date.now().toString(36)}-${rand}@rayo.test`).toLowerCase();
  const name = input.name ?? `IT User ${rand}`;
  const password = input.password ?? "Senha!Forte123";
  const hash = await bcrypt.hash(password, 10);

  const pool = getPool();
  // Espelho de markEmailVerifiedFromTrustedProvider — só vira "verified".
  await pool.query(
    `INSERT INTO email_verification_codes (email, code, verified, expires_at)
     VALUES ($1, '000000', TRUE, NOW() + INTERVAL '1 hour')`,
    [email],
  );

  // role-aware insert: tenta com coluna `role` primeiro; se não existir
  // (42703 undefined_column), cai pro insert sem role.
  let insertedId: number;
  try {
    const r = await pool.query<{ id: number }>(
      `INSERT INTO users (email, password_hash, name, segments, role)
       VALUES ($1, $2, $3, ARRAY[]::text[], $4)
       RETURNING id`,
      [email, hash, name, input.role ?? "client"],
    );
    insertedId = r.rows[0].id;
  } catch (err: unknown) {
    if ((err as { code?: string } | null)?.code === "42703") {
      const r = await pool.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, name, segments)
         VALUES ($1, $2, $3, ARRAY[]::text[])
         RETURNING id`,
        [email, hash, name],
      );
      insertedId = r.rows[0].id;
    } else {
      throw err;
    }
  }

  // Sessão direta — mesma rotina do `createSessionForUser`: token raw +
  // sha256 stored. Caller usa o token raw como cookie.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [insertedId, tokenHash],
  );

  return {
    id: insertedId,
    email,
    name,
    password,
    sessionCookie: `session_token=${token}`,
  };
}
