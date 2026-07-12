/* RAYO — Service Worker de Web Push (UX_PLAN.md estrutural).
   Escopo raiz: servido de /sw.js (public/ no dev via Vite; build/ em prod). */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "RAYO", body: "", link: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload não-JSON: usa defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || undefined,
      data: { link: data.link || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const win of windows) {
        // Se o app já está aberto, foca e navega.
        if ("focus" in win) {
          win.focus();
          if ("navigate" in win) win.navigate(link);
          return;
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
