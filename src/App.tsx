import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { TopNavbar } from "./components/TopNavbar";
import { MobileTopBar } from "./components/MobileTopBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { Onboarding } from "./components/Onboarding";
import { AccessibilityProvider } from "./components/AccessibilityContext";
import { AppProvider, useApp } from "./components/AppContext";
import { AnalyticsProvider } from "./components/AnalyticsContext";
import { AuthProvider, useAuth, userHasRole } from "./components/AuthContext";
import { AdminShell } from "./components/admin/AdminShell";
import { ThemeProvider, useTheme } from "./components/ThemeProvider";
import { UnreadMessagesProvider } from "./components/hooks/useUnreadMessages";
import { Toaster } from "./components/ui/sonner";
import { AuthPage } from "./components/AuthPage";
import { HomePage } from "./components/HomePage";
import { AcademiaWithBookReader } from "./components/AcademiaWithBookReader";
import { ConselheiroPage } from "./components/ConselheiroPage";
import { ComunidadePage } from "./components/ComunidadePage";
import { PerfilPage } from "./components/PerfilPage";
import { CentralConversasPage } from "./components/TrilhaTransformacao/CentralConversasPage";
import { ConversasPage } from "./components/ConversasPage";
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
import { analytics } from "./lib/analytics/mixpanel";
import { isReturningDevice, markDeviceAsReturning } from "./lib/deviceMemory";
import { RAYO_SCROLL_TOP } from "./lib/scrollTop";
import "./styles/nav-rayo.css";
import "./styles/playlists-rayo.css";
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
  | "turma-landing";

interface PublicRoute { page: PublicPage; blogSlug?: string; turmaId?: number }

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
  return null;
}

// Task #99 — `/academia` é alias legado: redireciona pra `/turmas`
// preservando query params, antes de qualquer renderização.
function maybeRedirectAcademiaToTurmas(): void {
  if (typeof window === "undefined") return;
  const p = window.location.pathname.replace(/\/+$/, "") || "/";
  if (p === "/academia") {
    const search = window.location.search || "";
    window.history.replaceState(null, "", `/turmas${search}`);
  }
}
maybeRedirectAcademiaToTurmas();

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

  // Task #99 — `/turmas` (e `?tab=turmas`) entram direto na aba Turmas
  // (id interno continua "academia" pra não quebrar o switch existente).
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (path === "/turmas" || path === "/academia" || tabParam === "turmas" || tabParam === "academia") {
        return "academia";
      }
    }
    return "home";
  });
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

  // Task #45 — deep-link `/u/<id>` para perfis compartilhados. Captura
  // o id na primeira renderização, troca pra aba Perfil e deixa o
  // sessionStorage `raio-pending-profile` pra PerfilPage abrir o
  // perfil correto (mesmo contrato usado pela busca). A URL é limpa
  // para não disparar de novo num refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/^\/u\/(\d+)\/?$/);
    if (!match) return;
    const id = match[1];
    try {
      sessionStorage.setItem("raio-pending-profile", id);
    } catch {
      // ignore
    }
    setCurrentTab("perfil");
    try {
      window.history.replaceState({}, "", "/");
    } catch {
      // ignore
    }
  }, []);

  // Task #92 — deep-link `/c/<slug>` para comunidades. Mesma mecânica do
  // `/u/<id>`: mantém autenticado (NÃO é página pública), parqueia o slug
  // em sessionStorage e troca pra aba Comunidade. ComunidadePage lê
  // `rayo-pending-community-slug` e abre a vista da comunidade.
  // Task #122 — também detecta `/c/<slug>/p/<id>` (discussão dedicada,
  // compartilhável). Nesse caso parqueia também o id em `raio-pending-post`
  // (mesma chave usada pela busca/perfil), e ComunidadePage abre o
  // CommentsPanel direto — slug fica só pro SEO/canonical e pra UI sugerir
  // a comunidade no header do post.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    // Task #122 — `/c/<slug>/p/<id>` é uma URL DE VERDADE: NÃO fazemos
    // replaceState pra "/". A URL fica no address bar (compartilhável,
    // refresh-safe) e ComunidadePage deriva o estado dela via popstate
    // + leitura inicial do pathname. Aqui só trocamos pra aba Comunidade.
    if (/^\/c\/[a-z0-9-]+(?:\/p\/\d+)?\/?$/i.test(path)) {
      setCurrentTab("comunidade");
      return;
    }
  }, []);

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
    setCurrentTab("academia");
    appContext?.setCurrentCourseId(turmaId);
    appContext?.setIsInCourseDetail(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Task #71 — deep-link `/conversas/<id>` for notification + email links.
  // Mirrors the `/u/:id` contract: park the target id in sessionStorage,
  // switch to the Conversas tab, and clean the URL so refresh doesn't replay.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/^\/conversas\/(\d+)\/?$/);
    if (!match) return;
    const id = match[1];
    try {
      sessionStorage.setItem("rayo-pending-conversation", id);
    } catch {
      // ignore
    }
    setCurrentTab("conversas");
    try {
      window.history.replaceState({}, "", "/");
    } catch {
      // ignore
    }
  }, []);

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
      setTimeout(() => setCurrentTab("home"), 0);
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
              onOpenPrivacyPolicy={() => setCurrentTab("privacy")}
            />
          );
        case "privacy":
          return <PrivacyPolicyPage onBack={() => setCurrentTab("perfil")} />;
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
        {renderCurrentPage()}
      </main>

      {!isInBookReader && (
        <Navigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />
      )}

      <ConsentBanner onOpenPrivacyPolicy={() => setCurrentTab("privacy")} />
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
    <ThemeProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <AppProvider>
            <AnalyticsProvider>
              <UnreadMessagesProvider>
                <AppContent />
                <Toaster />
              </UnreadMessagesProvider>
            </AnalyticsProvider>
          </AppProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
