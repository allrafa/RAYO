# RAYO Platform
RAYO é uma plataforma digital para fortalecer famílias através de conteúdo transformador, comunidade engajada e recursos práticos em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados, Pais.

## Run & Operate
- `npm run dev` (Express + Vite middleware) · `npm run build` (frontend prod).
- **Env vars principais**: `resend_api_key`, `RESEND_FROM_EMAIL`, `APP_URL`, `PUBLIC_SITE_URL` (default `https://rayo.app.br`), `ADMIN_EMAILS`, `CONTACT_EMAIL` (alias legado `CONTATO_TO_EMAIL`).
- **Bunny Stream**: `BUNNY_STREAM_LIBRARY_ID/API_KEY/CDN_HOSTNAME/WEBHOOK_SECRET` — ver `docs/contracts/bunny-stream.md`.
- **OAuth Google/Facebook** (só prod `https://rayo.app.br`): `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `FACEBOOK_CLIENT_ID/SECRET/REDIRECT_URI`. Sem `*_REDIRECT_URI` exato → botão "Em breve".
- **Stripe (Trilhas pagas)**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (gerado/managed pelo `stripe-replit-sync` no boot, opcional). Endpoint webhook: `POST /api/stripe/webhook`. Frontend usa Stripe Checkout hosted (sem chave pública necessária no client).

## Stack
- **Frontend**: React 18, TypeScript, Tailwind v4, Vite. Fonte única **Outfit** (200–700).
- **Design System v2.0**: `src/styles/` — `home-rayo.css` (`.rh-*`), `nav-rayo.css` (`.rn-*`), `playlists-rayo.css` (`.rh-pl-*`), base `app-rayo.css` (`.ra-*`). Tokens `--rayo-*` em `globals.css` (legacy `--raio-*` removido em #60).
- **Backend**: Express + TS + tsx. **DB**: PostgreSQL. **Auth**: sessão com cookies seguros. **Email**: Resend.

## Where things live
- `server/` (entry `index.ts`, `db/`, `middleware/`, `features/`) · `src/` (raiz `App.tsx`, `components/`, `lib/api.ts`, `styles/`, `design-tokens.ts`).
- `architecture.md` (protocolo) · `docs/contracts/` (DM, Bunny, Comunidade, Turmas, Marketing/SEO, Billing) · `tsconfig.json` / `tsconfig.server.json` / `vite.config.ts`.

## Architecture decisions
- **Thin Client, Fat Server**: lógica/auth/dados/segurança no Express.
- **Idempotent Migrations/Seeds**: migrações de boot são idempotentes.
- **RBAC**: hierarquia numérica (`client` < `producer` < `moderator` < `admin`).
- **Soft Deletes**: conteúdo é `hidden`, não deletado.
- **SSE para DM e notificações**: real-time via Server-Sent Events.
- **Dynamic Home Feed**: `recommendedSectionOrder` por segmentos; "Hoje no RAYO" usa rotação determinística diária.
- **Static Assets em Object Storage**: sentinels `objstore://<key>` resolvidos via signed URL em leitura. Imagens passam por `sharp`.
- **Vídeo via Bunny Stream**: sentinel `bunny://<libraryId>/<guid>` — ver `docs/contracts/bunny-stream.md`.

