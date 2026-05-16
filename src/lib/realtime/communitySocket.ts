// Singleton Socket.IO client — Community namespace (Task #223).
//
// Conecta em `/community` (mesmo cookie `session_token` do REST). Independe
// do socket do `/dm` mas compartilha a mesma conexão engine.io subjacente
// (socket.io-client reusa o Manager quando o path bate).
//
// Eventos servidor→cliente: post:new, post:updated, post:reaction,
// comment:new, comment:updated, comment:reaction, comment:typing.
//
// Eventos cliente→servidor: forum:join, forum:leave, post:join,
// post:leave, post:view, comment:typing (ack opcional pra todos).

import { io as ioClient, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getCommunitySocket(): Socket {
  if (socket) return socket;
  socket = ioClient("/community", {
    path: "/socket.io/",
    withCredentials: true,
    transports: ["polling", "websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 8_000,
    reconnectionAttempts: Infinity,
  });
  return socket;
}

export function disconnectCommunitySocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function emitCommunityWithAck(
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
