import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

export default async function globalTeardown() {
  const artifactsDir = path.resolve("tests/e2e/.artifacts");
  try {
    const pidStr = readFileSync(path.join(artifactsDir, "chrome-pid.txt"), "utf8").trim();
    const pid = parseInt(pidStr, 10);
    if (Number.isFinite(pid) && pid > 0) {
      try { process.kill(pid, "SIGTERM"); } catch { /* já morto */ }
      // Pequena espera, depois SIGKILL como garantia.
      await new Promise((r) => setTimeout(r, 500));
      try { process.kill(pid, "SIGKILL"); } catch { /* já morto */ }
    }
  } catch {
    // pid.txt pode não existir se o setup falhou
  }
  // Limpa profiles temporários (mantém logs/report).
  try {
    const entries = require("node:fs").readdirSync(artifactsDir) as string[];
    for (const name of entries) {
      if (name.startsWith("chrome-profile-")) {
        rmSync(path.join(artifactsDir, name), { recursive: true, force: true });
      }
    }
  } catch {
    // ok
  }
}
