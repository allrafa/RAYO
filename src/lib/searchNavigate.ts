// Task #44 — destino consistente para resultados de busca, usado tanto
// pelo overlay mobile quanto pelo dropdown desktop. Mantém o contrato
// de "qual aba abrir + qual id deve ser focado" em um único lugar para
// evitar drift.
//
// Para posts/usuários, usamos CustomEvent porque a página alvo
// (ComunidadePage / PerfilPage) é dona do estado de seleção; assim
// elas se inscrevem no evento e fazem o deep-link sem que precisemos
// elevar esse estado para o AppContext.

import type { SetStateAction } from "react";

export interface SearchHit {
  kind: "curso" | "video" | "audio" | "reels" | "podcast" | "post" | "user";
  id: number;
  ctaTarget: string | null;
}

export interface SearchNavigateDeps {
  onTabChange: (tab: string) => void;
  setCurrentCourseId: (id: number | null) => void;
  setIsInCourseDetail: (v: boolean) => void;
  setCurrentVideoId: (id: string | null) => void;
  setIsInVideoPage: (v: boolean) => void;
  onClose?: () => void;
}

export const SEARCH_OPEN_POST = "raio:open-post";
export const SEARCH_OPEN_PROFILE = "raio:open-profile";

export function navigateToSearchHit(r: SearchHit, deps: SearchNavigateDeps) {
  const close = () => deps.onClose?.();

  if (r.kind === "curso") {
    deps.setCurrentCourseId(r.id);
    deps.setIsInCourseDetail(true);
    deps.onTabChange("academia");
    close();
    return;
  }

  if (r.kind === "post") {
    // Vai pra Comunidade e avisa quem estiver escutando para abrir o
    // post específico. Se a página ainda não montou, ela lê o id ao
    // montar via sessionStorage como fallback.
    deps.onTabChange("comunidade");
    try {
      sessionStorage.setItem("raio-pending-post", String(r.id));
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent(SEARCH_OPEN_POST, { detail: { id: r.id } }),
    );
    close();
    return;
  }

  if (r.kind === "user") {
    deps.onTabChange("perfil");
    try {
      sessionStorage.setItem("raio-pending-profile", String(r.id));
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent(SEARCH_OPEN_PROFILE, { detail: { id: r.id } }),
    );
    close();
    return;
  }

  // video / audio / reels / podcast
  if (r.ctaTarget) {
    window.open(r.ctaTarget, "_blank", "noopener,noreferrer");
    close();
    return;
  }
  // Conteúdo CMS sem URL externa — abre o player interno via
  // AppContext (currentVideoId é string).
  deps.setCurrentVideoId(String(r.id));
  deps.setIsInVideoPage(true);
  deps.onTabChange("academia");
  close();
}

// Helper sem uso externo, mantém parser feliz se setSelected... vier
// como SetStateAction.
export type _Unused = SetStateAction<unknown>;
