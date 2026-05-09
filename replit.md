# RAYO Platform
RAYO (anteriormente RAIO; renomeado em Maio/2026) é uma plataforma digital para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados, Pais.

## Run & Operate
- `npm run dev`: Starts Express server with Vite dev middleware.
- `npm run build`: Builds frontend for production.
- **Environment Variables**:
    - `resend_api_key`, `RESEND_FROM_EMAIL` (default: `RAIO <onboarding@resend.dev>`).
    - `APP_URL` (default: `https://${REPLIT_DEV_DOMAIN}`), `PUBLIC_SITE_URL` (default `https://rayo.app.br`).
    - `ADMIN_EMAILS`: Comma-separated emails para role admin no boot.
    - `CONTACT_EMAIL` / `CONTATO_TO_EMAIL` (alias legado): destinatário do `/contato`.
    - **Bunny Stream**: `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_API_KEY`, `BUNNY_STREAM_CDN_HOSTNAME`, `BUNNY_STREAM_WEBHOOK_SECRET`. Ver `docs/contracts/bunny-stream.md`.
    - **OAuth Google/Facebook** (só funciona em produção `https://rayo.app.br`): `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `FACEBOOK_CLIENT_ID/SECRET/REDIRECT_URI`. Sem as `*_REDIRECT_URI` exatas, o botão fica "Em breve".

## Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Vite. Fonte única **Outfit** (200–700).
- **Design System v2.0 CSS**: trio em `src/styles/`: `home-rayo.css` (`.rh-*`), `nav-rayo.css` (`.rn-*`), `playlists-rayo.css` (`.rh-pl-*`); base compartilhada `app-rayo.css` (`.ra-*`). Tokens via `--rayo-*` em `globals.css` (legacy `--raio-*` removido em #60).
- **Backend**: Express.js, TypeScript, tsx. **Database**: PostgreSQL. **Auth**: sessão com cookies seguros. **Email**: Resend.

## Where things live
- `server/`: Backend (entry `index.ts`, DB em `db/`, middleware em `middleware/`, features em `features/`).
- `src/`: Frontend (raiz `App.tsx`, componentes em `components/`, API client `lib/api.ts`, estilos em `styles/`, tokens `design-tokens.ts`).
- `architecture.md`: Protocolo de desenvolvimento.
- `docs/contracts/`: Contratos detalhados de features estáveis (DM, Bunny, Comunidade, Turmas, Marketing/SEO).
- `tsconfig.json` / `tsconfig.server.json` / `vite.config.ts`.

## Architecture decisions
- **Thin Client, Fat Server**: lógica de negócio, auth, dados e segurança no Express.
- **Idempotent Migrations/Seeds**: migrações de boot são idempotentes.
- **Role-Based Access Control**: hierarquia numérica (`client` < `producer` < `moderator` < `admin`).
- **Soft Deletes for Moderation**: conteúdo é `hidden`, não deletado.
- **SSE para Real-time Messaging**: DM usa Server-Sent Events.
- **Dynamic Home Feed**: `recommendedSectionOrder` calculado por segmentos do user; "Hoje no RAIO" usa rotação determinística diária.
- **Static Assets em Object Storage**: sentinels `objstore://<key>` resolvidos via signed URL em leitura.
- **Bunny Stream para vídeo**: vídeos do CMS sobem pro Bunny; sentinel `bunny://<libraryId>/<guid>`. Detalhes em `docs/contracts/bunny-stream.md`.
- **Image Optimization**: imagens passam por `sharp` antes de Object Storage.

