# Billing — Trilhas pagas (Stripe — Task #130)

Contratos consolidados do produto Trilhas pagas. Mexa aqui antes de tocar em `server/features/billing/`, `server/middleware/requireTrailAccess.ts`, `server/stripeClient.ts` ou `src/components/trilhas/`.

## Visão geral

RAYO monetiza via **trilhas curadas por momento de vida** (Solteiro / Namoro / Noivos / Casados / Pais). Cada trilha agrupa N **turmas** (`courses`) num pacote com assinatura recorrente Stripe (mensal ou anual ~20% off). Comunidade pública continua grátis; só as turmas vinculadas a uma trilha (e a comunidade `class_id` delas) ficam gated.

Princípios:
- **Fonte da verdade = tabela `subscriptions`.** Status `active|trialing|past_due` valem como acesso. Nunca confiar em status enviado pelo cliente.
- **Webhook = único canal de escrita** das linhas de assinatura. Processamento idempotente por `stripe_subscription_id`.
- **Metadata Stripe `rayo_user_id` + `rayo_trail_id`** é a cola entre o que vive lá e o que vive aqui — setada no Checkout Session e replicada na Subscription.
- **Preços em CENTAVOS BRL** (`monthly_price_cents`, `yearly_price_cents`). UI converte na exibição.
- Gating por trilha devolve **HTTP 402 `TRAIL_PAYMENT_REQUIRED`** com `trail_id` pra UI renderizar paywall inline.

## Schema (`server/features/billing/migrate.ts`)

Tudo idempotente, roda no boot via `migrateBilling()`.

### `trails`
| coluna | tipo | nota |
|---|---|---|
| `id` | SERIAL PK | |
| `slug` | `VARCHAR(80) UNIQUE` | `[a-z0-9-]{2,60}` |
| `title` | `VARCHAR(160)` | |
| `life_stage` | `VARCHAR(20)` | `solteiro|namoro|noivos|casados|pais` |
| `description` | TEXT | |
| `hero_url` | `VARCHAR(500)` | sentinel `objstore://...` aceito |
| `monthly_price_cents` | INTEGER | BRL, ≥ 0 |
| `yearly_price_cents` | INTEGER | BRL, ≥ 0 |
| `stripe_product_id` | TEXT | preenchido por `syncStripeProductForTrail` |
| `stripe_price_monthly_id` | TEXT | recriado quando o valor muda |
| `stripe_price_yearly_id` | TEXT | idem |
| `active` | BOOLEAN | soft delete |

Índices: `idx_trails_active`, `idx_trails_life_stage`.

### `trail_courses` (M:N trilha ⇄ curso)
PK composta `(trail_id, course_id)` + `sort_order INTEGER`. ON DELETE CASCADE em ambos os lados. Índices `idx_trail_courses_course` e `idx_trail_courses_trail`.

### `subscriptions` (fonte da verdade)
| coluna | tipo | nota |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | FK `users` | CASCADE |
| `trail_id` | FK `trails` | CASCADE |
| `stripe_subscription_id` | `TEXT UNIQUE NOT NULL` | dedupe natural do upsert |
| `stripe_customer_id` | TEXT NOT NULL | |
| `status` | `VARCHAR(32)` | bruto do Stripe |
| `interval` | `VARCHAR(10)` | `month` ou `year` |
| `current_period_end` | TIMESTAMP | |
| `cancel_at_period_end` | BOOLEAN | |

Índices: `idx_subscriptions_user`, `idx_subscriptions_trail`, `idx_subscriptions_status`.

### `users.stripe_customer_id`
Coluna nullable adicionada via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Index parcial único `WHERE stripe_customer_id IS NOT NULL`. Preenchido em `ensureStripeCustomer` (no checkout) e reforçado pelo webhook `checkout.session.completed`/`customer.subscription.*`.

### `ACTIVE_STATUSES` (`server/features/billing/service.ts`)
```ts
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
```
- `active`/`trialing` → acesso normal.
- `past_due` mantém acesso (próxima cobrança pode passar).
- `canceled`/`incomplete*`/`unpaid` → sem acesso.

## Endpoints

Todas as rotas montadas em `server/index.ts` (linhas ~190–194). `optionalAuth` hidrata `req.user` antes do `rateLimiter`.

### Públicos / autenticados — `/api/trails`
| método | rota | auth | rate | descrição |
|---|---|---|---|---|
| GET | `/api/trails` | opcional | 240/15min keyByUser | Lista trilhas ativas + `course_count` + `user_has_access` (quando logado). |
| GET | `/api/trails/:slug` | opcional | idem | Detalhe trilha + array `courses` + `user_has_access`. 404 `TRAIL_NOT_FOUND`. |
| POST | `/api/trails/:slug/checkout` | **requireAuth** | **5/h keyByUser** | Body `{ interval: "month"|"year" }`. Devolve `{ url }` (Checkout Session hosted). 400 `INVALID_INTERVAL`, 404 `TRAIL_NOT_FOUND`, 409 `ALREADY_SUBSCRIBED`, 503 `PRICE_NOT_CONFIGURED`, 502 `CHECKOUT_FAILED`. |

