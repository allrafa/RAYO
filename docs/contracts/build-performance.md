# Build & Performance

Contratos de build, code splitting e bundle size. Mexa aqui antes de
tocar em `vite.config.ts`, `src/App.tsx` (lazy imports), ou
`src/components/RouteFallback.tsx`.

## Code splitting por rota

Cada área pesada é chunk lazy (`React.lazy` + `<Suspense>`):

- Academia, Comunidade, Conversas, Perfil, Conselheiro, Admin, Video,
  Landing, Privacy, Terms.
- Marketing pages (`/recursos`, `/como-funciona`, `/empresa`,
  `/contato`, `/faq`, `/imprensa`).
- Trilhas (`/trilhas`, `/trilhas/:slug`, `/trilhas/sucesso`).
- Blog (`/blog`, `/blog/:slug`).
- TurmaLanding standalone.

### Eager (NÃO lazificar)

- `HomePage` — entrada principal.
- `AuthPage`, `WelcomeScreen`, `Onboarding`, `ConsentBanner` — fluxo
  inicial precisa estar pronto.
- `Navigation`, `TopNavbar`, `DesktopSidebar` — UI persistente.
- **`CentralConversasPage`** — `HomePage` importa estaticamente.
  Lazificar dispara warning do Vite (`dynamic import in static-imported
  module`) e gera chunk inutilizado.

### Helper `lazyNamed`

`lazyNamed(loader, name)` em `App.tsx` adapta export **nomeado** pro
default que `React.lazy` exige. Type-safe via conditional type — sem
`any`.

```ts
const ComunidadePage = lazyNamed(
  () => import("./components/ComunidadePage"),
  "ComunidadePage"
);
```

### Skeletons

`src/components/RouteFallback.tsx`:

- `RouteFallback` — fallback in-page (mantém TopNavbar/sidebar).
- `PublicRouteFallback` — full-screen (rotas sem shell).

## Bundle size atual

| | Antes | Depois | Delta |
|---|---|---|---|
| Bundle inicial | 1751 kB | 1159 kB | **-34%** |
| Gzip | 498 kB | 351 kB | **-30%** |

Warning do Vite "chunks > 500 kB" continua aparecendo no build — é
informativo, não erro. Subir esse limite só se justifica com profile
real (usar `rollup-plugin-visualizer` antes).

## Vite middleware em dev

`server/index.ts` integra Vite como middleware do Express em dev (mesma
porta que a API). Isso significa:

- Ajustes de CORS / cookies usam o mesmo origin.
- Vite HMR funciona via WebSocket no mesmo host.
- Em prod, `npm run build` gera `dist/` e o Express serve estático
  (`Server: Serving static build`).

### `server.allowedHosts: true`

Replit serve o preview através de um proxy iframe — requisições chegam
de origin diferente. `vite.config.ts` precisa de `server.allowedHosts:
true` (ou allowlist explícita), senão o Vite recusa o request com
"Blocked request. This host is not allowed".

## Cache headers em dev

Em dev, o Express desabilita cache em respostas HTML pra evitar que o
preview iframe sirva versão velha. Gating por `NODE_ENV !== "production"`.
