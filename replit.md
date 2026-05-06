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

- **Mobile navigation** (Task #41): bottom navbar has 4 fixed slots
  (Home, Academia, Comunidade, Perfil) and is always visible. Mensagens
  is a floating top-right icon (`MobileTopBar`, `lg:hidden`). Admin for
  `producer+` lives inside `PerfilPage` (Conta → Painel Admin), not in
  the bottom bar. Conselheiro is reached via the Home CTA.

## Gotchas
- **Route Order**: In Express, fixed-prefix routes must be declared before dynamic parameter routes (e.g., `/:id`) to prevent incorrect matching.
- **Email Enumeration Prevention**: The `POST /api/auth/forgot-password` endpoint always returns a success message to prevent attackers from inferring valid email addresses.
- **Object-Level Authorization**: Producers can only modify content they created, unless overridden by `moderator+` roles.
- **Content Card Mapping**: `badge_text`, `meta_text`, `progress`, and `gradient` fields in Home Feed cards have specific contextual meanings depending on the section.
- **Static Assets**: Uploaded media is served statically via `/uploads/*` and relies on `multer` disk storage; future plans include object storage.
- **No fake discounts**: Course pricing displays `course.price` directly. Never reintroduce a hardcoded `* 0.5` "50% OFF" — there is no `original_price` field. Promotions must come from real backend data.

## Pointers
- **Development Protocol**: `architecture.md`
- **UI/UX Audit**: `docs/ui-ux-audit.md`
- **Email Sending (Resend)**: Refer to `server/lib/email.ts` and Resend documentation for email configurations.
- **Role Management**: See `server/middleware/auth.ts` for `requireRole(minRole)` implementation.
- **API Client**: `src/lib/api.ts`
