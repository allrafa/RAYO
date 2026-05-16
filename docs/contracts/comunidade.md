# Comunidade & Perfil estilo Reddit (Task #92)

Contratos consolidados da Comunidade subreddit-style e perfis públicos. Mexa aqui antes de tocar em `server/features/community/`, `server/features/users/follow*`, `CommunityDetailPage.tsx` ou `UserProfilePage.tsx`.

## Visão geral

Posts agora exigem seleção de comunidade (`forum_id` obrigatório), aceitam até 4 fotos persistentes (sentinels `objstore://posts/<file>`) e **vídeo é bloqueado server-side** com `VIDEO_NOT_ALLOWED` (HTTP 415) no `/api/community/posts/attachments`. Comunidades viraram subreddits: `forums.slug` único + `member_count` derivado de `forum_subscriptions`.

Endpoints canônicos por slug:
- `GET /api/community/forums/by-slug/:slug`
- `POST/DELETE /api/community/forums/by-slug/:slug/subscribe`
- `GET /api/community/forums/me`

**"Em alta"** vive em `GET /api/community/posts/trending?forum_id=<opt>` — ranking `(likes + comments)` nas últimas 48h. Cards de post mostram `c/<slug>` clicável (dispara `rayo:open-community` + `sessionStorage["rayo-pending-community-slug"]`). Deep-link `/c/:slug` é **autenticado** (NÃO em `getPublicPageFromUrl`) — captura o slug em `App.tsx`, troca pra aba Comunidade.

Perfis públicos `/u/:id` e o próprio `/perfil` usam o mesmo `UserProfilePage` com header (avatar + karma total + seguidores + segments), botão Seguir/Seguindo (`POST /api/users/:id/follow {follow:bool}`, `GET /api/users/:id/follows`) e tabs **Posts/Comentários/Comunidades/Conquistas/Sobre**. Listas de seguidores/seguindo via `GET /api/users/:id/{followers,following}`. Endpoints: `GET /api/community/users/:id/{posts,comments,communities,karma,badges}`.

Tabelas novas: `forum_subscriptions(user_id, forum_id)` e `user_follows(follower_id, followee_id)`.

