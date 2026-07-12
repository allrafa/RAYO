import { api } from "./api";

// Cliente de Web Push (UX_PLAN.md estrutural).
// - `isPushSupported()`: navegador tem SW + PushManager + Notification.
// - `ensurePushSubscription()`: registra o SW e garante a subscription no
//   servidor. Só pede permissão se `askPermission` for true (chamada a
//   partir de um gesto do usuário); caso contrário, apenas re-sincroniza
//   quando a permissão já foi concedida antes.

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensurePushSubscription(opts: { askPermission: boolean }): Promise<
  "subscribed" | "denied" | "unsupported" | "disabled" | "skipped"
> {
  if (!isPushSupported()) return "unsupported";

  const keyRes = await api.get<{ enabled: boolean; publicKey: string | null }>("/api/push/public-key");
  if (!keyRes.success || !keyRes.data?.enabled || !keyRes.data.publicKey) return "disabled";

  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") {
    if (!opts.askPermission) return "skipped";
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey),
    });
  }

  const json = subscription.toJSON();
  const res = await api.post("/api/push/subscribe", {
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  });
  return res.success ? "subscribed" : "disabled";
}
