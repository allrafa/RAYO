// Aliança (Modo Casal) — ALIANCA_PLAN.md.
//
// Princípio: encorajamento, não vigilância. O cônjuge vê apenas
// atividade sim/não, chama do casal, améns e orações — nunca qual
// conteúdo ou quanto tempo. Toda a mecânica roda sobre infraestrutura
// existente: notifications (com web push), XP e xp_log (mesma fonte do
// streak-calendar individual).
import crypto from "node:crypto";
import { query } from "../../db/index.js";
import { addXP } from "../gamification/service.js";
import { createNotification } from "../notifications/service.js";

const PAIR_XP = 25;
const PRAYER_XP = 3;

// Sem 0/O/1/I/L — o código precisa sobreviver a ser ditado por telefone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

interface CoupleRow {
  id: number;
  user_a: number;
  user_b: number;
}

export async function getCouple(
  userId: number,
): Promise<{ id: number; partnerId: number } | null> {
  const { rows } = await query<CoupleRow>(
    `SELECT id, user_a, user_b FROM couples WHERE user_a = $1 OR user_b = $1`,
    [userId],
  );
  if (rows.length === 0) return null;
  const c = rows[0];
  return { id: c.id, partnerId: c.user_a === userId ? c.user_b : c.user_a };
}

// ── Convite ──────────────────────────────────────────────────────────

export async function createInvite(
  userId: number,
): Promise<{ code: string; expiresAt: string } | { error: "ALREADY_PAIRED" }> {
  if (await getCouple(userId)) return { error: "ALREADY_PAIRED" };
  const code = generateCode();
  // Renova o pendente em vez de acumular convites vivos.
  const { rows: renewed } = await query<{ code: string; expires_at: string }>(
    `UPDATE couple_invites
        SET code = $2, expires_at = NOW() + INTERVAL '7 days', created_at = NOW()
      WHERE inviter_id = $1 AND status = 'pending'
      RETURNING code, expires_at`,
    [userId, code],
  );
  if (renewed.length > 0) {
    return { code: renewed[0].code, expiresAt: renewed[0].expires_at };
  }
  const { rows } = await query<{ code: string; expires_at: string }>(
    `INSERT INTO couple_invites (inviter_id, code)
     VALUES ($1, $2)
     RETURNING code, expires_at`,
    [userId, code],
  );
  return { code: rows[0].code, expiresAt: rows[0].expires_at };
}

export async function revokeInvite(userId: number): Promise<{ revoked: boolean }> {
  const { rows } = await query(
    `UPDATE couple_invites SET status = 'revoked'
      WHERE inviter_id = $1 AND status = 'pending'
      RETURNING id`,
    [userId],
  );
  return { revoked: rows.length > 0 };
}

export type AcceptError =
  | "INVALID_CODE"
  | "INVITE_EXPIRED"
  | "OWN_CODE"
  | "ALREADY_PAIRED";