### Autenticado — `/api/billing`
| método | rota | descrição |
|---|---|---|
| POST | `/api/billing/portal` | Cria sessão do **Stripe Customer Portal**. Body **ignorado** (return_url é sempre `${PUBLIC_SITE_URL}/perfil`). Devolve `{ url }`. |
| GET | `/api/billing/subscriptions` | Lista assinaturas do usuário (join com `trails`) — usado em "Minhas assinaturas" no Perfil. |

### Admin — `/api/admin/trails` (`requireRole("admin")`)
- `GET /` lista todas (incluindo `active=false`).
- `GET /:id` detalhe + `course_ids[]`.
- `POST /` cria trilha. Valida `slug`, `title`, `life_stage`, preços ≥ 0. Após insert, **best-effort** `syncStripeProductForTrail` (cria/atualiza `Product` e `Price` BRL recorrente). Falha de Stripe NÃO faz rollback do DB; admin re-tenta via novo PUT.
- `PUT /:id` atualiza. Mesma sync best-effort.
- `DELETE /:id` soft delete (`active=false`) + `invalidateTrailLookupCache()`.
- `GET /:id/subscribers` lista assinantes (join `users`).

### Webhook — `POST /api/stripe/webhook`
Registrado **ANTES** do `express.json()` global em `server/index.ts` com `express.raw({ type: 'application/json' })` (linhas 73–92). **Sem isso a verificação HMAC quebra.** Não autenticado (validação é via header `stripe-signature`).

## Fluxos

### Checkout
1. Usuário logado clica "Assinar" em `/trilhas/:slug` → `POST /api/trails/:slug/checkout` com `{ interval }`.
2. Service valida trilha ativa, valida que usuário ainda **não tem acesso** (409 `ALREADY_SUBSCRIBED`), valida que `stripe_price_*_id` existe (503 `PRICE_NOT_CONFIGURED`).
3. `ensureStripeCustomer` cria/recupera `users.stripe_customer_id` (Stripe customer com `metadata.rayo_user_id`).
4. Cria Checkout Session `mode:"subscription"`, `locale:"pt-BR"`, `allow_promotion_codes:true`, com `metadata` E `subscription_data.metadata` setados em **`rayo_user_id`, `rayo_trail_id`, `rayo_interval`**.
5. URLs: `success_url` = `${PUBLIC_SITE_URL}/trilhas/sucesso?slug=…&session_id={CHECKOUT_SESSION_ID}`, `cancel_url` = `${PUBLIC_SITE_URL}/trilhas/:slug`. **Origin do request é IGNORADO** — base vem de `PUBLIC_SITE_URL → APP_URL → "https://rayo.app.br"` (helper `trustedSiteBaseUrl`) pra fechar open-redirect.
6. Frontend redireciona pro `url` retornado.

### Sucesso pós-checkout
- Página `/trilhas/sucesso` confirma para o usuário; o gating real só libera quando `subscriptions` recebe a row via webhook (normalmente segundos depois). Páginas que precisam confirmar acesso devem **rebuscar `/api/auth/me` ou `/api/billing/subscriptions`** ao invés de assumir do `session_id`.

### Customer Portal
- "Minhas assinaturas" no Perfil chama `POST /api/billing/portal` → redireciona pro `url`. Cancelamento, troca de plano, atualização de cartão tudo acontece lá; o webhook reflete na nossa `subscriptions`.

### Webhook (idempotente por `stripe_subscription_id`)
`processStripeWebhook(payload, signature)` em `server/features/billing/webhookHandlers.ts`:

1. **Delegação primeiro:** `getStripeSync().processWebhook(payload, signature)` (lib `stripe-replit-sync`) valida HMAC, popula schema `stripe.*`, deduplica eventos.
2. Em cima, `handleEvent(event)` mantém nossa tabela `subscriptions` em dia.

Eventos tratados:

