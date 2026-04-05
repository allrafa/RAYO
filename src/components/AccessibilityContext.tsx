import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner@2.0.3';

type Theme = 'light' | 'dark' | 'system';

interface AccessibilitySettings {
  theme: Theme;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark';
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    theme: 'system',
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    fontSize: 'base'
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('raio-accessibility');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }

    // Check for system preferences
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }

    // Set initial resolved theme
    setResolvedTheme(prefersDark ? 'dark' : 'light');

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (settings.theme === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('raio-accessibility', JSON.stringify(settings));
    
    // Determine theme
    let actualTheme: 'light' | 'dark';
    if (settings.theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      actualTheme = settings.theme;
    }
    
    setResolvedTheme(actualTheme);
    
    // Apply settings to document
    const root = document.documentElement;
    root.classList.toggle('dark', actualTheme === 'dark');
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('large-text', settings.largeText);
    root.setAttribute('data-font-size', settings.fontSize);
    
    // Update CSS custom properties
    const fontSizes = {
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px'
    };
    root.style.setProperty('--font-size', fontSizes[settings.fontSize]);
  }, [settings]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleHighContrast = () => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const increaseFontSize = () => {
    const sizes: AccessibilitySettings['fontSize'][] = ['sm', 'base', 'lg', 'xl'];
    const currentIndex = sizes.indexOf(settings.fontSize);
    if (currentIndex < sizes.length - 1) {
      setSettings(prev => ({ ...prev, fontSize: sizes[currentIndex + 1] }));
    }
  };

  const decreaseFontSize = () => {
    const sizes: AccessibilitySettings['fontSize'][] = ['sm', 'base', 'lg', 'xl'];
    const currentIndex = sizes.indexOf(settings.fontSize);
    if (currentIndex > 0) {
      setSettings(prev => ({ ...prev, fontSize: sizes[currentIndex - 1] }));
    }
  };

  const setTheme = (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
    
    // Feedback para o usuário
    const themeLabels = {
      light: '☀️ Tema claro ativado',
      dark: '🌙 Tema escuro ativado', 
      system: '🖥️ Seguindo o sistema'
    };
    toast.success(themeLabels[theme]);
  };

  const toggleTheme = () => {
    if (settings.theme === 'light') {
      setTheme('dark');
    } else if (settings.theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSettings,
      toggleHighContrast,
      increaseFontSize,
      decreaseFontSize,
      setTheme,
      toggleTheme,
      resolvedTheme
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}