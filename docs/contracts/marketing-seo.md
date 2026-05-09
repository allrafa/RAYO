# Site Público / Marketing & SEO (Tasks #70, #111)

Contratos consolidados do site público (marketing, blog, contato) e do SEO server-side. Mexa aqui antes de tocar em `src/components/marketing/`, `src/styles/marketing-rayo.css`, `server/features/seo/` ou `server/features/blog/`.

## Visão geral

9 páginas públicas servidas SEM autenticação — `/recursos`, `/como-funciona`, `/empresa`, `/contato`, `/faq`, `/imprensa`, `/blog`, `/blog/:slug` e (mantidos) `/privacy`, `/terms`. CSS isolado em `src/styles/marketing-rayo.css` (todo prefixado por `.marketing-page` via `PublicLayout`). Roteamento detectado em `App.tsx` (`getPublicPageFromUrl`) ANTES dos gates de auth — a URL é a única fonte de verdade, full-reload nos links é OK.

**Blog público**: posts são `content_items` com `kind='artigo'` (sem nova tabela). Endpoints públicos `GET /api/blog/posts` (lista) e `GET /api/blog/posts/:slug` (detalhe + view_count++). Admin usa o CMS existente (kind "Artigo"). Renderização do corpo em Markdown safe sem `dangerouslySetInnerHTML` (`src/components/marketing/markdown.tsx`).

**Formulário /contato**: `POST /api/contato` validado (nome 2–120, email regex, assunto 2–120, mensagem 10–5000), rate-limited a 3/h por IP, dispara e-mail HTML+texto via `sendContatoEmail` (Resend) para `CONTATO_TO_EMAIL`. Quando Resend não está configurado em dev, responde `{ok:true, delivered:false}` em vez de erro.

**SEO público**: `/sitemap.xml` lista todas as páginas públicas + slugs de artigos publicados + turmas (lê de `content_items` / `courses` com cache HTTP 1h). `/robots.txt` libera as públicas e bloqueia `/api/`, `/admin`, `/perfil`, `/conversas`, `/u/`. Cada página marketing usa `useSeoMeta({title, description, canonical, ogImage?})` para hidratar `<title>`, meta description, canonical e OpenGraph/Twitter no client. Para bots/social-cards, `server/features/seo/publicMeta.ts` resolve meta + JSON-LD (Organization/WebSite/Breadcrumb + Article/ProfilePage/Course) server-side em `/blog/:slug`, `/u/:id` e `/turmas/:id`. Headers extras: `Permissions-Policy`, CSP report-only com coletor em `POST /api/csp-report`. `/.well-known/security.txt` puxa `SECURITY_CONTACT_EMAIL` / `DPO_CONTACT_EMAIL` / `SECURITY_POLICY_URL`. RSS feed em `/blog/feed.xml` (LIMIT 30, cache 15min).

## Gotchas

### CMS kind 'artigo'
`content_items.kind` aceita `artigo` desde Maio/2026. A constraint `content_items_kind_check` é re-criada idempotentemente no boot (`DROP + ADD`) se ainda não tiver `artigo`. O blog público filtra por `kind='artigo' AND status='published' AND slug IS NOT NULL`. **NÃO use uma tabela `blog_posts` separada.**

### Marketing CSS scope
`src/styles/marketing-rayo.css` tem todos os seletores prefixados por `.marketing-page` para não vazar nos demais layouts. **NÃO crie regras globais (sem prefixo) nesse arquivo.**

### Public route gate
`App` (default export em `src/App.tsx`) chama `getPublicPageFromUrl()` ANTES de instanciar `AuthProvider` e renderiza `<PublicShell />` direto quando o path é uma página pública. Isso garante que crawlers e visitantes anônimos NUNCA disparem `GET /api/auth/me` em first paint. Para adicionar nova rota pública, atualize `getPublicPageFromUrl`, `PublicPage` e o `switch` em `PublicShell`.

### Auth deep links
`/login` e `/cadastro` são entradas diretas no fluxo de auth — `getInitialAuthIntent()` em `App.tsx` mapeia o path para `preAuthStage='auth'` + `authStartMode` correto, pulando welcome/onboarding. CTAs do site marketing devem usar essas URLs (não `/?auth=...`).

### Blog read cache
`GET /api/blog/posts` e `GET /api/blog/posts/:slug` enviam `Cache-Control: public, max-age=300, s-maxage=300` (5min). Cuidado ao mudar — `view_count++` ainda corre no servidor a cada hit que chega na origem.

### OG default image
`useSeoMeta` injeta `https://rayo.app.br/og-default.png` quando a página não passa `ogImage`. **Adicione esse arquivo nos assets antes do deploy de produção.**