export async function acceptInvite(
  userId: number,
  rawCode: string,
): Promise<{ partner: { id: number; name: string } } | { error: AcceptError }> {
  const code = rawCode.trim().toUpperCase();
  const { rows: invites } = await query<{
    id: number;
    inviter_id: number;
    status: string;
    expired: boolean;
  }>(
    `SELECT id, inviter_id, status, (expires_at < NOW()) AS expired
       FROM couple_invites WHERE code = $1`,
    [code],
  );
  if (invites.length === 0) return { error: "INVALID_CODE" };
  const invite = invites[0];
  if (invite.inviter_id === userId) return { error: "OWN_CODE" };
  if (invite.status !== "pending" || invite.expired) return { error: "INVITE_EXPIRED" };
  if (await getCouple(userId)) return { error: "ALREADY_PAIRED" };
  if (await getCouple(invite.inviter_id)) return { error: "ALREADY_PAIRED" };

  const [a, b] =
    invite.inviter_id < userId ? [invite.inviter_id, userId] : [userId, invite.inviter_id];
  try {
    await query(`INSERT INTO couples (user_a, user_b) VALUES ($1, $2)`, [a, b]);
  } catch (err) {
    // UNIQUE(user_a)/UNIQUE(user_b): corrida entre dois accepts simultâneos.
    if ((err as { code?: string }).code === "23505") return { error: "ALREADY_PAIRED" };
    throw err;
  }
  await query(
    `UPDATE couple_invites SET status = 'accepted', accepted_by = $2 WHERE id = $1`,
    [invite.id, userId],
  );

  const { rows: people } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM users WHERE id = ANY($1::int[])`,
    [[invite.inviter_id, userId]],
  );
  const inviter = people.find((p) => p.id === invite.inviter_id)!;
  const acceptor = people.find((p) => p.id === userId)!;

  await addXP(invite.inviter_id, PAIR_XP, "couple_paired");
  await addXP(userId, PAIR_XP, "couple_paired");
  await createNotification({
    userId: invite.inviter_id,
    kind: "couple_paired",
    title: `${acceptor.name} aceitou seu convite 🤍`,
    body: "Vocês agora caminham juntos no RAYO.",
    link: "/",
    payload: { partner_id: userId },
  });
  await createNotification({
    userId,
    kind: "couple_paired",
    title: `Você e ${inviter.name} agora caminham juntos 🤍`,
    body: "A Aliança de vocês está firmada no RAYO.",
    link: "/",
    payload: { partner_id: invite.inviter_id },
  });

  return { partner: { id: inviter.id, name: inviter.name } };
}

// ── Oração pelo outro ────────────────────────────────────────────────

export async function prayForPartner(
  userId: number,
): Promise<
  | { prayed: true; alreadyPrayedToday: boolean; xpAwarded: number }
  | { error: "NOT_PAIRED" }
> {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" };
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO couple_prayers (couple_id, from_user)
     VALUES ($1, $2)
     ON CONFLICT (couple_id, from_user, prayed_date) DO NOTHING
     RETURNING id`,
    [couple.id, userId],
  );
  if (inserted.length === 0) {
    return { prayed: true, alreadyPrayedToday: true, xpAwarded: 0 };
  }
  await addXP(userId, PRAYER_XP, "couple_prayer");
  const { rows: me } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [userId],
  );
  await createNotification({
    userId: couple.partnerId,
    kind: "couple_prayer",
    title: `${me[0]?.name ?? "Seu cônjuge"} orou por você agora 🙏`,
    body: "Você não caminha só.",
    link: "/",
    payload: { from_user: userId },
  });
  // ALIANCA_PLAN.md §5 — se a outra direção também orou hoje, o dia de
  // oração mútua se completa: credita a missão pros DOIS. O INSERT acima
  // é idempotente por direção, então isso dispara no máximo 1x/dia.
  try {
    const { rows: mutual } = await query(
      `SELECT 1 FROM couple_prayers
        WHERE couple_id = $1 AND from_user = $2 AND prayed_date = CURRENT_DATE`,
      [couple.id, couple.partnerId],
    );
    if (mutual.length > 0) {
      const { recordMissionProgress } = await import("../gamification/service.js");
      await recordMissionProgress(userId, "couple_prayer_day");
      await recordMissionProgress(couple.partnerId, "couple_prayer_day");
    }
  } catch (err) {
    console.error("[Alianca] couple_prayer_day (non-blocking):", err);
  }
  return { prayed: true, alreadyPrayedToday: false, xpAwarded: PRAYER_XP };
}

// ── Desfazer o vínculo ───────────────────────────────────────────────
// Unilateral e silencioso (sem notificação) — por dignidade. As orações
// caem em cascata junto com a linha do casal.

export async function unpair(userId: number): Promise<{ unpaired: boolean }> {
  const { rows } = await query(
    `DELETE FROM couples WHERE user_a = $1 OR user_b = $1 RETURNING id`,
    [userId],
  );
  return { unpaired: rows.length > 0 };
}

