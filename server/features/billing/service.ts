import { query } from "../../db/index.js";
import { getUncachableStripeClient } from "../../stripeClient.js";

export class BillingError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
  }
}

export interface TrailRow {
  id: number;
  slug: string;
  title: string;
  life_stage: string;
  description: string | null;
  hero_url: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionRow {
  id: number;
  user_id: number;
  trail_id: number;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  interval: "month" | "year";
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}

// Task #130 — status que dão acesso à trilha. `trialing` libera acesso pleno
// durante o período grátis (Task #140 — 7 dias grátis no primeiro checkout).
// `past_due` mantém acesso porque a próxima cobrança pode passar; `canceled`
// perde acesso ao final do período (UI mostra alerta).
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// Task #140 — período de trial grátis no Checkout Session. Configurável via
// env `TRAIL_TRIAL_DAYS` (default 7). Set em 0 desabilita o trial.
export const TRAIL_TRIAL_DAYS: number = (() => {
  const raw = process.env.TRAIL_TRIAL_DAYS;
  if (raw == null || raw === "") return 7;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 7;
  return Math.min(n, 730);
})();

// Task #130 — cache curto de course_id → trail_id. Lookups em rota de aula
// rodam por request; sem cache cada hit faria join. TTL 60s pra refletir
// mudanças no admin sem reiniciar.
type TrailLookup = { trailId: number | null; expiresAt: number };
const courseToTrailCache = new Map<number, TrailLookup>();
const TRAIL_LOOKUP_TTL_MS = 60_000;

export async function getTrailIdForCourse(courseId: number): Promise<number | null> {
  const now = Date.now();
  const cached = courseToTrailCache.get(courseId);
  if (cached && cached.expiresAt > now) return cached.trailId;
  const { rows } = await query<{ trail_id: number }>(
    `SELECT tc.trail_id FROM trail_courses tc
       JOIN trails t ON t.id = tc.trail_id
      WHERE tc.course_id = $1 AND t.active = TRUE
      ORDER BY tc.trail_id ASC LIMIT 1`,
    [courseId],
  );
  const trailId = rows[0]?.trail_id ?? null;
  courseToTrailCache.set(courseId, { trailId, expiresAt: now + TRAIL_LOOKUP_TTL_MS });
  return trailId;
}

export function invalidateTrailLookupCache(): void {
  courseToTrailCache.clear();
}

export async function userHasActiveTrailAccess(
  userId: number,
  trailId: number,
): Promise<boolean> {
  // Task #130 (fix code-review #5): trocar do "single most recent row" pra
  // ANY row ativa. Após plan changes/re-subscribes o usuário pode ter mais
  // de uma linha em `subscriptions` para a mesma trilha — basta uma estar
  // em status válido pra liberar o acesso.
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM subscriptions
        WHERE user_id = $1 AND trail_id = $2
          AND status = ANY($3::text[])
     ) AS exists`,
    [userId, trailId, Array.from(ACTIVE_STATUSES)],
  );
  return rows[0]?.exists === true;
}

export async function listTrails(userId?: number): Promise<Array<TrailRow & {
  user_has_access: boolean;
  course_count: number;
  trial_days: number;
  trial_eligible: boolean;
}>> {
  const { rows } = await query<TrailRow & { course_count: string }>(
    `SELECT t.*, COALESCE((SELECT COUNT(*) FROM trail_courses tc WHERE tc.trail_id = t.id), 0)::text AS course_count
       FROM trails t
      WHERE t.active = TRUE
      ORDER BY t.id ASC`,
  );
  const trailIds = rows.map((r) => r.id);
  let access = new Set<number>();
  // Task #140 — trilhas em que o usuário JÁ teve assinatura (qualquer status,
  // inclusive canceled) não devem mostrar a promessa de trial no catálogo.
  let priorHistory = new Set<number>();
  if (userId && trailIds.length > 0) {
    const { rows: accessRows } = await query<{ trail_id: number }>(
      `SELECT trail_id FROM subscriptions
        WHERE user_id = $1 AND trail_id = ANY($2::int[])
          AND status = ANY($3::text[])`,
      [userId, trailIds, Array.from(ACTIVE_STATUSES)],
    );
    access = new Set(accessRows.map((r) => r.trail_id));
    const { rows: priorRows } = await query<{ trail_id: number }>(
      `SELECT DISTINCT trail_id FROM subscriptions
        WHERE user_id = $1 AND trail_id = ANY($2::int[])`,
      [userId, trailIds],
    );
    priorHistory = new Set(priorRows.map((r) => r.trail_id));
  }
  return rows.map((r) => ({
    ...r,
    course_count: parseInt(r.course_count as unknown as string, 10) || 0,
    user_has_access: access.has(r.id),
    trial_days: TRAIL_TRIAL_DAYS,
    trial_eligible: TRAIL_TRIAL_DAYS > 0 && !priorHistory.has(r.id),
  }));
}

export async function getTrailBySlug(
  slug: string,
  userId?: number,
): Promise<(TrailRow & {
  courses: Array<{ id: number; title: string; thumbnail: string | null; subtitle: string | null }>;
  user_has_access: boolean;
  trial_days: number;
  trial_eligible: boolean;
}) | null> {
  const { rows } = await query<TrailRow>(
    `SELECT * FROM trails WHERE slug = $1 AND active = TRUE LIMIT 1`,
    [slug],
  );
  if (rows.length === 0) return null;
  const trail = rows[0];
  const { rows: courses } = await query<{
    id: number;
    title: string;
    thumbnail: string | null;
    subtitle: string | null;
  }>(
    `SELECT c.id, c.title, c.thumbnail, c.subtitle
       FROM trail_courses tc
       JOIN courses c ON c.id = tc.course_id
      WHERE tc.trail_id = $1
      ORDER BY tc.sort_order ASC, c.id ASC`,
    [trail.id],
  );
  const user_has_access = userId ? await userHasActiveTrailAccess(userId, trail.id) : false;
  // Task #140 — trial é oferecido apenas para usuários que nunca tiveram
  // assinatura nesta trilha (alinhado com a checagem em createCheckoutSession).
  // Anônimos: assumimos elegível pra mostrar o gancho no marketing.
  let trial_eligible = TRAIL_TRIAL_DAYS > 0;
  if (trial_eligible && userId) {
    const { rows: prior } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM subscriptions WHERE user_id = $1 AND trail_id = $2
       ) AS exists`,
      [userId, trail.id],
    );
    if (prior[0]?.exists) trial_eligible = false;
  }
  return {
    ...trail,
    courses,
    user_has_access,
    trial_days: TRAIL_TRIAL_DAYS,
    trial_eligible,
  };
}

