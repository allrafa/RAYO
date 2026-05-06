# RAIO Platform
RAIO is a digital platform designed to strengthen families through transformative content, engaged community, and practical resources across five life contexts: Solteiro, Namoro, Noivos, Casados, Pais.

## Run & Operate
- `npm run dev`: Starts Express server on port 5000 with Vite dev middleware (serves both API and frontend).
- `npm run build`: Builds frontend for production.
- **Environment Variables**:
    - `resend_api_key`: Resend API key for email sending.
    - `RESEND_FROM_EMAIL`: (Optional) Sender email address for Resend (default: `RAIO <onboarding@resend.dev>`).
    - `APP_URL`: (Optional) Public URL used in email links (default: `https://${REPLIT_DEV_DOMAIN}`).
    - `ADMIN_EMAILS`: (Optional) Comma-separated emails to promote to `admin` role on boot.

## Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Vite
- **Fonts**: Urbanist (body/display sans) + Instrument Serif (`.font-display-serif` for editorial titles, used in onboarding); Google Fonts imports live at the top of `src/index.css`
- **Backend**: Express.js, TypeScript, tsx (runtime)
- **Database**: PostgreSQL
- **ORM**: _Populate as you build_
- **Validation**: _Populate as you build_
- **Auth**: Session-based with secure cookies
- **Email**: Resend

## Where things live
- `server/`: Backend
    - `index.ts`: Entry point (Express app).
    - `db/`: Database connection + schema.
    - `middleware/`: Security, auth, error handling.
    - `features/`: Feature folders (routes + service + validation). Includes `bundles/` (curated marketplace trilhas, `GET /api/bundles?segment=...`).
- `src/`: Frontend (React)
    - `App.tsx`: Root component.
    - `components/`: UI components.
    - `lib/api.ts`: API client.
    - `styles/`: CSS.
    - `design-tokens.ts`: Canonical UI tokens.
- `architecture.md`: Full development protocol (MUST be consulted before every sprint).
- `tsconfig.json`: Frontend TS config.
- `tsconfig.server.json`: Backend TS config.
- `vite.config.ts`: Vite + API proxy config.

