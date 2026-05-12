// Task #181 — Pré-carregamento de chunks lazy. Cada área pesada
// (Academia, Comunidade, Conversas, Perfil, Conselheiro, Admin) é um
// chunk separado depois do code splitting (#180). Quando a usuária
// passa o mouse / foca um item da bottom nav ou do DesktopSidebar,
// disparamos o dynamic import correspondente pra que o chunk já esteja
// em cache quando ela clica — eliminando o skeleton de meio segundo
// sem custo no first-paint.
//
// Os mesmos loaders também alimentam os `React.lazy(...)` em App.tsx,
// pra que Vite gere UM chunk por destino e o cache de módulos do
// browser sirva tanto o preload quanto a hidratação real do componente.

export const academiaLoader = () => import("../components/AcademiaWithBookReader");
export const comunidadeLoader = () => import("../components/ComunidadePage");
export const conversasLoader = () => import("../components/ConversasPage");
export const perfilLoader = () => import("../components/PerfilPage");
export const conselheiroLoader = () => import("../components/ConselheiroPage");
export const adminLoader = () => import("../components/admin/AdminShell");

const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  academia: academiaLoader,
  comunidade: comunidadeLoader,
  conversas: conversasLoader,
  perfil: perfilLoader,
  conselheiro: conselheiroLoader,
  admin: adminLoader,
};

// Dispara o dynamic import de uma aba sem bloquear. Erros são engolidos
// porque preload é puramente especulativo — se falhar (ex.: offline), a
// navegação real vai tentar de novo e mostrar o erro real.
export function preloadTab(tabId: string): void {
  const loader = ROUTE_PRELOADERS[tabId];
  if (!loader) return;
  try {
    loader().catch(() => {
      /* silent — tentativa especulativa */
    });
  } catch {
    /* ignore */
  }
}
