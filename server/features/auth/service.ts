import bcrypt from "bcrypt";
import crypto from "crypto";
import { query } from "../../db/index.js";
import type { RegisterInput, LoginInput } from "./validation.js";
import { trackEvent } from "../analytics/service.js";
import { sendVerificationCodeEmail, sendWelcomeEmail } from "../../lib/email.js";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  segments: string[];
  interests: string[];
  goals: string[];
  content_preferences: string[];
  level: number;
  xp: number;
  streak: number;
  is_premium: boolean;
  created_at: string;
}

function toSafeUser(row: Record<string, unknown>): SafeUser {
  const createdAt = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : String(row.created_at);

  return {
    id: row.id as number,
    email: row.email as string,
    name: row.name as string,
    segments: (row.segments as string[]) || [],
    interests: (row.interests as string[]) || [],
    goals: (row.goals as string[]) || [],
    content_preferences: (row.content_preferences as string[]) || [],
    level: row.level as number,
    xp: row.xp as number,
    streak: row.streak as number,
    is_premium: row.is_premium as boolean,
    created_at: createdAt,
  };
}

function generateVerificationCode(): string {
  if (process.env.NODE_ENV !== "production") {
    return "123456";
  }
  return String(crypto.randomInt(100000, 999999));
}

export async function sendVerificationCode(email: string): Promise<{ cooldownSeconds?: number }> {
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    const err = new Error("Este email já está registrado") as Error & { statusCode: number; code: string };
    err.statusCode = 409;
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const recent = await query(
    `SELECT created_at FROM email_verification_codes
     WHERE email = $1
     ORDER BY created_at DESC LIMIT 1`,
    [email]
  );

  if (recent.rows.length > 0) {
    const lastSent = new Date(recent.rows[0].created_at).getTime();
    const elapsed = Date.now() - lastSent;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Aguarde ${remaining} segundos para reenviar o código`) as Error & { statusCode: number; code: string };
      err.statusCode = 429;
      err.code = "COOLDOWN";
      throw err;
    }
  }

  await query("DELETE FROM email_verification_codes WHERE email = $1", [email]);

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MS);

  await query(
    `INSERT INTO email_verification_codes (email, code, expires_at)
     VALUES ($1, $2, $3)`,
    [email, code, expiresAt]
  );

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.log(`\n========================================`);
    console.log(`📧 CÓDIGO DE VERIFICAÇÃO (dev fallback)`);
    console.log(`   Email: ${email}`);
    console.log(`   Código: ${code}`);
    console.log(`   Expira em: 10 minutos`);
    console.log(`========================================\n`);
  }

  const sendResult = await sendVerificationCodeEmail(email, code);

  if (!sendResult.sent && !isDev) {
    const err = new Error(
      "Não foi possível enviar o código por e-mail. Tente novamente em instantes.",
    ) as Error & { statusCode: number; code: string };
    err.statusCode = 502;
    err.code = "EMAIL_SEND_FAILED";
    throw err;
  }

  return {};
}

export async function verifyCode(email: string, code: string): Promise<{ verified: boolean }> {
  const result = await query(
    `SELECT id, code, attempts, expires_at FROM email_verification_codes
     WHERE email = $1 AND verified = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error("Nenhum código encontrado. Solicite um novo código.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "NO_CODE";
    throw err;
  }

  const row = result.rows[0];

  if (new Date(row.expires_at) < new Date()) {
    await query("DELETE FROM email_verification_codes WHERE email = $1", [email]);
    const err = new Error("Código expirado. Solicite um novo código.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "CODE_EXPIRED";
    throw err;
  }

  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await query("DELETE FROM email_verification_codes WHERE email = $1", [email]);
    const err = new Error("Muitas tentativas. Solicite um novo código.") as Error & { statusCode: number; code: string };
    err.statusCode = 429;
    err.code = "TOO_MANY_ATTEMPTS";
    throw err;
  }

  if (row.code !== code) {
    await query(
      "UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1",
      [row.id]
    );
    const remaining = MAX_CODE_ATTEMPTS - (row.attempts + 1);
    const err = new Error(`Código incorreto. ${remaining} tentativa(s) restante(s).`) as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "INVALID_CODE";
    throw err;
  }

  await query(
    "UPDATE email_verification_codes SET verified = TRUE WHERE id = $1",
    [row.id]
  );

  return { verified: true };
}

export async function registerUser(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
  const verified = await query(
    `SELECT id FROM email_verification_codes
     WHERE email = $1 AND verified = TRUE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [input.email]
  );

  if (verified.rows.length === 0) {
    const err = new Error("Email não verificado. Solicite um código de verificação.") as Error & { statusCode: number; code: string };
    err.statusCode = 403;
    err.code = "EMAIL_NOT_VERIFIED";
    throw err;
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [input.email]);
  if (existing.rows.length > 0) {
    const err = new Error("Este email já está registrado") as Error & { statusCode: number; code: string };
    err.statusCode = 409;
    err.code = "EMAIL_EXISTS";
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const segments = input.segments || [];
  const interests = input.interests || [];

  const result = await query(
    `INSERT INTO users (email, password_hash, name, segments, interests)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, segments, interests, goals, content_preferences, level, xp, streak, is_premium, created_at`,
    [input.email, passwordHash, input.name, segments, interests]
  );

  await query("DELETE FROM email_verification_codes WHERE email = $1", [input.email]);

  const user = toSafeUser(result.rows[0]);
  const token = await createSession(user.id);

  trackEvent(user.id, "user_registered", { method: "email" });

  sendWelcomeEmail(user.email, user.name).catch(() => {});

  return { user, token };
}

export async function loginUser(input: LoginInput, ip?: string, userAgent?: string): Promise<{ user: SafeUser; token: string }> {
  const result = await query(
    "SELECT id, email, name, segments, interests, goals, content_preferences, password_hash, level, xp, streak, is_premium, created_at FROM users WHERE email = $1",
    [input.email]
  );

  if (result.rows.length === 0) {
    const err = new Error("Email ou senha incorretos") as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const row = result.rows[0];
  const validPassword = await bcrypt.compare(input.password, row.password_hash);

  if (!validPassword) {
    const err = new Error("Email ou senha incorretos") as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  const user = toSafeUser(row);
  const token = await createSession(user.id, ip, userAgent);

  await query("UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1", [user.id]);

  trackEvent(user.id, "user_login", { method: "email" });

  return { user, token };
}

async function createSession(userId: number, ip?: string, userAgent?: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, ip || null, userAgent || null]
  );

  return token;
}

export async function validateSession(token: string): Promise<SafeUser | null> {
  const tokenHash = hashToken(token);

  const result = await query(
    `SELECT u.id, u.email, u.name, u.segments, u.interests, u.goals, u.content_preferences, u.level, u.xp, u.streak, u.is_premium, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return toSafeUser(result.rows[0]);
}

export async function logoutUser(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function logoutAllSessions(userId: number): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export async function updateUserProfile(
  userId: number,
  updates: { segments?: string[]; interests?: string[]; goals?: string[]; content_preferences?: string[] }
): Promise<SafeUser> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.segments !== undefined) {
    setClauses.push(`segments = $${paramIndex++}`);
    values.push(updates.segments);
  }
  if (updates.interests !== undefined) {
    setClauses.push(`interests = $${paramIndex++}`);
    values.push(updates.interests);
  }
  if (updates.goals !== undefined) {
    setClauses.push(`goals = $${paramIndex++}`);
    values.push(updates.goals);
  }
  if (updates.content_preferences !== undefined) {
    setClauses.push(`content_preferences = $${paramIndex++}`);
    values.push(updates.content_preferences);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, email, name, segments, interests, goals, content_preferences, level, xp, streak, is_premium, created_at`,
    values
  );

  if (result.rows.length === 0) {
    const err = new Error("Usuário não encontrado") as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  return toSafeUser(result.rows[0]);
}
