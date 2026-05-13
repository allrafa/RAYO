# Roteamento (BrowserRouter, deep-links, sync URL↔context)

Contratos consolidados de roteamento client. Mexa aqui antes de tocar em
`src/App.tsx`, `src/AppContent` (rotas), `src/lib/scrollTop.ts`,
`src/lib/cardClickTargets.ts`, ou de adicionar uma rota nova /
deep-link.

## BrowserRouter

App roda dentro de `<BrowserRouter>` no default export de `App.tsx`.
`currentTab` deixou de ser state e virou **derivado** de `useLocation()`
via `tabFromPath(pathname)`. `setCurrentTab(tab)` foi preservado como
callback estável que por baixo chama `navigate(pathFromTab(tab))` —
todos os consumers continuam funcionando sem mudar.

### Mapa canônico

| URL | Tab |
|---|---|
| `/` | Home |
| `/academia` | Academia |
| `/comunidade` | Comunidade |
| `/conversas` | Conversas |
| `/perfil` | Perfil |
| `/conselheiro` | Conselheiro |
| `/admin` | Admin |

`PublicShell` (marketing/blog/trilhas/turma-landing/privacy/terms) é
detectado **ANTES** do BrowserRouter via `getPublicPageFromUrl()` em
`App.tsx`. Isso garante que crawlers e visitantes anônimos NUNCA
disparem `GET /api/auth/me` em first paint.

### Rotas first-class persistentes

Sobrevivem refresh / back / forward / share:

- **Comunidade**: `/c/:slug` e `/c/:slug/p/:id` (autenticadas — NÃO em
  `getPublicPageFromUrl`).
- **Perfil público**: `/u/:id` e
  `/u/:id/{posts,comentarios,comunidades,conquistas,salvos,sobre}`.
- **Perfil próprio**: `/perfil/...` aceita as mesmas tabs **+
  `assinaturas` e `configuracoes`** (extras quando `isSelf`).
- **DM**: `/conversas/:id` (conversa ativa).
- **Academia**: `/academia/curso/:id`,
  `/academia/curso/:id/aula/:lessonId`, `/video/:id`.
- **Filtro de segmento em Academia**: `?segmento=…` (modo `replace`,
  valida contra `SEGMENTS`, omite quando default/all).

## Sync URL ↔ Context (Academia/Vídeo)

`AppContent` instala 2 `useEffect` que mantêm URL em sync com
`currentCourseId` / `isInCourseDetail` / `currentVideoId` /
`isInVideoPage`. Branch "fechar" do segundo effect usa `useRef`
(`prevCourseDetail` / `prevVideoPage`) pra só disparar em transição
true→false **REAL** — sem isso, deep-link em `/academia/curso/5` causa
ping-pong de redirect (effect dispara antes da hidratação).

Aula via `sessionStorage["rayo-pending-lesson"]` consumido em
`CourseDetailPage` (rola até `[data-lesson-id="<id>"]` +
`.rayo-comment-highlight`).

## PerfilPage

Deriva tudo da URL via 2 regex:

```
PROFILE_TAB_SLUGS = "posts|comentarios|comunidades|conquistas|salvos|sobre"
```

`isSelf` aceita `assinaturas|configuracoes` adicionais. **Sempre que
adicionar tab nova ao `UserProfilePage`, ATUALIZE `PROFILE_TAB_SLUGS`** —
slug não-reconhecido faz `otherProfileId=null` e fecha o overlay
sozinho.

`<Tabs>` (Radix/shadcn) NUNCA pode receber `value` E `defaultValue` ao
mesmo tempo (Radix trava). Use spread condicional.

## CustomEvents (cards/busca → abas)

`rayo:open-{profile,post,community}` continuam sendo a ponte entre cards
e abas. Listeners no `AppContent` mapeiam pra `setCurrentTab` +
`navigate`.

**Não chame `onTabChange("perfil")` ANTES do dispatch** — cria entrada
intermediária no histórico (back vai pro Perfil sem contexto antes do
destino real).

## Privacy = overlay puro

`Privacy` virou overlay (state `showPrivacyOverlay`) em vez de tab.
`setCurrentTab("privacy")` é interceptado por compat e não mexe em URL.

## Login redirect

Após auth bem-sucedido, `useEffect` empurra `/login` / `/cadastro` →
`/` com `replace: true` (não polui histórico).

## Re-tap aba ativa = scroll-top

`Navigation` / `DesktopSidebar` checam `isActive` e disparam
`dispatchScrollTop(tabId)` em vez de `onTabChange`. Listener global em
`App.tsx` rola `window`. Páginas com side-effects extras escutam via
`onScrollTop()` (`src/lib/scrollTop.ts`):

- `ComunidadePage` reseta `activeCommunitySlug`.
- `PerfilPage` fecha overlay público.
- `ConversasPage` fecha conversa aberta.

## Click target hierarchy nos cards (padrão Facebook)

Helpers em `src/lib/cardClickTargets.ts`. Alvos:

| Onde | Ação |
|---|---|
| Avatar / nome | Perfil (`openProfileById`) |
| Imagem | Lightbox (`PostImageLightbox` via portal) |
| Corpo neutro do card | Discussão / detalhe |
| Texto `c/<slug>` | Comunidade (`openCommunityBySlug`) |
| Botões internos | Ação isolada (com `stopBubble` / `stopPropagation`) |

Wrapper é `<div role="button">` (NUNCA aninhar `<a>` em `<a>`/`<button>`).

**`cardKeyHandler` só dispara quando `e.target === e.currentTarget`** —
sem essa guarda, Enter/Espaço num filho aciona ambos (tab navigation
quebra). Cada região tem `aria-label` distinto e foco visível.

## Dialogs / overlays globais (App.tsx)

Diálogos montados na raiz (Privacy overlay, ConsentBanner, diálogo de
confirmação de e-mail expirado) usam Radix `<Dialog>` ou portal direto —
isso evita conflito com `transform` em ancestrais (ver gotcha do
`CommentsPanel via Portal` em `comunidade.md`). Ordem de montagem
importa: Radix gerencia z-index via `Layer`, mas overlay puro precisa
estar abaixo dos diálogos pra não roubar foco.
