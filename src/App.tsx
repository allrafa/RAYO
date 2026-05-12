import { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { TopNavbar } from "./components/TopNavbar";
import { MobileTopBar } from "./components/MobileTopBar";
import { PageTransition } from "./components/PageTransition";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { Onboarding } from "./components/Onboarding";
import { AccessibilityProvider } from "./components/AccessibilityContext";
import { AppProvider, useApp } from "./components/AppContext";
import { AnalyticsProvider } from "./components/AnalyticsContext";
import { AuthProvider, useAuth, userHasRole } from "./components/AuthContext";
import { AdminShell } from "./components/admin/AdminShell";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { UnreadMessagesProvider } from "./components/hooks/useUnreadMessages";
import { UnreadBySectionProvider } from "./components/hooks/useUnreadBySection";
import { Toaster } from "./components/ui/sonner";
import { AuthPage } from "./components/AuthPage";
import { HomePage } from "./components/HomePage";
import { AcademiaWithBookReader } from "./components/AcademiaWithBookReader";
import { ConselheiroPage } from "./components/ConselheiroPage";
import { ComunidadePage } from "./components/ComunidadePage";
import { PerfilPage } from "./components/PerfilPage";
import { CentralConversasPage } from "./components/TrilhaTransformacao/CentralConversasPage";
import { ConversasPage } from "./components/ConversasPage";
import { VideoPage } from "./components/VideoPage";
import { ConsentBanner } from "./components/ConsentBanner";
import { LandingPage } from "./components/LandingPage";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";
import { TermsPage } from "./components/TermsPage";
import { RecursosPage } from "./components/marketing/RecursosPage";
import { ComoFuncionaPage } from "./components/marketing/ComoFuncionaPage";
import { EmpresaPage } from "./components/marketing/EmpresaPage";
import { ContatoPage } from "./components/marketing/ContatoPage";
import { FaqPage } from "./components/marketing/FaqPage";
import { ImprensaPage } from "./components/marketing/ImprensaPage";
import { ExcluirDadosPage } from "./components/marketing/ExcluirDadosPage";
import { BlogIndexPage } from "./components/marketing/BlogIndexPage";
import { BlogPostPage } from "./components/marketing/BlogPostPage";
import { TurmaLandingPage } from "./components/turmas/TurmaLandingPage";
import { TrilhasCatalogPage } from "./components/trilhas/TrilhasCatalogPage";
import { TrilhaDetailPage } from "./components/trilhas/TrilhaDetailPage";
import { TrilhaSucessoPage } from "./components/trilhas/TrilhaSucessoPage";
import { analytics } from "./lib/analytics/mixpanel";
import { isReturningDevice, markDeviceAsReturning } from "./lib/deviceMemory";
import { RAYO_SCROLL_TOP } from "./lib/scrollTop";
import {
  RAYO_OPEN_PROFILE,
  RAYO_OPEN_POST,
  RAYO_OPEN_COMMUNITY,
} from "./lib/cardClickTargets";
import { migrateLegacyStorage } from "./lib/storageMigration";

// Task #163 — migra chaves `raio_*`/`raio-*` legadas (consent, theme,
// user-extended, search-recents, etc.) para `rayo_*`/`rayo-*` no
// primeiro boot pós-rebrand. Idempotente: roda no module-load (antes
// de qualquer componente ler localStorage) e marca flag pra não
// repetir.
migrateLegacyStorage();
import "./styles/nav-rayo.css";
import "./styles/playlists-rayo.css";
import "./styles/audio-player-rayo.css";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "./components/GlobalAudioPlayer";
import "./styles/app-rayo.css";
import "./styles/auth-rayo.css";
import "./styles/marketing-rayo.css";

type PreAuthStage = "welcome" | "onboarding" | "auth";
type AuthStartMode = "login" | "register";

interface OnboardingData {
  name: string;
  segments: string[];
  interests: string[];
}

// Páginas públicas (Task #70). Funcionam SEM autenticação (Google/Facebook
// também precisam verificar /privacy e /terms antes do consentimento OAuth).
// Detecta o path e renderiza a página direto, fora do fluxo welcome/auth.
//
// Para o blog, captura também o slug em /blog/<slug>.
type PublicPage =
  | "privacy" | "terms" | "excluir-dados"
  | "recursos" | "como-funciona" | "empresa" | "contato"
  | "faq" | "imprensa" | "blog"
  | "turma-landing"
  | "trilhas-catalog" | "trilha-detail" | "trilha-sucesso";

interface PublicRoute { page: PublicPage; blogSlug?: string; turmaId?: number; trailSlug?: string }

function getPublicPageFromUrl(): PublicRoute | null {
  if (typeof window === "undefined") return null;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/privacy") return { page: "privacy" };
  if (p === "/terms") return { page: "terms" };
  if (p === "/excluir-dados") return { page: "excluir-dados" };
  if (p === "/recursos") return { page: "recursos" };
  if (p === "/como-funciona") return { page: "como-funciona" };
  if (p === "/empresa") return { page: "empresa" };
  if (p === "/contato") return { page: "contato" };
  if (p === "/faq") return { page: "faq" };
  if (p === "/imprensa") return { page: "imprensa" };
  if (p === "/blog") return { page: "blog" };
  const m = /^\/blog\/([a-z0-9-]+)$/.exec(p);
  if (m) return { page: "blog", blogSlug: m[1] };
  // Task #99 — landing pública por turma (`/turmas/<id>`). Crawlers e
  // visitantes anônimos veem a landing direto, sem disparar /api/auth/me.
  // Lista da Academia (`/turmas` puro) continua autenticada.
  const t = /^\/turmas\/(\d+)$/.exec(p);
  if (t) return { page: "turma-landing", turmaId: parseInt(t[1], 10) };
  // Task #130 — Trilhas pagas (Stripe). Catálogo e detalhe são públicos
  // pra que visitantes anônimos vejam o pricing antes de criar conta.
  if (p === "/trilhas") return { page: "trilhas-catalog" };
  if (p === "/trilhas/sucesso") return { page: "trilha-sucesso" };
  const tr = /^\/trilhas\/([a-z0-9-]+)$/.exec(p);
  if (tr) return { page: "trilha-detail", trailSlug: tr[1] };
  return null;
}

// Task #176 — Roteamento real: cada aba do shell tem URL canônica.
// Mapas tab ↔ path. `currentTab` agora é DERIVADO de useLocation;
// `setCurrentTab(tab)` por baixo chama navigate(pathFromTab(tab)).
// Isso preserva todas as APIs legadas (Navigation, DesktopSidebar,
// TopNavbar, HomePage, etc. continuam recebendo `onTabChange`) sem
// precisar tocar nesses componentes.
//
// `/turmas` (sem :id) é alias legado pra /academia — redirecionamos no
// boot pra preservar bookmarks/links externos. `/turmas/:id` continua
// público (turma-landing) e é interceptado em getPublicPageFromUrl
// antes mesmo de chegar aqui.
function maybeRedirectLegacyTurmasToAcademia(): void {
  if (typeof window === "undefined") return;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/turmas") {
    const search = window.location.search || "";
    window.history.replaceState(null, "", `/academia${search}`);
  }
}
maybeRedirectLegacyTurmasToAcademia();

