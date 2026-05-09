import type Stripe from "stripe";
import { query } from "../../db/index.js";
import { getUncachableStripeClient, getStripeSync } from "../../stripeClient.js";
import { invalidateTrailLookupCache } from "./service.js";

// Task #130 — webhook handler do Stripe.
//
// Estratégia:
// 1. `stripe-replit-sync` faz o trabalho pesado de validar assinatura,
//    sincronizar produto/price/customer/subscription pra schema `stripe.*`
//    e deduplicar eventos. Chamamos `processWebhook` primeiro.
// 2. Em cima disso, mantemos a tabela `subscriptions` (nossa) sincronizada
//    via os mesmos eventos. Idempotente por `stripe_subscription_id`.

function isoDate(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
}

async function upsertSubscriptionRow(sub: Stripe.Subscription): Promise<void> {
  const trailId = parseInt(String(sub.metadata?.rayo_trail_id ?? ""), 10);
  const userId = parseInt(String(sub.metadata?.rayo_user_id ?? ""), 10);
  if (!trailId || !userId) {
    // Sem metadados válidos, não conseguimos vincular. Loga e ignora —
    // pode ser uma subscription manual criada pelo dashboard.
    console.warn("[stripe webhook] subscription sem metadata rayo_*:", sub.id);
    return;
  }
  const interval = (sub.items.data[0]?.price?.recurring?.interval ?? "month") as "month" | "year";
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Stripe Subscription tipa current_period_end como `number` opcional na
  // versão atual; alguns adapters tipam diferente. Cast seguro.
  const cpe = (sub as unknown as { current_period_end?: number | null }).current_period_end;

  // Garante que users.stripe_customer_id está preenchido (em caso de
  // checkout que veio antes do webhook customer.created chegar à nossa
  // tabela). Sem isso o `requireTrailAccess` quebra para o primeiro request.
  await query(
    `UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND (stripe_customer_id IS NULL OR stripe_customer_id <> $1)`,
    [customerId, userId],
  );

  await query(
    `INSERT INTO subscriptions (user_id, trail_id, stripe_subscription_id, stripe_customer_id,
                                status, interval, current_period_end, cancel_at_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       status = EXCLUDED.status,
       interval = EXCLUDED.interval,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = NOW()`,
    [
      userId,
      trailId,
      sub.id,
      customerId,
      sub.status,
      interval,
      isoDate(cpe ?? null),
      sub.cancel_at_period_end ?? false,
    ],
  );
  invalidateTrailLookupCache();
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(String(session.metadata?.rayo_user_id ?? ""), 10);
      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
      if (userId && customerId) {
        await query(
          `UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL`,
          [customerId, userId],
        );
      }
      // Busca a subscription pra criar/atualizar a linha agora — não
      // dependemos só do `customer.subscription.created` chegar primeiro.
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
      if (subscriptionId) {
        try {
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionRow(sub);
        } catch (err) {
          console.error("[stripe webhook] retrieve subscription failed", subscriptionId, err);
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscriptionRow(sub);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as unknown as { subscription?: string | null }).subscription;
      if (subId && typeof subId === "string") {
        await query(
          `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
            WHERE stripe_subscription_id = $1`,
          [subId],
        );
        invalidateTrailLookupCache();
      }
      break;
    }
    default:
      // outros eventos são ignorados pelo nosso handler — mas o
      // stripe-replit-sync já sincronizou tudo.
      break;
  }
}

export async function processStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const sync = await getStripeSync();
  // 1. Sync oficial (valida assinatura, popula schema stripe.*, deduplica).
  const result = await sync.processWebhook(payload, signature);
  // 2. Atualiza nossa tabela subscriptions com base no evento.
  // O evento já veio validado; reusamos o mesmo objeto.
  const event = (result?.event ?? null) as Stripe.Event | null;
  if (event) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error("[stripe webhook] handleEvent error", event.type, err);
      throw err;
    }
  }
}
