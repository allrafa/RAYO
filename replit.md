# RAIO Platform

## Overview
RAIO is a digital platform to strengthen families through transformative content, engaged community, and practical resources. It serves users across 5 life contexts: Solteiro, Namoro, Noivos, Casados, Pais.

## Architecture
**Thin Client, Fat Server** — The frontend only captures user intent. All business logic, auth, data access, and security enforcement happens on the Express.js backend.

See `architecture.md` for the full development protocol (MUST be consulted before every sprint).

## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Backend | Express.js, TypeScript, tsx (runtime) |
| Database | PostgreSQL (Replit built-in) |
| Auth | Session-based with secure cookies |

## Project Structure
```
server/                  # Backend
├── index.ts             # Entry point (Express app)
├── db/                  # Database connection + schema
├── middleware/           # Security, auth, error handling
├── features/            # Feature folders (routes + service + validation)
│   ├── health/          # Health check endpoint
│   ├── auth/            # Authentication (register, login, logout, me)
│   ├── users/           # User profile management (PATCH /api/users/profile)
│   ├── gamification/    # XP, badges, missions, streaks
│   ├── academia/        # Courses, modules, lessons, progress
│   ├── community/       # Forums, posts, comments, likes
│   ├── dashboard/       # Personalized dashboard aggregation
│   ├── lgpd/            # LGPD: data export & account deletion (anonymizes messages)
│   ├── messages/        # Direct messaging (conversations + messages + unread count)
│   └── admin/           # Admin/moderation: overview metrics, user role mgmt, hide/restore posts & comments
└── utils/               # Response helpers, logger

src/                     # Frontend (React)
├── App.tsx              # Root component (uses AuthContext for auth flow)
├── components/
│   ├── AuthContext.tsx   # Auth provider (login/register/logout/session check)
│   ├── AuthPage.tsx      # Login & Register screens
│   └── ...              # UI components
├── lib/
│   ├── api.ts           # API client (fetch wrapper with credentials)
│   └── ...              # Other utilities
└── styles/              # CSS

architecture.md          # Development protocol (permanent reference)
tsconfig.json            # Frontend TS config
tsconfig.server.json     # Backend TS config
vite.config.ts           # Vite + API proxy config
```

## Running the App
- `npm run dev` — Starts Express server on port 5000 with Vite dev middleware (serves both API and frontend)
- `npm run build` — Builds frontend for production

## Key Endpoints
- `GET /api/health` — Server + DB status check
- `POST /api/auth/send-code` — Send 6-digit verification code to email
- `POST /api/auth/verify-code` — Verify the code (must be done before register)
- `POST /api/auth/register` — Create account (requires verified email; accepts segments, interests, goals, content_preferences)
- `POST /api/auth/login` — Login (returns httpOnly session cookie)
- `POST /api/auth/logout` — Logout (clears session)
- `POST /api/auth/forgot-password` — Request password reset link by e-mail (always returns success to avoid e-mail enumeration)
- `POST /api/auth/reset-password` — Redefine password using single-use token (invalidates all sessions on success)
- `GET /api/auth/me` — Get current user (requires auth)
- `PATCH /api/users/profile` — Update user profile fields (segments, interests, goals, content_preferences, name)
- `GET /api/gamification/profile` — XP, level, streak, progress stats (requires auth)
- `GET /api/gamification/badges` — All badges with user's earned status (requires auth)
- `GET /api/gamification/missions` — Active daily/weekly missions with progress (requires auth)
- `POST /api/gamification/streak` — Update user's daily streak (requires auth)
- `POST /api/gamification/missions/:id/claim` — Claim completed mission reward (requires auth)
- XP/badge/mission-progress mutations are internal-only service functions (addXP, unlockBadge, recordMissionProgress); triggered by backend events in academia/community features, not by client requests

## Content CMS (Task #17)
- Six content kinds: `audio`, `video`, `reels`, `serie`, `curso`, `livro`
- Tables: `content_items` (unified), `content_episodes` (children of series), `media_assets` (uploads catalog)
- `kind='curso'` content_items link to existing `courses.id` (FK, ON DELETE SET NULL); the legacy Academia course pipeline keeps owning modules/lessons/progress, the CMS just adds discovery metadata
- Boot-time idempotent migration in `server/features/cms/migrate.ts` seeds 10 books (kind=`livro`), 5 videos migrated from legacy `mockVideos` (kind=`video`), and reflects every existing course as a CMS row; safe to re-run on every restart (`ON CONFLICT (slug) DO NOTHING` + `course_id` lookup)
- Admin endpoints under `/api/admin/cms/*` require `producer` role and enforce CHECK constraints on kind/status; episodes only attachable to `kind='serie'`
- Public endpoints under `/api/content/*` only return `status='published'` rows; segment filter uses GIN index on `segments[]`; detail bumps `view_count`
- Uploads: multer disk storage at `./uploads/<kind>/`, 200 MB cap, allow-list MIME, served back via `/uploads/*` static (cache-7d, CORP cross-origin) — swap-file for object storage later
- Admin UI lives at AdminShell → "Conteúdo": list with kind/status filters, type-aware form (cover + media uploaders, segment chips, premium pricing), series episode editor
- Client refactor: `mockBooks.ts` deleted; `AppContext` fetches `/api/content?kind=livro` on mount and merges per-user reading state (progress/favorite/notes) when refreshing