const TAB_PATHS: Record<string, string> = {
  home: "/",
  academia: "/academia",
  comunidade: "/comunidade",
  conversas: "/conversas",
  perfil: "/perfil",
  conselheiro: "/conselheiro",
  admin: "/admin",
  "trilha-conversas": "/trilha-conversas",
  landingpage: "/landingpage",
};

function tabFromPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "") return "home";
  if (p === "/academia" || p.startsWith("/academia/") || p === "/turmas") return "academia";
  if (p === "/comunidade" || p.startsWith("/comunidade/") || p.startsWith("/c/")) return "comunidade";
  if (p === "/conversas" || p.startsWith("/conversas/")) return "conversas";
  if (p === "/perfil" || p.startsWith("/perfil/") || p.startsWith("/u/")) return "perfil";
  if (p === "/conselheiro") return "conselheiro";
  if (p === "/admin" || p.startsWith("/admin/")) return "admin";
  if (p === "/trilha-conversas") return "trilha-conversas";
  if (p === "/landingpage") return "landingpage";
  return "home";
}

function pathFromTab(tab: string): string {
  return TAB_PATHS[tab] ?? "/";
}

// Task #70 — `/login` e `/cadastro` são entradas diretas no fluxo de auth
// (sem welcome / onboarding). Mantidos como rotas reais para serem
// linkáveis das páginas marketing e de e-mails transacionais.
function getInitialAuthIntent(): "login" | "register" | null {
  if (typeof window === "undefined") return null;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/login") return "login";
  if (p === "/cadastro") return "register";
  return null;
}

function getResetTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    return token && token.length >= 32 ? token : null;
  } catch {
    return null;
  }
}

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const { setTheme } = useTheme();

  // Task #45 — hidrata o tema (e idioma futuro) das preferências do
  // usuário assim que a sessão carrega. Mantemos localStorage como
  // cache pra primeiros frames, mas o servidor é a fonte de verdade.
  useEffect(() => {
    const pref = user?.notification_preferences?.theme;
    if (pref === "light" || pref === "dark") {
      setTheme(pref);
    }
  }, [user, setTheme]);

  // Task #176 — currentTab é DERIVADO da URL (useLocation). Não tem mais
  // useState próprio — qualquer mudança de aba passa pelo navigate, e o
  // back/forward do navegador volta a funcionar de graça. setCurrentTab
  // mantém a mesma assinatura (string → void) por compatibilidade com
  // todos os componentes legados (Navigation, DesktopSidebar, TopNavbar,
  // HomePage, NotificationBell, ConselheiroPage, etc.).
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = tabFromPath(location.pathname);
  const setCurrentTab = useCallback(
    (tab: string) => {
      // "privacy" não é uma aba real — é overlay. Mantemos o nome legado
      // pra preservar callsites (LandingPage onOpenPrivacyPolicy,
      // ConsentBanner) sem precisar tocar neles.
      if (tab === "privacy") {
        setShowPrivacyOverlay(true);
        return;
      }
      const target = pathFromTab(tab);
      if (window.location.pathname.replace(/\/+$/, "") !== target.replace(/\/+$/, "")) {
        navigate(target);
      }
    },
    [navigate],
  );
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(() => getResetTokenFromUrl());
  // Returning visitors (anyone who has logged in or registered on this device
  // before) skip the Welcome + 3-step Onboarding and land directly on the
  // login form. The flag lives in localStorage and is set by AuthContext on
  // any successful auth (login, register, or session restore).
  // A reset_token in the URL always wins so password-reset deep links land
  // straight on the reset form, never on welcome/onboarding.
  const [preAuthStage, setPreAuthStage] = useState<PreAuthStage>(() => {
    if (getResetTokenFromUrl()) return "auth";
    if (getInitialAuthIntent()) return "auth";
    return isReturningDevice() ? "auth" : "welcome";
  });
  const [authStartMode, setAuthStartMode] = useState<AuthStartMode>(() => {
    const intent = getInitialAuthIntent();
    if (intent) return intent;
    return isReturningDevice() ? "login" : "register";
  });
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [showPrivacyOverlay, setShowPrivacyOverlay] = useState(false);
  // Public marketing routes are now hard-gated em `App` (default export)
  // ANTES do AuthProvider — garante que /recursos, /blog etc. nunca chamem
  // `GET /api/auth/me`. Aqui dentro do `AppContent` ainda mantemos a rota
  // legada /privacy /terms (compatibilidade c/ fluxo OAuth) por baixo do
  // gate, mas nunca renderizamos páginas marketing — esse caminho não é
  // mais alcançado para elas.

  const appContext = useApp();
  const isInBookReader = appContext?.isInBookReader || false;
  // Task #44 — esconde a MobileTopBar (lupa + envelope) em contextos
  // de player/leitura/chat onde os ícones flutuantes brigam com o
  // próprio chrome da página.
  const isInPlayerContext =
    appContext?.isInVideoPage ||
    appContext?.isInBookReader ||
    appContext?.isInOrbChat ||
    appContext?.isInCentralConversas ||
    false;

  useEffect(() => {
    analytics.trackAppOpened();
  }, []);

  // Task #115 — listener global "voltar ao topo" disparado quando o usuário
  // clica numa aba que já está ativa. Páginas que precisam de side-effect
  // adicional (PerfilPage, ConversasPage) instalam seus próprios listeners.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener(RAYO_SCROLL_TOP, handler);
    return () => window.removeEventListener(RAYO_SCROLL_TOP, handler);
  }, []);

  // Task #164 — Quando qualquer card do produto pede pra abrir um
  // perfil/post/comunidade (helpers em src/lib/cardClickTargets.ts), os
  // eventos JÁ EXISTENTES (`rayo:open-profile`/`-post`/`-community`,
  // mesmos da busca em searchNavigate.ts) são disparados. Aqui, no nível
  // raiz, mapeamos cada evento pra aba correspondente — assim os cards
  // aninhados não precisam receber `setCurrentTab` por prop. As páginas
  // alvo (PerfilPage, ComunidadePage) continuam escutando o mesmo evento
  // e o stash de sessionStorage pra abrir o item certo.
  useEffect(() => {
    const onOpenProfile = () => setCurrentTab("perfil");
    const onOpenPost = () => setCurrentTab("comunidade");
    const onOpenCommunity = () => setCurrentTab("comunidade");
    window.addEventListener(RAYO_OPEN_PROFILE, onOpenProfile as EventListener);
    window.addEventListener(RAYO_OPEN_POST, onOpenPost as EventListener);
    window.addEventListener(RAYO_OPEN_COMMUNITY, onOpenCommunity as EventListener);
    return () => {
      window.removeEventListener(RAYO_OPEN_PROFILE, onOpenProfile as EventListener);
      window.removeEventListener(RAYO_OPEN_POST, onOpenPost as EventListener);
      window.removeEventListener(RAYO_OPEN_COMMUNITY, onOpenCommunity as EventListener);
    };
  }, []);

  // Task #45 — deep-link `/u/<id>` para perfis compartilhados. Captura
  // o id e estaciona em sessionStorage pra PerfilPage abrir o perfil
  // correto (mesmo contrato usado pela busca/cards).
  // Task #176 — em vez de replaceState manual, usamos navigate(replace)
  // pra trocar a URL pra `/perfil` (canônica da aba). A URL pública
  // /u/:id mais robusta (que sobrevive a refresh) fica pra Task #178.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = location.pathname.match(/^\/u\/(\d+)\/?$/);
    if (!match) return;
    const id = match[1];
    try {
      sessionStorage.setItem("rayo-pending-profile", id);
    } catch {
      // ignore
    }
    navigate("/perfil", { replace: true });
  }, [location.pathname, navigate]);

  // Task #176 — sync URL ↔ aba feito agora pelo router (currentTab é
  // derivado de useLocation). `/c/<slug>` e `/c/<slug>/p/<id>` continuam
  // tratadas dentro de ComunidadePage, que parsea o pathname e escuta
  // popstate pra abrir a comunidade/discussão certa. tabFromPath já
  // mapeia ambos os formatos pra "comunidade", então a aba destacada
  // no Navigation/DesktopSidebar fica correta automaticamente.

  // Task #177 — Roteamento de Academia: turma e player de vídeo agora têm
  // URL canônica (`/academia/curso/:id`, `/academia/curso/:id/aula/:lessonId`,
  // `/video/:id`). A URL é a fonte de verdade — fazemos sync bidirecional
  // com os flags legados (`isInCourseDetail`/`currentCourseId`/`isInVideoPage`/
  // `currentVideoId`) pra que TODOS os ~15 callsites existentes (HomePage,
  // AcademiaPage, NotificationBell, FavoritesPage, SmartRecommendations,
  // searchNavigate, MobileSearchPage, TopNavbar, HojeNoRaio, UnifiedContinue,
  // TurmaShell.back, etc) continuem funcionando sem modificação — eles
  // chamam `setCurrentCourseId(x)+setIsInCourseDetail(true)` e o sync se
  // encarrega de empurrar a URL nova; back/forward do navegador e refresh
  // funcionam por construção.
  //
  // Aula (`/academia/curso/:id/aula/:lessonId`) é aceita como URL válida
  // mas não tem UI de seleção de aula ainda — o lesson_id fica estacionado
  // em sessionStorage `rayo-pending-lesson` pra um futuro "scroll-to-lesson"
  // dentro de CourseDetailPage. Marca atual: course-level URL.
  useEffect(() => {
    if (!appContext) return;
    const p = location.pathname.replace(/\/+$/, "") || "/";
    const courseMatch = p.match(/^\/academia\/curso\/(\d+)(?:\/aula\/(\d+))?$/);
    const videoMatch = p.match(/^\/video\/([\w-]+)$/);

    if (courseMatch) {
      const id = Number(courseMatch[1]);
      const lessonId = courseMatch[2] ?? null;
      if (lessonId) {
        try { sessionStorage.setItem("rayo-pending-lesson", lessonId); } catch { /* ignore */ }
      }
      if (appContext.currentCourseId !== id || !appContext.isInCourseDetail) {
        appContext.setCurrentCourseId(id);
        appContext.setIsInCourseDetail(true);
      }
    } else if (appContext.isInCourseDetail) {
      appContext.setIsInCourseDetail(false);
      appContext.setCurrentCourseId(null);
    }

    if (videoMatch) {
      const id = videoMatch[1];
      if (appContext.currentVideoId !== id || !appContext.isInVideoPage) {
        appContext.setCurrentVideoId(id);
        appContext.setIsInVideoPage(true);
      }
    } else if (appContext.isInVideoPage) {
      appContext.setIsInVideoPage(false);
      appContext.setCurrentVideoId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Reverso: Context → URL. Quando um callsite legado flipa
  // isInCourseDetail/isInVideoPage, empurramos a URL canônica. Vídeo tem
  // prioridade (overlay sobreposto). Sair (flag=false) volta uma entrada
  // do histórico (vídeo) ou cai pra /academia (turma) — preserva o "back".
  //
  // Hydration guard via useRef: o branch "fechar" (flag=false &&
  // URL=canônica) só dispara em transição REAL true→false, não no estado
  // inicial false do mount. Sem isso, abrir direto em /academia/curso/5
  // (refresh ou deep-link) faria este effect rodar antes do URL→Context
  // hidratar o flag, executando navigate("/academia") e quebrando o deep
  // link (ping-pong de redirect). O effect URL→Context cuida da hidratação;
  // este aqui só reage a mudanças vindas do AppContext.
  const prevCourseDetail = useRef(false);
  const prevVideoPage = useRef(false);
  useEffect(() => {
    if (!appContext) return;
    const p = location.pathname.replace(/\/+$/, "") || "/";
    const wasCourse = prevCourseDetail.current;
    const wasVideo = prevVideoPage.current;
    prevCourseDetail.current = appContext.isInCourseDetail;
    prevVideoPage.current = appContext.isInVideoPage;

    if (appContext.isInVideoPage && appContext.currentVideoId) {
      const expected = `/video/${appContext.currentVideoId}`;
      if (p !== expected) navigate(expected);
      return;
    }
    // Só "fecha" o vídeo quando ele ESTAVA aberto e agora não está mais.
    if (wasVideo && !appContext.isInVideoPage && p.startsWith("/video/")) {
      navigate(-1);
      return;
    }

    if (appContext.isInCourseDetail && appContext.currentCourseId) {
      const expected = `/academia/curso/${appContext.currentCourseId}`;
      if (!p.startsWith(expected)) navigate(expected);
      return;
    }
    // Só "fecha" a turma quando ela ESTAVA aberta e agora não está mais.
    if (wasCourse && !appContext.isInCourseDetail && p.startsWith("/academia/curso/")) {
      navigate("/academia");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appContext?.isInCourseDetail,
    appContext?.currentCourseId,
    appContext?.isInVideoPage,
    appContext?.currentVideoId,
  ]);

  // Task #99 — abre o TurmaShell quando a landing pública estacionou
  // o id em sessionStorage (membro logado clicou "Entrar na turma" em
  // /turmas/:id). Roda uma vez no mount; limpa o stash depois pra não
  // reabrir num refresh involuntário.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem("rayo-pending-turma");
    } catch {
      pending = null;
    }
    if (!pending) return;
    const turmaId = Number(pending);
    if (!Number.isFinite(turmaId) || turmaId < 1) return;
    try {
      sessionStorage.removeItem("rayo-pending-turma");
    } catch {
      // ignore
    }
    // Task #177 — navega direto pra URL canônica da turma; o sync
    // bidirecional em AppContent vai hidratar `currentCourseId`/
    // `isInCourseDetail` quando o pathname mudar.
    navigate(`/academia/curso/${turmaId}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Task #176 — depois do login, se o usuário ainda está em /login ou
  // /cadastro (rotas anônimas que disparam o AuthPage), manda pra /
  // pra evitar mostrar a Home com URL `/login` na barra. replace: true
  // pra back não voltar pro form.
  useEffect(() => {
    if (!user) return;
    const p = location.pathname.replace(/\/+$/, "") || "/";
    if (p === "/login" || p === "/cadastro") {
      navigate("/", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Task #71 — deep-link `/conversas/<id>` for notification + email links.
  // Park the target id in sessionStorage and reescreve a URL pra
  // /conversas (rota canônica da aba). Task #179 vai trocar isso por
  // /conversas/:id sobrevivendo a refresh; por ora mantém o contrato
  // legado pra não regredir a abertura via notificações.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = location.pathname.match(/^\/conversas\/(\d+)\/?$/);
    if (!match) return;
    const id = match[1];
    try {
      sessionStorage.setItem("rayo-pending-conversation", id);
    } catch {
      // ignore
    }
    navigate("/conversas", { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (resetToken && user) {
      void logout();
    }
  }, [resetToken, user, logout]);

  useEffect(() => {
    if (resetToken) {
      setPreAuthStage("auth");
    }
  }, [resetToken]);

  // When the user logs out (or session expires) mid-runtime, re-sync the
  // pre-auth routing from the device flag so they land directly on login
  // instead of seeing a stale Welcome screen from the initial mount.
  useEffect(() => {
    if (user || isLoading || resetToken) return;
    if (isReturningDevice() && preAuthStage === "welcome") {
      setPreAuthStage("auth");
      setAuthStartMode("login");
    }
  }, [user, isLoading, resetToken, preAuthStage]);

  const clearResetToken = () => {
    setResetToken(null);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("reset_token");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // ignore
      }
    }
  };

  // (Páginas públicas são gateadas em App() ANTES do AuthProvider para evitar
  // chamadas a /api/auth/me em first paint de crawler. Ver default export.)

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--rayo-sand-100)" }}
      >
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: "var(--rayo-terra-100)" }}
          >
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--rayo-terra-500)",
                borderTopColor: "transparent",
              }}
            />
          </div>
          <p style={{ color: "var(--rayo-ink-700)" }}>
            Inicializando RAYO...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    let preAuthContent;
    if (preAuthStage === "welcome") {
      preAuthContent = (
        <WelcomeScreen
          onStart={() => {
            setAuthStartMode("register");
            setPreAuthStage("onboarding");
          }}
          onSkipToLogin={() => {
            // First-time visitor who already has an account elsewhere.
            // Remember the choice so future visits skip the welcome too.
            markDeviceAsReturning();
            setAuthStartMode("login");
            setPreAuthStage("auth");
          }}
        />
      );
    } else if (preAuthStage === "onboarding") {
      preAuthContent = (
        <Onboarding
          onComplete={(data: OnboardingData) => {
            setOnboardingData(data);
            setAuthStartMode("register");
            setPreAuthStage("auth");
          }}
        />
      );
    } else {
      // Returning visitors don't get a "back to welcome" button — there's
      // nothing meaningful to go back to. They can still switch to "Criar
      // conta" from inside AuthPage if needed.
      const hadOnboarding = authStartMode === "register" && !!onboardingData;
      const showGoBack = !resetToken && hadOnboarding;
      preAuthContent = (
        <AuthPage
          defaultMode={resetToken ? "reset" : authStartMode}
          prefillName={onboardingData?.name}
          prefillSegments={onboardingData?.segments}
          prefillInterests={onboardingData?.interests}
          onGoBack={showGoBack ? () => setPreAuthStage("welcome") : undefined}
          resetToken={resetToken || undefined}
          onResetComplete={clearResetToken}
        />
      );
    }

    return (
      <>
        {showPrivacyOverlay ? (
          <PrivacyPolicyPage onBack={() => setShowPrivacyOverlay(false)} />
        ) : (
          preAuthContent
        )}
        <ConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyOverlay(true)} />
      </>
    );
  }

  const userSegment = user.segments?.[0] || onboardingData?.segments?.[0] || "solteiro";

  if (currentTab === "admin") {
    // Baseline shell access starts at "producer" (content authors). The shell
    // itself hides sections the user can't access (Users → admin-only,
    // Moderation → moderator+).
    if (!userHasRole(user, "producer")) {
      setTimeout(() => navigate("/", { replace: true }), 0);
      return null;
    }
    return <AdminShell onExitAdmin={() => setCurrentTab("home")} />;
  }

  const renderCurrentPage = () => {
    try {
      switch (currentTab) {
        case "home":
          return (
            <HomePage
              userSegment={userSegment}
              userName={user.name}
              userLevel={user.level || 1}
              onNavigate={setCurrentTab}
            />
          );
        case "academia":
          return <AcademiaWithBookReader />;
        case "conselheiro":
          return <ConselheiroPage />;
        case "comunidade":
          return <ComunidadePage onNavigate={setCurrentTab} />;
        case "conversas":
          return <ConversasPage />;
        case "trilha-conversas":
          return <CentralConversasPage />;
        case "perfil":
          return <PerfilPage onNavigate={setCurrentTab} />;
        case "landingpage":
          return (
            <LandingPage
              onStartFree={() => setCurrentTab("home")}
              onStartPremium={() => setCurrentTab("home")}
              onClose={() => setCurrentTab("home")}
              showCloseButton={true}
              onOpenPrivacyPolicy={() => setShowPrivacyOverlay(true)}
            />
          );
        default:
          return (
            <HomePage
              userSegment={userSegment}
              userName={user.name}
              userLevel={user.level || 1}
              onNavigate={setCurrentTab}
            />
          );
      }
    } catch (error) {
      console.error("Erro ao renderizar página:", error);
      return (
        <div className="p-6 max-w-md mx-auto mt-8">
          <div className="text-center py-8 space-y-4">
            <h2 className="text-xl font-semibold">Carregando RAYO...</h2>
            <p className="text-muted-foreground">
              Preparando sua experiência de transformação
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--rayo-sand-100)" }}>
      <a href="#main-content" className="skip-link">
        Ir para conteúdo principal
      </a>

      {!isInBookReader && (
        <>
          <DesktopSidebar
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            isMinimized={isSidebarMinimized}
            onToggleMinimize={() => setIsSidebarMinimized(!isSidebarMinimized)}
          />
          <TopNavbar onTabChange={setCurrentTab} isSidebarMinimized={isSidebarMinimized} />
          {/* Mobile-only entry point for Mensagens (moved out of the
              bottom navbar in Task #41). Hidden on the conversas page
              itself to avoid a redundant icon over the chat header. */}
          {currentTab !== "conversas" &&
            currentTab !== "trilha-conversas" &&
            !isInPlayerContext && (
              <MobileTopBar
                onOpenMessages={() => setCurrentTab("conversas")}
                onTabChange={setCurrentTab}
              />
            )}
        </>
      )}

      <main
        id="main-content"
        className={`focus:outline-none ${
          isInBookReader
            ? ""
            : `navbar-bottom-spacing ${isSidebarMinimized ? "desktop-layout-minimized" : "desktop-layout"}`
        }`}
        tabIndex={-1}
        role="main"
        aria-label="Conteúdo principal"
      >
        <PageTransition tabKey={currentTab}>
          {renderCurrentPage()}
        </PageTransition>
      </main>

      {!isInBookReader && (
        <Navigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />
      )}

      {/* Task #168 — overlay global do player interno de vídeo/áudio.
          Diversos fluxos (busca, "Hoje no RAYO" interno, cards de
          video/audio/reels da Academia) chamam setIsInVideoPage(true),
          mas não havia onde a VideoPage estivesse efetivamente montada
          — o resultado era "tela preta" (na verdade, simplesmente nada
          abria). Renderizamos aqui no nível raiz pra cobrir todos os
          fluxos. */}
      {appContext?.isInVideoPage && appContext?.currentVideoId && (
        <div className="fixed inset-0 z-[9999] bg-background overflow-y-auto">
          <VideoPage
            videoId={appContext.currentVideoId}
            onBack={() => {
              appContext.setIsInVideoPage(false);
              appContext.setCurrentVideoId(null);
            }}
          />
        </div>
      )}

      <ConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyOverlay(true)} />

      {/* Task #176 — overlay de Política de Privacidade dentro do shell
          autenticado (acionado pelo ConsentBanner ou pela LandingPage).
          Antes era um "tab" virtual no switch; agora é overlay puro
          pra não conflitar com o roteamento real (URL não muda). */}
      {showPrivacyOverlay && (
        <div className="fixed inset-0 z-[10000] bg-background overflow-y-auto">
          <PrivacyPolicyPage onBack={() => setShowPrivacyOverlay(false)} />
        </div>
      )}
    </div>
  );
}

// Task #70 — Public/marketing shell renderizado SEM AuthProvider para que
// crawlers e visitantes anônimos nunca disparem `GET /api/auth/me` no first
// paint. Cobre /privacy, /terms e todas as páginas marketing + blog.
function PublicShell({ route }: { route: PublicRoute }) {
  // Em vez de fazer setState pra "fechar" uma página pública, o botão Voltar
  // faz hard-navigate pra "/" — recarrega o app no fluxo normal de auth, sem
  // precisar manter providers para essa transição rara.
  const goHome = () => {
    if (typeof window !== "undefined") window.location.href = "/";
  };
  switch (route.page) {
    case "privacy": return <PrivacyPolicyPage onBack={goHome} />;
    case "terms": return <TermsPage onBack={goHome} />;
    case "excluir-dados": return <ExcluirDadosPage />;
    case "recursos": return <RecursosPage />;
    case "como-funciona": return <ComoFuncionaPage />;
    case "empresa": return <EmpresaPage />;
    case "contato": return <ContatoPage />;
    case "faq": return <FaqPage />;
    case "imprensa": return <ImprensaPage />;
    case "blog":
      return route.blogSlug
        ? <BlogPostPage slug={route.blogSlug} />
        : <BlogIndexPage />;
    case "turma-landing":
      return <PublicTurmaLanding turmaId={route.turmaId!} />;
    case "trilhas-catalog":
      return <TrilhasCatalogPage />;
    case "trilha-detail":
      return <TrilhaDetailPage slug={route.trailSlug!} />;
    case "trilha-sucesso":
      return <TrilhaSucessoPage />;
  }
}

// Task #99 — wrapper público da landing de turma (sem AuthProvider). Usa
// fetch direto pra `/api/turmas/:id/landing` (rota pública). CTA "Garantir
// minha vaga" chama `/api/turmas/:id/interest` (anônimo OK no backend).
function PublicTurmaLanding({ turmaId }: { turmaId: number }) {
  // Task #99 — quando o landing endpoint sinaliza is_member=true (cookie
  // de sessão presente), trocamos a CTA pra "Entrar na turma". Como a
  // rota /turmas/:id é detectada ANTES do AuthProvider (gate público
  // pré-render), não conseguimos chamar setCurrentCourseId aqui — então
  // estacionamos o id em sessionStorage e damos full-reload pra "/".
  // O AppContent monta com Auth + AppProvider, lê o stash e abre o
  // TurmaShell direto (vide useEffect "rayo-pending-turma" em AppContent).
  return (
    <TurmaLandingPage
      turmaId={turmaId}
      onBack={() => {
        if (typeof window !== "undefined") window.location.href = "/";
      }}
      onEnterTurma={() => {
        if (typeof window === "undefined") return;
        try {
          sessionStorage.setItem("rayo-pending-turma", String(turmaId));
        } catch {
          // ignore
        }
        window.location.href = "/";
      }}
    />
  );
}

export default function App() {
  // Detect na inicialização do bundle, antes de qualquer provider de auth.
  const publicRoute = getPublicPageFromUrl();
  if (publicRoute) {
    return (
      <ThemeProvider>
        <AccessibilityProvider>
          <PublicShell route={publicRoute} />
          <Toaster />
        </AccessibilityProvider>
      </ThemeProvider>
    );
  }
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <AppProvider>
              <AnalyticsProvider>
                <UnreadMessagesProvider>
                  <UnreadBySectionProvider>
                    <AudioPlayerProvider>
                      <AppContent />
                      <GlobalAudioPlayer />
                      <Toaster />
                    </AudioPlayerProvider>
                  </UnreadBySectionProvider>
                </UnreadMessagesProvider>
              </AnalyticsProvider>
            </AppProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
