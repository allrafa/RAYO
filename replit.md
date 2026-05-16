# RAYO Platform
RAYO é uma plataforma digital para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados, Pais.

## Run & Operate
- `npm run dev` (Express + Vite middleware) · `npm run build` (frontend prod).
- **Env vars principais**: `resend_api_key`, `RESEND_FROM_EMAIL`, `APP_URL`, `PUBLIC_SITE_URL` (default `https://rayo.app.br`), `ADMIN_EMAILS`, `CONTACT_EMAIL` (alias legado `CONTATO_TO_EMAIL`).
- **Bunny Stream**: `BUNNY_STREAM_LIBRARY_ID/API_KEY/CDN_HOSTNAME/WEBHOOK_SECRET` — ver `docs/contracts/bunny-stream.md`.
- **OAuth Google/Facebook** (só prod `https://rayo.app.br`): `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `FACEBOOK_CLIENT_ID/SECRET/REDIRECT_URI`. Sem `*_REDIRECT_URI` exato → botão "Em breve" — ver `docs/contracts/auth.md`.
- **Stripe (Trilhas pagas)**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (gerado/managed pelo `stripe-replit-sync` no boot, opcional). Webhook `POST /api/stripe/webhook`. Checkout hosted (sem chave pública no client) — ver `docs/contracts/billing.md`.
- **Realtime (Task #229 — Socket.IO único)**: `SOCKET_IO_ENABLED` (default `true`, kill-switch absoluto). `SOCKET_IO_PATH` (default `/socket.io`, customiza o path do engine.io; cliente lê `VITE_SOCKET_IO_PATH`). Socket.IO é o **transporte único** de DM, Comunidade e Notificações — SSE foi removido. Servidor anexa `socket.io` ao mesmo http.Server do Express, com dois namespaces: `/dm` (salas `user:<id>` e `conversation:<id>`) e `/community` (salas `forum:<slug>` e `post:<id>`). Auth pelo mesmo cookie `session_token`. Notificações (`notification:new`/`notification:unread`) trafegam pelo `/dm` via `publishToUser → emitToUser`. Gap-fill: DM via `conversation:sync` + `GET /api/messages/conversations/:id/since?cursor=`; Comunidade via `GET /api/community/forums/:slug/since?cursor=`. Smoke admin-only: `GET /api/admin/realtime/ping` (Task #230). Ponto de extensão `attachAdapter(io)` em `server/realtime/io.ts` pra adapter Redis futuro. Ver `server/realtime/io.ts`, `server/realtime/community.ts`, `src/lib/realtime/socket.ts`, `src/lib/community/useCommunitySocket.ts` e o contrato completo em `docs/contracts/realtime.md`.

## Stack
- **Frontend**: React 18, TypeScript, Tailwind v4, Vite. Fonte única **Outfit** (200–700).
- **Design System v2.0**: `src/styles/` — `home-rayo.css` (`.rh-*`), `nav-rayo.css` (`.rn-*`), `playlists-rayo.css` (`.rh-pl-*`), base `app-rayo.css` (`.ra-*`). Tokens `--rayo-*` (com aliases legacy `--raio-*`) em `globals.css`.
- **Backend**: Express + TS + tsx. **DB**: PostgreSQL. **Auth**: sessão com cookies seguros. **Email**: Resend.

## Where things live
- `server/` (entry `index.ts`, `db/`, `middleware/`, `features/`) · `src/` (raiz `App.tsx`, `components/`, `lib/api.ts`, `styles/`, `design-tokens.ts`).
- `architecture.md` (protocolo) · `docs/contracts/` (auth, routing, content & media, build, DM, Bunny, Comunidade, Turmas, Marketing/SEO, Billing) · `tsconfig.json` / `tsconfig.server.json` / `vite.config.ts`.

## Architecture decisions
- **Thin Client, Fat Server**: lógica/auth/dados/segurança no Express.
- **Idempotent Migrations/Seeds**: migrações de boot são idempotentes.
- **RBAC**: hierarquia numérica (`client` < `producer` < `moderator` < `admin`).
- **Soft Deletes**: conteúdo é `hidden`, não deletado.
- **Socket.IO único para realtime**: DM, Comunidade e Notificações via Socket.IO (sem SSE) — ver `docs/contracts/realtime.md`.
- **Dynamic Home Feed**: `recommendedSectionOrder` por segmentos; "Hoje no RAYO" usa rotação determinística diária.
- **Static Assets em Object Storage**: sentinels `objstore://<key>` resolvidos via signed URL em leitura. Imagens passam por `sharp`.
- **Vídeo via Bunny Stream**: sentinel `bunny://<libraryId>/<guid>` — ver `docs/contracts/bunny-stream.md`.