### CMS Endpoints
- `GET /api/content` — public list (filters: `kind`, `segment`, `search`, `page`, `limit`)
- `GET /api/content/:id` — public detail (published only; increments view_count)
- `GET /api/admin/cms` — admin list (filters: `kind`, `status`, `search`, `page`, `limit`) [producer]
- `GET /api/admin/cms/kinds` — list of valid kinds [producer]
- `GET /api/admin/cms/courses` — courses available for kind=`curso` linkage [producer]
- `GET /api/admin/cms/:id` — full detail incl. episodes [producer]
- `POST /api/admin/cms` — create (defaults to draft) [producer]
- `PATCH /api/admin/cms/:id` — update [producer]
- `POST /api/admin/cms/:id/publish` | `/unpublish` [producer]
- `DELETE /api/admin/cms/:id` — delete (cascades to episodes) [producer]
- `GET|POST|PATCH|DELETE /api/admin/cms/:id/episodes[/:epId]` — series episodes CRUD [producer]
- `GET|POST|PATCH|DELETE /api/admin/cms/courses/:courseId/modules[/:moduleId]` — course modules CRUD [producer]
- `POST|PATCH|DELETE /api/admin/cms/courses/:courseId/modules/:moduleId/lessons[/:lessonId]` — course lessons CRUD [producer]
- `POST /api/admin/cms/media/upload` — multipart `file` field [producer]
- `GET /api/admin/cms/media/list` — assets uploaded by current user [producer]
- **Route order matters**: in `server/features/cms/routes.ts` all fixed-prefix routes (`/kinds`, `/courses*`, `/media/*`) are declared BEFORE the `/:id` catch-all family — Express matches in registration order, so a request like `GET /media/list` would otherwise resolve to `GET /:id` with `id="media"` and return `INVALID_ID`. Keep new fixed paths above `/:id`.
- Object-level authz: producers can only mutate content they created (`created_by = req.user.id`); moderator+ override that check. Slug uniqueness retries with a numeric suffix on PG `23505`. Series cannot be deleted while episodes exist (`SERIES_HAS_EPISODES` 409). Course modules cascade-delete their lessons via the existing FK.
- VideoPage (`src/components/VideoPage.tsx`) loads videos from `/api/content?kind=video` (no more hardcoded `mockVideos`); shows a loader and an empty-state when the catalogue is empty. Reader pages key by `book.slug ?? book.id`; transcripts in `src/data/mockTranscripts.ts` are keyed by slug.
- `GET /uploads/<path>` — static file delivery for uploaded media

## Onboarding Data Flow
- WelcomeScreen → Onboarding (collects name, segments, interests) → AuthPage (3-step registration)
- Segments/interests from onboarding are passed through `App.tsx` → `AuthPage` props → `register()` call → backend persists them
- `AppContext` syncs `userData` from `AuthContext.user` so all components reflect server data
- `api.ts` supports GET, POST, PUT, PATCH, DELETE methods

## Email Verification
- Registration requires email verification via 6-digit code
- Codes expire in 10 minutes, max 5 attempts per code
- 60-second cooldown between code sends
- In development, the code is fixed as `123456` and also logged to console as fallback
- Real e-mails are sent via Resend (`server/lib/email.ts`); see "Email Sending (Resend)" section below

## Email Sending (Resend)
- Provider: Resend (`resend` npm package)
- Module: `server/lib/email.ts` exposes `sendVerificationCodeEmail`, `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendDataExportEmail`, `sendAccountDeletionEmail`
- Triggers:
  - Verification code → on `POST /api/auth/send-code`
  - Welcome → after successful `POST /api/auth/register`
  - Password reset link → on `POST /api/auth/forgot-password` (link valid 30 minutes, single-use; resetting invalidates all sessions)
  - LGPD export confirmation → after successful `POST /api/users/data-export`
  - LGPD deletion confirmation → after successful `POST /api/users/data-deletion` (sent to original e-mail before anonymization completes downstream effects)