## Product
- **Auth**: registro, login, logout, reset, perfil, verificação de e-mail.
- **CMS**: 6 kinds (audio, video, reels, serie, curso, livro) + `artigo` (blog).
- **Gamification**: XP, badges, missões, streaks. **Personalized Dashboard** agrega tudo + comunidade.
- **Community Forums**: subreddit-style — ver `docs/contracts/comunidade.md`.
- **Direct Messaging**: per-side state + attachments + swipe — ver `docs/contracts/dm.md`.
- **Notificações**: tabela `notifications`, `NotificationBell` no header, SSE, endpoints `/api/notifications`.
- **LGPD**: export e deleção de conta em `/api/lgpd`.
- **Admin & Moderation**: gestão de usuários, moderação, métricas.
- **Turmas (mini-Skool)**: ver `docs/contracts/turmas.md`.
- **Trilhas pagas (Stripe)**: 5 trilhas curadas por momento de vida, cada uma agrupando N turmas. Assinatura recorrente (mensal/anual). Tabelas: `trails`, `trail_courses` (M:N), `subscriptions` (fonte da verdade — atualizada por webhook), `users.stripe_customer_id`. Catálogo `/trilhas`, detalhe `/trilhas/:slug`, sucesso `/trilhas/sucesso?slug=…`. Comunidade pública continua grátis; turmas vinculadas a trilha paga (e a comunidade `class_id` delas) são gated. Contrato completo em `docs/contracts/billing.md`.
- **Site Público / Marketing & SEO**: ver `docs/contracts/marketing-seo.md`.

## User preferences
- I prefer simple language.
- I like functional programming paradigms.
- I want iterative development with frequent, small updates.
- Ask before making major changes to the codebase or architecture.
- I prefer detailed explanations for complex features or decisions.
- Do not make changes to the `docs/` folder without explicit instruction.
- Do not make changes to the `replit.nix` file.

## Gotchas universais

### Backend / Segurança
- **Route Order**: rotas com prefixo fixo antes das dinâmicas no Express.
- **Email Enumeration Prevention**: forgot password sempre retorna sucesso.
- **Object-Level Authorization**: producers só editam conteúdo próprio; `moderator+` override.
- **No Fake Discounts**: preço de curso vem de `course.price`; promoções só do backend.
- **Idempotent Daily Completions**: `POST /api/home/today/complete` usa `ON CONFLICT DO NOTHING`.
- **Busca Comunidade & Publish (gotcha conhecida)**: a busca tabbed em `/comunidade` (`/api/community/search`) usa **ILIKE puro** (sem trigram). Os índices `pg_trgm` GIN com `gin_trgm_ops` foram tentados na Task #193 e revertidos: o diff de schema do Publish **não preserva o opclass** ao replicar pra prod e gera `CREATE INDEX ... USING gin ("col")` (sem opclass), que falha com `data type text has no default operator class for access method "gin"`. Não readicionar índices trigram no `initializeSchema()` enquanto não houver caminho de migração que respeite opclasses (custom migration scripts, deploy hooks ou self-heal startup DDL violam o skill `database`). Dataset pequeno = Seq Scan continua aceitável.
- **Rate Limiter**: `rateLimiter(max, windowMs, opts)` em `server/middleware/security.ts` — bucket in-memory por instância, `opts.keyByUser` (cai pra IP quando anônimo) e `opts.skip(req)`. `optionalAuth` hidrata `req.user` antes de cada limiter autenticado. `app.set("trust proxy", 1)`. `/api/auth` POSTs sensíveis 20/15min por IP; resto 60/15min keyByUser. Demais autenticadas 120–600/15min keyByUser. Reiniciar workflow zera buckets.

### Stripe Billing — gating + webhook
- Webhook `POST /api/stripe/webhook` é registrado com `express.raw({type:'application/json'})` **ANTES** do `express.json()` global em `server/index.ts` — sem isso a verificação HMAC quebra.
- Init no `start()`: `migrateBilling()` → `runMigrations()` (stripe-replit-sync) → `findOrCreateManagedWebhook()` → `syncBackfill()`.
- **Fonte da verdade = tabela `subscriptions`** (status `active|trialing|past_due` valem como acesso). Webhook delega ao `processWebhook` do sync e depois processa via `handleEvent` (idempotente por `stripe_subscription_id`).
- Metadata Stripe `rayo_user_id` + `rayo_trail_id` setada no Checkout Session.
- Stripe não permite editar valor de price → `service.ts` cria price novo + desativa antigo.
- Cache 60s `course_id → trail_id` em `service.ts` (`invalidateTrailLookupCache` em writes/webhooks).
- Gating em `server/middleware/requireTrailAccess.ts` (helper `checkCourseAccess`). Routes Academia usam `ensureTrailAccess` que devolve 402 `TRAIL_PAYMENT_REQUIRED` (com `trail_id`) em `enroll`, `lesson progress` etc. Frontend captura 402 → `<TrailPaywall trailId={…}/>`.
- Preços em CENTAVOS BRL (`monthly_price_cents`, `yearly_price_cents`).
- Rotas `/trilhas/*` rodam na **PublicShell** (sem AuthProvider) — `TrilhaDetailPage` chama `/api/auth/me` direto.

