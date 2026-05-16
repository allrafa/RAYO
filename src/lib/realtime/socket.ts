// Singleton Socket.IO client (Task #222).
//
// Same-origin: o browser envia o cookie httpOnly `session_token`
// automaticamente — não precisamos passar token manualmente.
// Reconnect/backoff: tudo gerido pelo socket.io-client. A reconexão
// emite `connect` de novo, então quem usa `subscribe(...)` recebe um
// evento sintético "connected" pra forçar resync (igual SSE).
//
// Eventos servidor→cliente são os mesmos do SSE legado:
// `message:new`, `message:read`, `unread:changed`, `message:reaction`,
// `typing`, `listening`. Quando o usuário desloga, chamamos
// `disconnectSocket()` pra fechar.

import { io as ioClient, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = ioClient({
    // Same-origin: socket.io-client infere a URL do `window.location`.
    path: "/socket.io/",
    withCredentials: true,
    // Polling primeiro garante handshake mesmo se proxy bloquear WS
    // imediatamente; upgrade pra websocket acontece em seguida.
    transports: ["polling", "websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

// Helper p/ emit com ack opcional. Resolve `false` se o socket não
// está conectado ou se o servidor não acknowledgeu em 2s.
export function emitWithAck(
  event: string,
  payload: unknown,
  timeoutMs = 2_000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const s = socket;
    if (!s || !s.connected) return resolve(false);
    let settled = false;
    const t = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, timeoutMs);
    s.emit(event, payload, (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      resolve(Boolean(ok));
    });
  });
}