## Product
- **Auth**: registro, login, logout, reset, perfil, verificação de e-mail (código + magic link), OAuth Google/Facebook — ver `docs/contracts/auth.md`.
- **CMS**: 6 kinds (audio, video, reels, serie, curso, livro) + `artigo` (blog) — ver `docs/contracts/content-and-media.md`.
- **Gamification**: XP, badges, missões, streaks. **Personalized Dashboard** agrega tudo + comunidade.
- **Community Forums**: subreddit-style, criação por usuários, mod local — ver `docs/contracts/comunidade.md`.
- **Direct Messaging**: per-side state + attachments + swipe + áudio — ver `docs/contracts/dm.md`.
- **Notificações**: tabela `notifications`, `NotificationBell` no header, transporte via Socket.IO `/dm` (sala `user:<id>`), endpoints `/api/notifications`. Ver `docs/contracts/realtime.md`.
- **LGPD**: export e deleção de conta em `/api/lgpd`.
- **Admin & Moderation**: gestão de usuários, moderação, métricas.
- **Turmas (mini-Skool)**: ver `docs/contracts/turmas.md`.
- **Trilhas pagas (Stripe)**: assinatura recorrente por trilha curada, gating 402 — ver `docs/contracts/billing.md`.
- **Site Público / Marketing & SEO**: ver `docs/contracts/marketing-seo.md`.

## User preferences
- I prefer simple language.
- I like functional programming paradigms.
- I want iterative development with frequent, small updates.
- Ask before making major changes to the codebase or architecture.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the `docs/` folder without explicit instruction.
- Do not make changes to the `replit.nix` file.

## Gotchas universais (cross-cutting)

Estes valem pra qualquer feature. Gotchas específicas vivem nos contratos.

- **Route Order (Express)**: rotas com prefixo fixo antes das dinâmicas. Ex: `/api/admin/community/*` precisa montar **antes** de qualquer `/api/admin` catch-all.
- **Email Enumeration Prevention**: `forgot-password` sempre devolve 200, mesmo se o e-mail não existir.
- **Object-Level Authorization**: producers só editam conteúdo próprio; `moderator+` faz override. Sempre cheque ownership no service, não só no router.
- **No Fake Discounts**: preço de curso vem de `course.price`; promoções e descontos vêm SEMPRE do backend, nunca do client.
- **Idempotent writes**: completions diárias, follows, subscriptions de fórum, reações — todos usam `ON CONFLICT DO NOTHING` ou upsert. Cliques duplos não duplicam.
- **Rate Limiter**: `rateLimiter(max, windowMs, opts)` em `server/middleware/security.ts` — bucket **in-memory por instância** (reiniciar workflow zera buckets), `opts.keyByUser` (cai pra IP quando anônimo) e `opts.skip(req)`. `optionalAuth` hidrata `req.user` antes de cada limiter autenticado. `app.set("trust proxy", 1)`. POSTs sensíveis em `/api/auth` **20/15min por IP**; resto **60/15min keyByUser**. Demais autenticadas **120–600/15min keyByUser**. Limites específicos vivem nos contratos.

## Pointers
- `architecture.md` (protocolo de mudanças) · `docs/ui-ux-audit.md` · `docs/platform-spec.md`
- **Contratos** (`docs/contracts/`):
  - `auth.md` — sessão, OAuth, verificação por código + magic link, rate limiter `/api/auth`, `<EmailVerificationInline>`.
  - `routing.md` — BrowserRouter, deep-links, sync URL↔context, custom events, scroll-top, click target hierarchy, `PROFILE_TAB_SLUGS`.
  - `content-and-media.md` — CMS kinds, content card mapping, YouTube cover fallback, player de áudio global, cards de destaque da Home (`home_feed_items`), catálogo↔trilhas.
  - `build-performance.md` — code splitting, `lazyNamed`, bundle size, `RouteFallback`, Vite middleware.
  - `dm.md` — DM v2, viewport sizing, `<AudioBubble>`, status leitura, attachments.
  - `bunny-stream.md` — upload, webhook HMAC, sentinel `bunny://`, embed.
  - `comunidade.md` — posts (só fotos), forums + slug, follow, reações multi-emoji, CMS de comunidades + mod local, `CommentsPanel via Portal`.
  - `turmas.md` — Turmas == Courses, `class_id` em posts, captura de interesse.
  - `marketing-seo.md` — páginas públicas, blog, sitemap/robots, JSON-LD server-side.
  - `billing.md` — Stripe Trilhas pagas, gating 402, webhook, trial 7 dias.
- **E2E**: `tests/e2e/README.md` — setup Playwright + CDP no Replit, gotchas (networkidle, rate limit, cleanup).
- **Helpers de servidor**: `server/lib/email.ts` (Resend) · `server/middleware/auth.ts` (roles) · `server/features/seo/publicMeta.ts` (SEO server-side) · `src/lib/api.ts` (API client) · `server/lib/youtubeMetadata.ts` (YouTube ID/thumb helpers).
