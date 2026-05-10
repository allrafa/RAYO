import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

async function preflightDevServer(baseUrl: string): Promise<void> {
  // Falha cedo com mensagem clara se o dev server não tá de pé.
  // Sem isso, o primeiro teste falha lá no fim com timeout de navegação.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5_000);
    const res = await fetch(baseUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok && res.status >= 500) {
      throw new Error(`Dev server respondeu ${res.status} em ${baseUrl}`);
    }
  } catch (err) {
    throw new Error(
      `[e2e] Dev server não respondeu em ${baseUrl}. ` +
        `Suba o workflow "Start application" (Replit) ou rode "npm run dev" localmente. ` +
        `Causa: ${(err as Error).message}`,
    );
  }
}

/**
 * No container do Replit, `chromium.launch()` morre em segundos porque o
 * Playwright força `--inspector-pipe` (FDs 3/4) e o container não consegue
 * fechar o handshake a tempo. Solução: lançar o chromium do Replit
 * (`$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`) com `--remote-debugging-port=0`
 * e expor o ws endpoint pros testes via arquivo + env. Os specs conectam
 * com `chromium.connectOverCDP(...)` no fixture custom (`fixtures.ts`).
 */
export default async function globalSetup() {
  const exe = process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const artifactsDir = path.resolve("tests/e2e/.artifacts");
  mkdirSync(artifactsDir, { recursive: true });

  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ??
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
  await preflightDevServer(baseUrl);

  if (!exe) {
    // Ambiente local (fora do container Replit): deixa o fixture usar
    // `chromium.launch()` normal (Playwright bundled). Limpa qualquer
    // ws-endpoint/pid stale que tenha sobrado de uma run anterior no Replit
    // (sem isso o teardown poderia matar um PID reaproveitado).
    for (const f of ["ws-endpoint.txt", "chrome-pid.txt"]) {
      try { rmSync(path.join(artifactsDir, f), { force: true }); } catch { /* ignore */ }
    }
    delete process.env.E2E_WS_ENDPOINT;
    // eslint-disable-next-line no-console
    console.log("[e2e] Modo local — usando chromium bundled do Playwright (sem CDP).");
    return;
  }

  mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = path.join(artifactsDir, `chrome-profile-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });

  const headed = process.env.PWDEBUG === "1" || process.env.HEADED === "1";
  const args = [
    headed ? "--headless=false" : "--headless=new",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  const child = spawn(exe, args, { stdio: ["ignore", "pipe", "pipe"] });
  const wsEndpoint = await new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const m = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        child.stderr?.off("data", onData);
        resolve(m[1]);
      }
    };
    child.stderr?.on("data", onData);
    child.on("exit", (code) => reject(new Error(`Chromium saiu antes de expor o ws endpoint (code=${code})`)));
    setTimeout(() => reject(new Error("Timeout esperando ws endpoint do Chromium")), 15_000);
  });

  writeFileSync(path.join(artifactsDir, "ws-endpoint.txt"), wsEndpoint);
  writeFileSync(path.join(artifactsDir, "chrome-pid.txt"), String(child.pid));
  process.env.E2E_WS_ENDPOINT = wsEndpoint;

  // Não daemonizar — Node sairá após os testes; precisamos manter ref para
  // o teardown. Detach + unref pra Node não esperar por ele.
  child.unref();
  // eslint-disable-next-line no-console
  console.log(`[e2e] Chromium pronto: ${wsEndpoint} (pid=${child.pid})`);
}
