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
    - `CONTACT_EMAIL`: destinatário do formulário público `/contato` (default: `suporte@rayo.app.br`). Alias legado `CONTATO_TO_EMAIL` ainda é aceito como fallback.
    - **Bunny Stream (opcional, Task #86)** — sem essas vars o uploader de vídeo no CMS fica desabilitado com mensagem "Configurar Bunny no admin antes de usar"; conteúdos com `external_url` continuam funcionando:
        - `BUNNY_STREAM_LIBRARY_ID`: ID numérico da Stream Library no painel Bunny.
        - `BUNNY_STREAM_API_KEY`: AccessKey da library (Stream → Library → API).
        - `BUNNY_STREAM_CDN_HOSTNAME`: hostname do pull zone (ex `vz-abc123.b-cdn.net`).
        - `BUNNY_STREAM_WEBHOOK_SECRET` (**obrigatória** pra webhook funcionar): segredo HMAC SHA256 configurado em Stream → Library → Webhook. Sem ela `/api/webhooks/bunny` rejeita 503.
    - **OAuth (opcional, Task #69 + #72)** — sem essas vars os botões aparecem como "Em breve". **OAuth Google e Facebook só funcionam no domínio de produção `https://rayo.app.br`** (no preview/dev o login social fica desabilitado de propósito; use email/senha):
        - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: credenciais OAuth 2.0 do Google Cloud.
        - `GOOGLE_REDIRECT_URI` (**obrigatória** para habilitar Google): deve ser exatamente `https://rayo.app.br/api/auth/google/callback` e estar registrada como Authorized redirect URI no Google Cloud Console. Sem essa var a estratégia não é registrada (log de erro no boot) e o botão fica como "Em breve".
        - `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`: App ID e App Secret do app criado em [Facebook Developers](https://developers.facebook.com) (produto "Facebook Login").
        - `FACEBOOK_REDIRECT_URI` (**obrigatória** para habilitar Facebook): deve ser exatamente `https://rayo.app.br/api/auth/facebook/callback` e estar registrada como Valid OAuth Redirect URI nas configurações de Facebook Login. Sem essa var a estratégia não é registrada e o botão fica como "Em breve".

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
- **Bunny Stream para vídeo (Task #86)**: vídeos do CMS (`kind=video|reels`) sobem direto pro Bunny Stream. DB grava o sentinel `bunny://<libraryId>/<videoGuid>` em `content_items.video_external_id` + `video_provider='bunny'`; webhook de transcode preenche `video_status`, `video_duration_sec`, `video_thumbnail_url`. Em leitura, o servidor adiciona `video_embed_url`/`video_hls_url` derivados (`withResolvedBunnyFields`). `media_url`/`external_url` legados continuam suportados como fallback.
- **Image Optimization**: Uploaded images are optimized (resized, re-encoded) using `sharp` before storage.

## Product
- **User Authentication**: Register, login, logout, password reset, profile management, email verification.
- **Content Management System (CMS)**: Manages six content kinds (audio, video, reels, serie, curso, livro) with admin tools.
- **Gamification**: XP levels, badges, missions, and streaks.
- **Community Forums**: Forums, posts, comments, likes with moderation.
- **Personalized Dashboard**: Aggregates gamification stats, course progress, recommendations, and community posts.
- **Direct Messaging**: Private conversations with real-time updates. Mensagens fora do ar disparam notificação por e-mail (rate-limit 1/h por conversa) quando o destinatário não tem SSE ativo e está idle há >10min. **Mensagens v2 (Task #79)**: arquivar/desarquivar e excluir per-participante (tabela `conversation_user_state`), lista única com seção colapsável "Arquivadas (N)" no rodapé (sem abas), swipe horizontal estilo WhatsApp (←arquivar / →excluir) via `motion`, menu `...` no hover desktop, avatares reais nos cards e header (JOIN em `users.avatar_url`), envio de **foto** (input file → `POST /api/messages/conversations/:id/attachments` com middleware DM próprio + lightbox in-app na visualização) e **áudio** (gravação client via `MediaRecorder` em webm/opus, auto-stop em 120s, mesmo endpoint). Mensagens agora têm `kind` (`text|image|audio`) + `attachment_url` (`objstore://...`) + `attachment_meta` (mime/size/duration). Excluir marca `cleared_at` para esconder histórico anterior do lado de quem excluiu — se a outra pessoa enviar nova mensagem, a conversa reabre só com o que vier depois do corte.
- **Notificações**: Tabela `notifications` (kind/title/body/link/payload) feed pelo sino no header (`NotificationBell`). DM gera entrada com kind `message`. SSE (`notification:new` / `notification:unread`) atualiza badge + dropdown sem polling. Endpoints em `/api/notifications`.
- **LGPD Compliance**: Data export and account deletion features.
- **Admin & Moderation**: Tools for user management, content moderation, and platform metrics.
- **Comunidade & Perfil estilo Reddit (Task #92)**: posts agora exigem seleção de comunidade (`forum_id` obrigatório), aceitam até 4 fotos persistentes (sentinels `objstore://posts/<file>`) e **vídeo é bloqueado server-side** (mime allowlist `image/jpeg|png|webp` ≤5 MB no `/api/community/posts/attachments`). Comunidades viraram subreddits: `forums.slug` único + `member_count` (derivado de `forum_subscriptions`), endpoint `POST /api/community/forums/:id/subscribe {subscribed:bool}` e `GET /api/community/forums/by-slug/:slug`. Cards de post mostram `c/<slug>` clicável (dispara `rayo:open-community` + `sessionStorage["rayo-pending-community-slug"]`). Deep-link `/c/:slug` é **autenticado** (NÃO em `getPublicPageFromUrl`) — captura o slug em `App.tsx`, troca pra aba Comunidade. Perfis públicos `/u/:id` reformulados via `UserProfilePage` com header (avatar+karma total+seguidores+segments), botão Seguir/Seguindo (`POST /api/users/:id/follow {follow:bool}`, `GET /api/users/:id/follows`) e tabs **Posts/Comentários/Comunidades/Sobre**. Endpoints: `GET /api/community/users/:id/{posts,comments,communities,karma}`. Tabelas novas: `forum_subscriptions(user_id, forum_id)` e `user_follows(follower_id, following_id)`.
- **Site Público / Marketing (Task #70)**: 9 páginas públicas servidas SEM autenticação — `/recursos`, `/como-funciona`, `/empresa`, `/contato`, `/faq`, `/imprensa`, `/blog`, `/blog/:slug` e (mantidos) `/privacy`, `/terms`. CSS isolado em `src/styles/marketing-rayo.css` (todo prefixado por `.marketing-page` via `PublicLayout`). Roteamento detectado em `App.tsx` (`getPublicPageFromUrl`) ANTES dos gates de auth — a URL é a única fonte de verdade, full-reload nos links é OK.
- **Blog público**: posts são `content_items` com `kind='artigo'` (sem nova tabela). Endpoints públicos `GET /api/blog/posts` (lista) e `GET /api/blog/posts/:slug` (detalhe + view_count++). Admin usa o CMS existente (kind "Artigo"). Renderização do corpo em Markdown safe sem `dangerouslySetInnerHTML` (`src/components/marketing/markdown.tsx`).
- **Formulário /contato**: `POST /api/contato` validado (nome 2–120, email regex, assunto 2–120, mensagem 10–5000), rate-limited a 3/h por IP, dispara e-mail HTML+texto via `sendContatoEmail` (Resend) para `CONTATO_TO_EMAIL`. Quando Resend não está configurado em dev, responde `{ok:true, delivered:false}` em vez de erro.
- **SEO público (Task #70)**: `/sitemap.xml` lista todas as 10 páginas públicas + slugs de artigos publicados (lê de `content_items` com cache HTTP de 1h). `/robots.txt` libera todas as páginas públicas e bloqueia `/api/`, `/admin`, `/perfil`, `/conversas`, `/u/`. Cada página marketing usa `useSeoMeta({title, description, canonical, ogImage?})` para hidratar `<title>`, meta description, canonical e OpenGraph/Twitter no client.

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
- **CMS kind 'artigo'**: `content_items.kind` aceita `artigo` desde Maio/2026 (Task #70). A constraint `content_items_kind_check` é re-criada idempotentemente no boot (`DROP + ADD`) se ainda não tiver `artigo`. O blog público filtra por `kind='artigo' AND status='published' AND slug IS NOT NULL`. NÃO use uma tabela `blog_posts` separada.
- **Marketing CSS scope**: `src/styles/marketing-rayo.css` tem todos os seletores prefixados por `.marketing-page` para não vazar nos demais layouts. NÃO crie regras globais (sem prefixo) nesse arquivo.
- **Public route gate (Task #70)**: `App` (default export em `src/App.tsx`) chama `getPublicPageFromUrl()` ANTES de instanciar `AuthProvider` e renderiza `<PublicShell />` direto quando o path é uma página pública. Isso garante que crawlers e visitantes anônimos NUNCA disparem `GET /api/auth/me` em first paint. Para adicionar nova rota pública, atualize `getPublicPageFromUrl`, `PublicPage` e o `switch` em `PublicShell`.
- **Auth deep links (Task #70)**: `/login` e `/cadastro` são entradas diretas no fluxo de auth — `getInitialAuthIntent()` em `App.tsx` mapeia o path para `preAuthStage='auth'` + `authStartMode` correto, pulando welcome/onboarding. CTAs do site marketing devem usar essas URLs (não `/?auth=...`).
- **Blog read cache**: `GET /api/blog/posts` e `GET /api/blog/posts/:slug` enviam `Cache-Control: public, max-age=300, s-maxage=300` (5min). Cuidado ao mudar — view_count++ ainda corre no servidor a cada hit que chega na origem.
- **DM per-side state (Task #79)**: arquivar/excluir vivem em `conversation_user_state(conversation_id, user_id, archived_at, deleted_at, cleared_at)`, NUNCA em `conversations` (que é compartilhada). `listConversations(userId, scope)` filtra por `s.deleted_at IS NULL` e separa active/archived por `s.archived_at`. `getMessages` e `getUnreadConversationCount` respeitam `cleared_at` (linhas anteriores ao corte ficam invisíveis para esse usuário). `sendMessage` roda `reopenConversation(recipientId)` no destinatário e `getOrCreateConversation` reabre o lado do solicitante para que mensagens novas sempre apareçam para os dois.
- **DM archive contract**: NÃO existe rota `/unarchive` separada. Use `POST /api/messages/conversations/:id/archive` com body `{archived: true|false}` para alternar — o frontend chama `{archived: false}` ao clicar numa conversa arquivada (move pro topo das ativas e abre).
- **DM attachments (Task #79)**: `POST /api/messages/conversations/:id/attachments` usa middleware **próprio** (multer memory) em `server/features/messages/routes.ts` — NÃO o `uploadMiddleware` do CMS. Limites estritos validados ANTES de gravar em Object Storage: imagem (jpeg/png/webp/gif) ≤5 MB, áudio (webm/ogg/mp4/mpeg/wav/x-m4a) ≤10 MB e duração ≤120 s (medida server-side via `music-metadata`). Membership da conversa é verificada antes do parse pra não gastar bytes/banda em conversas inacessíveis. Devolve `{kind, attachment_url: "objstore://messages/<kind>/<file>", attachment_meta: {mime, size, name, duration_sec?}}`. O cliente envia em seguida `POST /messages` com `kind`, `attachment_url`, `attachment_meta`. `service.sendMessage` (defesa em profundidade) exige: prefix exato `objstore://messages/<kind>/` (bloqueia URL externa e chaves de outros namespaces como CMS), `attachment_meta.mime` presente E pertencente à mesma allowlist do endpoint de upload. URLs são resolvidas via `resolveStoredMediaUrl` em leitura.
- **DM swipe gestures**: `motion/react` (já no bundle). Threshold de 80 px. Arrastar p/ **esquerda** revela "Arquivar" (lado direito, âmbar). Arrastar p/ **direita** revela "Excluir" (lado esquerdo, vermelho) → AlertDialog confirma. Tap no card depois de revelado fecha o swipe em vez de abrir.
- **DM lista única + Arquivadas colapsadas (Task #79)**: `ConversasPage` carrega ambos os escopos (`active` + `archived`) em paralelo e mostra UMA lista. As ativas vêm em cima; abaixo, uma seção colapsável "Arquivadas (N)" (default fechada). Clicar numa conversa arquivada **desarquiva e abre** (chama `/archive {archived:false}` e move pro topo das ativas). NÃO use Tabs. Pré-visualização de e-mail para áudio inclui duração: `🎤 Áudio (mm:ss)`.
- **OG default image**: `useSeoMeta` injeta `https://rayo.app.br/og-default.png` quando a página não passa `ogImage`. Adicione esse arquivo nos assets antes do deploy de produção.
- **Bunny upload contract (Task #86)**: `POST /api/admin/bunny/content/:id/upload` (producer+, multipart, campo `file`) cria o slot no Bunny e sobe os bytes em uma única chamada. Limites estritos: mime allowlist (`video/mp4|quicktime|webm|x-matroska`), ≤5 GB, rate-limit 20/h por usuário, ownership/membership checada ANTES do parse multer. Multer usa **disk storage** em `os.tmpdir()/rayo-bunny-uploads` (5 GB em RAM seria suicídio); arquivos são removidos no `finally`. Frontend dispara via XHR pra ter `upload.onprogress` real (`BunnyVideoUploader` em `AdminCmsForm.tsx`). Para itens novos, exige salvar antes (precisa de `contentId > 0`).
- **Bunny webhook (Task #86)**: `POST /api/webhooks/bunny` é montado **fora** do `optionalAuth` (sem sessão; Bunny é quem chama). Validação por HMAC SHA256 do raw body com `BUNNY_STREAM_WEBHOOK_SECRET`, headers aceitos `X-Bunny-Signature`/`X-Webhook-Signature`/`Authorization` (prefixo `sha256=` opcional). Sem secret configurado, devolve 503. Aceita payloads `{VideoGuid, Status}` e snake_case. Em `Status=4` (ready) puxa duração/thumb via `getVideo` e dispara notificação `kind=video_status` pro `created_by` do conteúdo. Webhooks pra GUIDs órfãos (vídeos criados manualmente no painel) respondem 200 pra Bunny não reentregar.
- **Bunny sentinel format**: `bunny://<libraryId>/<videoGuid>`. `parseBunnyRef` aceita o sentinel completo OU só o GUID puro (cai pro library_id da config). NÃO grave URLs cruas (`https://iframe.mediadelivery.net/...`) em `video_external_id` — quebra o resolver. URLs públicas só são geradas em leitura por `withResolvedBunnyFields` (embed customizado com `primaryColor=C8553D` = `--rayo-terra-500`).
- **Posts só aceitam fotos (Task #92 — INVIOLÁVEL)**: `POST /api/community/posts/attachments` usa multer **próprio** (memoryStorage, NÃO o `uploadMiddleware` do CMS) com fileFilter mime restrito a `image/jpeg|png|webp` e cap 5 MB. Vídeo é bloqueado **com código de erro explícito** `VIDEO_NOT_ALLOWED` (HTTP 415) — qualquer mime `video/*` recusado no fileFilter ANTES de tocar disco/RAM, e o handler de erro do multer reconhece esse caso pra retornar a mensagem específica. `service.createPost` valida que cada item de `images` é string que começa com prefixo exato `objstore://posts/` (defesa em profundidade — bloqueia URL externa, vídeo, sentinels do CMS/DM). Máx 4 imagens por post. Limites de rate: 60 uploads/h e 30 posts/h por usuário. Vídeo no app vive **só** no CMS via Bunny — confundir os dois quebra a regra de moderação do produto.
- **Comunidade slug + subscriptions (Task #92)**: `forums.slug` é único e gerado por slugify NFD na migração de boot (idempotente). `member_count` NÃO é coluna persistida — sempre derivada de `COUNT(*) FROM forum_subscriptions` (a coluna foi removida via `DROP COLUMN IF EXISTS` no boot pra evitar drift). Endpoints canônicos por slug: `POST/DELETE /api/community/forums/by-slug/:slug/subscribe` e `GET /api/community/forums/me` (comunidades inscritas pelo viewer). O endpoint legado `POST /api/community/forums/:id/subscribe` continua existindo. `CommunityDetailPage` (`src/components/CommunityDetailPage.tsx`) é a vista subreddit-style renderizada DENTRO de `ComunidadePage` quando há slug ativo (`activeCommunitySlug`); deep-link `/c/:slug` ou `CustomEvent("rayo:open-community",{detail:{slug}})` setam esse estado. NÃO adicione `/c/:slug` em `getPublicPageFromUrl` — é rota autenticada.
- **Follow contract (Task #92)**: `POST /api/users/:id/follow {follow:bool}` (default true). Self-follow recusa com 400/`SELF_FOLLOW`. Idempotente via `ON CONFLICT DO NOTHING` em `user_follows(follower_id, following_id)`. `GET /api/users/:id/follows` devolve `{followers_count, following_count, is_following}` — `is_following` é em relação ao `req.user.id`.
- **Bunny vs Object Storage**: vídeo é Bunny, áudio/imagem/PDF é Object Storage. NÃO confunda os sentinels (`bunny://` ≠ `objstore://`) e os endpoints (`/api/admin/bunny/*` ≠ `/api/admin/cms/media/upload`). Os limites de DM (`messages/routes.ts`) também usam Object Storage com regras próprias.

## Pointers
- **Development Protocol**: `architecture.md`
- **UI/UX Audit**: `docs/ui-ux-audit.md`
- **Email Sending (Resend)**: `server/lib/email.ts`
- **Role Management**: `server/middleware/auth.ts`
- **API Client**: `src/lib/api.ts`