| evento | efeito |
|---|---|
| `checkout.session.completed` | Atualiza `users.stripe_customer_id` quando NULL; busca a `subscription` via API e chama `upsertSubscriptionRow` (não espera `customer.subscription.created` chegar). |
| `customer.subscription.created` | `upsertSubscriptionRow` (insert ou update). |
| `customer.subscription.updated` | `upsertSubscriptionRow` (status, period_end, cancel_at_period_end, interval). |
| `customer.subscription.deleted` | `upsertSubscriptionRow` (status passa a `canceled`). |
| `invoice.payment_failed` | `UPDATE subscriptions SET status='past_due'` pelo `stripe_subscription_id` da invoice. |
| `charge.refunded` | Resolve `subscription` via `invoice.id` do charge → marca `status='canceled'`, `cancel_at_period_end=false`. Defensivo porque refunds via API/parciais nem sempre disparam `subscription.deleted`. |
| outros | Ignorados pelo nosso handler — `stripe-replit-sync` já fez o trabalho dele. |

`upsertSubscriptionRow` exige `metadata.rayo_user_id` E `rayo_trail_id`; sem isso loga `[stripe webhook] subscription sem metadata rayo_*` e ignora (provável subscription manual via dashboard). Toda mutação chama `invalidateTrailLookupCache()`.

### Boot sequence (`server/index.ts` `start()`)
1. `migrateBilling()` (nossas tabelas).
2. `runMigrations()` do `stripe-replit-sync` (schema `stripe.*`).
3. `findOrCreateManagedWebhook(${webhookBase}/api/stripe/webhook)` — registra o endpoint na conta Stripe e gerencia o `STRIPE_WEBHOOK_SECRET` automaticamente.
4. `syncBackfill()` (não-bloqueante).

## Gating (`requireTrailAccess.ts`)

Helper canônico:
```ts
checkCourseAccess(req, courseId): { allowed: boolean; trailId: number | null }
```
Regras:
- `getTrailIdForCourse(courseId)` (cache 60s) → se `null`, curso não pertence a trilha paga → libera.
- `hasRole(req.user, "moderator")` → libera (instrutores/líderes precisam abrir as turmas que produzem).
- Sem usuário → bloqueia.
- Caso contrário, `userHasActiveTrailAccess(userId, trailId)` consulta `EXISTS (... status = ANY(ACTIVE_STATUSES))`. **Qualquer linha ativa** dessa trilha libera (após plan changes, o usuário pode ter múltiplas linhas pra mesma trilha — basta uma estar válida).

Existe também o middleware `requireTrailAccessForCourse(getCourseId)` pra rotas onde o `course_id` está na URL.

### Payload de erro 402 (contrato com o frontend)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "TRAIL_PAYMENT_REQUIRED",
    "message": "Esta turma faz parte de uma trilha paga. Assine para acessar.",
    "trail_id": 7,
    "trail_slug": "casados-foundation",
    "course_id": 42
  }
}
```
- `trail_id`/`course_id` sempre presentes; `trail_slug` é incluído pelo `ensureTrailAccess` em `server/features/academia/routes.ts` (lookup extra na tabela `trails`) pra que o frontend redirecione direto pra `/trilhas/:slug` sem precisar refetch. Pode vir `null` se a trilha foi desativada entre o gate e o lookup.
- O middleware genérico `requireTrailAccessForCourse` em `server/middleware/requireTrailAccess.ts` devolve só `trail_id`+`course_id` (sem o slug) — se você usar ele em rotas novas e precisar do slug, replique o lookup de `ensureTrailAccess` ou faça o frontend cair pra `GET /api/trails` e mapear `trail_id → slug`.

O frontend captura o 402 e renderiza `<TrailPaywall trailId={…}/>` (que busca `/api/trails/:slug` e oferece "Assinar mensal/anual").

### Onde o gating é aplicado hoje
`server/features/academia/routes.ts` usa o helper local `ensureTrailAccess` que devolve 402 nos endpoints:
- `POST /:id/enroll`
- `GET /:id/progress`
- `PATCH /lessons/:id/progress` (resolve `course_id` da lesson)
- demais leituras autenticadas que chamam `ensureTrailAccess(req, res, courseId)`.

Comunidade fica gated **transitivamente**: posts com `class_id` exigem matrícula via `isCourseMember` em `server/features/community/`, e a matrícula em si já passou pelo gate de trilha (o `POST /:id/enroll` devolveu 402 se necessário). Não duplique `checkCourseAccess` na comunidade — confie no gate da matrícula.

### Cache `course_id → trail_id`
`courseToTrailCache` (Map em memória, TTL 60s) em `server/features/billing/service.ts`. Invalide via `invalidateTrailLookupCache()` em **toda** mutação que afete o vínculo (admin upsert/delete de trilha, todos os handlers de webhook que mexem em subscription). Se você adicionar um novo writer, chame a invalidação senão o gate fica stale por até 60s.

## Frontend

Rotas `/trilhas`, `/trilhas/:slug` e `/trilhas/sucesso` rodam na **PublicShell** (sem `AuthProvider`) — `TrilhaDetailPage` chama `/api/auth/me` direto pra detectar sessão sem depender do contexto. Componentes principais:
- `src/components/trilhas/TrilhasCatalogPage.tsx`
- `src/components/trilhas/TrilhaDetailPage.tsx`
- `src/components/trilhas/TrailPaywall.tsx` — paywall reutilizável que aparece em toda 402.
- `src/components/perfil/MinhasAssinaturasCard.tsx` — chama `/api/billing/portal`.
- `src/components/turmas/TurmaShell.tsx`/`TurmaLandingPage.tsx`/`TurmaCommunityTab.tsx` — capturam o 402 nas chamadas de matrícula/lessons/posts.

Stripe Checkout é hosted: **não é necessário** chave pública no client (sem `loadStripe`).

## Env vars

| var | obrigatória | nota |
|---|---|---|
| `STRIPE_SECRET_KEY` | sim em prod | secret key da conta. Em dev é resolvida via Replit Connector `stripe` por `getUncachableStripeClient()`. |
| `STRIPE_WEBHOOK_SECRET` | gerada/managed | `findOrCreateManagedWebhook` cria e o `stripe-replit-sync` gerencia. Defina à mão só se controla o endpoint manualmente. |
| `PUBLIC_SITE_URL` | sim | base trusted dos `success_url`/`cancel_url`/`return_url`. Default `https://rayo.app.br`. |
| `APP_URL` | fallback | usada quando `PUBLIC_SITE_URL` ausente. |