- Failure handling: welcome / LGPD e-mails are best-effort (failures logged, never block the request). Verification e-mails block in production (`NODE_ENV=production`); password reset and verification e-mails fall back to a console log in development so links/codes are always reachable. The `POST /api/auth/forgot-password` endpoint always returns a success message (even for unknown e-mails) to avoid e-mail enumeration.
- Required env vars:
  - `resend_api_key` — Resend API key (already configured)
- Optional env vars:
  - `RESEND_FROM_EMAIL` — sender address (default: `RAIO <onboarding@resend.dev>`). The default Resend test sender only delivers to the e-mail tied to your Resend account; for general delivery, verify the `raio.app` domain in the Resend dashboard and set `RESEND_FROM_EMAIL=RAIO <noreply@raio.app>`
  - `APP_URL` — public URL used in e-mail links (default: `https://${REPLIT_DEV_DOMAIN}`)

## Gamification System
- XP Levels: Iniciante(0), Aprendiz(100), Praticante(250), Experiente(500), Mestre(1000), Mentor(2000), Líder(5000)
- 17 badges seeded across tiers: bronze, silver, gold, platinum, premium
- 6 missions seeded: 3 daily, 3 weekly
- DB tables: badges, user_badges, xp_log, missions, user_mission_progress
- users table extended with: longest_streak, last_activity_date
- Service functions: addXP(), updateStreak(), unlockBadge(), recordMissionProgress(), claimMissionReward()
- PerfilPage fetches real data from /api/gamification/profile and /api/gamification/badges

## Community System
- DB tables: forums, posts, comments, post_likes, comment_likes
- 7 forums seeded: 4 life-context-specific + 3 general (Finanças, Fé & Propósito, Geral)
- 12 sample posts with comments seeded across forums
- API endpoints under `/api/community/`:
  - `GET /forums` — List all forums with post counts
  - `GET /forums/:id/posts` — Paginated posts for a forum (optional auth for user_liked)
  - `GET /posts` — All posts paginated (optional auth)
  - `POST /posts` — Create post (requires auth, needs forum_id + content)
  - `GET /posts/:id` — Post detail with threaded comments (optional auth)
  - `POST /posts/:id/like` — Toggle like on post (requires auth)
  - `POST /posts/:id/comments` — Add comment (requires auth)
  - `POST /comments/:id/like` — Toggle like on comment (requires auth)
- `optionalAuth` middleware: attaches `req.user` if session cookie exists, but doesn't block unauthenticated requests
- Frontend: ComunidadePage loads forums/posts from API, supports real comments panel with submit + like
- Feature files: `server/features/community/service.ts`, `server/features/community/routes.ts`