// ── Pedidos de oração & testemunhos (DIFERENCIAL_PLAN.md D2) ─────────
// A oração do casal ganha objeto (pelo que oramos) e memória (o que
// Deus respondeu). Lista compartilhada: qualquer um dos dois adiciona,
// responde ou remove.

const MAX_OPEN_REQUESTS = 20;

export interface PrayerRequest {
  id: number;
  text: string;
  status: "open" | "answered";
  created_by: number;
  createdByMe: boolean;
  answer_note: string | null;
  answered_at: string | null;
  created_at: string;
}

export async function listPrayerRequests(
  userId: number,
): Promise<{ open: PrayerRequest[]; answered: PrayerRequest[] } | { error: "NOT_PAIRED" }> {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" };
  const { rows } = await query<Omit<PrayerRequest, "createdByMe">>(
    `SELECT id, text, status, created_by, answer_note,
            answered_at::text AS answered_at, created_at::text AS created_at
       FROM couple_prayer_requests
      WHERE couple_id = $1
      ORDER BY (status = 'open') DESC, COALESCE(answered_at, created_at) DESC
      LIMIT 60`,
    [couple.id],
  );
  const mapped = rows.map((r) => ({ ...r, createdByMe: r.created_by === userId }));
  return {
    open: mapped.filter((r) => r.status === "open"),
    answered: mapped.filter((r) => r.status === "answered"),
  };
}

