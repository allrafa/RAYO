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
import { ThemeProvider } from "./components/ThemeProvider";
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
import { analytics } from "./lib/analytics/mixpanel";
import { isReturningDevice, markDeviceAsReturning } from "./lib/deviceMemory";

type PreAuthStage = "welcome" | "onboarding" | "auth";
type AuthStartMode = "login" | "register";

interface OnboardingData {
  name: string;
  segments: string[];
  interests: string[];
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
  const [currentTab, setCurrentTab] = useState("home");
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
    return isReturningDevice() ? "auth" : "welcome";
  });
  const [authStartMode, setAuthStartMode] = useState<AuthStartMode>(() =>
    isReturningDevice() ? "login" : "register",
  );
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [showPrivacyOverlay, setShowPrivacyOverlay] = useState(false);

  const appContext = useApp();
  const isInBookReader = appContext?.isInBookReader || false;

  useEffect(() => {
    analytics.trackAppOpened();
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

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--raio-bg-primary)" }}
      >
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: "var(--raio-accent-subtle)" }}
          >
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--raio-accent-primary)",
                borderTopColor: "transparent",
              }}
            />
          </div>
          <p style={{ color: "var(--raio-text-secondary)" }}>
            Inicializando RAIO...
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
          return <ComunidadePage />;
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
            <h2 className="text-xl font-semibold">Carregando RAIO...</h2>
            <p className="text-muted-foreground">
              Preparando sua experiência de transformação
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
          <TopNavbar onTabChange={setCurrentTab} />
          {/* Mobile-only entry point for Mensagens (moved out of the
              bottom navbar in Task #41). Hidden on the conversas page
              itself to avoid a redundant icon over the chat header. */}
          {currentTab !== "conversas" && (
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

export default function App() {
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
