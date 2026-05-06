import bcrypt from "bcrypt";
import crypto from "crypto";
import { query } from "../../db/index.js";
import type { RegisterInput, LoginInput } from "./validation.js";
import { trackEvent } from "../analytics/service.js";
import { sendVerificationCodeEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../../lib/email.js";
import { logger } from "../../utils/logger.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const VERIFICATION_CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000")
  );
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type UserRole = "client" | "producer" | "moderator" | "admin";

// Task #45 — formato nested do payload de preferências. Os campos
// flat antigos (push/email/...) continuam aceitos no parse para
// tolerar dados legados, mas a API nova grava sempre na chave
// `notifications`. `language` fica fora do bloco notifications porque
// não é uma notificação.
export interface NotificationFlags {
  push?: boolean;
  email?: boolean;
  weekly_digest?: boolean;
  missions?: boolean;
  community?: boolean;
}

export interface NotificationPreferences {
  notifications?: NotificationFlags;
  language?: string;
  theme?: string;
  // legacy flat keys (lidos mas não escritos)
  push?: boolean;
  email?: boolean;
  missions?: boolean;
  community?: boolean;
}

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  segments: string[];
  interests: string[];
  goals: string[];
  content_preferences: string[];
  notification_preferences: NotificationPreferences;
  level: number;
  xp: number;
  streak: number;
  is_premium: boolean;
  role: UserRole;
  created_at: string;
}

// Standard column list for SELECTs that hydrate a SafeUser. Keep all queries
// in sync with this list so the /me payload is consistent.
export const USER_SAFE_COLUMNS =
  "id, email, name, bio, avatar_url, segments, interests, goals, content_preferences, notification_preferences, level, xp, streak, is_premium, role, created_at";

