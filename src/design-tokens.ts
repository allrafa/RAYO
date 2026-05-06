/**
 * 🎨 RAIO DESIGN SYSTEM - DESIGN TOKENS
 * 
 * Arquivo central que define TODOS os tokens de design do ecossistema RAIO.
 * Este é o único lugar onde cores, espaçamentos, tipografia e animações devem ser definidos.
 * 
 * Uso:
 * import { colors, spacing, typography, animations, radius, shadows } from './design-tokens';
 * 
 * Princípios:
 * 1. Minimalismo Premium (off-white/preto com acentos amarelos)
 * 2. Content-First (hierarquia clara)
 * 3. Motion Purposeful (animações sutis)
 * 4. Acessibilidade Total (WCAG AAA)
 */

// ============================================================================
// 🎨 CORES
// ============================================================================

export const colors = {
  // ---------------------------------------------------------------------------
  // LIGHT MODE (Padrão) - Off-White Premium
  // ---------------------------------------------------------------------------
  light: {
    // Backgrounds
    background: {
      primary: '#FAFAFA',      // Off-white principal (WelcomeScreen, Onboarding)
      secondary: '#FFFFFF',    // Branco puro para cards elevados
      tertiary: '#F5F5F5',     // Cinza clarinho para seções alternadas
      warmCream: '#F3EFE7',    // Warm cream (editorial gradient stop)
      warmSoft: '#F5F1EA',     // Warm cream suavizado (numeral watermark)
      overlay: 'rgba(255, 255, 255, 0.7)',  // Glassmorphism
    },
    
    // Textos
    text: {
      primary: '#1A1A1A',      // Preto quente principal
      deep: '#374151',         // Cinza-escuro para ênfase em corpo (editorial)
      strong: '#4B5563',       // Corpo de subtítulos editoriais
      secondary: '#6B7280',    // Cinza médio para texto secundário
      tertiary: '#9CA3AF',     // Cinza claro para labels/placeholders
      inverse: '#FAFAFA',      // Texto em backgrounds escuros
      disabled: '#D1D5DB',     // Texto desabilitado
    },
    
    // Bordas
    border: {
      default: '#E5E5E5',      // Borda padrão sutil
      hover: '#D1D5DB',        // Borda em hover
      active: '#F59E0B',       // Borda em foco/ativo (amarelo com melhor contraste)
      divider: '#F3F4F6',      // Divisores ultra sutis
    },
    
    // Acentos (Amarelo Dourado - Brand RAIO) - Ajustado para melhor contraste
    accent: {
      primary: '#D97706',      // Amarelo mais escuro para texto (WCAG AAA)
      hover: '#B45309',        // Amarelo ainda mais escuro para hover
      light: '#FEF3C7',        // Amarelo claro (backgrounds sutis)
      subtle: '#FFFBEB',       // Amarelo muito sutil (hover states)
      bright: '#FCD34D',       // Amarelo brilhante para backgrounds/badges
    },
    
    // Estados Semânticos
    success: {
      default: '#10B981',
      light: '#D1FAE5',
      text: '#065F46',
    },
    error: {
      default: '#EF4444',
      light: '#FEE2E2',
      text: '#991B1B',
    },
    warning: {
      default: '#F59E0B',
      light: '#FEF3C7',
      text: '#92400E',
    },
    info: {
      default: '#3B82F6',
      light: '#DBEAFE',
      text: '#1E40AF',
    },
    
    // Interação
    interactive: {
      default: '#1A1A1A',      // Estado normal (ex: botões)
      hover: '#2A2A2A',        // Estado hover
      active: '#0A0A0A',       // Estado active/pressed
      disabled: '#F3F4F6',     // Estado disabled
    },
  },

  // ---------------------------------------------------------------------------
  // DARK MODE - Preto Premium
  // ---------------------------------------------------------------------------
  dark: {
    // Backgrounds
    background: {
      primary: '#0A0A0A',      // Preto profundo principal
      secondary: '#1A1A1A',    // Preto elevado para cards
      tertiary: '#2A2A2A',     // Cinza escuro para seções alternadas
      overlay: 'rgba(10, 10, 10, 0.7)',  // Glassmorphism dark
    },
    
    // Textos
    text: {
      primary: '#FAFAFA',      // Off-white principal
      secondary: '#9CA3AF',    // Cinza claro para texto secundário
      tertiary: '#6B7280',     // Cinza médio para labels/placeholders
      inverse: '#1A1A1A',      // Texto em backgrounds claros
      disabled: '#4B5563',     // Texto desabilitado
    },
    
    // Bordas
    border: {
      default: '#2A2A2A',      // Borda padrão sutil
      hover: '#3A3A3A',        // Borda em hover
      active: '#FBBF24',       // Borda em foco/ativo (amarelo mais intenso)
      divider: '#1F1F1F',      // Divisores ultra sutis
    },
    
    // Acentos (Amarelo Dourado - Dark Mode) - Ajustado para melhor contraste
    accent: {
      primary: '#FBBF24',      // Amarelo mais intenso para texto em dark (WCAG AAA)
      hover: '#FCD34D',        // Amarelo ainda mais claro para hover
      light: '#78350F',        // Amarelo escurecido para backgrounds
      subtle: '#1F1B16',       // Amarelo muito escurecido (hover states)
      bright: '#FDE68A',       // Amarelo brilhante para dark mode
    },
    
    // Estados Semânticos
    success: {
      default: '#10B981',
      light: '#064E3B',
      text: '#6EE7B7',
    },
    error: {
      default: '#EF4444',
      light: '#7F1D1D',
      text: '#FCA5A5',
    },
    warning: {
      default: '#F59E0B',
      light: '#78350F',
      text: '#FCD34D',
    },
    info: {
      default: '#3B82F6',
      light: '#1E3A8A',
      text: '#93C5FD',
    },
    
    // Interação
    interactive: {
      default: '#FAFAFA',      // Estado normal (ex: botões)
      hover: '#FFFFFF',        // Estado hover
      active: '#E5E5E5',       // Estado active/pressed
      disabled: '#2A2A2A',     // Estado disabled
    },
  },

  // ---------------------------------------------------------------------------
  // CORES ADICIONAIS (Compatibilidade com sistema antigo)
  // ---------------------------------------------------------------------------
  legacy: {
    sage: {
      900: '#2d3730',
      800: '#37443a',
      700: '#435347',
      600: '#556859',
      500: '#6b7f73',
      400: '#8a9a90',
      300: '#b0bbb4',
      200: '#d1d7d3',
      100: '#e8ebe9',
      50: '#f6f7f6',
    },
    mint: {
      900: '#134e4a',
      800: '#115e59',
      700: '#0f766e',
      600: '#0d9488',
      500: '#14b8a6',
      400: '#2dd4bf',
      300: '#5fe9d0',
      200: '#99f6e0',
      100: '#ccfbef',
      50: '#f0fdf9',
    },
    gold: {
      900: '#78350f',
      800: '#92400e',
      700: '#b45309',
      600: '#d97706',
      500: '#f59e0b',
      400: '#fbbf24',
      300: '#fcd34d',
      200: '#fde68a',
      100: '#fef3c7',
      50: '#fffbeb',
    },
    coral: {
      900: '#831843',
      800: '#9d174d',
      700: '#be185d',
      600: '#db2777',
      500: '#ec4899',
      400: '#f472b6',
      300: '#f9a8d4',
      200: '#fbcfe8',
      100: '#fce7f3',
      50: '#fdf2f8',
    },
  },
};

