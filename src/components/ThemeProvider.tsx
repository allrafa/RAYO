import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Carregar tema do localStorage na montagem
  useEffect(() => {
    // Task #163 — chave migrada pra 'rayo-theme' no rebrand RAIO→RAYO
    // (Maio/2026). storageMigration.ts copiou o valor legado no boot.
    const savedTheme = localStorage.getItem('rayo-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Prioridade: 1. localStorage, 2. preferência do sistema, 3. light (padrão)
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  // Aplicar tema ao DOM
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remover classes antigas
    root.classList.remove('light', 'dark');
    
    // Adicionar nova classe
    root.classList.add(newTheme);
    
    // Salvar no localStorage
    localStorage.setItem('rayo-theme', newTheme);
    
    // Atualizar meta theme-color para mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // RAYO v2: forest-900 em light, ink-900 em dark (alinhado ao index.html)
      metaThemeColor.setAttribute(
        'content',
        newTheme === 'dark' ? '#0E1A14' : '#0C3B2E'
      );
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Prevenir flash durante SSR/hydration
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
