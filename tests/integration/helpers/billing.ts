// Task #239 — Helpers de billing (Stripe Trilhas pagas) pra integration
// tests. Exporta:
//   * `ensureBillingSchema()` — idempotente, garante migrações de billing.
//   * `createTrail()`, `createCourse()`, `linkTrailCourse()` — seeds.
//   * `insertSubscription()` — insert direto na tabela `subscriptions`.
//   * `createMockStripe()` + `createMockStripeSync()` — fábricas de stubs
//     com call-log pra asserts no spec.
import type Stripe from "stripe";
import { migrateBilling } from "../../../server/features/billing/migrate.js";
import { invalidateTrailLookupCache } from "../../../server/features/billing/service.js";
import { __resetRateLimitersForTest } from "../../../server/middleware/security.js";
import { getPool, ensureSchema } from "./db.js";

let billingReady: Promise<void> | null = null;
export function ensureBillingSchema(): Promise<void> {
  if (!billingReady) {
    billingReady = (async () => {
      await ensureSchema();
      await migrateBilling();
    })();
  }
  return billingReady;
}

// invalida o cache `course_id → trail_id` (TTL 60s) entre specs/tests E
// limpa buckets do rate-limiter. Os limiters (checkout 5/h, billing 120/15m,
// trails 240/15m) são singletons no módulo `routes.ts` e acumulam contagem
// por chave (`user:1`, `ip:127.0.0.1`). Como `truncateAll()` reinicia
// identity de `users`, todos os specs acabam usando `user.id=1` e disparam
// 429 espúrio sem este reset. DEVE ser chamado em todo afterEach de spec
// de billing que faz request HTTP.
export function resetBillingCaches(): void {
  invalidateTrailLookupCache();
  __resetRateLimitersForTest();
}

export interface TrailSeed {
  slug?: string;
  title?: string;
  life_stage?: string;
  monthly_price_cents?: number;
  yearly_price_cents?: number;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  active?: boolean;
}

export async function createTrail(seed: TrailSeed = {}): Promise<{ id: number; slug: string }> {
  const slug = seed.slug ?? `trail-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO trails (slug, title, life_stage, monthly_price_cents, yearly_price_cents,
                         stripe_price_monthly_id, stripe_price_yearly_id, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      slug,
      seed.title ?? "Trilha Teste",
      seed.life_stage ?? "solteiro",
      seed.monthly_price_cents ?? 4990,
      seed.yearly_price_cents ?? 47900,
      seed.stripe_price_monthly_id === undefined ? "price_mock_month" : seed.stripe_price_monthly_id,
      seed.stripe_price_yearly_id === undefined ? "price_mock_year" : seed.stripe_price_yearly_id,
      seed.active ?? true,
    ],
  );
  return { id: rows[0].id, slug };
}

export async function createCourse(title: string = "Curso Teste"): Promise<{ id: number }> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO courses (title) VALUES ($1) RETURNING id`,
    [title],
  );
  return { id: rows[0].id };
}