export async function createPrayerRequest(
  userId: number,
  rawText: string,
): Promise<{ request: PrayerRequest } | { error: "NOT_PAIRED" | "INVALID_TEXT" | "LIMIT_REACHED" }> {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" };
  const text = rawText.trim();
  if (text.length < 3 || text.length > 280) return { error: "INVALID_TEXT" };
  const { rows: count } = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM couple_prayer_requests
      WHERE couple_id = $1 AND status = 'open'`,
    [couple.id],
  );
  if (count[0].n >= MAX_OPEN_REQUESTS) return { error: "LIMIT_REACHED" };
  const { rows } = await query<Omit<PrayerRequest, "createdByMe">>(
    `INSERT INTO couple_prayer_requests (couple_id, created_by, text)
     VALUES ($1, $2, $3)
     RETURNING id, text, status, created_by, answer_note,
               answered_at::text AS answered_at, created_at::text AS created_at`,
    [couple.id, userId, text],
  );
  const { rows: me } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [userId],
  );
  await createNotification({
    userId: couple.partnerId,
    kind: "couple_prayer_request",
    title: `${me[0]?.name ?? "Seu cônjuge"} adicionou um pedido de oração 🙏`,
    body: text.length > 90 ? `${text.slice(0, 87)}…` : text,
    link: "/",
    payload: { request_id: rows[0].id },
  });
  return { request: { ...rows[0], createdByMe: true } };
}

export async function answerPrayerRequest(
  userId: number,
  requestId: number,
  rawNote?: string,
): Promise<
  | { answered: true; alreadyAnswered: boolean }
  | { error: "NOT_PAIRED" | "NOT_FOUND" | "INVALID_NOTE" }
> {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" };
  const note = (rawNote ?? "").trim();
  if (note.length > 280) return { error: "INVALID_NOTE" };
  const { rows: existing } = await query<{ id: number; status: string; text: string }>(
    `SELECT id, status, text FROM couple_prayer_requests
      WHERE id = $1 AND couple_id = $2`,
    [requestId, couple.id],
  );
  if (existing.length === 0) return { error: "NOT_FOUND" };
  if (existing[0].status === "answered") return { answered: true, alreadyAnswered: true };
  await query(
    `UPDATE couple_prayer_requests
        SET status = 'answered', answered_at = NOW(), answered_by = $3,
            answer_note = NULLIF($4, '')
      WHERE id = $1 AND couple_id = $2`,
    [requestId, couple.id, userId, note],
  );
  const { rows: me } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [userId],
  );
  await createNotification({
    userId: couple.partnerId,
    kind: "couple_testimony",
    title: "Deus respondeu 🙌",
    body: `${me[0]?.name ?? "Seu cônjuge"} marcou "${existing[0].text.slice(0, 60)}${existing[0].text.length > 60 ? "…" : ""}" como respondido.`,
    link: "/",
    payload: { request_id: requestId },
  });
  return { answered: true, alreadyAnswered: false };
}

export async function deletePrayerRequest(
  userId: number,
  requestId: number,
): Promise<{ deleted: boolean } | { error: "NOT_PAIRED" }> {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" };
  const { rows } = await query(
    `DELETE FROM couple_prayer_requests
      WHERE id = $1 AND couple_id = $2
      RETURNING id`,
    [requestId, couple.id],
  );
  return { deleted: rows.length > 0 };
}

// ── Estado agregado (o que o AliancaCard consome) ────────────────────

export interface AliancaPaired {
  status: "paired";
  partner: { id: number; name: string };
  coupleStreak: number;
  partnerActiveToday: boolean;
  prayedByMeToday: boolean;
  prayedByPartnerToday: boolean;
  amensToday: { mine: boolean; partner: boolean };
}

export type AliancaState =
  | { status: "none" }
  | { status: "invited"; code: string; expiresAt: string }
  | AliancaPaired;

// Dias consecutivos (terminando hoje ou ontem) em que AMBOS têm registro
// no xp_log — a mesma fonte de "dia ativo" do streak-calendar individual.
async function coupleStreak(userA: number, userB: number): Promise<number> {
  const { rows } = await query<{ day: string }>(
    `SELECT date_trunc('day', created_at)::date::text AS day
       FROM xp_log
      WHERE user_id IN ($1, $2)
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY 1
     HAVING COUNT(DISTINCT user_id) = 2`,
    [userA, userB],
  );
  const both = new Set(rows.map((r) => r.day));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Hoje ainda pode não ter atividade dos dois — começa em ontem sem quebrar.
  if (!both.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (both.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Devocional do casal (RITMO_PLAN.md F1) ───────────────────────────
// Um devocional global por dia (mesma rotação determinística da Palavra
// do dia). Cada cônjuge confirma "Fizemos juntos" 1x/dia; na SEGUNDA
// confirmação do dia o ritual se completa: +10 XP pros dois via missão
// e celebração no cliente.

const DEVOTIONAL_XP = 10;

export async function getCoupleDevotional(userId: number) {
  const couple = await getCouple(userId);
  if (!couple) return { paired: false as const };
  const { devotionalForDate } = await import("./devotionals.js");
  const devotional = devotionalForDate(new Date());
  const { rows } = await query<{ user_id: number }>(
    `SELECT user_id FROM couple_devotional_completions
      WHERE couple_id = $1 AND devo_date = CURRENT_DATE`,
    [couple.id],
  );
  const done = new Set(rows.map((r) => r.user_id));
  const { rows: partner } = await query<{ name: string }>(
    `SELECT name FROM users WHERE id = $1`,
    [couple.partnerId],
  );
  return {
    paired: true as const,
    devotional,
    myDone: done.has(userId),
    partnerDone: done.has(couple.partnerId),
    partnerName: partner[0]?.name ?? "",
  };
}

export async function completeCoupleDevotional(userId: number) {
  const couple = await getCouple(userId);
  if (!couple) return { error: "NOT_PAIRED" as const };
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO couple_devotional_completions (couple_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (couple_id, user_id, devo_date) DO NOTHING
     RETURNING id`,
    [couple.id, userId],
  );
  const alreadyDone = inserted.length === 0;
  let xpAwarded = 0;
  let bothDone = false;
  let leveledUp = false;
  let newLevel: number | undefined;
  if (!alreadyDone) {
    const xp = await addXP(userId, DEVOTIONAL_XP, "couple_devotional");
    xpAwarded = DEVOTIONAL_XP;
    leveledUp = xp.leveledUp;
    newLevel = xp.newLevel;
    const { rows: all } = await query<{ user_id: number }>(
      `SELECT user_id FROM couple_devotional_completions
        WHERE couple_id = $1 AND devo_date = CURRENT_DATE`,
      [couple.id],
    );
    bothDone = all.length >= 2;
    const { rows: me } = await query<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [userId],
    );
    const myName = me[0]?.name ?? "Seu cônjuge";
    if (bothDone) {
      // Dia devocional do casal completo: missão pros DOIS (gatilho
      // conjunto — dispara no máximo 1x/dia porque o INSERT é UNIQUE).
      try {
        const { recordMissionProgress } = await import("../gamification/service.js");
        await recordMissionProgress(userId, "couple_devotional_day");
        await recordMissionProgress(couple.partnerId, "couple_devotional_day");
      } catch (err) {
        console.error("[Alianca] couple_devotional_day (non-blocking):", err);
      }
      await createNotification({
        userId: couple.partnerId,
        kind: "couple_devotional",
        title: "Vocês dois fizeram o devocional de hoje 🙌",
        body: "O ritual do dia está completo. Conversem sobre a pergunta!",
        link: "/",
        payload: { from_user: userId },
      });
    } else {
      // Convite suave, não cobrança — o primeiro a fazer chama o outro.
      await createNotification({
        userId: couple.partnerId,
        kind: "couple_devotional",
        title: `${myName} fez o devocional de hoje 🤍`,
        body: "Reserve um momento pra fazer a sua parte — e conversem sobre a pergunta do dia.",
        link: "/",
        payload: { from_user: userId },
      });
    }
  } else {
    const { rows: all } = await query<{ user_id: number }>(
      `SELECT user_id FROM couple_devotional_completions
        WHERE couple_id = $1 AND devo_date = CURRENT_DATE`,
      [couple.id],
    );
    bothDone = all.length >= 2;
  }
  return { done: true, alreadyDone, bothDone, xpAwarded, leveledUp, newLevel };
}

