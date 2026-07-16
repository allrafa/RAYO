// Scheduler de e-mails devocionais (RITMO_PLAN.md F2).
//
// Acorda os templates dormentes de `email.ts` sem dependência nova:
// um setInterval de 5 min, gated por EMAIL_SCHEDULER_ENABLED=1
// (desligado por padrão em dev/teste). O dedup é o INSERT atômico em
// `email_sends UNIQUE(user_id, kind, send_date)` — reinício não
// reenvia e múltiplas instâncias não duplicam.
//
// Janelas (hora LOCAL de America/Sao_Paulo):
//   • missao_diaria  — todo dia, 07h–11h59
//   • carta_semanal  — domingo,  08h–11h59
//
// Opt-out LGPD: notification_preferences.notifications.email (missão) e
// .weekly_digest (carta) — chaves que o PATCH /api/users/preferences já
// aceita. Ausente = opt-in (default suave); só e-mail verificado recebe.

import { query } from "../db/index.js";
import { logger } from "../utils/logger.js";
import {
  sendMissaoDoDiaEmail,
  sendCartaSemanalEmail,
  isEmailConfigured,
} from "./email.js";
import { cartaForDate, cartaEditionForDate } from "./cartas.js";
import { getTodayItem } from "../features/home/service.js";
import { isPushConfigured, sendPushToUser, type PushPayload } from "./push.js";
import { verseForDate } from "../features/home/verses.js";

const TICK_MS = 5 * 60 * 1000;
const BATCH_PER_TICK = 50;
const SEND_SPACING_MS = 150;

interface SpNow {
  /** YYYY-MM-DD no fuso de São Paulo — chave de dedup do dia. */
  date: string;
  hour: number;
  /** 0=domingo … 6=sábado. */
  weekday: number;
  /** "Terça · 15 julho" — usado nos templates. */
  dateLabel: string;
}

const WEEKDAYS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function spNowParts(now: Date): SpNow {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = weekdayMap[parts.weekday] ?? 0;
  const month = parseInt(parts.month, 10);
  const day = parseInt(parts.day, 10);
  // "24" pode aparecer pra meia-noite em alguns runtimes ICU.
  const hour = parseInt(parts.hour, 10) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    weekday,
    dateLabel: `${WEEKDAYS_PT[weekday]} · ${day} ${MONTHS_PT[month - 1]}`,
  };
}

interface EligibleUser {
  id: number;
  email: string;
  name: string;
  streak: number;
}

// prefKey: 'email' (missão) | 'weekly_digest' (carta). Ausente = opt-in.
async function eligibleUsers(kind: string, prefKey: string, spDate: string): Promise<EligibleUser[]> {
  const { rows } = await query<EligibleUser>(
    `SELECT u.id, u.email, u.name, COALESCE(u.streak, 0) AS streak
       FROM users u
      WHERE u.email NOT LIKE 'deleted_%'
        AND COALESCE(
              (u.notification_preferences -> 'notifications' ->> $2)::boolean,
              TRUE
            )
        AND EXISTS (
              SELECT 1 FROM email_verification_codes ev
               WHERE ev.email = u.email AND ev.verified = TRUE
            )
        AND NOT EXISTS (
              SELECT 1 FROM email_sends es
               WHERE es.user_id = u.id AND es.kind = $1 AND es.send_date = $3::date
            )
      ORDER BY u.id
      LIMIT ${BATCH_PER_TICK}`,
    [kind, prefKey, spDate],
  );
  return rows;
}

