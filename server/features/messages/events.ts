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

// Task #222 — Dual-write: SSE legado (`listeners`) + Socket.IO. Cliente
// dedup por `message.id` quando assinar os dois transportes. Quando a
// migração completar, removemos a branch SSE. emitToUser é no-op se o
// Socket.IO estiver desabilitado por env (SOCKET_IO_ENABLED=false).
export function publishToUser(userId: number, event: string, payload: unknown): void {
  emitToUser(userId, event, payload);
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