async function ensureStripeCustomer(userId: number, email: string, name: string | null): Promise<string> {
  const { rows } = await query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId],
  );
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { rayo_user_id: String(userId) },
  });
  await query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [customer.id, userId]);
  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  trailSlug: string;
  interval: "month" | "year";
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  // Task #130 (fix code-review #3): passa userId pra que `user_has_access`
  // seja calculado e bloqueie checkouts duplicados de quem já assina.
  const trail = await getTrailBySlug(params.trailSlug, params.userId);
  if (!trail) throw new BillingError("Trilha não encontrada", "TRAIL_NOT_FOUND", 404);
  if (trail.user_has_access) {
    throw new BillingError(
      "Você já tem assinatura ativa nesta trilha",
      "ALREADY_SUBSCRIBED",
      409,
    );
  }
  const priceId = params.interval === "year"
    ? trail.stripe_price_yearly_id
    : trail.stripe_price_monthly_id;
  if (!priceId) {
    throw new BillingError(
      "Trilha sem preço configurado. Avise o suporte.",
      "PRICE_NOT_CONFIGURED",
      503,
    );
  }
  const customerId = await ensureStripeCustomer(params.userId, params.userEmail, params.userName);

  // Task #140 — só oferece trial se o usuário NUNCA teve assinatura nesta
  // trilha (qualquer status, inclusive canceled). Isso evita abuso de reabrir
  // checkout pra ganhar trial repetido. Quem cancelou e quer voltar deve usar
  // o Customer Portal pra reativar (sem novo trial).
  let trialPeriodDays: number | undefined;
  if (TRAIL_TRIAL_DAYS > 0) {
    const { rows: prior } = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM subscriptions WHERE user_id = $1 AND trail_id = $2
       ) AS exists`,
      [params.userId, trail.id],
    );
    if (!prior[0]?.exists) trialPeriodDays = TRAIL_TRIAL_DAYS;
  }

  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    locale: "pt-BR",
    subscription_data: {
      ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
      metadata: {
        rayo_user_id: String(params.userId),
        rayo_trail_id: String(trail.id),
        rayo_interval: params.interval,
      },
    },
    metadata: {
      rayo_user_id: String(params.userId),
      rayo_trail_id: String(trail.id),
      rayo_interval: params.interval,
    },
  });
  if (!session.url) {
    throw new BillingError("Falha ao criar sessão de checkout", "CHECKOUT_FAILED", 502);
  }
  return { url: session.url };
}

export async function createBillingPortalSession(params: {
  userId: number;
  userEmail: string;
  userName: string | null;
  returnUrl: string;
}): Promise<{ url: string }> {
  const customerId = await ensureStripeCustomer(params.userId, params.userEmail, params.userName);
  const stripe = await getUncachableStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: params.returnUrl,
  });
  return { url: session.url };
}

export async function listUserSubscriptions(userId: number): Promise<Array<{
  id: number;
  trail_id: number;
  trail_slug: string;
  trail_title: string;
  status: string;
  interval: string;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}>> {
  const { rows } = await query<{
    id: number;
    trail_id: number;
    trail_slug: string;
    trail_title: string;
    status: string;
    interval: string;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
  }>(
    `SELECT s.id, s.trail_id, t.slug AS trail_slug, t.title AS trail_title,
            s.status, s.interval, s.current_period_end, s.cancel_at_period_end
       FROM subscriptions s
       JOIN trails t ON t.id = s.trail_id
      WHERE s.user_id = $1
      ORDER BY s.updated_at DESC`,
    [userId],
  );
  return rows;
}

// Admin: CRUD trilhas + sync Stripe.
export async function adminListTrails(): Promise<TrailRow[]> {
  const { rows } = await query<TrailRow>(`SELECT * FROM trails ORDER BY id DESC`);
  return rows;
}

export async function adminGetTrail(id: number): Promise<(TrailRow & { course_ids: number[] }) | null> {
  const { rows } = await query<TrailRow>(`SELECT * FROM trails WHERE id = $1`, [id]);
  if (rows.length === 0) return null;
  const { rows: cIds } = await query<{ course_id: number }>(
    `SELECT course_id FROM trail_courses WHERE trail_id = $1 ORDER BY sort_order ASC, course_id ASC`,
    [id],
  );
  return { ...rows[0], course_ids: cIds.map((r) => r.course_id) };
}

async function syncStripeProductForTrail(trail: TrailRow): Promise<{
  product_id: string;
  monthly_price_id: string | null;
  yearly_price_id: string | null;
}> {
  const stripe = await getUncachableStripeClient();
  let productId = trail.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Trilha ${trail.title}`,
      description: trail.description ?? undefined,
      metadata: { rayo_trail_id: String(trail.id), rayo_trail_slug: trail.slug },
    });
    productId = product.id;
  } else {
    await stripe.products.update(productId, {
      name: `Trilha ${trail.title}`,
      description: trail.description ?? undefined,
      metadata: { rayo_trail_id: String(trail.id), rayo_trail_slug: trail.slug },
    });
  }

  // Stripe não permite editar valor de um price existente. Quando o preço
  // muda, criamos um novo e desativamos o antigo (mantém histórico para
  // assinaturas vigentes).
  async function ensurePrice(
    existingId: string | null,
    cents: number,
    interval: "month" | "year",
  ): Promise<string | null> {
    if (cents <= 0) return null;
    if (existingId) {
      try {
        const existing = await stripe.prices.retrieve(existingId);
        if (existing.unit_amount === cents && existing.active) return existingId;
        if (existing.active) {
          await stripe.prices.update(existingId, { active: false });
        }
      } catch {
        // price não encontrado — cria novo abaixo.
      }
    }
    const created = await stripe.prices.create({
      product: productId!,
      unit_amount: cents,
      currency: "brl",
      recurring: { interval },
      metadata: { rayo_trail_id: String(trail.id), rayo_interval: interval },
    });
    return created.id;
  }

  const monthlyPriceId = await ensurePrice(
    trail.stripe_price_monthly_id,
    trail.monthly_price_cents,
    "month",
  );
  const yearlyPriceId = await ensurePrice(
    trail.stripe_price_yearly_id,
    trail.yearly_price_cents,
    "year",
  );

  return {
    product_id: productId,
    monthly_price_id: monthlyPriceId,
    yearly_price_id: yearlyPriceId,
  };
}