### Roteamento (BrowserRouter, react-router v6)
- App roda dentro de `<BrowserRouter>` no default export de `App.tsx`. `currentTab` deixou de ser state e virou DERIVADO de `useLocation()` via `tabFromPath(pathname)`. `setCurrentTab(tab)` foi preservado como callback estável que por baixo chama `navigate(pathFromTab(tab))` — todos os consumers continuam funcionando sem mudar.
- **Mapa canônico**: Home `/`, Academia `/academia`, Comunidade `/comunidade`, Conversas `/conversas`, Perfil `/perfil`, Conselheiro `/conselheiro`, Admin `/admin`. PublicShell (marketing/blog/trilhas/turma-landing) é detectado ANTES do BrowserRouter via `getPublicPageFromUrl()`.
- **Rotas first-class persistentes** (sobrevivem refresh/back/forward/share):
  - `/c/:slug` e `/c/:slug/p/:id` (Comunidade).
  - `/u/:id` e `/u/:id/{posts,comentarios,comunidades,conquistas,salvos,sobre}` (perfil público); `/perfil/{...,assinaturas,configuracoes}` (perfil próprio).
  - `/conversas/:id` (DM ativa).
  - `/academia/curso/:id`, `/academia/curso/:id/aula/:lessonId`, `/video/:id`.
  - `?segmento=…` em Academia (replace mode, valida contra `SEGMENTS`, omite quando default/all).
- **Sync URL ↔ Context (Academia/Vídeo)**: `AppContent` instala 2 `useEffect` que mantêm URL em sync com `currentCourseId`/`isInCourseDetail`/`currentVideoId`/`isInVideoPage`. Branch "fechar" do segundo effect usa `useRef` (`prevCourseDetail`/`prevVideoPage`) pra só disparar em transição true→false REAL — sem isso, deep-link em `/academia/curso/5` causa ping-pong de redirect (effect dispara antes da hidratação). Aula via `sessionStorage["rayo-pending-lesson"]` consumido em `CourseDetailPage` (rola até `[data-lesson-id="<id>"]` + `.rayo-comment-highlight`).
- **PerfilPage**: deriva tudo da URL via 2 regex (`PROFILE_TAB_SLUGS = "posts|comentarios|comunidades|conquistas|salvos|sobre"`; self aceita `assinaturas|configuracoes` extra). **Sempre que adicionar tab nova ao UserProfilePage, ATUALIZAR `PROFILE_TAB_SLUGS`** — slug não-reconhecido faz `otherProfileId=null` e fecha o overlay sozinho. `<Tabs>` NUNCA pode receber `value` E `defaultValue` ao mesmo tempo (Radix trava); usar spread condicional.
- **CustomEvents** `rayo:open-{profile,post,community}` continuam sendo a ponte entre cards/busca e abas — listeners no AppContent mapeiam pra `setCurrentTab` + navigate. Não chamar `onTabChange("perfil")` antes do dispatch (cria entrada intermediária no histórico).
- **Privacy** virou overlay puro (`showPrivacyOverlay` state) — `setCurrentTab("privacy")` é interceptado por compat e não mexe em URL.
- **Login redirect**: após auth, `useEffect` empurra `/login`/`/cadastro` → `/` com `replace:true`.

