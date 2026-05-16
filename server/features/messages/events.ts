import { emitToUser } from "../../realtime/io.js";

type Listener = (event: string, payload: unknown) => void;

const listeners = new Map<number, Set<Listener>>();

export function subscribeUser(userId: number, listener: Listener): () => void {
  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(listener);
  return () => {
    const s = listeners.get(userId);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) listeners.delete(userId);
  };
}

// Task #222 — Dual-write: SSE legado (`listeners`) + Socket.IO. Quando
// `DM_REALTIME=socket` o cliente ignora o SSE e vice-versa, mas o
// servidor SEMPRE escreve em ambos pra que a flag seja só um switch
// de leitura. Cliente dedup por `message.id` quando assinar os dois
// transportes em transição.

// Eventos user-scoped: vão pra uma pessoa só (unread, notification).
export function publishToUser(userId: number, event: string, payload: unknown): void {
  emitToUser(userId, event, payload);
  fanoutSse(userId, event, payload);
}

// Eventos conversation-scoped (message:new, message:read, message:reaction):
// vão pra todos os participantes da conversa.
//
// DESIGN NOTE (post-review fix): NÃO usamos a sala `conversation:<id>`
// pra mensagens, porque a membership da sala só é populada no `connect`
// (e via `conversation:join` opcional do cliente). Conversas criadas
// ou reabertas via `deleted_at` depois do connect do destinatário
// ficariam sem ele na sala → ele perderia o `message:new`.
//
// Solução: emitir direto pra `user:<id>` de cada participante. Isso é
// independente do estado da sala de conversa (a `user:<id>` é joinada
// uma vez no connect e nunca muda). A sala `conversation:<id>`
// permanece útil só pra typing/listening (perda de evento ali é
// aceitável — indicador transiente).
//
// O parâmetro `conversationId` é mantido pra contexto/observabilidade
// e simetria com `emitToConversation` mesmo não sendo mais usado no
// dispatch.
export function publishToConversation(
  _conversationId: number,
  participants: number[],
  event: string,
  payload: unknown,
): void {
  for (const userId of participants) {
    emitToUser(userId, event, payload);
    fanoutSse(userId, event, payload);
  }
}

function fanoutSse(userId: number, event: string, payload: unknown): void {
  const set = listeners.get(userId);
  if (!set) return;
  for (const l of Array.from(set)) {
    try {
      l(event, payload);
    } catch {
      // Swallow listener errors so one bad subscriber can't break others.
    }
  }
}

export function getActiveSubscriberCount(userId: number): number {
  return listeners.get(userId)?.size ?? 0;
}
