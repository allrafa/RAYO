import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { TopNavbar } from "./components/TopNavbar";
import { AccessibilityProvider } from "./components/AccessibilityContext";
import { AppProvider, useApp } from "./components/AppContext";
import { AnalyticsProvider } from "./components/AnalyticsContext";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { AuthPage } from "./components/AuthPage";
import { HomePage } from "./components/HomePage";
import { AcademiaWithBookReader } from "./components/AcademiaWithBookReader";
import { ConselheiroPage } from "./components/ConselheiroPage";
import { ComunidadePage } from "./components/ComunidadePage";
import { PerfilPage } from "./components/PerfilPage";
import { CentralConversasPage } from "./components/TrilhaTransformacao/CentralConversasPage";
import { ConsentBanner } from "./components/ConsentBanner";
import { LandingPage } from "./components/LandingPage";
import { analytics } from "./lib/analytics/mixpanel";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState("home");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  const appContext = useApp();
  const isInBookReader = appContext?.isInBookReader || false;

  useEffect(() => {
    analytics.trackAppOpened();
  }, []);

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
    return <AuthPage />;
  }

  const renderCurrentPage = () => {
    try {
      switch (currentTab) {
        case "home":
          return (
            <HomePage
              userSegment="solteiro"
              userName={user.name}
              userLevel={user.level || 1}
            />
          );
        case "academia":
          return <AcademiaWithBookReader />;
        case "conselheiro":
          return <ConselheiroPage />;
        case "comunidade":
          return <ComunidadePage />;
        case "conversas":
          return <CentralConversasPage />;
        case "perfil":
          return <PerfilPage />;
        case "landingpage":
          return (
            <LandingPage
              onStartFree={() => setCurrentTab("home")}
              onStartPremium={() => setCurrentTab("home")}
              onClose={() => setCurrentTab("home")}
              showCloseButton={true}
            />
          );
        default:
          return (
            <HomePage
              userSegment="solteiro"
              userName={user.name}
              userLevel={user.level || 1}
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
          userName={user.name}
          userLevel={user.level}
          notifications={0}
          isTransparent={false}
        />
      )}

      <ConsentBanner />
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
              <AppContent />
              <Toaster />
            </AnalyticsProvider>
          </AppProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
