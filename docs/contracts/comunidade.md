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