Refinos UX adicionais (Task #93): header da Comunidade trocou o composer inline por uma **barra de busca clicável** (abre `MobileSearchPage`) + botão **"+"** no canto superior direito (abre `CreatePostModal`). `MobileTopBar` virou no-op (pílulas removidas). `PostCard` ganhou menu **"…"** (`DropdownMenu`) com **Salvar/Compartilhar/Editar/Excluir** — Salvar/Desalvar via `POST /api/community/posts/:id/save {saved}`, Editar reabre o `CreatePostModal` em modo `editingPost` (PATCH `/api/community/posts/:id` aceita `content/category/title/images`; **`forum_id` é IMUTÁVEL**), Excluir confirma em `AlertDialog` e chama `DELETE /api/community/posts/:id` (autor OU moderator+; soft via `is_hidden=TRUE`). Tabela `post_saves(user_id, post_id)` + índices; `is_saved` é hidratado em batch em todo listing (`hydratePostsRows`) e mapeado em `AppContext.mapAPIPost`. Aba **"Salvos"** em `UserProfilePage` só aparece quando `isSelf` (lazy load via `GET /api/community/users/me/saved`). Tabs do perfil são **mobile-first** — `inline-flex` rolável horizontal em mobile, `lg:justify-between` no desktop. Input de comentários usa `flex-shrink-0` pra ficar sticky no rodapé do painel. `PerfilPage` deletou ~280 linhas legadas (header gradient terra + stats + earned badges + "Suas comunidades") porque `UserProfilePage` embutido já cobre tudo isso; Configurações/Missões/LGPD/Logout continuam.

## Gotchas

### Posts só aceitam fotos (INVIOLÁVEL)
`POST /api/community/posts/attachments` usa multer **próprio** (memoryStorage, **NÃO** o `uploadMiddleware` do CMS) com fileFilter mime restrito a `image/jpeg|png|webp` e cap 5 MB. Vídeo é bloqueado **com código de erro explícito** `VIDEO_NOT_ALLOWED` (HTTP 415) — qualquer mime `video/*` recusado no fileFilter ANTES de tocar disco/RAM, e o handler de erro do multer reconhece esse caso pra retornar a mensagem específica. `service.createPost` valida que cada item de `images` é string que começa com prefixo exato `objstore://posts/` (defesa em profundidade — bloqueia URL externa, vídeo, sentinels do CMS/DM). Máx 4 imagens por post. Limites de rate: 60 uploads/h e 30 posts/h por usuário. Vídeo no app vive **só** no CMS via Bunny — confundir os dois quebra a regra de moderação do produto.

### Comunidade slug + subscriptions
`forums.slug` é único e gerado por slugify NFD na migração de boot (idempotente). `member_count` **NÃO é coluna persistida** — sempre derivada de `COUNT(*) FROM forum_subscriptions` (a coluna foi removida via `DROP COLUMN IF EXISTS` no boot pra evitar drift). Endpoints canônicos por slug: `POST/DELETE /api/community/forums/by-slug/:slug/subscribe` e `GET /api/community/forums/me` (comunidades inscritas pelo viewer). O endpoint legado `POST /api/community/forums/:id/subscribe` continua existindo. `CommunityDetailPage` (`src/components/CommunityDetailPage.tsx`) é a vista subreddit-style renderizada DENTRO de `ComunidadePage` quando há slug ativo (`activeCommunitySlug`); deep-link `/c/:slug` ou `CustomEvent("rayo:open-community",{detail:{slug}})` setam esse estado. **NÃO adicione `/c/:slug` em `getPublicPageFromUrl`** — é rota autenticada.

### Follow contract
`POST /api/users/:id/follow {follow:bool}` (default true). Self-follow recusa com 400/`SELF_FOLLOW`. Idempotente via `ON CONFLICT DO NOTHING` em `user_follows(follower_id, following_id)`. `GET /api/users/:id/follows` devolve `{followers_count, following_count, is_following}` — `is_following` é em relação ao `req.user.id`.

### Busca tabbed: ILIKE puro (sem trigram) — gotcha de Publish
A busca em `/comunidade` (`/api/community/search`) usa **ILIKE puro** intencionalmente. Os índices `pg_trgm` GIN com `gin_trgm_ops` foram tentados na Task #193 e revertidos: o diff de schema do Publish **não preserva o opclass** ao replicar pra prod e gera `CREATE INDEX ... USING gin ("col")` (sem opclass), que falha em prod com `data type text has no default operator class for access method "gin"`. **Não readicionar índices trigram no `initializeSchema()`** enquanto não houver caminho de migração que respeite opclasses (custom migration scripts, deploy hooks ou self-heal startup DDL violam o skill `database`). Dataset pequeno = Seq Scan continua aceitável.

### CMS de comunidades + criação por usuários (Task #198)
Schema: `forums` ganhou `cover_url`, `rules`, `created_by`, `is_official` (default `TRUE` em registros antigos via backfill idempotente). Nova tabela `forum_moderators` (PK `forum_id+user_id`, índice por user) — **moderadores per-community SEM precisar promover role global**.

Service (`server/features/community/service.ts`):
- `getForumBySlug` / `listForums` enriquecidos: `cover_url` resolvido via `resolveStoredMediaUrl`, `is_moderator`, `moderators[]`, `rules`, `is_official`, `created_by`.
- `createForumByUser`: criador vira moderador local + subscriber em transação; nome/slug únicos via `ensureUniqueSlug`; UNIQUE violation → `SLUG_TAKEN 409`.
- `adminCreateForum` / `updateForum` / `setForumActive` / `listAdminForums` / `addForumModerator` / `removeForumModerator`.
- `deletePost` agora consulta `isForumModerator(forumId, userId)` quando o caller não é autor nem `moderator+` global — **mod local pode soft-deletar** e gera `mod_actions` normalmente.

Rotas:
- `POST /api/community/forums` (`requireAuth`, **5/dia keyByUser**) — criação por usuário.
- `/api/admin/community/*` (`requireRole admin`, rateLimiter 300/15min) em `server/features/community/adminRoutes.ts`: `GET/POST /forums`, `PATCH /forums/:id`, `POST /forums/:id/active`, `GET/POST /forums/:id/moderators`, `DELETE /forums/:id/moderators/:userId`, `POST /forums/cover` (multer image-only 5MB → `objstore://forums/<file>`, otimização via `optimizeCmsImage`). Mountado em `server/index.ts` **ANTES** de `/api/admin` ser interceptado.

Frontend:
- `AdminCommunitiesPage` (em `src/components/admin/`): grid de cards com cover, badges Oficial/Inativa, modais de criar/editar (capa upload, slug livre, regras, ícone, contexto, `is_official`) e gestão de moderadores per-community por ID. Entrada na sidebar admin via `MessagesSquare` (minRole admin).
- `CommunityDetailPage` reescrito: cover banner, badge "Oficial" / "Você modera", aba "Sobre" com regras + lista clicável de moderadores (avatar, link pro perfil, data desde) + criado em / contagens.
- `ComunidadePage`: botão "Criar" no header da view Grupos (só pra autenticados) abrindo `CreateCommunityModal`. Após criar, recarrega `loadForums()` e abre direto a comunidade nova via `openCommunityBySlug`.
- `CreateCommunityModal`: nome (slug derivado no server), descrição, ícone (emoji picker), regras opcionais. Quando POST devolve `403 EMAIL_NOT_VERIFIED`, monta `<EmailVerificationInline/>` sem perder os campos do form e retoma o submit ao confirmar.

**Cover sentinel**: aceita SOMENTE `objstore://forums/<file>` (defesa contra URL externa). String vazia → `null`.

**Limite de slug**: 2-60 chars `[a-z0-9-]`. Validação no `validateForumPatch`. Race no slug: `try/catch` UNIQUE → 409.

### Reações multi-emoji
Set fechado `["❤️","😂","🙏","💡","🔥","👏"]` espelhado em `ALLOWED_REACTION_EMOJIS` (server) e `REACTION_EMOJIS` (client). Tabelas `post_reactions` / `comment_reactions` (UNIQUE `user+target+emoji`), backfill ❤️ a partir de `post_likes` / `comment_likes` legados.

Endpoints `POST /api/community/{posts,comments}/:id/reactions` devolvem `{reactions:[{emoji,count}], user_reaction}`. `like_count` continua somando **TOTAL** (preserva trending/karma); `togglePostLike` / `toggleCommentLike` viraram aliases pra ❤️. Hidratação em batch via `aggregateReactions` / `userReactionsFor`.

`EmojiReactionPicker` (variants `full` / `compact`) é all-in-one. PostCard mantém estado local (não dispara `loadPosts` global). Discussão compartilhável `/c/<slug>/p/<id>` parqueia stash e ComunidadePage abre `CommentsPanel`; OG/JSON-LD `DiscussionForumPosting` em `publicMeta.ts`. `FavoriteIcon` virou Bookmark (Heart só no picker).

### Cards de perfil clicáveis
Posts/Comentários/Salvos no `UserProfilePage` viraram `role="button"` que disparam `rayo:open-post` + `sessionStorage["rayo-pending-post"]`. Comentários incluem `highlight_comment_id` (key extra `rayo-pending-post-comment`); `CommentsPanel` rola até `[data-comment-id="<id>"]` + `.rayo-comment-highlight` (animação 2,2s em `globals.css`).

### CommentsPanel via Portal (regra geral pra overlays dentro de PullToRefresh)
`CommentsPanel` é renderizado via `createPortal(jsx, document.body)`. Sem isso, o `transform: translateY(...)` do `PullToRefresh` cria **containing block** que **quebra `position: fixed` em descendentes** — o painel some no mobile. Body-scroll-lock + Esc/backdrop fechando.

**Regra geral**: qualquer overlay/modal dentro de `PullToRefresh` precisa ir pro portal (ou usar shadcn `Sheet` / `Dialog`).

### Realtime via Socket.IO (Task #223)

Eventos de feed e discussão fluem pelo namespace `/community` (ver
`docs/contracts/realtime.md` — seção "Comunidade"). Resumo:

- **Servidor**: `community/service.ts` faz fan-out via
  `community/realtime.ts` depois de cada mutation (`createPost`,
  `updatePost`, `deletePost`, `togglePostReaction`,
  `addComment`, `toggleCommentReaction`, `setPostHiddenWithAuth`,
  `setCommentHiddenWithAuth`). Emits são best-effort em `try/catch` —
  falha no socket NÃO reverte a operação no banco.
- **Cliente**: `useCommunitySocket(enabled)` em
  `src/lib/community/useCommunitySocket.ts` é o ponto único de
  integração. `CommunityDetailPage` patcha o feed in-place; a
  `DiscussionPage` patcha a lista de comentários e os chips de
  reação sem refetch.
- **Flag**: `COMMUNITY_REALTIME` (`socket`|`sse`, default `socket` em
  dev / `sse` em prod). Quando `sse`, o hook vira NOOP e a página
  volta ao comportamento pré-#223 (estado local + refetch). O
  servidor segue emitindo mesmo em modo `sse` — a flag só desliga
  a leitura.
- **Notificações** (`notification:new` / `notification:unread`)
  continuam saindo via SSE em `messages/events.ts` por
  `publishToUser` — canal pessoal separado do `/community`,
  não migra nesta task.