## Architecture decisions
- **Thin Client, Fat Server**: All business logic, auth, data access, and security enforcement reside on the Express.js backend. The frontend focuses solely on capturing user intent.
- **Idempotent Migrations/Seeds**: Boot-time migrations for CMS content and Home Feed items are designed to be idempotent, ensuring consistent initial data and safe re-runs.
- **Role-Based Access Control**: A numeric hierarchy of roles (`client` < `producer` < `moderator` < `admin`) is enforced by middleware for administrative actions.
- **Soft Deletes for Moderation**: Instead of hard deletion, content (posts, comments) can be `hidden` by moderators, allowing for restoration.
- **Server-Sent Events (SSE) for Real-time Messaging**: Direct Messaging uses SSE for real-time updates on new messages, unread counts, and ephemeral typing indicators, reducing polling overhead.
- **Segment-driven Home order + daily rotation (Task #43)**: Backend
  exposes `recommendedSectionOrder` (string[]) on the dashboard payload,
  computed from the user's primary `segments[0]`. The frontend renders
  rails dynamically by id and ignores unknown ids, so adding a rail in
  `RAIL_ORDER_BY_SEGMENT` is forward-compatible. "Hoje no RAIO"
  (`GET /api/home/today`) picks one item per (user, day, segment) using
  a deterministic `(epochDay + userId) % n` rotation; completion
  (`POST /api/home/today/complete`) is idempotent (UNIQUE on
  `home_today_completions(user_id, completed_date)`) and awards
  `+15 XP` plus a streak bump on first claim only.
- **Perfil aprimorado (Task #45)**: `users` ganhou `avatar_url TEXT` e
  `bio TEXT` (ALTER idempotente em `server/db/schema.ts`).
  Endpoints novos: `POST /api/auth/change-password` (verifica senha
  atual via bcrypt antes de trocar), `POST /api/users/avatar` (multer
  dedicado, cap 2 MB, JPG/PNG/WebP, salva em `uploads/avatar/`,
  retorna `user`), `PATCH /api/users/preferences` (merge raso na JSONB
  `notification_preferences`, allowlist `push|email|missions|community`),
  `GET /api/users/me/activity-stats` (cursos/biblioteca/comunidades
  distintas/posts criados — usa `is_hidden = FALSE`). `PATCH
  /api/users/profile` agora aceita `name` (2–100) e `bio` (≤280, "" → null).
  `GET /api/users/:id/public` devolve `bio` + `avatar_url`.
  Frontend: `PerfilPage` consome tudo isso, mostra avatar com botão de
  câmera, exibe bio no hero, lista "Missões da semana" com botão
  Resgatar (`POST /api/gamification/missions/:id/claim`), e os
  modais ficam em `src/components/perfil/PerfilModals.tsx`
  (EditProfile, ChangePassword, Language). Toggle de Notificações
  persiste via `updatePreferences`. Idioma é local
  (`localStorage["raio-language"]`, i18n real fora de escopo).
  **Regra "no Em breve"**: nenhum item de menu pode disparar
  `toast.info("Em breve!")` — ou faz algo real, ou é removido. "Sessões
  Conselheiro" foi removido do grid (sem fonte de dados).
- **Stats clicáveis + Continue unificado + Busca mobile (Task #44)**:
  Os 3 cards de stats da Home (Sequência, Nível, XP semanal) viraram
  `<button>` reais e abrem modais informativos:
  `StreakCalendarModal` (calendário de hábitos via
  `GET /api/home/streak-calendar`), `BadgesModal`
  (`GET /api/gamification/badges`) e `XPHistoryModal`
  (`GET /api/home/xp-history?weeks=N`). As três rails antigas
  ("continue", "youtube_continue", "recently_played") foram fundidas
  em uma única rail "continue" alimentada por `GET /api/home/continue`
  (cursos em progresso + CMS audio/video recentes), mesclada no cliente
  com o progresso de YouTube (localStorage). Os ids legados continuam
  resolvendo para `null` no frontend pra tolerar payloads antigos. Busca
  mobile vive em `MobileSearchPage` (overlay full-screen aberto pelo
  ícone de lupa do `MobileTopBar`); a busca desktop no `TopNavbar`
  agora também consome `GET /api/search?q=...` (cursos + content_items
  + posts + users, ILIKE, 5 por categoria) com debounce e dropdown.

## Product
- **User Authentication**: Register, login, logout, password reset, and user profile management. Email verification is required for registration.
- **Content Management System (CMS)**: Manages six content kinds (audio, video, reels, serie, curso, livro) with admin tools for creation, publishing, and media uploads.
- **Gamification**: XP levels, badges, missions, and streaks to engage users.
- **Community Forums**: Features forums, posts, comments, and likes with moderation capabilities.
- **Personalized Dashboard**: Aggregates user-specific gamification stats, course progress, recommendations, and relevant community posts.
- **Direct Messaging**: Private conversations between users with real-time updates and unread message indicators.
- **LGPD Compliance**: Features for data export and account deletion (anonymization of PII).
- **Admin & Moderation**: Tools for user management (roles), content moderation (hide/restore), and platform overview metrics.

## User preferences
- I prefer simple language.
- I like functional programming paradigms.
- I want iterative development with frequent, small updates.
- Ask before making major changes to the codebase or architecture.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the `docs/` folder without explicit instruction.
- Do not make changes to the `replit.nix` file.

- **Mobile navigation** (Task #41 + #44): bottom navbar has 4 fixed
  slots (Home, Academia, Comunidade, Perfil) and is always visible.
  `MobileTopBar` (canto superior direito, `lg:hidden`) carrega dois
  ícones flutuantes: lupa (abre `MobileSearchPage`) e envelope
  (Mensagens). Admin para `producer+` vive dentro do `PerfilPage`
  (Conta → Painel Admin), não no bottom bar. Conselheiro continua sendo
  acessado via CTA do hero da Home.
- **Home structure** (Task #42 — Faxina): hero is a single editorial
  layer (image + overlay + greeting + headline + CTA "Falar com o
  conselheiro" → opens `TrilhaTransformacaoChat`). The greeting lives
  in the hero, not above the stats grid. Mensagens is **only** reached
  via `MobileTopBar` (the duplicate envelope inside the hero was
  removed). There is no Shuffle FAB and no empty "Adicionar conteúdo"
  card. `YouTubeMockBanner` is dev-only (gated by `import.meta.env.PROD`).
  YouTube card thumbnails use `loading="lazy"`.

## Gotchas
- **Route Order**: In Express, fixed-prefix routes must be declared before dynamic parameter routes (e.g., `/:id`) to prevent incorrect matching.
- **Email Enumeration Prevention**: The `POST /api/auth/forgot-password` endpoint always returns a success message to prevent attackers from inferring valid email addresses.
- **Object-Level Authorization**: Producers can only modify content they created, unless overridden by `moderator+` roles.
- **Content Card Mapping**: `badge_text`, `meta_text`, `progress`, and `gradient` fields in Home Feed cards have specific contextual meanings depending on the section.
- **Static Assets**: Uploaded media is served statically via `/uploads/*` and relies on `multer` disk storage; future plans include object storage.
- **No fake discounts**: Course pricing displays `course.price` directly. Never reintroduce a hardcoded `* 0.5` "50% OFF" — there is no `original_price` field. Promotions must come from real backend data.
- **Idempotent daily completions (Task #43)**: `POST /api/home/today/complete` uses `INSERT … ON CONFLICT (user_id, completed_date) DO NOTHING` and only awards XP/streak when the insert actually wrote a row (`rowCount === 1`). Never bypass that guard or duplicate completions will yield extra XP.

## Pointers
- **Development Protocol**: `architecture.md`
- **UI/UX Audit**: `docs/ui-ux-audit.md`
- **Email Sending (Resend)**: Refer to `server/lib/email.ts` and Resend documentation for email configurations.
- **Role Management**: See `server/middleware/auth.ts` for `requireRole(minRole)` implementation.
- **API Client**: `src/lib/api.ts`