export async function getAliancaState(userId: number): Promise<AliancaState> {
  const couple = await getCouple(userId);
  if (!couple) {
    const { rows: invites } = await query<{ code: string; expires_at: string }>(
      `SELECT code, expires_at FROM couple_invites
        WHERE inviter_id = $1 AND status = 'pending' AND expires_at >= NOW()`,
      [userId],
    );
    if (invites.length > 0) {
      return { status: "invited", code: invites[0].code, expiresAt: invites[0].expires_at };
    }
    return { status: "none" };
  }

  const [partnerRows, activityRows, prayerRows, amenRows, streak] = await Promise.all([
    query<{ id: number; name: string }>(`SELECT id, name FROM users WHERE id = $1`, [
      couple.partnerId,
    ]),
    query<{ ok: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM xp_log
          WHERE user_id = $1 AND created_at >= CURRENT_DATE
       ) AS ok`,
      [couple.partnerId],
    ),
    query<{ from_user: number }>(
      `SELECT from_user FROM couple_prayers
        WHERE couple_id = $1 AND prayed_date = CURRENT_DATE`,
      [couple.id],
    ),
    query<{ user_id: number }>(
      `SELECT user_id FROM verse_amens
        WHERE user_id IN ($1, $2) AND amen_date = CURRENT_DATE`,
      [userId, couple.partnerId],
    ),
    coupleStreak(userId, couple.partnerId),
  ]);

  const prayers = new Set(prayerRows.rows.map((r) => r.from_user));
  const amens = new Set(amenRows.rows.map((r) => r.user_id));

  return {
    status: "paired",
    partner: { id: partnerRows.rows[0].id, name: partnerRows.rows[0].name },
    coupleStreak: streak,
    partnerActiveToday: activityRows.rows[0]?.ok ?? false,
    prayedByMeToday: prayers.has(userId),
    prayedByPartnerToday: prayers.has(couple.partnerId),
    amensToday: { mine: amens.has(userId), partner: amens.has(couple.partnerId) },
  };
}
