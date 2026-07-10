import type Stripe from "stripe";
import { query } from "../../db/index.js";
import { getUncachableStripeClient, getStripeSync } from "../../stripeClient.js";
import { invalidateTrailLookupCache } from "./service.js";
import { sendTrailPurchaseEmail } from "../../lib/email.js";

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

async function sendPurchaseConfirmation(sub: Stripe.Subscription): Promise<void> {
  const trailId = parseInt(String(sub.metadata?.rayo_trail_id ?? ""), 10);
  const userId = parseInt(String(sub.metadata?.rayo_user_id ?? ""), 10);
  if (!trailId || !userId) return;
  const { rows } = await query(
    `SELECT u.email, u.name, t.title, t.slug
       FROM users u, trails t
      WHERE u.id = $1 AND t.id = $2`,
    [userId, trailId],
  );
  if (rows.length === 0) return;
  const trialEnd = (sub as unknown as { trial_end?: number | null }).trial_end;
  await sendTrailPurchaseEmail(rows[0].email, rows[0].name ?? "", {
    trailTitle: rows[0].title,
    trailSlug: rows[0].slug,
    isTrial: sub.status === "trialing",
    trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
  });
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
          // Confirmação de compra por e-mail — fire-and-forget: falha de
          // e-mail nunca pode falhar o webhook (o Stripe faria retry e o
          // cliente receberia e-mails duplicados).
          void sendPurchaseConfirmation(sub).catch((err) => {
            console.error("[stripe webhook] purchase email failed", sub.id, err);
          });
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
    // Task #130 — refund tratado explicitamente. Quando o charge é
    // reembolsado total ou parcialmente, marcamos a sub como `canceled`
    // e revogamos o acesso (a Stripe normalmente também emite
    // `customer.subscription.deleted` em refunds totais via dashboard,
    // mas refunds via API/parciais nem sempre — então defensivo).
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      // Resolve a subscription pela invoice associada ao charge.
      const invoiceId = typeof charge.invoice === "string"
        ? charge.invoice
        : charge.invoice?.id ?? null;
      if (invoiceId) {
        try {
          const stripe = await getUncachableStripeClient();
          const invoice = await stripe.invoices.retrieve(invoiceId);
          const subId = (invoice as unknown as { subscription?: string | null }).subscription;
          if (subId && typeof subId === "string") {
            await query(
              `UPDATE subscriptions
                  SET status = 'canceled',
                      cancel_at_period_end = false,
                      updated_at = NOW()
                WHERE stripe_subscription_id = $1`,
              [subId],
            );
            invalidateTrailLookupCache();
            console.info("[stripe webhook] charge.refunded → subscription canceled", subId);
          }
        } catch (err) {
          console.error("[stripe webhook] charge.refunded retrieve invoice failed", invoiceId, err);
        }
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
  // 1. Sync oficial (valida assinatura via constructEventAsync — joga se
  //    inválida —, popula schema stripe.* e deduplica). Retorna void: a lib
  //    NÃO devolve o evento (Promise<void> em stripe-replit-sync).
  await sync.processWebhook(payload, signature);
  // 2. Atualiza nossa tabela subscriptions com base no mesmo evento. Como a
  //    assinatura já foi validada acima (qualquer adulteração teria jogado),
  //    o payload é confiável e podemos parseá-lo diretamente.
  let event: Stripe.Event | null = null;
  try {
    event = JSON.parse(payload.toString("utf-8")) as Stripe.Event;
  } catch {
    console.error("[stripe webhook] payload inválido (não-JSON) após assinatura validada");
    return;
  }
  if (event && typeof event === "object" && typeof event.type === "string") {
    // Dedupe por event.id: re-entregas do Stripe não reprocessam handlers.
    // Eventos sem id (só possíveis em payloads sintéticos) processam normal.
    if (typeof event.id === "string" && event.id.length > 0) {
      const { rows } = await query(
        `INSERT INTO stripe_webhook_events (event_id, event_type)
         VALUES ($1, $2)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [event.id, event.type],
      );
      if (rows.length === 0) {
        console.info("[stripe webhook] evento duplicado ignorado", event.id, event.type);
        return;
      }
    }
    try {
      await handleEvent(event);
    } catch (err) {
      // Libera o claim de dedupe: o retry do Stripe precisa reprocessar.
      if (typeof event.id === "string" && event.id.length > 0) {
        await query(`DELETE FROM stripe_webhook_events WHERE event_id = $1`, [event.id])
          .catch(() => { /* best-effort */ });
      }
      console.error("[stripe webhook] handleEvent error", event.type, err);
      throw err;
    }
  }
}
