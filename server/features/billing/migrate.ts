import { query } from "../../db/index.js";

// Task #130 — schema das trilhas pagas. Tudo idempotente.
//
// Decisões:
// - Tabela `trails` armazena metadados + IDs de produto/preço Stripe.
//   Nunca duplicamos `name`/`description` do Stripe — fonte da verdade
//   do produto fica lá; aqui só guardamos o que é nosso (slug, life_stage,
//   ordem das turmas, etc).
// - Preços ficam em CENTAVOS (BRL). UI converte na exibição.
// - `subscriptions` é alimentada exclusivamente pelo webhook do Stripe.
//   Nunca confiar em status enviado pelo cliente.
// - `users.stripe_customer_id` é nullable; preenchido no checkout.
export async function migrateBilling(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS trails (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(80) UNIQUE NOT NULL,
      title VARCHAR(160) NOT NULL,
      life_stage VARCHAR(20) NOT NULL,
      description TEXT,
      hero_url VARCHAR(500),
      monthly_price_cents INTEGER NOT NULL DEFAULT 0,
      yearly_price_cents INTEGER NOT NULL DEFAULT 0,
      stripe_product_id TEXT,
      stripe_price_monthly_id TEXT,
      stripe_price_yearly_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_trails_active ON trails(active)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trails_life_stage ON trails(life_stage)`);

  await query(`
    CREATE TABLE IF NOT EXISTS trail_courses (
      trail_id INTEGER NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (trail_id, course_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_trail_courses_course ON trail_courses(course_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trail_courses_trail ON trail_courses(trail_id)`);

  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`,
  );

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trail_id INTEGER NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
      stripe_subscription_id TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT NOT NULL,
      status VARCHAR(32) NOT NULL,
      interval VARCHAR(10) NOT NULL,
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_trail ON subscriptions(trail_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`);

  console.log("[DB] Billing schema initialized.");
}
