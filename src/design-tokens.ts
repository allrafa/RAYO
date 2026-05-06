/**
 * 🌅 RAYO DESIGN SYSTEM v2.0 — DESIGN TOKENS (Maio/2026)
 *
 * Identidade: Saturado · Contrastante · Editorial · Outfit
 *
 * Paleta canônica RAYO em `colors.rayo` — fonte de verdade do rebrand.
 * Os blocos `colors.light` e `colors.dark` foram remapeados para apontar
 * para a paleta RAYO, então código existente que importa `colors.light.*`
 * herda o novo visual sem mudança de API.
 *
 * Princípios:
 * 1. Sand 55 · Forest 20 · Sage 12 · Terracota 9 · Ochre 4
 * 2. Tipografia única (Outfit, pesos 200–700) — contraste por peso
 * 3. Cantos arredondados editoriais (10/16/24/32/pill)
 * 4. Sombras tom-em-tom (ink-tinted, não preto puro)
 * 5. Acessibilidade WCAG AA (Forest 900 sobre Sand 50 ≈ 13:1)
 */

// ============================================================================
// 🎨 CORES
// ============================================================================

export const colors = {
  // ---------------------------------------------------------------------------
  // 🌅 RAYO PALETTE — Fonte de verdade do rebrand v2.0
  // ---------------------------------------------------------------------------
  rayo: {
    sand: {
      50:  '#FAF4E8',  // Page background
      100: '#F2E9D5',  // Alt sections, cards alternados
      200: '#E8DBBF',  // Bordas sutis
      300: '#D9C89E',  // Bordas hover
      400: '#BFA87A',  // Bordas ênfase
    },
    forest: {
      900: '#0C3B2E',  // Primary CTA, nav ativo, hero
      700: '#144D3C',  // Hover de primary
      500: '#1E6A52',  // Acentos verdes mais vivos
    },
    sage: {
      100: '#DCE8D2',
      300: '#A9C396',
      500: '#6D9773',  // Success / progress positivo
      700: '#4F7253',
    },
    terra: {
      100: '#F2D6CC',  // Backgrounds de badges leves
      300: '#E08770',  // Avatares, ícones
      500: '#C8553D',  // Accent principal — ações, eyebrows, ring
      700: '#9C3A26',  // Hover de accent
      900: '#5E2113',  // Texto sobre terra-100
    },
    ochre: {
      300: '#E8C77E',  // Highlights pontuais (XP, eyebrows)
      500: '#D4A24C',  // Warning
      700: '#A37A2D',
    },
    ink: {
      900: '#0E1A14',  // Texto principal
      700: '#1F2A22',  // Texto secundário enfatizado
      500: '#4A5247',  // Texto secundário
      400: '#6E7569',  // Labels / metadata
      300: '#9CA098',  // Placeholders / disabled
    },
  },

  // ---------------------------------------------------------------------------
  // LIGHT MODE — Mapeado para a paleta RAYO (mantém API compatível)
  // ---------------------------------------------------------------------------
  light: {
    // Backgrounds
    background: {
      primary: '#FAF4E8',      // Sand 50 — página
      secondary: '#FFFFFF',    // Branco puro para cards elevados
      tertiary: '#F2E9D5',     // Sand 100 — seções alternadas
      warmCream: '#F2E9D5',    // Sand 100 (editorial gradient stop)
      warmSoft: '#FAF4E8',     // Sand 50 (numeral watermark)
      overlay: 'rgba(250, 244, 232, 0.7)',  // Glassmorphism sand
    },
    
    // Textos — Ink palette
    text: {
      primary: '#0E1A14',      // Ink 900
      deep: '#1F2A22',         // Ink 700
      strong: '#4A5247',       // Ink 500
      secondary: '#4A5247',    // Ink 500
      tertiary: '#9CA098',     // Ink 300
      inverse: '#FAF4E8',      // Sand 50 sobre Forest
      disabled: '#D9C89E',     // Sand 300
    },
    
    // Bordas — Sand para sutil, Terra para ativo
    border: {
      default: '#E8DBBF',      // Sand 200
      hover: '#D9C89E',        // Sand 300
      active: '#C8553D',       // Terra 500
      divider: '#E8DBBF',      // Sand 200
    },
    
    // Acentos — Terracota (substitui amber) + Ochre (gold pontual)
    accent: {
      primary: '#C8553D',      // Terra 500 — accent principal
      hover: '#9C3A26',        // Terra 700
      light: '#F2D6CC',        // Terra 100 — backgrounds de badges
      subtle: '#FAF4E8',       // Sand 50 — hover states
      bright: '#E8C77E',       // Ochre 300 — highlights pontuais
      // Glows recalibrados em terracota
      glowSoft: 'rgba(200, 85, 61, 0.18)',
      glowMedium: 'rgba(200, 85, 61, 0.35)',
      glowStrong: 'rgba(200, 85, 61, 0.55)',
      glowAmberBright: 'rgba(232, 199, 126, 0.12)',
      // Triplas RGB para composição em gradientes
      primaryRgb: '200, 85, 61',
      hoverRgb: '156, 58, 38',
      brightRgb: '232, 199, 126',
    },

    // Overlays translúcidos (insets, micro-shadows)
    overlay: {
      darkSoft: 'rgba(0, 0, 0, 0.04)',
      darkMedium: 'rgba(0, 0, 0, 0.06)',
      darkStrong: 'rgba(0, 0, 0, 0.1)',
      textPrimarySoft: 'rgba(26, 26, 26, 0.5)',
      textPrimaryFaint: 'rgba(26, 26, 26, 0.2)',
      bgStrong: 'rgba(255, 255, 255, 0.92)',
      bgMedium: 'rgba(255, 255, 255, 0.6)',
      bgSoft: 'rgba(255, 255, 255, 0.4)',
      inverseSoft: 'rgba(250, 250, 250, 0.85)',
      inverseTransparent: 'rgba(250, 250, 250, 0)',
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
  // Font Families — RAYO v2: Outfit única (200–700)
  // displaySerif aponta para Outfit também (sem mistura) para compatibilidade
  // com componentes legados que ainda referenciam essa chave.
  family: {
    display: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    displaySerif: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
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
