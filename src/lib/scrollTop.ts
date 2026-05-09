// Task #115 — Re-tap na aba ativa volta ao topo. Quem dispara: Navigation
// (mobile) e DesktopSidebar quando o usuário clica numa aba que já está
// selecionada. Quem escuta: AppContent (scroll global da window) + páginas
// que precisam de side-effect adicional (PerfilPage fecha overlay de perfil
// público, ConversasPage fecha conversa aberta).
//
// Detail = { tab } pra que cada listener decida se é a aba dele.

export const RAYO_SCROLL_TOP = "rayo:scroll-top";

export interface ScrollTopDetail {
  tab: string;
}

export function dispatchScrollTop(tab: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ScrollTopDetail>(RAYO_SCROLL_TOP, { detail: { tab } }),
  );
}

export function onScrollTop(
  handler: (detail: ScrollTopDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<ScrollTopDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(RAYO_SCROLL_TOP, listener);
  return () => window.removeEventListener(RAYO_SCROLL_TOP, listener);
}
