# RAIO Platform
RAIO is a digital platform designed to strengthen families by providing transformative content, an engaged community, and practical resources across various life contexts.

## Run & Operate
- `npm run dev`: Starts the Express server (port 5000) with Vite dev middleware for both API and frontend.
- `npm run build`: Builds the frontend for production.
- **Environment Variables**:
    - `resend_api_key`: Resend API key for email sending.
    - `RESEND_FROM_EMAIL`: (Optional) Sender email address (default: `RAIO <onboarding@resend.dev>`).
    - `APP_URL`: (Optional) Public URL for email links (default: `https://${REPLIT_DEV_DOMAIN}`).
    - `ADMIN_EMAILS`: Comma-separated emails for initial `admin` role assignment.

## Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Vite
- **Backend**: Express.js, TypeScript, tsx
- **Database**: PostgreSQL
- **ORM**: _Populate as you build_
- **Validation**: _Populate as you build_
- **Build Tool**: Vite
- **Runtime**: Node.js (via tsx)
- **Authentication**: Session-based with secure cookies
- **Email**: Resend

## Where things live
- `server/`: Backend source code.
    - `server/index.ts`: Backend entry point.
    - `server/db/`: Database connection and schema.
    - `server/features/`: Feature-specific logic (routes, services, validation).
- `src/`: Frontend source code.
    - `src/App.tsx`: Root React component.
    - `src/components/AuthContext.tsx`: Authentication provider.
    - `src/lib/api.ts`: API client.
    - `src/design-tokens.ts`: Canonical UI design tokens.
    - `src/styles/globals.css`: Global CSS and Tailwind directives.
- `architecture.md`: Full development protocol (source of truth for architectural guidelines).
- `tsconfig.json`: Frontend TypeScript configuration.
- `tsconfig.server.json`: Backend TypeScript configuration.
- `vite.config.ts`: Vite and API proxy configuration.

## Architecture decisions
- **Thin Client, Fat Server**: All business logic, authentication, data access, and security enforcement reside on the Express.js backend; the frontend primarily captures user intent.
- **Feature-based Organization**: Backend features are organized into `server/features/` folders, each containing related routes, services, and validation.
- **Idempotent Migrations/Seeds**: Database seed scripts (e.g., for CMS, home feed) are designed to be idempotent, allowing safe re-execution on server restarts.
- **Soft Deletes for Moderation**: Instead of hard-deleting, posts and comments are soft-hidden (`is_hidden` flag) to allow moderator restoration.
- **Role-Based Access Control**: A numeric role hierarchy (`client` < `producer` < `moderator` < `admin`) is enforced by middleware for administrative functions.

## Product
- **User Segmentation**: Supports 5 life contexts (Solteiro, Namoro, Noivos, Casados, Pais) for tailored content and experiences.
- **Content Management System (CMS)**: Manages six content types (`audio`, `video`, `reels`, `serie`, `curso`, `livro`) with admin tools for creation, publishing, and media uploads.
- **Gamification**: Includes XP, levels, badges, missions (daily/weekly), and streaks to encourage engagement.
- **Community Features**: Forums, posts, comments, and like functionality for user interaction.
- **Personalized Dashboard**: Aggregates user-specific data like gamification stats, course progress, and recommended content.
- **Direct Messaging**: Real-time private conversations between users with unread counts and SSE for instant updates.
- **LGPD Compliance**: Features for data export and anonymization of user data upon deletion request.
- **Admin & Moderation Tools**: Overview metrics, user role management, and content visibility toggling.

## User preferences
_Populate as you build_

## Gotchas
- **Route Order in Express**: In `server/features/cms/routes.ts` (and similar), fixed-prefix routes must be declared *before* `/:id` catch-all routes to ensure correct matching.
- **Email Verification Cooldown**: There's a 60-second cooldown between sending verification codes.
- **Password Reset Always Returns Success**: The `POST /api/auth/forgot-password` endpoint always returns a success message to prevent email enumeration, even if the email is not registered.
- **Content Deletion Cascades**: Deleting a series cascades to its episodes; deleting a course module cascades to its lessons.
- **Home Feed Card Visibility**: `GET /api/home-feed` will hide cards linked to `content_items` that are not `published`. Static promo cards (no `content_item_id`) are always visible.

## Pointers
- **Development Protocol**: `architecture.md` (MUST be consulted before every sprint).
- **UI/UX Audit**: `docs/ui-ux-audit.md` for design system and UI/UX issues.
- **External Documentation**:
    - [React](https://react.dev/)
    - [Express.js](https://expressjs.com/)
    - [PostgreSQL](https://www.postgresql.org/docs/)
    - [Tailwind CSS](https://tailwindcss.com/docs)
    - [Vite](https://vitejs.dev/)
    - [Resend](https://resend.com/docs)