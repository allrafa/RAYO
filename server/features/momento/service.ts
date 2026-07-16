// Momento RAYO (DIFERENCIAL_PLAN.md D3) — a oração comunitária síncrona
// das 21h (America/Sao_Paulo). A janela ao vivo é 21h00–21h10; a
// presença (+5 XP, 1x/dia) aceita até 21h15 de tolerância pra quem
// chegou no finalzinho. MOMENTO_FORCE_OPEN=1 (fora de produção) força a
// janela aberta pra dev/screenshot/e2e.
import { query } from "../../db/index.js";
import { addXP, updateStreak } from "../gamification/service.js";
import { spNowParts } from "../../lib/emailScheduler.js";
import { verseForDate } from "../home/verses.js";

const OPEN_MIN = 21 * 60;        // 21h00
const CLOSE_MIN = 21 * 60 + 10;  // 21h10 (fim do ao vivo)
const GRACE_MIN = 21 * 60 + 15;  // 21h15 (última chance da presença)

function forcedOpen(): boolean {
  return (
    process.env.MOMENTO_FORCE_OPEN === "1" &&
    process.env.NODE_ENV !== "production"
  );
}

export interface MomentoWindow {
  open: boolean;
  /** Segundos até abrir (0 quando aberto). Granularidade de minuto. */
  secondsToOpen: number;
  /** Segundos até fechar o ao vivo (0 quando fechado). */
  secondsToClose: number;
  /** YYYY-MM-DD (SP) — a "sala" do dia. */
  date: string;
}

export function momentoWindow(now: Date = new Date()): MomentoWindow {
  const sp = spNowParts(now);
  const mins = sp.hour * 60 + sp.minute;
  if (forcedOpen()) {
    return { open: true, secondsToOpen: 0, secondsToClose: 600, date: sp.date };
  }
  const open = mins >= OPEN_MIN && mins < CLOSE_MIN;
  const secondsToOpen = open ? 0 : ((OPEN_MIN - mins + 1440) % 1440) * 60;
  const secondsToClose = open ? (CLOSE_MIN - mins) * 60 : 0;
  return { open, secondsToOpen, secondsToClose, date: sp.date };
}

export async function getMomentoState(userId: number, now: Date = new Date()) {
  const win = momentoWindow(now);
  const verse = verseForDate(now);
  const { rows } = await query(
    `SELECT 1 FROM momento_attendances
      WHERE user_id = $1 AND momento_date = $2::date`,
    [userId, win.date],
  );
  return {
    ...win,
    attendedToday: rows.length > 0,
    verse: { ref: verse.ref, text: verse.text },
  };
}

export async function attendMomento(userId: number, now: Date = new Date()) {
  const sp = spNowParts(now);
  const mins = sp.hour * 60 + sp.minute;
  const within =
    forcedOpen() || (mins >= OPEN_MIN && mins < GRACE_MIN);
  if (!within) return { error: "CLOSED" as const };
  const { rows: inserted } = await query<{ id: number }>(
    `INSERT INTO momento_attendances (user_id, momento_date)
     VALUES ($1, $2::date)
     ON CONFLICT (user_id, momento_date) DO NOTHING
     RETURNING id`,
    [userId, sp.date],
  );
  if (inserted.length === 0) {
    return { attended: true, alreadyAttended: true, xpAwarded: 0 };
  }
  const xp = await addXP(userId, 5, "momento_presence");
  const streak = await updateStreak(userId);
  return {
    attended: true,
    alreadyAttended: false,
    xpAwarded: 5,
    leveledUp: xp.leveledUp,
    newLevel: xp.newLevel,
    currentStreak: streak.currentStreak,
  };
}
