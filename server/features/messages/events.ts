import { emitToUser } from "../../realtime/io.js";

// Task #229 — Single-transport policy: Socket.IO é o ÚNICO canal de
// realtime (DM, Comunidade e Notificações). O SSE legado foi removido
// nesta task. Os helpers abaixo são fachadas finas sobre `emitToUser`
// que preservam a semântica do contrato anterior (user-scoped vs
// conversation-scoped) sem mudar as call sites em messages/notifications.

// Eventos user-scoped: vão pra uma pessoa só (unread:changed,
// notification:new, notification:unread).
export function publishToUser(userId: number, event: string, payload: unknown): void {
  emitToUser(userId, event, payload);
}

// Eventos conversation-scoped (message:new, message:read,
// message:reaction): emitidos direto pra `user:<id>` de cada
// participante. NÃO usamos a sala `conversation:<id>` aqui porque
// a membership da sala só é populada no `connect` (e via
// `conversation:join` opcional do cliente); conversas reabertas via
// `deleted_at` depois do connect do destinatário ficariam sem ele
// na sala → ele perderia o `message:new`.
//
// A sala `conversation:<id>` permanece útil só pra typing/listening
// (indicadores transientes onde perda ocasional é aceitável).
//
// `conversationId` é mantido por simetria/observabilidade.
export function publishToConversation(
  _conversationId: number,
  participants: number[],
  event: string,
  payload: unknown,
): void {
  for (const userId of participants) {
    emitToUser(userId, event, payload);
  }
}
