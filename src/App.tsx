import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { TopNavbar } from "./components/TopNavbar";
import { Onboarding } from "./components/Onboarding";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { AccessibilityProvider } from "./components/AccessibilityContext";
import { AppProvider, useApp } from "./components/AppContext";
import { AnalyticsProvider } from "./components/AnalyticsContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/sonner";
import { HomePage } from "./components/HomePage";
import { AcademiaWithBookReader } from "./components/AcademiaWithBookReader";
import { ConselheiroPage } from "./components/ConselheiroPage";
import { ComunidadePage } from "./components/ComunidadePage";
import { PerfilPage } from "./components/PerfilPage";
import { CentralConversasPage } from "./components/TrilhaTransformacao/CentralConversasPage";
import { ConsentBanner } from "./components/ConsentBanner";
import { LandingPage } from "./components/LandingPage";
import { DebugLandingPageButton } from "./components/DebugLandingPageButton";
import { DebugResetOnboarding } from "./components/DebugResetOnboarding";
import { analytics } from "./lib/analytics/mixpanel";

function AppContent() {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [currentTab, setCurrentTab] = useState("home");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [userData, setUserData] = useState({
    name: "Maria",
    segments: ["solteiro"],
    interests: [],
    goals: [],
    level: 3,
    points: 250,
    streak: 0,
    completedCourses: [],
    enrolledCourses: [],
    favoriteProducts: []
  });

  // Hook para acessar o estado do Book Reader
  const appContext = useApp();
  const isInBookReader = appContext?.isInBookReader || false;

  // 🎯 MODO PREVIEW: Landing Page isolada
  // Para visualizar: adicione ?preview=landing na URL
  // Exemplo: http://localhost:5173/?preview=landing
  const urlParams = new URLSearchParams(window.location.search);
  const previewMode = urlParams.get('preview');

  // Simulate checking for existing user data
  useEffect(() => {
    // Track app opened
    analytics.trackAppOpened();
    
    const initializeApp = async () => {
      try {
        // 🔄 RESETAR ONBOARDING - Descomentar para voltar ao início
        // localStorage.removeItem("raio-user");
        // localStorage.removeItem("raio-welcome-seen");
        
        const existingUser = localStorage.getItem("raio-user");
        const seenWelcome = localStorage.getItem("raio-welcome-seen");
        
        if (seenWelcome === "true") {
          setHasSeenWelcome(true);
        }
        
        if (existingUser) {
          const user = JSON.parse(existingUser);
          if (user.segment && !user.segments) {
            user.segments = [user.segment];
            delete user.segment;
          }
          if (!user.segments || !Array.isArray(user.segments)) {
            user.segments = ["solteiro"];
          }
          setUserData(user);
          setIsOnboarded(true);
          setHasSeenWelcome(true); // Se já tem usuário, já viu welcome
        }
      } catch (error) {
        console.error("Erro ao inicializar app:", error);
        localStorage.removeItem("raio-user");
      } finally {
        // Pequeno delay para garantir que os contextos sejam carregados
        setTimeout(() => setIsAppReady(true), 100);
      }
    };
    
    initializeApp();
  }, []);

  const handleWelcomeComplete = () => {
    localStorage.setItem("raio-welcome-seen", "true");
    setHasSeenWelcome(true);
    // Agora vai para o Onboarding para coletar dados do usuário
  };

  const handleOnboardingComplete = (newUserData: any) => {
    const completeUserData = {
      ...newUserData,
      level: 1,
      points: 0,
      streak: 0,
      completedCourses: [],
      enrolledCourses: [],
      favoriteProducts: [],
      segments: newUserData.segments || ["solteiro"]
    };
    setUserData(completeUserData);
    localStorage.setItem("raio-user", JSON.stringify(completeUserData));
    setIsOnboarded(true);
  };

  // 🎯 PREVIEW MODE: Mostrar Landing Page isolada
  // Acesse com: ?preview=landing na URL
  if (previewMode === 'landing') {
    return (
      <LandingPage
        onStartFree={() => {
          // Remove preview mode e vai para app normal
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
        onStartPremium={() => {
          // Remove preview mode e vai para app normal
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
        showCloseButton={true}
        onClose={() => {
          // Volta para app normal
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  // Loading inicial
  if (!isAppReady) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'var(--raio-bg-primary)',
        }}
      >
        <div className="text-center space-y-4">
          <div 
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{
              background: 'var(--raio-accent-subtle)',
            }}
          >
            <div 
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--raio-accent-primary)',
                borderTopColor: 'transparent',
              }}
            ></div>
          </div>
          <p style={{ color: 'var(--raio-text-secondary)' }}>
            Inicializando RAIO...
          </p>
        </div>
      </div>
    );
  }

  // Welcome Screen (primeira vez)
  if (!hasSeenWelcome) {
    return <WelcomeScreen onStart={handleWelcomeComplete} />;
  }

  // Onboarding
  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const renderCurrentPage = () => {
    try {
      switch (currentTab) {
        case "home":
          return (
            <HomePage 
              userSegment={userData.segments?.[0] || "solteiro"}
              userName={userData.name}
              userLevel={userData.level || 1}
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
              userSegment={userData.segments?.[0] || "solteiro"}
              userName={userData.name}
              userLevel={userData.level || 1}
            />
          );
      }
    } catch (error) {
      console.error("Erro ao renderizar página:", error);
      return (
        <div className="p-6 max-w-md mx-auto mt-8">
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold">Carregando RAIO...</h2>
            <p className="text-muted-foreground">Preparando sua experiência de transformação</p>
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

      {/* Desktop Layout: Sidebar + Top Navbar - ESCONDIDOS NO READER MODE */}
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
      
      {/* Main Content */}
      <main 
        id="main-content" 
        className={`focus:outline-none ${
          isInBookReader 
            ? '' // Sem padding no reader mode
            : `navbar-bottom-spacing ${isSidebarMinimized ? 'desktop-layout-minimized' : 'desktop-layout'}`
        }`}
        tabIndex={-1}
        role="main"
        aria-label="Conteúdo principal"
      >
        {renderCurrentPage()}
      </main>

      {/* Mobile Navigation - ESCONDIDO NO READER MODE */}
      {!isInBookReader && (
        <Navigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userName={userData.name}
          userLevel={userData.level}
          notifications={2}
          isTransparent={false}
        />
      )}
      
      {/* Consent Banner - LGPD */}
      <ConsentBanner />
      
      {/* 🐛 DEBUG: Botão para visualizar Landing Page */}
      <DebugLandingPageButton />
      
      {/* 🐛 DEBUG: Botão para resetar Onboarding */}
      <DebugResetOnboarding />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <AppProvider>
          <AnalyticsProvider>
            <AppContent />
            <Toaster />
          </AnalyticsProvider>
        </AppProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
