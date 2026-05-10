// Task #163 — migração idempotente de chaves localStorage do rebrand
// RAIO → RAYO (Maio/2026). Roda uma única vez por device no boot do
// App; pra cada par (legacy, next): se `next` já existe, só remove o
// `legacy`; senão copia `legacy → next` e remove o `legacy`. Resultado
// final: storage só com chaves `rayo_*`/`rayo-*`/`rayo:*`.
// A flag `rayo_storage_migrated_v1` marca conclusão pra não repetir.
//
// Não toca sessionStorage (ciclo curto; fallback `rayo ?? raio` inline
// nos consumers cobre a janela de transição entre tabs).
// Falhas silenciosas: storage indisponível, JSON corrompido, etc.

const MIGRATION_FLAG = "rayo_storage_migrated_v1";

const KEY_MAP: Array<readonly [legacy: string, next: string]> = [
  ["raio_consent_preferences", "rayo_consent_preferences"],
  ["raio_privacy_settings", "rayo_privacy_settings"],
  ["raio_disable_personalization", "rayo_disable_personalization"],
  ["raio-user-extended", "rayo-user-extended"],
  ["raio-search-recents", "rayo-search-recents"],
  ["raio-theme", "rayo-theme"],
  ["raio-notif-asked", "rayo-notif-asked"],
  ["raio-welcome-seen", "rayo-welcome-seen"],
  ["raio_onboarding_start_time", "rayo_onboarding_start_time"],
  ["raio_just_completed_onboarding", "rayo_just_completed_onboarding"],
  ["raio:returningUser", "rayo:returningUser"],
  ["raio-analytics-sessions", "rayo-analytics-sessions"],
  ["raio-analytics-interactions", "rayo-analytics-interactions"],
  ["raio-video-data", "rayo-video-data"],
  ["raio-trilha-sessions", "rayo-trilha-sessions"],
  ["raio-youtube-mock-banner-dismissed", "rayo-youtube-mock-banner-dismissed"],
  ["raio-notifications-permission", "rayo-notifications-permission"],
  ["raio-notifications", "rayo-notifications"],
  ["raio_today_skipped_date", "rayo_today_skipped_date"],
  ["raio-accessibility", "rayo-accessibility"],
  ["raio-weekly-goal", "rayo-weekly-goal"],
];

// Prefixos com chave dinâmica (sufixo por usuário ou similar). Pra
// cada chave do localStorage que comece com `legacy`, copia (ou só
// remove) pra contraparte com prefixo `next`.
const KEY_PREFIX_MAP: Array<readonly [legacy: string, next: string]> = [
  ["raio_today_skipped_date:", "rayo_today_skipped_date:"],
];

export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    for (const [legacy, next] of KEY_MAP) {
      try {
        const legacyValue = localStorage.getItem(legacy);
        if (legacyValue == null) continue;
        if (localStorage.getItem(next) == null) {
          localStorage.setItem(next, legacyValue);
        }
        localStorage.removeItem(legacy);
      } catch {
        // chave individual problemática não trava as outras
      }
    }
    // Snapshot dos keys antes de mutar; matches por prefixo legado.
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k != null) allKeys.push(k);
      }
      for (const [legacyPrefix, nextPrefix] of KEY_PREFIX_MAP) {
        for (const k of allKeys) {
          if (!k.startsWith(legacyPrefix)) continue;
          try {
            const nextKey = nextPrefix + k.slice(legacyPrefix.length);
            const legacyValue = localStorage.getItem(k);
            if (legacyValue != null && localStorage.getItem(nextKey) == null) {
              localStorage.setItem(nextKey, legacyValue);
            }
            localStorage.removeItem(k);
          } catch {
            // ignora chave individual
          }
        }
      }
    } catch {
      // snapshot falhou; segue
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // localStorage indisponível (modo privado, quota, etc.)
  }
}
