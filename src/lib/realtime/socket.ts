// Singleton Socket.IO client — DM namespace (Task #222).
//
// Conecta no namespace dedicado `/dm` do servidor. Same-origin: o
// browser envia o cookie httpOnly `session_token` automaticamente.
// Reconexão é gerida pelo socket.io-client; cada reconnect emite
// `connect` de novo, e o servidor reentra automaticamente nas salas
// das conversas do usuário e re-emite `conversation:sync`.
//
// Eventos servidor→cliente: message:new, message:read, message:reaction,
// message:typing, listening, unread:changed, conversation:sync,
// conversation:updated.
//
// Eventos cliente→servidor: message:typing, message:read,
// dm:listening, conversation:join (ack opcional pra todos).

import { io as ioClient, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = ioClient("/dm", {
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
