// Helpers puros para renderização agrupada de mensagens em ConversasPage.
// Sem efeitos colaterais, sem dependência de React/DOM — fácil de testar
// mentalmente e fácil de mudar regra (intervalo, formato de data, etc).

export interface GroupableMessage {
  id: number;
  sender_id: number;
  created_at: string;
  read_at: string | null;
}

export interface MessageRenderInfo<M extends GroupableMessage> {
  message: M;
  /** Primeira mensagem de uma sequência do mesmo remetente. */
  isFirstOfGroup: boolean;
  /** Última mensagem de uma sequência do mesmo remetente. */
  isLastOfGroup: boolean;
  /** Mostrar o horário embaixo da bolha (só na última do grupo). */
  showTimestamp: boolean;
  /**
   * Mostrar o indicador "Enviado"/"Lido" embaixo da bolha (só na última
   * mensagem `mine` da lista — padrão WhatsApp/iMessage).
   */
  showReadIndicator: boolean;
  /** Se preenchido, renderizar uma pílula central com este label antes da mensagem. */
  dateSeparator: string | null;
}

/** Janela em ms pra considerar duas mensagens como "do mesmo grupo". */
const GROUP_WINDOW_MS = 2 * 60_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Formata um separador de data em PT-BR no padrão "Hoje" / "Ontem" /
 * dia da semana (últimos 7 dias) / data completa. `now` é injetável
 * pra facilitar teste manual.
 */
export function formatDateSeparator(date: Date, now: Date = new Date()): string {
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays > 1 && diffDays < 7) {
    const wd = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
    return wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  const sameYear = target.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/**
 * Detecta se um texto é composto APENAS de emojis (com até alguns
 * espaços). Conservador: limita tamanho e exige pelo menos 1 emoji
 * "Extended_Pictographic" pra evitar falsos positivos com pontuação
 * ou acentos. Em dúvida, devolve `false` (renderiza como texto normal).
 */
export function isOnlyEmoji(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  // Limite conservador — emojis ocupam 1-2 code units cada; ~16 chars
  // cobre 3-6 emojis tranquilamente sem deixar passar parágrafos.
  if (t.length > 16) return false;
  try {
    const onlyEmojiOrWhitespace = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u;
    if (!onlyEmojiOrWhitespace.test(t)) return false;
    return /\p{Extended_Pictographic}/u.test(t);
  } catch {
    // Engines sem suporte a `\p{...}` (improvável em browsers atuais)
    // caem no caminho seguro: trata como texto normal.
    return false;
  }
}

/**
 * Anota cada mensagem com flags de renderização (agrupamento + separador
 * de data + visibilidade do indicador "Lido"). Mensagens devem vir em
 * ordem cronológica ascendente (a mesma ordem usada pelo render).
 */
export function annotateMessages<M extends GroupableMessage>(
  messages: M[],
  currentUserId: number,
): MessageRenderInfo<M>[] {
  if (messages.length === 0) return [];

  // Índice da última mensagem `mine` (qualquer status). É nela — e só
  // nela — que o status "Enviado"/"Lido" aparece.
  let lastMineIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === currentUserId) {
      lastMineIdx = i;
      break;
    }
  }

  return messages.map((m, i) => {
    const prev = messages[i - 1] ?? null;
    const next = messages[i + 1] ?? null;
    const mDate = new Date(m.created_at);

    const sameSenderAsPrev =
      !!prev &&
      prev.sender_id === m.sender_id &&
      isSameDay(new Date(prev.created_at), mDate) &&
      mDate.getTime() - new Date(prev.created_at).getTime() <= GROUP_WINDOW_MS;

    const sameSenderAsNext =
      !!next &&
      next.sender_id === m.sender_id &&
      isSameDay(new Date(next.created_at), mDate) &&
      new Date(next.created_at).getTime() - mDate.getTime() <= GROUP_WINDOW_MS;

    const isFirstOfGroup = !sameSenderAsPrev;
    const isLastOfGroup = !sameSenderAsNext;

    const dateSeparator =
      !prev || !isSameDay(new Date(prev.created_at), mDate)
        ? formatDateSeparator(mDate)
        : null;

    return {
      message: m,
      isFirstOfGroup,
      isLastOfGroup,
      showTimestamp: isLastOfGroup,
      showReadIndicator: i === lastMineIdx,
      dateSeparator,
    };
  });
}
