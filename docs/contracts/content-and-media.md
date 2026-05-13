# Conteúdo, áudio, vídeo e cards de destaque

Contratos consolidados do CMS, do player de áudio global, de fallbacks
de vídeo e dos cards de destaque da Home. Mexa aqui antes de tocar em
`server/features/cms/`, `server/features/courses/`,
`server/features/home/`, `server/lib/youtubeMetadata.ts`,
`src/contexts/AudioPlayerContext.tsx`, `src/components/GlobalAudioPlayer*`
ou em qualquer card que abra player/curso/turma.

## CMS kinds

`content_items.kind` aceita: `audio | video | reels | serie | curso |
livro | artigo`. A constraint `content_items_kind_check` é
re-criada idempotentemente no boot (`DROP + ADD`) quando muda. Cada
kind tem regras próprias (ver `comunidade.md` pra posts e
`bunny-stream.md` pra vídeo).

## Content Card Mapping

`badge_text`, `meta_text`, `progress`, `gradient` em `ContentCard` têm
significado contextual e dependem do kind:

- `progress` só em itens com `user_course_progress` (curso/serie).
- `badge_text` é setado pelo backend quando o item está em destaque,
  é novo, ou tem flag de moderação.
- `meta_text` carrega duração/contagem/estágio.
- `gradient` é fallback quando `cover_url` não resolve.

## Catálogo conectado a Trilhas

`GET /api/courses` faz `LEFT JOIN trail_courses + trails` (devolve
`trail_id`, `trail_slug`, `trail_title`).

- Curso com `trail_slug` no `CourseCard` redireciona pra
  `/trilhas/:slug` (checkout Stripe real); badge terra-500 "Trilha: X",
  esconde preço avulso, CTA "Ver trilha".
- `TurmaLandingPage` standalone renderiza `<TrailPaywall>` quando
  `trail_id && !has_trail_access && !is_member`; senão CTA "Avise-me
  quando abrir".
- `MarketplaceView` deriva `displayedPopular` / `displayedTopRated` de
  `segmentFilteredCourses`. `visibleFormatKinds` esconde formatos com
  `count=0` ("Cursos" sempre visível).
- Rating / students só renderiza quando `> 0` — uma migração idempotente
  zera dos 6 cursos seed legados via match `(title, rating)` pra
  evitar mostrar dado fake.

## YouTube cover fallback (Task #183)

Vídeos cadastrados antes do autofill podem ter `cover_url=null`.
`applyYouTubeCoverFallback` (privado em `server/features/cms/service.ts`)
é aplicado em `listPublicContent` e `getPublicContentDetail` — só pra
`kind="video"` com `cover_url` falsy E `external_url` reconhecível como
YouTube.

Helper público: `youtubeThumbnailFromExternalUrl(url)` em
`server/lib/youtubeMetadata.ts` (devolve
`https://img.youtube.com/vi/<id>/hqdefault.jpg` ou `null`).

É **fallback de leitura** — não escreve no DB. Admin
(`getAdminContentDetail`) **NÃO recebe o fallback** (precisa ver
`null` real pra saber que falta capa).

## Player de áudio global

`AudioPlayerProvider` em `src/contexts/AudioPlayerContext.tsx` mantém
um `<audio>` único no nível raiz.

API:
```ts
playTrack({ id, title, subtitle, audioUrl, coverUrl })
togglePlay()
seek(seconds)
close()
useIsTrackPlaying(id): boolean
```

- Mini-player fixo (`GlobalAudioPlayer`) em `App.tsx` — `bottom: 64px`
  no mobile (acima da bottom nav), `0` no desktop.
- CSS em `src/styles/audio-player-rayo.css`.
- **Mesma faixa = toggle pause/play** sem reload.
- **Nova faixa = `el.load()` em microtask antes de `play()`** — sem isso
  o navegador toca o `src` antigo (race do DOM).
- Cards mock sem `audio_url` → toast "Em breve" (sem fingir que tocou).
- Cards de podcast/audio na Home continuam abrindo `VideoPage` global
  (kind `audio` é coberto lá) — **não duplicar player**.

## Cards de destaque da Home (`home_feed_items`)

Cada row tem `content_item_id` (FK pra `content_items`) e `link_url`
(opcional).

### Validação no admin (backend)

- `content_item_id` precisa existir, ter `status='published'` e
  `kind ∈ {audio, video, reels, curso}`.
- Se passar `link_url`, normalizado pra `http(s)` ou path interno (`/...`).

### Precedência no frontend (`openHomeFeedCard`)

1. **Conteúdo vinculado** (`content_item_id`):
   - `audio | video | reels` → abre player global.
   - `curso` → `TurmaShell` + aba Academia.
2. **`link_url`**:
   - `http(s)` → `window.open(..., "_blank", "noopener")`.
   - `/...` → `window.location.assign(...)`.
3. **Sem nada** → toast "Em breve". **NÃO** existe fallback genérico
   pra "abrir Home" — sumir é melhor que enganar.

### Made-for-you

Em `made_for_you`, **CMS tem prioridade sobre playlists do YouTube
auto** — se um card CMS bate o critério, a playlist auto não aparece
no slot.

## "Hoje no RAYO" (rotação determinística)

`server/features/home/service.ts` usa rotação determinística por dia
(`dayOfYear`) pra que o card "Hoje no RAYO" seja igual pra todos os
visitantes no mesmo dia, mas mude diariamente sem job. `POST
/api/home/today/complete` é **idempotente** via `ON CONFLICT DO
NOTHING` — clicar duas vezes não duplica completion.