export async function adminUpsertTrail(input: {
  id?: number;
  slug: string;
  title: string;
  life_stage: string;
  description?: string | null;
  hero_url?: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  active?: boolean;
  course_ids?: number[];
}): Promise<TrailRow> {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) {
    throw new BillingError("Slug inválido (use letras, números e hífens)", "INVALID_SLUG", 400);
  }
  if (!input.title.trim()) {
    throw new BillingError("Título obrigatório", "INVALID_TITLE", 400);
  }
  const validStages = ["solteiro", "namoro", "noivos", "casados", "pais"];
  if (!validStages.includes(input.life_stage)) {
    throw new BillingError("life_stage inválido", "INVALID_STAGE", 400);
  }
  if (input.monthly_price_cents < 0 || input.yearly_price_cents < 0) {
    throw new BillingError("Preço inválido", "INVALID_PRICE", 400);
  }

  let row: TrailRow;
  if (input.id) {
    const { rows } = await query<TrailRow>(
      `UPDATE trails SET slug=$1, title=$2, life_stage=$3, description=$4, hero_url=$5,
              monthly_price_cents=$6, yearly_price_cents=$7, active=$8, updated_at=NOW()
        WHERE id=$9 RETURNING *`,
      [
        slug,
        input.title.trim(),
        input.life_stage,
        input.description ?? null,
        input.hero_url ?? null,
        input.monthly_price_cents,
        input.yearly_price_cents,
        input.active ?? true,
        input.id,
      ],
    );
    if (rows.length === 0) throw new BillingError("Trilha não encontrada", "TRAIL_NOT_FOUND", 404);
    row = rows[0];
  } else {
    const { rows } = await query<TrailRow>(
      `INSERT INTO trails (slug, title, life_stage, description, hero_url,
                           monthly_price_cents, yearly_price_cents, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        slug,
        input.title.trim(),
        input.life_stage,
        input.description ?? null,
        input.hero_url ?? null,
        input.monthly_price_cents,
        input.yearly_price_cents,
        input.active ?? true,
      ],
    );
    row = rows[0];
  }

  // Best-effort: se Stripe falhar, persiste sem product_id (admin pode
  // re-tentar via "Sincronizar Stripe"). Não rolarback do DB.
  try {
    const stripeIds = await syncStripeProductForTrail(row);
    const { rows: updated } = await query<TrailRow>(
      `UPDATE trails SET stripe_product_id=$1, stripe_price_monthly_id=$2, stripe_price_yearly_id=$3,
              updated_at=NOW()
        WHERE id=$4 RETURNING *`,
      [stripeIds.product_id, stripeIds.monthly_price_id, stripeIds.yearly_price_id, row.id],
    );
    row = updated[0];
  } catch (err) {
    console.error("[billing] sync stripe failed for trail", row.id, err);
  }

  // Vínculo com cursos (sempre sincroniza a lista enviada).
  if (input.course_ids) {
    await query(`DELETE FROM trail_courses WHERE trail_id = $1`, [row.id]);
    for (let i = 0; i < input.course_ids.length; i++) {
      await query(
        `INSERT INTO trail_courses (trail_id, course_id, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [row.id, input.course_ids[i], i],
      );
    }
    invalidateTrailLookupCache();
  }

  return row;
}

export async function adminDeleteTrail(id: number): Promise<void> {
  await query(`UPDATE trails SET active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
  invalidateTrailLookupCache();
}

export async function adminListSubscribers(trailId: number): Promise<Array<{
  user_id: number;
  user_email: string;
  user_name: string | null;
  status: string;
  interval: string;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
}>> {
  const { rows } = await query<{
    user_id: number;
    user_email: string;
    user_name: string | null;
    status: string;
    interval: string;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
    created_at: Date;
  }>(
    `SELECT s.user_id, u.email AS user_email, u.name AS user_name,
            s.status, s.interval, s.current_period_end, s.cancel_at_period_end, s.created_at
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
      WHERE s.trail_id = $1
      ORDER BY s.created_at DESC`,
    [trailId],
  );
  return rows;
}