/** Claim atômico do envio do dia. true = este processo enviará. */
async function claimSend(userId: number, kind: string, spDate: string): Promise<boolean> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO email_sends (user_id, kind, send_date)
     VALUES ($1, $2, $3::date)
     ON CONFLICT (user_id, kind, send_date) DO NOTHING
     RETURNING id`,
    [userId, kind, spDate],
  );
  return rows.length > 0;
}

async function releaseClaim(userId: number, kind: string, spDate: string): Promise<void> {
  await query(
    `DELETE FROM email_sends WHERE user_id = $1 AND kind = $2 AND send_date = $3::date`,
    [userId, kind, spDate],
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function siteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.APP_URL || "https://rayo.app").replace(/\/+$/, "");
}

async function tickMissaoDoDia(sp: SpNow): Promise<number> {
  const users = await eligibleUsers("missao_diaria", "email", sp.date);
  let sent = 0;
  for (const u of users) {
    // Conteúdo antes do claim: sem item do dia (catálogo vazio pro
    // segmento), não registra — pode aparecer conteúdo mais tarde.
    const item = await getTodayItem(u.id);
    if (!item) continue;
    if (!(await claimSend(u.id, "missao_diaria", sp.date))) continue;
    try {
      await sendMissaoDoDiaEmail({
        email: u.email,
        dateLabel: sp.dateLabel,
        headline: "Sua missão de hoje te espera",
        headlineItalic: "cinco minutos que mudam o dia",
        description:
          item.hook?.trim() ||
          item.subtitle?.trim() ||
          "Um conteúdo escolhido pra você dar o passo de hoje com Deus.",
        missionTitle: item.title,
        missionXp: 15,
        currentStreak: u.streak,
        ctaUrl: `${siteUrl()}/`,
      });
      sent++;
      await sleep(SEND_SPACING_MS);
    } catch (err) {
      // Falha dura de envio: libera o claim pra retry no próximo tick.
      await releaseClaim(u.id, "missao_diaria", sp.date).catch(() => {});
      logger.warn("EmailScheduler", `missao_diaria falhou pra user ${u.id}: ${(err as Error).message}`);
    }
  }
  return sent;
}

async function tickCartaSemanal(sp: SpNow, now: Date): Promise<number> {
  const users = await eligibleUsers("carta_semanal", "weekly_digest", sp.date);
  if (users.length === 0) return 0;
  const carta = cartaForDate(now);
  const edition = cartaEditionForDate(now) % 1000;
  let sent = 0;
  for (const u of users) {
    if (!(await claimSend(u.id, "carta_semanal", sp.date))) continue;
    try {
      await sendCartaSemanalEmail({
        email: u.email,
        edition,
        dateLabel: sp.dateLabel,
        readingMinutes: carta.readingMinutes,
        author: "Equipe RAYO",
        headline: carta.headline,
        headlineItalic: carta.headlineItalic,
        paragraphs: carta.paragraphs,
        ctaUrl: `${siteUrl()}/`,
      });
      sent++;
      await sleep(SEND_SPACING_MS);
    } catch (err) {
      await releaseClaim(u.id, "carta_semanal", sp.date).catch(() => {});
      logger.warn("EmailScheduler", `carta_semanal falhou pra user ${u.id}: ${(err as Error).message}`);
    }
  }
  return sent;
}

// ── D1 (DIFERENCIAL_PLAN.md) — a Palavra sai do app ─────────────────

/** Usuário-sistema que assina a thread do dia (o mesmo do seed da
 *  comunidade). Idempotente. */
async function ensureSystemUserId(): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO users (email, password_hash, name, segments)
     VALUES ('comunidade@rayo.app.br', 'seed_no_login', 'Equipe RAYO', '{casados}')
     ON CONFLICT (email) DO UPDATE SET name = 'Equipe RAYO'
     RETURNING id`,
  );
  return rows[0].id;
}

/** Cria a thread diária da Palavra em c/geral (1x/dia; claim no ledger
 *  em nome do usuário-sistema). Devolve o id do post de hoje (criado
 *  agora ou já existente) pra que o push aponte pra conversa. */