### Re-tap & navegação dos cards
- **Re-tap aba ativa = scroll-top**: `Navigation`/`DesktopSidebar` checam `isActive` e disparam `dispatchScrollTop(tabId)` em vez de `onTabChange`. Listener global em `App.tsx` rola `window`. Páginas com side-effects extras escutam via `onScrollTop()` (`src/lib/scrollTop.ts`): ComunidadePage reseta `activeCommunitySlug`, PerfilPage fecha overlay público, ConversasPage fecha conversa aberta.
- **Click target hierarchy nos cards (padrão Facebook)**: avatar/nome → perfil (`openProfileById`); imagem → lightbox (`PostImageLightbox` via portal); corpo neutro → discussão/detalhe; `c/<slug>` → comunidade (`openCommunityBySlug`); botões internos → ação isolada com `stopBubble`/`stopPropagation`. Helpers em `src/lib/cardClickTargets.ts`. Wrapper é `<div role="button">` (NUNCA aninhar `<a>` em `<a>`/`<button>`). **`cardKeyHandler` só dispara quando `e.target === e.currentTarget`** — sem essa guarda Enter/Espaço num filho aciona ambos. Cada região com `aria-label` distinto e foco visível.

### Comunidade & Reações
- **Reações multi-emoji**: set fechado `["❤️","😂","🙏","💡","🔥","👏"]` espelhado em `ALLOWED_REACTION_EMOJIS` (server) e `REACTION_EMOJIS` (client). Tabelas `post_reactions`/`comment_reactions` (UNIQUE user+target+emoji), backfill ❤️ a partir de `post_likes`/`comment_likes` legados. Endpoints `POST /api/community/{posts,comments}/:id/reactions` devolvem `{reactions:[{emoji,count}], user_reaction}`. `like_count` continua somando TOTAL (preserva trending/karma); `togglePostLike`/`toggleCommentLike` viraram aliases pra ❤️. Hidratação em batch via `aggregateReactions`/`userReactionsFor`. `EmojiReactionPicker` (variants `full`/`compact`) é all-in-one. PostCard mantém estado local (não dispara `loadPosts` global). Discussão compartilhável `/c/<slug>/p/<id>` parqueia stash e ComunidadePage abre CommentsPanel; OG/JSON-LD `DiscussionForumPosting` em `publicMeta.ts`. `FavoriteIcon` virou Bookmark (Heart só no picker).
- **Cards de perfil clicáveis**: Posts/Comentários/Salvos no `UserProfilePage` viraram `role="button"` que disparam `rayo:open-post` + sessionStorage `rayo-pending-post`. Comentários incluem `highlight_comment_id` (key extra `rayo-pending-post-comment`); `CommentsPanel` rola até `[data-comment-id="<id>"]` + `.rayo-comment-highlight` (animação 2,2s em `globals.css`).
- **CommentsPanel via Portal**: renderizado via `createPortal(jsx, document.body)`. Sem isso, `transform: translateY(...)` do `PullToRefresh` cria containing block que **quebra `position: fixed` em descendentes** — o painel some no mobile. Body-scroll-lock + Esc/backdrop. **Regra geral**: qualquer overlay/modal dentro de `PullToRefresh` precisa ir pro portal (ou usar shadcn `Sheet`/`Dialog`).

