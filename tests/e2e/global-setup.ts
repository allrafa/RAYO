import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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
  if (!exe) {
    throw new Error("REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE não definido — Playwright precisa do binário do Chromium fornecido pelo Replit.");
  }

  const artifactsDir = path.resolve("tests/e2e/.artifacts");
  mkdirSync(artifactsDir, { recursive: true });
  const userDataDir = path.join(artifactsDir, `chrome-profile-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });

  const args = [
    "--headless=new",
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