// Task #48 — async because avatar_url is now persisted as an
// `objstore://` reference and must be turned into a fresh signed
// external URL before leaving the server.
async function toSafeUser(row: Record<string, unknown>): Promise<SafeUser> {
  const createdAt = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : String(row.created_at);

  const rawRole = (row.role as string | undefined) || "client";
  const role: UserRole =
    rawRole === "admin" || rawRole === "moderator" || rawRole === "producer"
      ? rawRole
      : "client";

  const rawPrefs = row.notification_preferences;
  const notification_preferences: NotificationPreferences =
    rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)
      ? (rawPrefs as NotificationPreferences)
      : {};

  const avatarUrl = await resolveStoredMediaUrl(
    (row.avatar_url as string | null) ?? null,
  );

  return {
    id: row.id as number,
    email: row.email as string,
    name: row.name as string,
    bio: (row.bio as string | null) ?? null,
    avatar_url: avatarUrl,
    segments: (row.segments as string[]) || [],
    interests: (row.interests as string[]) || [],
    goals: (row.goals as string[]) || [],
    content_preferences: (row.content_preferences as string[]) || [],
    notification_preferences,
    level: row.level as number,
    xp: row.xp as number,
    streak: row.streak as number,
    is_premium: row.is_premium as boolean,
    role,
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
  const sendResult = await sendVerificationCodeEmail(email, code);

  if (!sendResult.sent) {
    if (isDev) {
      console.log(`\n========================================`);
      console.log(`📧 CÓDIGO DE VERIFICAÇÃO (dev fallback)`);
      console.log(`   Email: ${email}`);
      console.log(`   Código: ${code}`);
      console.log(`   Expira em: 10 minutos`);
      console.log(`========================================\n`);
    } else {
      const err = new Error(
        "Não foi possível enviar o código por e-mail. Tente novamente em instantes.",
      ) as Error & { statusCode: number; code: string };
      err.statusCode = 502;
      err.code = "EMAIL_SEND_FAILED";
      throw err;
    }
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
     RETURNING ${USER_SAFE_COLUMNS}`,
    [input.email, passwordHash, input.name, segments, interests]
  );

  await query("DELETE FROM email_verification_codes WHERE email = $1", [input.email]);

  const user = await toSafeUser(result.rows[0]);
  const token = await createSession(user.id);

  trackEvent(user.id, "user_registered", { method: "email" });

  void sendWelcomeEmail(user.email, user.name);

  return { user, token };
}

export async function loginUser(input: LoginInput, ip?: string, userAgent?: string): Promise<{ user: SafeUser; token: string }> {
  const result = await query(
    `SELECT ${USER_SAFE_COLUMNS}, password_hash FROM users WHERE email = $1`,
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

  const user = await toSafeUser(row);
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
    `SELECT u.id, u.email, u.name, u.bio, u.avatar_url, u.segments, u.interests, u.goals, u.content_preferences, u.notification_preferences, u.level, u.xp, u.streak, u.is_premium, u.role, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return await toSafeUser(result.rows[0]);
}

export async function logoutUser(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function logoutAllSessions(userId: number): Promise<void> {
  await query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

export async function requestPasswordReset(email: string, ip?: string): Promise<void> {
  const userResult = await query(
    "SELECT id, email, name FROM users WHERE email = $1",
    [email],
  );

  if (userResult.rows.length === 0) {
    logger.info("Auth", `Password reset requested for unknown email: ${email}`);
    return;
  }

  const user = userResult.rows[0] as { id: number; email: string; name: string };

  const recent = await query(
    `SELECT created_at FROM password_reset_tokens
     WHERE user_id = $1 AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [user.id],
  );

  if (recent.rows.length > 0) {
    const lastSent = new Date(recent.rows[0].created_at).getTime();
    const elapsed = Date.now() - lastSent;
    if (elapsed < PASSWORD_RESET_REQUEST_COOLDOWN_MS) {
      logger.info(
        "Auth",
        `Password reset cooldown active for user ${user.id}; suppressing duplicate email.`,
      );
      return;
    }
  }

  await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
     VALUES ($1, $2, $3, $4)`,
    [user.id, tokenHash, expiresAt, ip || null],
  );

  const resetUrl = `${getAppUrl()}/?reset_token=${token}`;
  const isDev = process.env.NODE_ENV !== "production";

  const sendResult = await sendPasswordResetEmail(user.email, user.name, resetUrl);

  if (!sendResult.sent && isDev) {
    console.log(`\n========================================`);
    console.log(`🔐 LINK DE REDEFINIÇÃO DE SENHA (dev fallback)`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Link: ${resetUrl}`);
    console.log(`   Expira em: 30 minutos`);
    console.log(`========================================\n`);
  }

  trackEvent(user.id, "password_reset_requested", {});
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!token || typeof token !== "string" || token.length < 32) {
    const err = new Error("Link de redefinição inválido.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "INVALID_RESET_TOKEN";
    throw err;
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    const err = new Error("A nova senha deve ter pelo menos 8 caracteres.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "WEAK_PASSWORD";
    throw err;
  }

  const tokenHash = hashToken(token);

  const lookup = await query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );

  if (lookup.rows.length === 0) {
    const err = new Error("Link de redefinição inválido ou já utilizado.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "INVALID_RESET_TOKEN";
    throw err;
  }

  const lookupRow = lookup.rows[0] as { used_at: string | null; expires_at: string };

  if (lookupRow.used_at) {
    const err = new Error("Este link de redefinição já foi utilizado. Solicite um novo.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "RESET_TOKEN_USED";
    throw err;
  }

  if (new Date(lookupRow.expires_at) < new Date()) {
    const err = new Error("Link de redefinição expirado. Solicite um novo.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "RESET_TOKEN_EXPIRED";
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const claim = await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING id, user_id`,
    [tokenHash],
  );

  if (claim.rows.length === 0) {
    const err = new Error("Este link de redefinição já foi utilizado. Solicite um novo.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "RESET_TOKEN_USED";
    throw err;
  }

  const userId = (claim.rows[0] as { user_id: number }).user_id;

  await query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [passwordHash, userId],
  );

  await logoutAllSessions(userId);

  trackEvent(userId, "password_reset_completed", {});
}

export async function updateUserProfile(
  userId: number,
  updates: {
    name?: string;
    bio?: string | null;
    avatar_url?: string | null;
    segments?: string[];
    interests?: string[];
    goals?: string[];
    content_preferences?: string[];
    notification_preferences?: NotificationPreferences;
  }
): Promise<SafeUser> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.bio !== undefined) {
    setClauses.push(`bio = $${paramIndex++}`);
    values.push(updates.bio);
  }
  if (updates.avatar_url !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatar_url);
  }
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
  if (updates.notification_preferences !== undefined) {
    setClauses.push(`notification_preferences = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(updates.notification_preferences));
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
     RETURNING ${USER_SAFE_COLUMNS}`,
    values
  );

  if (result.rows.length === 0) {
    const err = new Error("Usuário não encontrado") as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  return await toSafeUser(result.rows[0]);
}

// Task #45 — troca de senha autenticada (usuário logado, sabe a senha atual).
// Distinto do reset-password (esquecimento via email).
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    const err = new Error("A nova senha deve ter pelo menos 8 caracteres.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "WEAK_PASSWORD";
    throw err;
  }
  if (newPassword.length > 128) {
    const err = new Error("A nova senha deve ter no máximo 128 caracteres.") as Error & { statusCode: number; code: string };
    err.statusCode = 400;
    err.code = "WEAK_PASSWORD";
    throw err;
  }

  const { rows } = await query(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId],
  );
  if (rows.length === 0) {
    const err = new Error("Usuário não encontrado") as Error & { statusCode: number; code: string };
    err.statusCode = 404;
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) {
    const err = new Error("Senha atual incorreta.") as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = "INVALID_CURRENT_PASSWORD";
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [passwordHash, userId],
  );

  trackEvent(userId, "password_changed", {});
}
