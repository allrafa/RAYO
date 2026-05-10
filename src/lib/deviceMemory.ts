// Task #163 — chave migrada pro namespace `rayo:` no rebrand RAIO→RAYO.
// A migração one-shot em src/lib/storageMigration.ts copia a chave
// legada `raio:returningUser` antes do primeiro consumer ler.
const RETURNING_USER_KEY = "rayo:returningUser";

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isReturningDevice(): boolean {
  const storage = safeLocalStorage();
  if (!storage) return false;
  try {
    return storage.getItem(RETURNING_USER_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDeviceAsReturning(): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(RETURNING_USER_KEY, "1");
  } catch {
  }
}

export function forgetDevice(): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(RETURNING_USER_KEY);
  } catch {
  }
}
