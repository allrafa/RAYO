import Stripe from "stripe";

// Task #130 (fix code-review type-safety): tipagem explícita do payload
// do connector Replit e do StripeSync — sem `any` em código de billing.
interface ReplitConnectionItem {
  settings: {
    publishable: string;
    secret: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface StripeSyncCtor {
  new (opts: {
    poolConfig: { connectionString: string; max?: number };
    stripeSecretKey: string;
  }): StripeSyncInstance;
}

interface StripeSyncInstance {
  processWebhook(payload: Buffer, signature: string): Promise<{
    event?: unknown;
    [key: string]: unknown;
  }>;
  runMigrations?(): Promise<void>;
  syncBackfill?(): Promise<void>;
  findOrCreateManagedWebhook?(opts: { url: string; events?: string[] }): Promise<unknown>;
  [key: string]: unknown;
}

// Task #239 — Seam de teste pra injetar stubs do Stripe SDK e do
// stripe-replit-sync. Usado SÓ por integration tests; em prod
// `__setStripeClientForTest(null)` mantém o comportamento original.
// Setado via dynamic import no spec, lido aqui antes de cair na lógica
// real de Replit Connectors / Stripe API.
let stripeClientOverride: Stripe | null = null;
let stripeSyncOverride: StripeSyncInstance | null = null;
export function __setStripeClientForTest(client: Stripe | null): void {
  stripeClientOverride = client;
}
export function __setStripeSyncForTest(sync: StripeSyncInstance | null): void {
  stripeSyncOverride = sync;
}

let connectionSettings: ReplitConnectionItem | null = null;

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
  });

  const data = (await response.json()) as { items?: ReplitConnectionItem[] };
  connectionSettings = data.items?.[0] ?? null;

  if (
    !connectionSettings ||
    !connectionSettings.settings.publishable ||
    !connectionSettings.settings.secret
  ) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

// WARNING: Never cache this client. Tokens expire.
export async function getUncachableStripeClient(): Promise<Stripe> {
  if (stripeClientOverride) return stripeClientOverride;
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

export async function getStripePublishableKey(): Promise<string> {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey(): Promise<string> {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: StripeSyncInstance | null = null;

export async function getStripeSync(): Promise<StripeSyncInstance> {
  if (stripeSyncOverride) return stripeSyncOverride;
  if (!stripeSync) {
    const mod = (await import("stripe-replit-sync")) as { StripeSync: StripeSyncCtor };
    const secretKey = await getStripeSecretKey();
    stripeSync = new mod.StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