### DM (Conversas)
- **Viewport sizing**: `.ra-page` (min-height:100vh) deixa shell crescer e quebra header/composer fixos. Regra: `.rayo-dm-shell.ra-page { height:100dvh; min-height:0; overflow:hidden }`. Desktop desconta 80px da TopNavbar via `calc(100dvh - 80px)`. Toda coluna flex interna precisa de `min-h-0` pra `<ScrollArea>` rolar por dentro. `body.rayo-dm-page` zera `padding-bottom` do `<main>`. `body.rayo-dm-conversation-open` (só com convo aberta) esconde bottom nav. Estado lista-only no mobile/tablet (≤1023px) reserva 72px+safe-area.
- **Regra geral pra "app shell" (header+footer fixos com área central rolável)**: container raiz NÃO pode usar `min-height` — tem que usar `height` travada e ancestrais flex precisam de `min-h-0`.
- **Bubble fit-content**: `.ra-chat-bubble` NUNCA pode ter `max-width: %` direto — em flex-col aninhado colapsa pra `min-content` e quebra texto curto letra a letra. Regra: `.ra-chat-bubble { width: fit-content; max-width: 100%; min-width: 0; overflow-wrap: anywhere }` e o wrapper carrega o cap real (`w-fit max-w-[min(80%,560px)]`).
- **AudioBubble**: `<audio controls>` nativo banido das DMs. Usar `<AudioBubble>` (`src/components/AudioBubble.tsx`) — variants `user|assistant|compact`. Hooks `onPlay/onTimeUpdate` chamam `sendListeningPing`.
- **Status leitura**: ícone-only colorido (`CheckCheck` terra-500=lido, `Check` neutro=enviado), sem texto.
- **Preview "🎤 Áudio (0:07)"** exige `last_message_meta` no SELECT da query `listConversations` (LATERAL JOIN).
- `GROUP_WINDOW_MS` em `messageGrouping.ts` = 5min.
- Imagens DM com `onError` → placeholder `.ra-chat-attachment-fallback`.

