# RAYO Platform
RAYO (anteriormente RAIO; renomeado em Maio/2026) é uma plataforma digital para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados, Pais.

## Run & Operate
- `npm run dev`: Starts Express server with Vite dev middleware.
- `npm run build`: Builds frontend for production.
- **Environment Variables**:
    - `resend_api_key`: Resend API key.
    - `RESEND_FROM_EMAIL`: Sender email address (default: `RAIO <onboarding@resend.dev>`).
    - `APP_URL`: Public URL for email links (default: `https://${REPLIT_DEV_DOMAIN}`).
    - `PUBLIC_SITE_URL`: Domínio canônico usado em `/sitemap.xml` e `/robots.txt` (default: `https://rayo.app.br`).
    - `ADMIN_EMAILS`: Comma-separated emails for admin role on boot.
    - **OAuth (opcional, Task #69)** — sem essas vars os botões aparecem como "Em breve". **OAuth Google só funciona no domínio de produção `https://rayo.app.br`** (no preview/dev o login social fica desabilitado de propósito; use email/senha):
        - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: credenciais OAuth 2.0 do Google Cloud.
        - `GOOGLE_REDIRECT_URI` (**obrigatória** para habilitar Google): deve ser exatamente `https://rayo.app.br/api/auth/google/callback` e estar registrada como Authorized redirect URI no Google Cloud Console. Sem essa var a estratégia não é registrada (log de erro no boot) e o botão fica como "Em breve".
        - `APPLE_CLIENT_ID` (Service ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (P8 em texto). `APPLE_REDIRECT_URI` é **opcional** — se ausente, a callback é montada a partir de `APP_URL`/`REPLIT_DEV_DOMAIN` (comportamento legado preservado).

## Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Vite
- **Fonts**: Outfit (única, pesos 200–700) — RAYO Design System v2.0
- **Design System v2.0 CSS**: trio em `src/styles/`: `home-rayo.css` (`.rh-*` Home/Hero/Stats/Courses), `nav-rayo.css` (`.rn-*` TopBar/MobileBottomNav), `playlists-rayo.css` (`.rh-pl-*` cards quadrados); base compartilhada **`app-rayo.css`** (`.ra-*` page shell, header, tabs, cards, pills, tags, metrics, empty, search, disc-list, chat-bubble, admin-shell). Tokens via `--rayo-*` em `globals.css` — legacy `--raio-*` foi varrido em Maio/2026 (#60).
- **Backend**: Express.js, TypeScript, tsx
- **Database**: PostgreSQL
- **ORM**: _Populate as you build_
- **Validation**: _Populate as you build_
- **Auth**: Session-based with secure cookies
- **Email**: Resend

## Where things live
- `server/`: Backend (entry point `index.ts`, DB in `db/`, middleware in `middleware/`, features in `features/`)
- `src/`: Frontend (React root `App.tsx`, components in `components/`, API client `lib/api.ts`, styles in `styles/`, design tokens `design-tokens.ts`)
- `architecture.md`: Full development protocol.
- `tsconfig.json`: Frontend TS config.
- `tsconfig.server.json`: Backend TS config.
- `vite.config.ts`: Vite + API proxy config.

## Architecture decisions
- **Thin Client, Fat Server**: All business logic, auth, data access, and security reside on the Express.js backend.
- **Idempotent Migrations/Seeds**: Boot-time migrations for CMS content and Home Feed items are idempotent.
- **Role-Based Access Control**: Numeric hierarchy of roles (`client` < `producer` < `moderator` < `admin`) enforced by middleware.
- **Soft Deletes for Moderation**: Content is `hidden` by moderators rather than hard deleted.
- **Server-Sent Events (SSE) for Real-time Messaging**: Direct Messaging uses SSE for real-time updates.
- **Dynamic Home Feed**: `recommendedSectionOrder` is computed from user segments, allowing dynamic rail rendering. "Hoje no RAIO" uses deterministic daily rotation.
- **Static Assets in Object Storage**: Uploaded media uses Replit Object Storage via short-lived signed URLs. DB stores `objstore://<key>` sentinels which are resolved to signed URLs on read.
- **Image Optimization**: Uploaded images are optimized (resized, re-encoded) using `sharp` before storage.

## Product
- **User Authentication**: Register, login, logout, password reset, profile management, email verification.
- **Content Management System (CMS)**: Manages six content kinds (audio, video, reels, serie, curso, livro) with admin tools.
- **Gamification**: XP levels, badges, missions, and streaks.
- **Community Forums**: Forums, posts, comments, likes with moderation.
- **Personalized Dashboard**: Aggregates gamification stats, course progress, recommendations, and community posts.
- **Direct Messaging**: Private conversations with real-time updates.
- **LGPD Compliance**: Data export and account deletion features.
- **Admin & Moderation**: Tools for user management, content moderation, and platform metrics.

## User preferences
- I prefer simple language.
- I like functional programming paradigms.
- I want iterative development with frequent, small updates.
- Ask before making major changes to the codebase or architecture.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the `docs/` folder without explicit instruction.
- Do not make changes to the `replit.nix` file.

## Gotchas
- **Route Order**: Fixed-prefix routes must be declared before dynamic parameter routes in Express.
- **Email Enumeration Prevention**: Forgot password always returns success.
- **Object-Level Authorization**: Producers can only modify their own content; `moderator+` roles override.
- **Content Card Mapping**: `badge_text`, `meta_text`, `progress`, and `gradient` fields have contextual meanings.
- **No Fake Discounts**: Course pricing displays `course.price` directly; promotions must come from backend data.
- **Rate Limiter (Task #51)**: `rateLimiter(max, windowMs, opts)` em `server/middleware/security.ts` tem bucket próprio por instância, `opts.keyByUser` (chaveia por `req.user.id`, cai pra IP quando anônimo) e `opts.skip(req)`. `optionalAuth` roda antes de cada limiter autenticado em `server/index.ts` para hidratar `req.user`; `requireAuth` reaproveita o user já validado. `app.set("trust proxy", 1)`. `/api/auth` POSTs sensíveis: 20/15min por IP. `/api/auth` resto: 60/15min keyByUser, com `GET /me` skipado. LGPD vive em `/api/lgpd` (não mais montado em `/api/users`). Demais rotas autenticadas: 120–600/15min keyByUser.
- **Idempotent Daily Completions**: `POST /api/home/today/complete` uses `ON CONFLICT DO NOTHING` to prevent duplicate XP/streak awards.

## Pointers
- **Development Protocol**: `architecture.md`
- **UI/UX Audit**: `docs/ui-ux-audit.md`
- **Email Sending (Resend)**: `server/lib/email.ts`
- **Role Management**: `server/middleware/auth.ts`
- **API Client**: `src/lib/api.ts`