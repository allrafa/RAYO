// Task #164 — Click targets dos cards (padrão Facebook).
//
// Hierarquia padronizada para QUALQUER card do produto (Comunidade, Turma,
// Catálogo, Home, Perfil, Notificações, Membros):
//
//   • Avatar/Nome do autor       → openProfileById(id)
//   • Foto/Imagem do post        → openLightbox(images, index)  (componente local)
//   • Corpo/área neutra do card  → onClick do wrapper (role="button")
//   • Comunidade `c/<slug>`      → openCommunityBySlug(slug)
//   • Timestamp (permalink)      → mesmo destino do corpo (discussão)
//   • Botões/menus internos      → ação isolada, SEMPRE com stopPropagation
//
// O wrapper do card vira um `role="button"` com tabIndex/onKeyDown
// (Enter/Espaço). Filhos clicáveis usam `<button>`/`<a>` reais e chamam
// `stopBubble(handler)` para não disparar o clique do card.
//
// Reutilizamos os CustomEvents existentes (`rayo:open-profile`,
// `rayo:open-post`, `rayo:open-community`) — os mesmos da busca
// (`searchNavigate.ts`) e dos deep-links em `App.tsx`. NÃO criamos
// evento novo: App.tsx ganhou apenas um listener que mapeia cada um
// desses eventos pra tab correta via `setCurrentTab`. As páginas alvo
// (PerfilPage, ComunidadePage) continuam escutando o mesmo evento e o
// stash de sessionStorage como fallback.

import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

export const RAYO_OPEN_PROFILE = "rayo:open-profile";
export const RAYO_OPEN_POST = "rayo:open-post";
export const RAYO_OPEN_COMMUNITY = "rayo:open-community";

/** Stoppa o bubble e (opcionalmente) chama um handler. Usado em qualquer
 *  filho clicável que vive dentro de um card com onClick no wrapper. */
export function stopBubble<E extends ReactMouseEvent | ReactKeyboardEvent>(
  handler?: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    e.stopPropagation();
    handler?.(e);
  };
}

/** Aceita Enter/Espaço como ativação do card (role="button"), mas APENAS
 *  quando o foco está no próprio wrapper. Se o foco está num filho
 *  interativo (botão, link, etc) o handler não dispara — caso contrário
 *  Enter num botão filho ativaria simultaneamente o filho e o card. */
export function cardKeyHandler(
  fn: () => void,
): (e: ReactKeyboardEvent) => void {
  return (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

/** Abre o perfil público de um usuário pelo id, vindo de qualquer aba.
 *  Reusa o evento `rayo:open-profile` (mesmo da busca). App.tsx escuta
 *  o evento e troca pra aba `perfil`; PerfilPage escuta o evento e o
 *  stash de sessionStorage. */
export function openProfileById(id: number | string | null | undefined): void {
  if (id == null) return;
  const idStr = String(id);
  if (!idStr || idStr === "0") return;
  try {
    sessionStorage.setItem("rayo-pending-profile", idStr);
  } catch {
    /* private mode */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(RAYO_OPEN_PROFILE, { detail: { id: Number(idStr) } }),
    );
  } catch {
    /* noop */
  }
}

/** Abre uma comunidade `c/<slug>` (subreddit-like) a partir de qualquer aba.
 *  Reusa `rayo:open-community` (mesmo evento que ComunidadePage e
 *  UserProfilePage já disparavam). App.tsx escuta e troca pra aba
 *  `comunidade`. */
export function openCommunityBySlug(slug: string | null | undefined): void {
  if (!slug) return;
  try {
    sessionStorage.setItem("rayo-pending-community-slug", slug);
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(RAYO_OPEN_COMMUNITY, { detail: { slug } }),
    );
  } catch {
    /* noop */
  }
}

/** Abre uma discussão de post pelo id (mesmo contrato da busca).
 *  Reusa `rayo:open-post`; App.tsx troca pra aba `comunidade`. */
export function openPostById(
  id: number | string,
  highlightCommentId?: number | string | null,
): void {
  const idStr = String(id);
  if (!idStr || idStr === "0") return;
  try {
    sessionStorage.setItem("rayo-pending-post", idStr);
    if (highlightCommentId != null) {
      sessionStorage.setItem(
        "rayo-pending-post-comment",
        String(highlightCommentId),
      );
    }
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(RAYO_OPEN_POST, {
        detail: {
          id: Number(idStr),
          highlight_comment_id:
            highlightCommentId != null ? Number(highlightCommentId) : undefined,
        },
      }),
    );
  } catch {
    /* noop */
  }
}

/** Classe de estilo padrão para regiões clicáveis dentro de um card.
 *  Cursor pointer + foco visível com a cor terra do design system.
 *  Use junto com `role="button"`/`<button>`. */
export const CARD_INTERACTIVE_CLASS =
  "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rayo-terra-500)] focus-visible:ring-offset-2 rounded";
