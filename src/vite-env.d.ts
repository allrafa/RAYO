/// <reference types="vite/client" />

// ============================================================================
// 🌩️ RAIO ECOSYSTEM - VITE ENVIRONMENT TYPE DEFINITIONS
// ============================================================================

interface ImportMetaEnv {
  // Environment
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_APP_VERSION: string;
  
  // Analytics
  readonly VITE_MIXPANEL_TOKEN: string;
  readonly VITE_ANALYTICS_ENABLED: string;
  
  // Feature Flags
  readonly VITE_GROWTHBOOK_API_HOST: string;
  readonly VITE_GROWTHBOOK_CLIENT_KEY: string;
  readonly VITE_GROWTHBOOK_ENABLED: string;
  
  // Backend - Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  // YouTube API (opcional)
  readonly VITE_YOUTUBE_API_KEY?: string;
  
  // API URLs
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_URL: string;
  
  // Feature Toggles
  readonly VITE_FEATURE_GAMIFICATION: string;
  readonly VITE_FEATURE_COMMUNITY: string;
  readonly VITE_FEATURE_ACADEMIA: string;
  readonly VITE_FEATURE_CONSELHEIRO_IA: string;
  readonly VITE_FEATURE_PAYWALL: string;
  
  // Debug
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  readonly VITE_ENABLE_CONSOLE_LOGS: string;
  
  // Storage & CDN
  readonly VITE_STORAGE_BUCKET: string;
  readonly VITE_CDN_URL: string;
  
  // CORS & Security
  readonly VITE_ALLOWED_ORIGINS: string;
  readonly VITE_COOKIE_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ============================================================================
// Module Declarations
// ============================================================================

// CSS Modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Images
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Fonts
declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const content: string;
  export default content;
}

// Figma Asset Scheme (special case for Figma Make)
declare module 'figma:asset/*' {
  const content: string;
  export default content;
}

// JSON
declare module '*.json' {
  const value: any;
  export default value;
}

// ============================================================================
// Global Type Augmentations
// ============================================================================

// Window object extensions
interface Window {
  // Mixpanel
  mixpanel?: any;
  
  // GrowthBook
  growthbook?: any;
  
  // Debug helpers
  __RAIO_DEBUG__?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

// Helper type for environment variables
type EnvValue = string | undefined;

// Helper type for boolean env vars
type BooleanEnv = 'true' | 'false';