export async function linkTrailCourse(trailId: number, courseId: number): Promise<void> {
  await getPool().query(
    `INSERT INTO trail_courses (trail_id, course_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [trailId, courseId],
  );
}

export interface SubscriptionSeed {
  user_id: number;
  trail_id: number;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  status: string;
  interval?: "month" | "year";
  current_period_end?: Date | null;
  cancel_at_period_end?: boolean;
}

export async function insertSubscription(seed: SubscriptionSeed): Promise<{ id: number }> {
  const { rows } = await getPool().query<{ id: number }>(
    `INSERT INTO subscriptions (user_id, trail_id, stripe_subscription_id, stripe_customer_id,
                                status, interval, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      seed.user_id,
      seed.trail_id,
      seed.stripe_subscription_id ?? `sub_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      seed.stripe_customer_id ?? `cus_test_${seed.user_id}`,
      seed.status,
      seed.interval ?? "month",
      seed.current_period_end ?? null,
      seed.cancel_at_period_end ?? false,
    ],
  );
  return { id: rows[0].id };
}

// ─────────────────────── Mock Stripe SDK ───────────────────────
//
// Reflete a SUPERFÍCIE EXATA que `service.ts` + `webhookHandlers.ts`
// usam: `customers.create`, `checkout.sessions.create`,
// `billingPortal.sessions.create`, `subscriptions.retrieve`,
// `invoices.retrieve`. Não tenta cobrir tudo do SDK — só o que é tocado.

export interface MockStripeCalls {
  customersCreate: Array<{ args: Stripe.CustomerCreateParams }>;
  checkoutCreate: Array<{ args: Stripe.Checkout.SessionCreateParams }>;
  portalCreate: Array<{ args: Stripe.BillingPortal.SessionCreateParams }>;
  subscriptionsRetrieve: Array<{ id: string }>;
  invoicesRetrieve: Array<{ id: string }>;
}

export interface MockStripeConfig {
  // Customers: id padrão devolvido pelo create
  nextCustomerId?: string;
  // Checkout: url devolvida no create (se null, simula CHECKOUT_FAILED)
  nextCheckoutUrl?: string | null;
  // Lookup de subscriptions.retrieve(id) → Stripe.Subscription | undefined
  subscriptions?: Map<string, Stripe.Subscription>;
  // Lookup de invoices.retrieve(id) → Stripe.Invoice | undefined
  invoices?: Map<string, Stripe.Invoice>;
}

export function createMockStripe(config: MockStripeConfig = {}): {
  client: Stripe;
  calls: MockStripeCalls;
} {
  const calls: MockStripeCalls = {
    customersCreate: [],
    checkoutCreate: [],
    portalCreate: [],
    subscriptionsRetrieve: [],
    invoicesRetrieve: [],
  };

  let custCounter = 0;
  const nextCustId = () => config.nextCustomerId ?? `cus_test_${++custCounter}`;

  const subs = config.subscriptions ?? new Map<string, Stripe.Subscription>();
  const invs = config.invoices ?? new Map<string, Stripe.Invoice>();

  // Type cast no final: o objeto cobre só o que `service.ts`+webhook usam,
  // mas o type-system exige a superfície completa. Cast via `unknown` é o
  // padrão usado pra stubs nessa codebase.
  const client = {
    customers: {
      create: async (args: Stripe.CustomerCreateParams) => {
        calls.customersCreate.push({ args });
        return { id: nextCustId(), object: "customer" } as Stripe.Customer;
      },
    },
    checkout: {
      sessions: {
        create: async (args: Stripe.Checkout.SessionCreateParams) => {
          calls.checkoutCreate.push({ args });
          const url = config.nextCheckoutUrl === undefined
            ? `https://checkout.stripe.test/cs_${Date.now()}`
            : config.nextCheckoutUrl;
          return {
            id: `cs_test_${Date.now()}`,
            object: "checkout.session",
            url,
          } as unknown as Stripe.Checkout.Session;
        },
      },
    },
    billingPortal: {
      sessions: {
        create: async (args: Stripe.BillingPortal.SessionCreateParams) => {
          calls.portalCreate.push({ args });
          return {
            id: `bps_test_${Date.now()}`,
            url: `https://portal.stripe.test/bps_${Date.now()}`,
          } as unknown as Stripe.BillingPortal.Session;
        },
      },
    },
    subscriptions: {
      retrieve: async (id: string) => {
        calls.subscriptionsRetrieve.push({ id });
        const sub = subs.get(id);
        if (!sub) throw new Error(`mock: subscription ${id} not found`);
        return sub;
      },
    },
    invoices: {
      retrieve: async (id: string) => {
        calls.invoicesRetrieve.push({ id });
        const inv = invs.get(id);
        if (!inv) throw new Error(`mock: invoice ${id} not found`);
        return inv;
      },
    },
  };
  return { client: client as unknown as Stripe, calls };
}

// ─────────────────────── Mock stripe-replit-sync ───────────────────────
//
// Em vez de stripe.webhooks.constructEvent (HMAC), `processStripeWebhook`
// delega a validação ao `stripe-replit-sync.processWebhook(payload,
// signature)`. Contrato REAL da lib: `Promise<void>` — ela valida a
// assinatura (joga se inválida) e NÃO devolve o evento; quem precisa do
// evento parseia o payload depois que a chamada sucede. O stub espelha
// exatamente isso:
//   * `signature === "test_invalid_sig"` → joga (assinatura inválida).
//   * caso contrário, valida que o payload é JSON, loga e resolve void.
// Isso permite os specs montarem `event.type` à vontade sem gerar HMAC real.

export function createMockStripeSync(): {
  sync: {
    processWebhook: (payload: Buffer, signature: string) => Promise<void>;
    runMigrations?: () => Promise<void>;
    syncBackfill?: () => Promise<void>;
  };
  callLog: Array<{ signature: string; eventType: string | null }>;
} {
  const callLog: Array<{ signature: string; eventType: string | null }> = [];
  const sync = {
    processWebhook: async (payload: Buffer, signature: string): Promise<void> => {
      if (signature === "test_invalid_sig") {
        throw new Error("Invalid signature");
      }
      let event: unknown = null;
      try {
        event = JSON.parse(payload.toString("utf-8"));
      } catch {
        throw new Error("Invalid payload (mock expected JSON)");
      }
      callLog.push({
        signature,
        eventType: (event as { type?: string } | null)?.type ?? null,
      });
    },
  };
  return { sync, callLog };
}

// Helper pra construir um Stripe.Subscription mínimo coerente com o que
// `upsertSubscriptionRow` lê (metadata, items[0].price.recurring.interval,
// customer, current_period_end, cancel_at_period_end, status, id).
export function fakeSubscription(opts: {
  id: string;
  userId: number;
  trailId: number;
  customerId?: string;
  status?: string;
  interval?: "month" | "year";
  current_period_end?: number;
  cancel_at_period_end?: boolean;
}): Stripe.Subscription {
  const customer = opts.customerId ?? `cus_test_${opts.userId}`;
  return {
    id: opts.id,
    object: "subscription",
    customer,
    status: opts.status ?? "active",
    cancel_at_period_end: opts.cancel_at_period_end ?? false,
    current_period_end: opts.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400,
    metadata: {
      rayo_user_id: String(opts.userId),
      rayo_trail_id: String(opts.trailId),
      rayo_interval: opts.interval ?? "month",
    },
    items: {
      object: "list",
      data: [
        {
          id: `si_${opts.id}`,
          price: {
            id: `price_${opts.id}`,
            recurring: { interval: opts.interval ?? "month" },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}
