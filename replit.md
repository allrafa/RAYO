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
│   └── dashboard/       # Personalized dashboard aggregation
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
- `GET /api/auth/me` — Get current user (requires auth)
- `PATCH /api/users/profile` — Update user profile fields (segments, interests, goals, content_preferences, name)
- `GET /api/gamification/profile` — XP, level, streak, progress stats (requires auth)
- `GET /api/gamification/badges` — All badges with user's earned status (requires auth)
- `GET /api/gamification/missions` — Active daily/weekly missions with progress (requires auth)
- `POST /api/gamification/streak` — Update user's daily streak (requires auth)
- `POST /api/gamification/missions/:id/claim` — Claim completed mission reward (requires auth)
- XP/badge/mission-progress mutations are internal-only service functions (addXP, unlockBadge, recordMissionProgress); triggered by backend events in academia/community features, not by client requests

## Onboarding Data Flow
- WelcomeScreen → Onboarding (collects name, segments, interests) → AuthPage (3-step registration)
- Segments/interests from onboarding are passed through `App.tsx` → `AuthPage` props → `register()` call → backend persists them
- `AppContext` syncs `userData` from `AuthContext.user` so all components reflect server data
- `api.ts` supports GET, POST, PUT, PATCH, DELETE methods

## Email Verification
- Registration requires email verification via 6-digit code
- Codes expire in 10 minutes, max 5 attempts per code
- 60-second cooldown between code sends
- TODO: Connect Resend for actual email delivery (codes currently logged to server console)

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

## Development Rules
1. No business logic in frontend
2. No API keys or secrets in client code
3. Features organized by behavior in `server/features/`
4. Always consult `architecture.md` before starting work
5. Break tasks into small, specific units
6. Research existing code before implementing
