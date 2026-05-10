# RAYO Platform — Architecture & Development Protocol

> This document is the permanent development protocol for the RAYO platform
> (anteriormente RAIO; renomeado em Maio/2026 — Task #163).
> It MUST be consulted before starting any sprint or task.

---

## 1. Core Architecture: Thin Client, Fat Server

### Rule
The frontend controls NOTHING. It only captures user intent (clicks, form inputs, navigation) and sends it to the backend. The backend processes everything and returns the response.

### What goes where

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Frontend (thin client)** | Render UI, capture user interactions, call API endpoints | Show a button, send `POST /api/auth/login`, display response |
| **Backend (fat server)** | All business logic, data validation, authorization, database access | Validate credentials, hash passwords, check permissions, query DB |

### Forbidden on the frontend
- API keys, secrets, or tokens (except session tokens stored in httpOnly cookies)
- Business logic (pricing calculations, permission checks, data transformations)
- Direct database queries
- Authorization/role checks that gate access to features
- Sensitive user data processing

### Forbidden on the backend
- HTML/CSS/UI rendering logic
- Frontend state management
- Browser-specific APIs

---

## 2. Folder Structure: Organized by Behavior

```
/
├── server/                          # Backend (Express.js + TypeScript)
│   ├── index.ts                     # Server entry point
│   ├── db/
│   │   ├── index.ts                 # Database connection pool
│   │   └── schema.ts                # Schema creation/migration
│   ├── middleware/
│   │   ├── security.ts              # Helmet, CORS, rate limiting
│   │   ├── auth.ts                  # Session validation middleware
│   │   └── errorHandler.ts          # Centralized error handling
│   ├── features/
│   │   ├── health/
│   │   │   └── routes.ts            # GET /api/health
│   │   ├── auth/
│   │   │   ├── routes.ts            # POST /api/auth/login, /register, /logout
│   │   │   ├── service.ts           # Auth business logic
│   │   │   └── validation.ts        # Input validation
│   │   ├── courses/
│   │   │   ├── routes.ts            # CRUD endpoints for courses
│   │   │   ├── service.ts           # Course business logic
│   │   │   └── validation.ts        # Input validation
│   │   ├── community/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   └── validation.ts
│   │   └── gamification/
│   │       ├── routes.ts
│   │       ├── service.ts
│   │       └── validation.ts
│   └── utils/
│       ├── response.ts              # Standardized API responses
│       └── logger.ts                # Server-side logging
│
├── src/                             # Frontend (React + TypeScript)
│   ├── App.tsx                      # Root component
│   ├── components/                  # UI components
│   ├── lib/                         # Frontend utilities
│   └── styles/                      # CSS/Tailwind
│
├── architecture.md                  # THIS FILE — development protocol
├── replit.md                        # Project overview for AI context
├── package.json
├── tsconfig.json                    # Frontend TypeScript config
├── tsconfig.server.json             # Backend TypeScript config
└── vite.config.ts                   # Vite configuration
```

### Dev server architecture decision
Express is the single entry point on port 5000. In development, Vite runs in **middleware mode** — mounted inside Express via `vite.middlewares`. This means one process serves both API routes and the frontend. There is no separate Vite dev server and no `/api` proxy needed. In production, Express serves the static build output directly.

### Feature isolation rule
Each feature lives in its own folder under `server/features/`. Within each feature folder:
- `routes.ts` — Express route definitions (thin: parse request, call service, return response)
- `service.ts` — Business logic (thick: validation, data processing, DB queries)
- `validation.ts` — Input validation schemas

If a bug is in the authentication flow, you ONLY touch `server/features/auth/`. You never touch `server/features/courses/`. This isolation prevents "fix one thing, break another."

---

## 3. Development Methodology

### 3.1 Break work into small tasks
Never give the AI a whole project at once. Break it into small, well-defined tasks that fit comfortably in the context window. Each task should:
- Be completable in one session
- Have clear acceptance criteria
- Touch a limited number of files

### 3.2 Research before implementing
Before writing any code:
1. **Search the project** — Find existing components, hooks, utilities that can be reused. Never recreate what already exists.
2. **Search documentation** — Find proven patterns for the implementation. Never reinvent the wheel.

### 3.3 Specify exact files
Every task must list exactly which files to create or modify. No guessing. Example:
- Create `server/features/auth/routes.ts`
- Create `server/features/auth/service.ts`
- Modify `server/index.ts` (add auth routes)

### 3.4 Isolate by behavior
Each page/feature gets its own folder. Within that folder, sub-behaviors get sub-folders. If the problem is in "password recovery," the AI only looks at the password recovery folder.

### 3.5 No code duplication
Before creating a new component or utility:
1. Search the codebase for existing similar code
2. If it exists, import and reuse it
3. If it needs modification, extend it — don't copy it

---

## 4. Security Rules

### Backend security
- All user input is validated and sanitized on the server
- Passwords are hashed with bcrypt (never stored in plaintext)
- Sessions use secure, httpOnly cookies
- Rate limiting on authentication endpoints
- SQL queries use parameterized statements (never string interpolation)
- CORS is configured to allow only the frontend origin

### Frontend security
- No API keys or secrets in client code
- No business logic that can be manipulated via browser DevTools
- Session tokens are httpOnly cookies (not accessible via JavaScript)
- All sensitive operations go through the API

### Environment variables
- All secrets stored in Replit's environment variable system
- Never hardcoded in source code
- Never committed to version control
- Backend reads them via `process.env`

---

## 5. API Design Standards

### Response format
All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message"
  }
}
```

### HTTP status codes
- `200` — Success
- `201` — Created
- `400` — Bad request (validation error)
- `401` — Unauthorized (not logged in)
- `403` — Forbidden (logged in but no permission)
- `404` — Not found
- `500` — Internal server error

### Route naming
- `POST /api/auth/login` — not `/api/login`
- `GET /api/courses` — not `/api/getCourses`
- `GET /api/courses/:id` — not `/api/course?id=123`

---

## 6. Database Conventions

### Technology
- Replit's built-in PostgreSQL
- Connection via `DATABASE_URL` environment variable
- Connection pooling via `pg.Pool`

### Naming
- Tables: `snake_case`, plural (`users`, `courses`, `user_badges`)
- Columns: `snake_case` (`created_at`, `password_hash`)
- Primary keys: `id` (UUID or SERIAL)
- Foreign keys: `<table_singular>_id` (`user_id`, `course_id`)

### Required columns
Every table must have:
- `id` — Primary key
- `created_at` — Timestamp, default `NOW()`
- `updated_at` — Timestamp, default `NOW()`, updated on modification

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Vite |
| Backend | Express.js, TypeScript, tsx (runtime) |
| Database | PostgreSQL (Replit built-in) |
| Auth | Session-based with secure cookies |
| Deployment | Replit Deployments |
