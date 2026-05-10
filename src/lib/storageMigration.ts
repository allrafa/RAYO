// Task #163 — migração idempotente de chaves localStorage do rebrand
// RAIO → RAYO (Maio/2026). Roda uma única vez por device no boot do
// App; copia chaves legadas `raio_*`/`raio-*` pra contraparte `rayo_*`/
// `rayo-*` quando a nova ainda não existe, mantendo a antiga intacta
// como salvaguarda. A flag `rayo_storage_migrated_v1` marca conclusão.
//
// Não toca sessionStorage (ciclo curto, fallback inline nos consumers).
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
];

export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    for (const [legacy, next] of KEY_MAP) {
      try {
        const legacyValue = localStorage.getItem(legacy);
        if (legacyValue == null) continue;
        if (localStorage.getItem(next) != null) continue;
        localStorage.setItem(next, legacyValue);
      } catch {
        // chave individual problemática não trava as outras
      }
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // localStorage indisponível (modo privado, quota, etc.)
  }
}
