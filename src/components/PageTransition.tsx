import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// Task #159 — Transição suave entre abas (mobile).
//
// Envolve o conteúdo principal do app (`<main>`) num AnimatePresence pra que
// a troca de aba na bottom navigation faça um fade + leve slide horizontal,
// igual ao app do Facebook. A direção do slide segue a ordem natural das
// abas na bottom nav (ir pra direita = entrada vinda da direita).
//
// Decisões importantes:
// - Só anima em viewport mobile/tablet (≤1023px). No desktop, render direto.
// - Respeita `prefers-reduced-motion`: usuários com a preferência ativa não
//   veem a animação (acessibilidade).
// - Re-tap na aba ativa NÃO troca `currentTab` (já tratado em Navigation/
//   DesktopSidebar via dispatchScrollTop), então não dispara animação.
// - Curta (180ms, easeOut) — sensação instantânea, sem atrasar a resposta.
// - O motion.div é um wrapper "neutro" (block normal); páginas com layout
//   próprio (ex: DM com `height: 100dvh`) continuam funcionando porque dvh
//   é viewport-relative, não depende do parent.

const NAV_ORDER = ["home", "academia", "comunidade", "perfil"] as const;

function tabIndex(tab: string): number {
  const i = (NAV_ORDER as readonly string[]).indexOf(tab);
  return i >= 0 ? i : -1;
}

function computeDirection(prev: string, next: string): 1 | -1 {
  const i = tabIndex(prev);
  const j = tabIndex(next);
  // Se uma das abas está fora da bottom nav (ex: conversas, admin), usa
  // direção neutra (entrada da direita) — fade ainda acontece, slide é leve.
  if (i < 0 || j < 0) return 1;
  return j > i ? 1 : -1;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // Safari < 14 usa addListener
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);
  return isMobile;
}

interface PageTransitionProps {
  /** Identificador da aba atual — usado como `key` do motion.div. */
  tabKey: string;
  children: ReactNode;
}

export function PageTransition({ tabKey, children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Guarda a aba anterior pra calcular direção do slide.
  const prevTabRef = useRef<string>(tabKey);
  const direction = computeDirection(prevTabRef.current, tabKey);
  useEffect(() => {
    prevTabRef.current = tabKey;
  }, [tabKey]);

  // No desktop ou com reduced-motion, render direto sem AnimatePresence.
  // Mantemos `key` no wrapper pra que o React continue desmontando/remontando
  // a página corretamente na troca (evita estado órfão entre páginas).
  if (!isMobile || reduceMotion) {
    return <div key={tabKey}>{children}</div>;
  }

  // Escopo estrito (Task #159): animação só vale pra trocas entre as 4 abas
  // da bottom nav (home/academia/comunidade/perfil). Quando a aba anterior
  // OU a próxima é "interna" (conversas, admin, conselheiro, privacy, etc),
  // render direto — esses fluxos têm transições próprias e direção lateral
  // não tem semântica clara fora da bottom nav.
  const prevIsNav = tabIndex(prevTabRef.current) >= 0;
  const nextIsNav = tabIndex(tabKey) >= 0;
  if (!prevIsNav || !nextIsNav) {
    return <div key={tabKey}>{children}</div>;
  }

  const distance = 12;

  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={tabKey}
        custom={direction}
        initial={{ opacity: 0, x: direction * distance }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -direction * distance }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        // will-change só durante a animação (motion já cuida); style mínimo
        // pra garantir que o wrapper não constranja altura/overflow das
        // páginas internas (ex: DM usa 100dvh).
        style={{ minHeight: "inherit" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