// ============================================================================
// 📏 ESPAÇAMENTOS
// ============================================================================

export const spacing = {
  // Valores base
  px: '1px',
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  32: '8rem',        // 128px
  
  // Aliases semânticos
  xs: '0.5rem',      // 8px
  sm: '0.75rem',     // 12px
  md: '1rem',        // 16px
  lg: '1.5rem',      // 24px
  xl: '2rem',        // 32px
  '2xl': '3rem',     // 48px
  '3xl': '4rem',     // 64px
};

// ============================================================================
// 📝 TIPOGRAFIA
// ============================================================================

export const typography = {
  // Font Families
  family: {
    display: '"Urbanist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    displaySerif: '"Instrument Serif", "Cormorant Garamond", "Times New Roman", serif',
    body: '"Urbanist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
  },
  
  // Font Sizes
  size: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  },
  
  // Font Weights
  weight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Line Heights
  lineHeight: {
    none: 1,
    tight: 1.2,
    snug: 1.4,
    normal: 1.6,
    relaxed: 1.8,
    loose: 2,
  },
  
  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// ============================================================================
// 🎬 ANIMAÇÕES
// ============================================================================

export const animations = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '1000ms',
  },
  
  // Easing Functions (cubic-bezier)
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.43, 0.13, 0.23, 0.96)',  // Apple-like spring
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Presets comuns
  presets: {
    fadeIn: {
      duration: '200ms',
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
      fill: 'forwards',
    },
    slideUp: {
      duration: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    },
    scaleIn: {
      duration: '200ms',
      easing: 'cubic-bezier(0.43, 0.13, 0.23, 0.96)',
      fill: 'forwards',
    },
  },
};

