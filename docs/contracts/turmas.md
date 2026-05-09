# Turmas (mini-Skool — Task #99)

Contratos consolidados do produto Turmas. Mexa aqui antes de tocar em `server/features/courses/`, `server/features/turmas/` ou `src/components/turmas/`.

## Visão geral

RAYO ressignificou "Academia/Marketplace" como **Turmas**: cada `course` agora pode operar como uma comunidade Skool-style com landing rica e área de membros. UI rebatizada (nav, sidebar, manifest, label "Catálogo de turmas"); o **id interno do tab continua `"academia"`** pra não quebrar `AppContext` / `App.tsx` switch (rename é UX-only).

- **Tabela `courses` estendida**: `subtitle`, `who_for` (jsonb[]), `what_you_get` (jsonb[]), `how_it_works` (text), `hero_cover_url` — todas idempotentes em `server/db/schema.ts`. **NÃO** crie tabela `classes` separada — Turma == Course.
- **Tabela nova `class_interests`**: captura "Em breve" (modal sem checkout). `(user_id nullable, course_id, name, email, message, created_at)`. Dedupe 24h por (user OU email)+course no service.
- **Coluna nova `posts.class_id`** (FK opcional pra `courses`): comunidade escopada por turma. `getAllPosts` SEM `class_id` filtra `class_id IS NULL` (não vaza posts de turma no feed global). Com `?class_id=N`, filtra estritamente. `createPost` exige matrícula em `user_course_progress` quando `class_id` setado (defesa em profundidade no service + validação no router).
- **Alias `/api/turmas`** monta o mesmo router de `/api/courses` (espelho 1:1). Endpoints novos: `GET /:id/landing` (público), `POST /:id/interest` (anônimo OK, rate 5/h por user/IP), `GET /:id/members` (matriculado OU moderator+).
- **TurmaShell** (`src/components/turmas/TurmaShell.tsx`): container ativado quando `isInCourseDetail=true`. Não-membro → renderiza `TurmaLandingPage` pura com `JoinInterestModal`. Membro → header + 4 tabs (Aulas via `CourseDetailPage` legado, Comunidade via `TurmaCommunityTab` que reusa endpoints `/api/community/posts` com `class_id`, Membros via `TurmaMembersTab`, Sobre = landing embedded).

## Gotchas

### Turmas == Courses
Nunca crie tabela `classes` separada — o produto rebrand-ou Academia em Turmas, mas o schema continua `courses` + `user_course_progress`. Endpoints `/api/turmas/*` são alias do mesmo router de `/api/courses/*` (mount em `server/index.ts`). Sentinel de papel: matrícula = `user_course_progress(user_id, course_id)`.

### Posts com `class_id`
`class_id` em `posts` é **OPCIONAL**. Sem `class_id`, `getAllPosts` filtra `class_id IS NULL` por padrão (NÃO vaza posts de turma na Comunidade global). Com `?class_id=N`, filtra estritamente. `createPost` chama `user_course_progress` pra exigir matrícula quando `class_id` setado — router valida E service revalida. Se você adicionar uma rota nova de listagem de posts, replique esse contrato OU o feed global vai vazar conteúdo privado de turma.

### Captura de interesse
`POST /api/turmas/:id/interest` aceita user anônimo (`req.user?.id` opcional). Dedupe 24h é por **(user_id OU email)+course** — não confie só em email pra evitar spam. Rate-limit 5/h é via `keyByUser` no router (cai pra IP quando anônimo). Sem checkout/Stripe ainda.