### Conteúdo, áudio & vídeo
- **Content Card Mapping**: `badge_text`, `meta_text`, `progress`, `gradient` têm significado contextual.
- **Catálogo conectado a Trilhas**: `GET /api/courses` faz LEFT JOIN `trail_courses + trails` (devolve `trail_id/trail_slug/trail_title`). Curso com `trail_slug` no `CourseCard` redireciona pra `/trilhas/:slug` (checkout Stripe real); badge terra-500 "Trilha: X", esconde preço avulso, CTA "Ver trilha". `TurmaLandingPage` standalone renderiza `<TrailPaywall>` quando `trail_id && !has_trail_access && !is_member`; senão CTA "Avise-me quando abrir". `MarketplaceView` deriva `displayedPopular`/`displayedTopRated` de `segmentFilteredCourses`. `visibleFormatKinds` esconde formatos `count=0` ("Cursos" sempre visível). Rating/students só renderiza quando `> 0` (migração idempotente zera dos 6 cursos seed legados via match `(title, rating)`).
- **YouTube cover fallback**: vídeos cadastrados antes do autofill (Task #183) podem ter `cover_url=null`. `applyYouTubeCoverFallback` (privado em `server/features/cms/service.ts`) é aplicado em `listPublicContent` e `getPublicContentDetail` — só pra `kind="video"` com `cover_url` falsy E `external_url` reconhecível como YouTube. Helper público: `youtubeThumbnailFromExternalUrl(url)` em `server/lib/youtubeMetadata.ts` (devolve `https://img.youtube.com/vi/<id>/hqdefault.jpg` ou `null`). É **fallback de leitura** — não escreve no DB. Admin (`getAdminContentDetail`) NÃO recebe o fallback (precisa ver null real pra saber que falta capa).
- **Player de áudio global**: `AudioPlayerProvider` em `src/contexts/AudioPlayerContext.tsx` mantém um `<audio>` único no nível raiz. API: `playTrack({id,title,subtitle,audioUrl,coverUrl})`, `togglePlay`, `seek`, `close`, `useIsTrackPlaying(id)`. Mini-player fixo (`GlobalAudioPlayer`) em `App.tsx` — bottom 64px no mobile (acima da bottom nav), 0 no desktop. CSS em `src/styles/audio-player-rayo.css`. Mesma faixa = toggle pause/play sem reload; nova faixa = `el.load()` em microtask antes de `play()` (sem isso o navegador toca o src antigo). Cards mock sem `audio_url` → toast "Em breve" (sem fingir). Cards de podcast/audio na Home continuam abrindo `VideoPage` global (kind audio coberto) — não duplicar player.
- **Cards de destaque da home**: `home_feed_items` tem `content_item_id` (FK pra `content_items`) e `link_url`. Backend valida no admin: `content_item_id` precisa existir, ter `status='published'` e `kind ∈ {audio,video,reels,curso}`. Frontend (`openHomeFeedCard`) precedência: conteúdo vinculado (audio/video/reels → player; curso → TurmaShell+aba Academia) → `link_url` (`http` → `window.open` noopener; `/` → `window.location.assign`) → toast "Em breve". **Sem fallback genérico**. Em `made_for_you`, CMS tem prioridade sobre playlists do YouTube auto.

### Build & Performance
- **Code splitting por rota**: cada área pesada é chunk lazy (`React.lazy` + `<Suspense>`) — Academia, Comunidade, Conversas, Perfil, Conselheiro, Admin, Video, Landing, Privacy, Terms, marketing pages, trilhas, blog, TurmaLanding. **Eager**: HomePage, AuthPage, WelcomeScreen, Onboarding, ConsentBanner, Navigation/TopNavbar/DesktopSidebar, **CentralConversasPage** (HomePage importa estaticamente — lazificar dispara warning Vite). Helper `lazyNamed(loader, name)` em App.tsx adapta export nomeado pra default que React.lazy exige (type-safe via conditional type, sem `any`). Skeletons em `src/components/RouteFallback.tsx`: `RouteFallback` (in-page) e `PublicRouteFallback` (full-screen). Bundle inicial: 1751kB → 1159kB (-34%) / gzip 498kB → 351kB.

### Rebrand RAIO → RAYO (Maio/2026)
- Nome anterior do produto era RAIO. Storage/eventos/copy migrados pra namespace `rayo`; tokens CSS `--raio-*` mantidos como source of truth com aliases `--rayo-*: var(--raio-*)` em `globals.css` pra preservar valores.
- Migração one-shot em `src/lib/storageMigration.ts` (flag `rayo_storage_migrated_v1`) copia chaves legadas no boot do `App.tsx`. sessionStorage usa fallback de leitura (`rayo ?? raio`) por janela de transição. CustomEvents trocados atomicamente (single SPA, sem dual-emission). Stash legado `raio-pending-*` ainda é consumido por compat.

### E2E Playwright
- Suíte em `tests/e2e/` rodando contra dev server real + DB de dev. Rodar `npx playwright test`; ver `tests/e2e/README.md`.
- Especificidades do container Replit:
  1. `chromium.launch()` morre por causa do `--inspector-pipe` — `global-setup.ts` lança o chromium do Replit (`$REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE`) com `--remote-debugging-port=0` e fixture em `tests/e2e/fixtures.ts` conecta via `chromium.connectOverCDP`. Specs DEVEM importar `test`/`expect` de `./fixtures`.
  2. `waitForLoadState("networkidle")` nunca resolve (SSE sempre aberto) — esperar por elemento âncora.
  3. `registerUser` em `helpers/api.ts` insere linha verified em `email_verification_codes` antes do POST pra pular Resend.
  4. Rate limiter `/api/auth` é in-memory — restart `Start application` se bater limite.
  5. Cleanup via `deleteUsersById`/`deleteAllTestUsersByEmailPrefix` (prefixo `test-@rayo.test`).

Gotchas por feature → ver `docs/contracts/{dm,bunny-stream,comunidade,turmas,marketing-seo,billing}.md`.

## Pointers
- `architecture.md` (protocolo) · `docs/ui-ux-audit.md` · `docs/platform-spec.md`
- Contratos: `docs/contracts/dm.md` · `bunny-stream.md` · `comunidade.md` · `turmas.md` · `marketing-seo.md` · `billing.md`
- `server/lib/email.ts` (Resend) · `server/middleware/auth.ts` (roles) · `server/features/seo/publicMeta.ts` (SEO server-side) · `src/lib/api.ts` (API client) · `server/lib/youtubeMetadata.ts` (YouTube ID/thumb helpers)