export async function tickVersePost(
  sp: SpNow,
  now: Date,
): Promise<{ created: boolean; postId: number | null }> {
  const systemId = await ensureSystemUserId();
  const verse = verseForDate(now);
  const title = `🌿 Palavra do dia · ${verse.ref}`;

  const findToday = async (): Promise<number | null> => {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM posts
        WHERE user_id = $1 AND title = $2
          AND created_at >= NOW() - INTERVAL '20 hours'
        ORDER BY id DESC LIMIT 1`,
      [systemId, title],
    );
    return rows[0]?.id ?? null;
  };

  if (!(await claimSend(systemId, "verse_post", sp.date))) {
    return { created: false, postId: await findToday() };
  }
  const { rows: forums } = await query<{ id: number }>(
    `SELECT id FROM forums WHERE slug = 'geral' LIMIT 1`,
  );
  if (forums.length === 0) {
    await releaseClaim(systemId, "verse_post", sp.date).catch(() => {});
    return { created: false, postId: null };
  }
  const content =
    `“${verse.text}”\n\n— ${verse.ref}\n\n` +
    `Diga amém 🙏 e conta pra gente: como essa palavra te encontra hoje?`;
  const { rows: post } = await query<{ id: number }>(
    `INSERT INTO posts (forum_id, user_id, title, content, category)
     VALUES ($1, $2, $3, $4, 'Espiritualidade')
     RETURNING id`,
    [forums[0].id, systemId, title, content],
  );
  return { created: true, postId: post[0].id };
}

/** Push diário da Palavra (~8h SP) pra quem tem push ativo. `sender` e
 *  `pushReady` são injetáveis pros testes. Sem VAPID: nem claim — quando
 *  as chaves entrarem, o dia ainda estará disponível. */
export async function tickVersePush(
  sp: SpNow,
  now: Date,
  postId: number | null,
  sender: (userId: number, payload: PushPayload) => Promise<void> = sendPushToUser,
  pushReady: () => boolean = isPushConfigured,
): Promise<number> {
  if (!pushReady()) return 0;
  const { rows: users } = await query<{ id: number }>(
    `SELECT u.id
       FROM users u
      WHERE u.email NOT LIKE 'deleted_%'
        AND COALESCE(
              (u.notification_preferences -> 'notifications' ->> 'push')::boolean,
              TRUE
            )
        AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = u.id)
        AND NOT EXISTS (
              SELECT 1 FROM email_sends es
               WHERE es.user_id = u.id AND es.kind = 'verse_push' AND es.send_date = $1::date
            )
      ORDER BY u.id
      LIMIT ${BATCH_PER_TICK}`,
    [sp.date],
  );
  const verse = verseForDate(now);
  const body =
    verse.text.length > 130 ? `${verse.text.slice(0, 127)}…` : verse.text;
  const link = postId ? `/c/geral/p/${postId}` : "/";
  let sent = 0;
  for (const u of users) {
    if (!(await claimSend(u.id, "verse_push", sp.date))) continue;
    try {
      await sender(u.id, {
        title: `Palavra do dia 🌿 ${verse.ref}`,
        body: `“${body}”`,
        link,
      });
      sent++;
      await sleep(SEND_SPACING_MS);
    } catch (err) {
      await releaseClaim(u.id, "verse_push", sp.date).catch(() => {});
      logger.warn("EmailScheduler", `verse_push falhou pra user ${u.id}: ${(err as Error).message}`);
    }
  }
  return sent;
}

/** Um tick do scheduler — exportado pra ser chamado direto nos testes
 *  (sem setInterval). Devolve contadores por tipo. */
export async function runEmailSchedulerTick(
  now: Date = new Date(),
): Promise<{ missao: number; carta: number; versePost: boolean; versePush: number }> {
  const sp = spNowParts(now);
  let missao = 0;
  let carta = 0;
  let versePost = false;
  let versePush = 0;
  // Janela da manhã: depois das 12h local não faz sentido "missão do dia".
  if (sp.hour >= 7 && sp.hour < 12) {
    missao = await tickMissaoDoDia(sp);
  }
  if (sp.weekday === 0 && sp.hour >= 8 && sp.hour < 12) {
    carta = await tickCartaSemanal(sp, now);
  }
  // D1 — a Palavra sai do app: thread do dia primeiro (o push aponta
  // pra ela quando existir).
  if (sp.hour >= 8 && sp.hour < 12) {
    const post = await tickVersePost(sp, now);
    versePost = post.created;
    versePush = await tickVersePush(sp, now, post.postId);
  }
  return { missao, carta, versePost, versePush };
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startEmailScheduler(): void {
  if (process.env.EMAIL_SCHEDULER_ENABLED !== "1") {
    logger.info("EmailScheduler", "Desligado (EMAIL_SCHEDULER_ENABLED != 1).");
    return;
  }
  if (!isEmailConfigured()) {
    logger.warn("EmailScheduler", "Ligado mas Resend não está configurado — envios serão pulados.");
  }
  const tick = () => {
    runEmailSchedulerTick().then(({ missao, carta }) => {
      if (missao > 0 || carta > 0) {
        logger.info("EmailScheduler", `Tick: ${missao} missão(ões) do dia, ${carta} carta(s) semanais.`);
      }
    }).catch((err) => {
      logger.error("EmailScheduler", `Tick falhou: ${(err as Error).message}`);
    });
  };
  interval = setInterval(tick, TICK_MS);
  // unref: o interval não deve segurar o processo vivo no shutdown.
  interval.unref?.();
  tick(); // primeiro tick imediato no boot
  logger.info("EmailScheduler", "Ligado — tick a cada 5 min (janelas 7h/8h America/Sao_Paulo).");
}

export function stopEmailScheduler(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