## Product
- **User Authentication**: registro, login, logout, reset, perfil, verificação de e-mail.
- **CMS**: 6 kinds (audio, video, reels, serie, curso, livro) + `artigo` para o blog. Detalhes do blog em `docs/contracts/marketing-seo.md`.
- **Gamification**: XP, badges, missões, streaks.
- **Community Forums**: ver `docs/contracts/comunidade.md` (subreddit-style, posts só com fotos, follow, perfis públicos).
- **Personalized Dashboard**: agrega gamificação, progresso de cursos, recomendações e comunidade.
- **Direct Messaging**: ver `docs/contracts/dm.md` (per-side state, attachments, swipe, lista única).
- **Notificações**: tabela `notifications` (kind/title/body/link/payload), sino no header (`NotificationBell`), SSE (`notification:new`/`unread`). Endpoints em `/api/notifications`.
- **LGPD**: export e deleção de conta em `/api/lgpd`.
- **Admin & Moderation**: ferramentas de gestão de usuários, moderação e métricas.
- **Turmas (mini-Skool)**: ver `docs/contracts/turmas.md` (Turma == Course, landing rica, comunidade escopada por `class_id`, captura de interesse).
- **Site Público / Marketing & SEO**: ver `docs/contracts/marketing-seo.md` (9 páginas públicas, blog, sitemap, JSON-LD, security.txt, RSS).

## User preferences
- I prefer simple language.
- I like functional programming paradigms.
- I want iterative development with frequent, small updates.
- Ask before making major changes to the codebase or architecture.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the `docs/` folder without explicit instruction.
- Do not make changes to the `replit.nix` file.

## Gotchas
Universais (ficam inline; o resto está em `docs/contracts/*.md`):
- **Route Order**: rotas com prefixo fixo devem vir antes das dinâmicas no Express.
- **Email Enumeration Prevention**: forgot password sempre retorna sucesso.
- **Object-Level Authorization**: producers só editam conteúdo próprio; `moderator+` override.
- **Content Card Mapping**: `badge_text`, `meta_text`, `progress`, `gradient` têm significado contextual.
- **No Fake Discounts**: preço de curso vem direto de `course.price`; promoções só do backend.
- **Rate Limiter (Task #51)**: `rateLimiter(max, windowMs, opts)` em `server/middleware/security.ts` — bucket por instância, `opts.keyByUser` (cai pra IP quando anônimo) e `opts.skip(req)`. `optionalAuth` roda antes de cada limiter autenticado pra hidratar `req.user`. `app.set("trust proxy", 1)`. `/api/auth` POSTs sensíveis: 20/15min por IP. `/api/auth` resto: 60/15min keyByUser, com `GET /me` skipado. LGPD em `/api/lgpd`. Demais autenticadas: 120–600/15min keyByUser.
- **Idempotent Daily Completions**: `POST /api/home/today/complete` usa `ON CONFLICT DO NOTHING` para evitar XP/streak duplicado.

Por feature (ver arquivo correspondente):
- **Direct Messaging (Task #79)**: `docs/contracts/dm.md` — per-side state, archive contract, attachments, swipe, lista única + arquivadas.
- **Bunny Stream (Task #86)**: `docs/contracts/bunny-stream.md` — upload contract, webhook, sentinel format, Bunny vs Object Storage.
- **Comunidade (Task #92)**: `docs/contracts/comunidade.md` — posts só fotos (INVIOLÁVEL), slug + subscriptions, follow contract.
- **Turmas (Task #99)**: `docs/contracts/turmas.md` — Turmas == Courses, posts com `class_id`, captura de interesse.
- **Marketing & SEO (Tasks #70, #111)**: `docs/contracts/marketing-seo.md` — kind 'artigo', CSS scope, public route gate, auth deep links, blog cache, OG default image.

## Pointers
- **Development Protocol**: `architecture.md`
- **UI/UX Audit**: `docs/ui-ux-audit.md`
- **Platform Spec**: `docs/platform-spec.md`
- **Feature Contracts**: `docs/contracts/{dm,bunny-stream,comunidade,turmas,marketing-seo}.md`
- **Email Sending (Resend)**: `server/lib/email.ts`
- **Role Management**: `server/middleware/auth.ts`
- **API Client**: `src/lib/api.ts`
- **SEO server-side**: `server/features/seo/publicMeta.ts`