// ============================================================================
// 🔘 BORDER RADIUS
// ============================================================================

export const radius = {
  none: '0',
  xs: '0.25rem',     // 4px
  sm: '0.375rem',    // 6px
  md: '0.5rem',      // 8px
  lg: '0.75rem',     // 12px
  xl: '1rem',        // 16px
  '2xl': '1.25rem',  // 20px
  '3xl': '1.5rem',   // 24px
  full: '9999px',
};

// ============================================================================
// 🎭 SHADOWS (Elevações)
// ============================================================================

export const shadows = {
  light: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.12)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.16)',
    '2xl': '0 12px 48px rgba(0, 0, 0, 0.20)',
    inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    
    // Glow effects
    glowYellow: '0 0 20px rgba(252, 211, 77, 0.3)',
    glowYellowSubtle: '0 0 10px rgba(252, 211, 77, 0.15)',
  },
  
  dark: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 2px 8px rgba(0, 0, 0, 0.5)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.7)',
    xl: '0 8px 32px rgba(0, 0, 0, 0.9)',
    '2xl': '0 12px 48px rgba(0, 0, 0, 1)',
    inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)',
    
    // Glow effects
    glowYellow: '0 0 20px rgba(252, 211, 77, 0.4)',
    glowYellowSubtle: '0 0 10px rgba(252, 211, 77, 0.2)',
  },
};

// ============================================================================
// 🪟 GLASSMORPHISM
// ============================================================================

export const glassmorphism = {
  light: {
    default: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(32px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(12px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
  },
  
  dark: {
    default: {
      background: 'rgba(10, 10, 10, 0.7)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    strong: {
      background: 'rgba(10, 10, 10, 0.85)',
      backdropFilter: 'blur(32px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    subtle: {
      background: 'rgba(10, 10, 10, 0.5)',
      backdropFilter: 'blur(12px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
  },
};

// ============================================================================
// 📱 BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================================
// 🎯 Z-INDEX HIERARCHY
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  max: 9999,
};

// ============================================================================
// 🔧 UTILITÁRIOS
// ============================================================================

/**
 * Retorna o tema atual baseado no modo (light/dark)
 */
export const getTheme = (mode: 'light' | 'dark' = 'light') => ({
  colors: colors[mode],
  shadows: shadows[mode],
  glassmorphism: glassmorphism[mode],
  spacing,
  typography,
  animations,
  radius,
  zIndex,
});

/**
 * Helper para criar transições consistentes
 */
export const transition = (
  properties: string[] = ['all'],
  duration: keyof typeof animations.duration = 'normal',
  easing: keyof typeof animations.easing = 'easeInOut'
) => {
  return `${properties.join(', ')} ${animations.duration[duration]} ${animations.easing[easing]}`;
};

/**
 * Helper para criar media queries
 */
export const mediaQuery = (breakpoint: keyof typeof breakpoints) => {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
};

// ============================================================================
// 📤 EXPORT DEFAULT
// ============================================================================

export default {
  colors,
  spacing,
  typography,
  animations,
  radius,
  shadows,
  glassmorphism,
  breakpoints,
  zIndex,
  getTheme,
  transition,
  mediaQuery,
};