## Gotchas

### Webhook precisa do `express.raw` ANTES do `express.json`
Ordem do middleware em `server/index.ts` é crítica (linhas 73–92). Se o body for parseado como JSON antes da verificação, o HMAC quebra e todos os eventos viram 400. Não mova o handler nem aplique `express.json()` global antes dele.

### Idempotência só funciona por `stripe_subscription_id`
O `UNIQUE` no `stripe_subscription_id` + `ON CONFLICT ... DO UPDATE` é o mecanismo. **Não** crie outra rota/job que insira em `subscriptions` sem o mesmo upsert — você cria duplicatas.

### Stripe não edita preço de `Price`
`syncStripeProductForTrail.ensurePrice` cria um Price novo e desativa o antigo quando `unit_amount` muda. Assinaturas vigentes mantêm o Price antigo até troca pelo Customer Portal. Não tente `prices.update({ unit_amount })` — Stripe rejeita.

### Metadata é a cola
Subscription/Checkout Session **sem** `metadata.rayo_user_id` + `rayo_trail_id` são ignorados pelo `upsertSubscriptionRow` (warning no log). Sempre que criar Checkout/Subscription manualmente (ex: dashboard pra refund/teste), copie esses metadados ou a row não aparece no nosso sistema.

### `users.stripe_customer_id` pode chegar atrasado
O webhook `customer.subscription.*` força `UPDATE users SET stripe_customer_id = $1 WHERE id = $2` defensivamente — sem isso o **primeiro** request pós-checkout pode quebrar `requireTrailAccess` (que cruza por `user_id`, mas a portal session precisa do customer). Não otimize esse update fora.

### Open-redirect: `success_url` / `return_url`
Helper `trustedSiteBaseUrl()` resolve a base. **Nunca** use `req.headers.origin` ou body do cliente pra montar essas URLs — vira phishing vector. O body de `/api/billing/portal` é explicitamente ignorado.

### `ALREADY_SUBSCRIBED` no checkout
`createCheckoutSession` chama `getTrailBySlug(slug, userId)` e bloqueia se `user_has_access=true` (409). Isso evita criar sub duplicada quando o usuário clica "Assinar" duas vezes. Se você quiser reativar uma sub `canceled`, mande pro Customer Portal — não pra novo checkout.

### Cache de trail lookup
TTL 60s. Toda escrita que muda vínculo `trail ↔ course` ou `subscription` precisa chamar `invalidateTrailLookupCache()`. Já é feito em `adminUpsertTrail`, `adminDeleteTrail` e em todos os ramos do webhook que mexem em `subscriptions`.

### Sync best-effort de Stripe no admin
`adminUpsertTrail` persiste no DB primeiro e tenta sincronizar Stripe depois. Se a sync falhar (rede, key inválida), a linha existe sem `stripe_*_id` e `POST /:slug/checkout` devolve 503 `PRICE_NOT_CONFIGURED` até o admin re-salvar. Não envolva tudo em transação — o produto Stripe é criado fora do banco e rollback parcial geraria órfão lá.

### `requireTrailAccess` libera moderator+
`hasRole(req.user, "moderator")` é o curto-circuito antes de consultar `subscriptions`. Não remova: produtores precisam abrir e editar as turmas que postam, mesmo sem assinar a trilha.