## Dashboard System
- `GET /api/dashboard` — Aggregated personalized payload (requires auth)
  - Greeting with real user name + segments
  - Gamification stats: level, levelTitle, xp, streak, longestStreak, xpForNextLevel, levelProgress
  - Weekly XP (sum of XP earned in current week)
  - Completed courses count
  - Courses in progress (with progress %, completed/total lessons)
  - Recommended courses (filtered by user's life context segments, backfilled with popular courses)
  - Recent community posts from relevant forums
  - Active missions with current progress
- Frontend: HomePage fetches /api/dashboard and renders: stats cards (streak, level, weekly XP), level progress bar, courses in progress, recommended courses, daily missions, active discussions
- Feature files: `server/features/dashboard/service.ts`, `server/features/dashboard/routes.ts`

## LGPD Compliance & Analytics
- DB tables: `lgpd_requests` (tracks export/deletion requests), `analytics_events` (server-side event log)
- `POST /api/users/data-export` — Exports all user data as JSON (profile, progress, posts, badges, xp, missions, analytics); creates lgpd_request record
- `POST /api/users/data-deletion` — Anonymizes user PII (name → "Usuário Removido", email → randomized), marks posts/comments as removed, deletes progress/badges/likes, clears sessions
- Backend event tracking: `trackEvent(userId, eventName, metadata)` in `server/features/analytics/service.ts`
  - Events tracked: user_registered, user_login, post_created, comment_created, course_enrolled, lesson_completed, course_completed, lgpd_data_export, lgpd_data_deletion_requested
- Cookie consent: Existing `ConsentBanner` component with necessary/analytics/marketing/personalization toggles (localStorage-persisted)
- Privacy policy: `PrivacyPolicyPage` accessible from profile → tab "privacy" in App.tsx
- Profile LGPD section: "Exportar meus dados" (downloads JSON) and "Excluir minha conta" (confirmation dialog + anonymization) buttons in PerfilPage
- Feature files: `server/features/lgpd/service.ts`, `server/features/lgpd/routes.ts`, `server/features/analytics/service.ts`

## Direct Messaging
- DB tables: `conversations` (user_a_id < user_b_id with UNIQUE constraint to enforce one canonical conv per pair), `messages` (with read_at)
- `GET /api/messages/conversations` — List user's conversations with last message + unread_count
- `POST /api/messages/conversations` — Create or fetch existing conversation `{user_id}` (idempotent; rejects self)
- `GET /api/messages/conversations/:id/messages` — Paginated messages with sender_name, plus other_user_id/name (membership enforced)
- `POST /api/messages/conversations/:id/messages` — Send message `{content}` (membership enforced; empty content rejected)
- `POST /api/messages/conversations/:id/read` — Mark all incoming messages as read
- `GET /api/messages/unread-count` — Count of conversations with at least one unread message (for nav badge)
- `GET /api/messages/users/search?q=` — Search users by name (prefix) or exact email; excludes self

## Admin & Moderation
- Roles (column `users.role`): `client` (default) < `producer` < `moderator` < `admin` (numeric hierarchy enforced by `requireRole(minRole)` middleware in `server/middleware/auth.ts`)
- Bootstrap: env var `ADMIN_EMAILS` (comma-separated emails) promotes those accounts to `admin` on every server boot (idempotent)
- Soft hide: `posts.is_hidden`/`comments.is_hidden` (+ `hidden_at`/`hidden_by`); community feed and post detail filter `is_hidden = FALSE`. No hard deletes — moderators can restore.
- `GET /api/admin/overview` — Aggregate metrics (users by role, premium, content counts, posts/comments visible vs hidden, last-7d) — moderator+
- `GET /api/admin/users?search=&role=&segment=&premium=&page=&limit=` — Paginated user list — moderator+
- `PATCH /api/admin/users/:id/role` — Change a user's role `{role}` — admin only; blocks self-demotion
- `GET /api/admin/moderation/posts?status=visible|hidden|all` — List posts for moderation — moderator+
- `GET /api/admin/moderation/comments?status=visible|hidden|all` — List comments for moderation — moderator+
- `POST /api/admin/moderation/posts/:id/hide` and `/restore` — Toggle post visibility — moderator+
- `POST /api/admin/moderation/comments/:id/hide` and `/restore` — Toggle comment visibility — moderator+
- Frontend: dedicated `<AdminShell>` (full-screen takeover at `currentTab="admin"`, hides `Navigation`/`DesktopSidebar`/`TopNavbar`); sidebar entry only visible when `userHasRole(user, "moderator")`. Pages in `src/components/admin/`: `AdminOverviewPage`, `AdminUsersPage`, `AdminModerationPage`.
- Frontend: `ConversasPage` (real DMs with polling: 15s convs, 5s messages, mark-read on open), `useUnreadMessages` hook (polls 20s + on visibility) feeding badge in `Navigation` and `TopNavbar`
- LGPD: account deletion anonymizes message contents to `[mensagem removida por solicitação LGPD]` (preserves conversation history for the other party)
- Feature files: `server/features/messages/service.ts`, `server/features/messages/routes.ts`, `src/components/ConversasPage.tsx`, `src/components/hooks/useUnreadMessages.ts`

## Development Rules
1. No business logic in frontend
2. No API keys or secrets in client code
3. Features organized by behavior in `server/features/`
4. Always consult `architecture.md` before starting work
5. Break tasks into small, specific units
6. Research existing code before implementing

## Design System & UI/UX
- Canonical tokens live in `src/design-tokens.ts` and are exposed as CSS vars `--raio-*` in `src/styles/globals.css`. Components consume `var(--raio-*)` (via inline `style`) or Shadcn semantic vars (`bg-card`, `text-foreground`).
- Avoid literal colors (`#22C55E`, `bg-green-500`) in new code; use tokens. Neutral overlays (`black/30`, `white/90`) are fine.
- Placeholder buttons must be `disabled` + `aria-disabled` + `title="Em breve"` — never a bare `toast.info("Em breve!")`.
- Icon-only buttons require `aria-label`; active sidebar nav item uses `aria-current="page"`.
- Full audit + inventory + open issues: `docs/ui-ux-audit.md` (delivered in Task #18).
- Shadcn `--primary`/`--accent`/`--warning` semantic vars currently still map to legacy `--raio-sage/mint/gold/coral-*`. Removing the legacy palettes is a future migration (kept compatibility-only in `globals.css` and `design-tokens.ts`).
