// Task #99 (extensão) + Task #111 — SEO/SSR-leve para rotas públicas.
// O frontend é SPA (React + Vite), então o HTML cru servido pra crawlers
// que não rodam JS (Facebook bot, WhatsApp link preview, Slack unfurl,
// GoogleBot legacy, validadores de painel OAuth) sai praticamente vazio:
// só o `<div id="root">`.
//
// Esse módulo faz três coisas pra cada request de rota pública:
//   1. Injeta no `<head>` as tags certas: <title>, <meta description>,
//      <link rel="canonical">, OpenGraph (FB/LinkedIn/WhatsApp) e Twitter.
//   2. (Opcional) Injeta JSON-LD (schema.org) — Organization+WebSite na
//      home, Article em /blog/:slug, ProfilePage em /u/:id, Course em
//      /turmas/:id. Ajuda Google/Bing a entender o tipo de página.
//   3. (Opcional) Injeta <noscript> com HTML estático (usado em
//      /excluir-dados pro validador do Facebook).
//
// Rotas dinâmicas (/blog/:slug, /u/:id, /turmas/:id) são resolvidas via
// `resolvePublicMeta(path)` que consulta o banco com cache em memória
// curto (60s) pra não martelar o Postgres.

import { query } from "../../db/index.js";
import { resolveStoredMediaUrl } from "../../lib/objectStorageBridge.js";

const SITE = (process.env.PUBLIC_SITE_URL || "https://rayo.app.br").replace(
  /\/+$/,
  "",
);
const DEFAULT_OG = `${SITE}/og-default.png`;

// Task #111 — resolve qualquer referência de imagem (objstore://, /uploads/...,
// http(s)://) em URL absoluta utilizável por crawler de OG. Caso a referência
// não vire absoluta (ex.: legado órfão), cai pro DEFAULT_OG pra não quebrar
// o card de preview.
async function toAbsoluteImageUrl(ref: string | null | undefined): Promise<string> {
  if (!ref) return DEFAULT_OG;
  try {
    const resolved = await resolveStoredMediaUrl(ref);
    if (resolved && /^https?:\/\//i.test(resolved)) return resolved;
    if (resolved && resolved.startsWith("/")) return `${SITE}${resolved}`;
  } catch {
    /* fall through */
  }
  return DEFAULT_OG;
}

export interface JsonLd {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

export interface PublicMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  /** og:type — default "website". Use "article" / "profile" pra páginas dinâmicas. */
  ogType?: string;
  /** Lista de blocos JSON-LD a injetar no <head>. */
  jsonLd?: JsonLd[];
  /** HTML estático para `<noscript>`. Opcional — se ausente, só meta tags. */
  noscriptHtml?: string;
  /** href para `<link rel="alternate" type="application/rss+xml">`. Opcional. */
  alternateRss?: string;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// JSON-LD não pode ter `</script>` no meio (XSS escape) — basta trocar `<` por `\u003c`.
const escapeJsonLd = (v: unknown): string =>
  JSON.stringify(v).replace(/</g, "\\u003c");

const ORGANIZATION_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RAYO",
  url: SITE,
  logo: `${SITE}/og-default.png`,
  sameAs: [],
};

const WEBSITE_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "RAYO",
  url: SITE,
  inLanguage: "pt-BR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE}/blog?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const EXCLUIR_DADOS_NOSCRIPT = `
<main style="max-width:760px;margin:0 auto;padding:32px 24px;font-family:system-ui,sans-serif;line-height:1.6;color:#1a1612;">
  <h1>Exclusão de dados — RAYO</h1>
  <p>Você é dono dos seus dados. Veja como apagar sua conta no RAYO e todos
  os dados pessoais associados, em conformidade com a LGPD.</p>

  <h2>1. Pelo próprio app</h2>
  <ol>
    <li>Acesse <a href="https://rayo.app.br">rayo.app.br</a> e faça login.</li>
    <li>Toque em <strong>Perfil</strong>.</li>
    <li>Abra <strong>Configurações</strong> &rarr; <strong>Privacidade · LGPD</strong>.</li>
    <li>Toque em <strong>Excluir minha conta</strong> e confirme.</li>
  </ol>

  <h2>2. Por e-mail (caso não consiga logar)</h2>
  <p>Escreva para <strong>dpo@rayo.app.br</strong> com o assunto
  &quot;Exclusão de conta&quot;. Resposta em até 5 dias úteis,
  exclusão concluída em até 30 dias corridos.</p>

  <h2>3. O que é apagado</h2>
  <ul>
    <li>Dados de cadastro (nome, e-mail, foto, telefone, segmentos).</li>
    <li>Histórico de progresso, conquistas, XP, badges e missões.</li>
    <li>Mensagens diretas (ambos os lados deixam de ver o conteúdo).</li>
    <li>Inscrições em comunidades, seguidores e curtidas.</li>
    <li>Tokens de login social (Google e Facebook).</li>
  </ul>

  <h2>4. Login com Google ou Facebook</h2>
  <p>A exclusão da conta no RAYO revoga automaticamente o vínculo com Google
  e Facebook. Você também pode revogar diretamente nos provedores:</p>
  <ul>
    <li>Google: <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a></li>
    <li>Facebook: <a href="https://www.facebook.com/settings?tab=applications">facebook.com/settings &rarr; Apps e sites</a></li>
  </ul>

  <h2>5. Dúvidas</h2>
  <p>Encarregado de dados: <strong>dpo@rayo.app.br</strong>.
  Política completa em <a href="https://rayo.app.br/privacy">rayo.app.br/privacy</a>.</p>
</main>
`;

// Task #111 — BreadcrumbList helper para todas as páginas marketing.
// Google usa pra mostrar trilha de navegação na SERP.
function breadcrumb(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
const HOME_CRUMB = { name: "Início", url: `${SITE}/` };

// Registry: path exato (sem trailing slash) -> meta. Adicionar nova rota
// pública estática aqui é o único lugar a tocar — o middleware faz o resto.
export const PUBLIC_META: Record<string, PublicMeta> = {
  "/": {
    title: "RAYO — Conteúdo, comunidade e práticas para fortalecer famílias",
    description:
      "Plataforma digital para famílias em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados e Pais. Cursos, comunidade, missões e turmas.",
    canonical: `${SITE}/`,
    jsonLd: [ORGANIZATION_LD, WEBSITE_LD],
  },
  "/recursos": {
    title: "Recursos · RAYO",
    description:
      "Conheça os recursos do RAYO: turmas, comunidade, missões, cursos, áudios, livros e mais.",
    canonical: `${SITE}/recursos`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Recursos", url: `${SITE}/recursos` }])],
  },
  "/como-funciona": {
    title: "Como funciona · RAYO",
    description:
      "Entenda como o RAYO acompanha cada fase da sua família com conteúdo, comunidade e práticas guiadas.",
    canonical: `${SITE}/como-funciona`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Como funciona", url: `${SITE}/como-funciona` }])],
  },
  "/empresa": {
    title: "Empresa · RAYO",
    description:
      "Quem somos, missão, valores e o time por trás do RAYO.",
    canonical: `${SITE}/empresa`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Empresa", url: `${SITE}/empresa` }])],
  },
  "/contato": {
    title: "Contato · RAYO",
    description:
      "Suporte, parcerias, imprensa, ideias para o produto. Respondemos em até um dia útil.",
    canonical: `${SITE}/contato`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Contato", url: `${SITE}/contato` }])],
  },
  "/faq": {
    title: "Perguntas frequentes · RAYO",
    description:
      "Respostas rápidas sobre conta, planos, conteúdo, comunidade e privacidade no RAYO.",
    canonical: `${SITE}/faq`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "FAQ", url: `${SITE}/faq` }])],
  },
  "/imprensa": {
    title: "Imprensa · RAYO",
    description:
      "Materiais para imprensa, kit de marca e canais oficiais para falar com o RAYO.",
    canonical: `${SITE}/imprensa`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Imprensa", url: `${SITE}/imprensa` }])],
  },
  "/blog": {
    title: "Blog · RAYO",
    description:
      "Reflexões, práticas e estudos sobre família, relacionamentos e formação espiritual.",
    canonical: `${SITE}/blog`,
    alternateRss: `${SITE}/blog/feed.xml`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Blog", url: `${SITE}/blog` }])],
  },
  "/privacy": {
    title: "Política de Privacidade · RAYO",
    description:
      "Como o RAYO coleta, usa, armazena e protege seus dados pessoais — em conformidade com a LGPD.",
    canonical: `${SITE}/privacy`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Privacidade", url: `${SITE}/privacy` }])],
  },
  "/terms": {
    title: "Termos de Uso · RAYO",
    description:
      "Termos e condições para uso da plataforma RAYO.",
    canonical: `${SITE}/terms`,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Termos", url: `${SITE}/terms` }])],
  },
  "/excluir-dados": {
    title: "Exclusão de dados · RAYO",
    description:
      "Como excluir sua conta e todos os dados pessoais associados ao RAYO. Conformidade LGPD + Login do Google e Facebook.",
    canonical: `${SITE}/excluir-dados`,
    noscriptHtml: EXCLUIR_DADOS_NOSCRIPT,
    jsonLd: [breadcrumb([HOME_CRUMB, { name: "Exclusão de dados", url: `${SITE}/excluir-dados` }])],
  },
};

// ---------------------------------------------------------------------------
// Cache em memória curto (60s) pra resolvers dinâmicos. Bots costumam
// fazer várias hits em sequência; cachear evita queries duplicadas.
// ---------------------------------------------------------------------------
interface CacheEntry {
  value: PublicMeta | null;
  expiresAt: number;
}
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

function cacheGet(key: string): PublicMeta | null | undefined {
  const e = CACHE.get(key);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    CACHE.delete(key);
    return undefined;
  }
  return e.value;
}
function cacheSet(key: string, value: PublicMeta | null): void {
  // Limita tamanho pra não vazar memória se o servidor receber URLs aleatórias.
  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const truncate = (s: string, max: number): string =>
  s.length <= max ? s : `${s.slice(0, max - 1)}…`;

const stripMarkdown = (s: string): string =>
  s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------
// Resolvers dinâmicos. Cada um devolve um PublicMeta ou null (404 → cai no
// SPA shell normal sem injeção custom).
// ---------------------------------------------------------------------------

async function resolveBlogPost(slug: string): Promise<PublicMeta | null> {
  const { rows } = await query<{
    title: string;
    short_description: string | null;
    long_description: string | null;
    cover_url: string | null;
    author: string | null;
    published_at: Date | null;
    updated_at: Date | null;
  }>(
    `SELECT title, short_description, long_description, cover_url, author,
            published_at, updated_at
       FROM content_items
      WHERE kind = 'artigo' AND status = 'published' AND slug = $1
      LIMIT 1`,
    [slug],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  const desc = truncate(
    stripMarkdown(r.short_description || r.long_description || ""),
    200,
  ) || "Artigo do blog do RAYO.";
  const canonical = `${SITE}/blog/${encodeURIComponent(slug)}`;
  const ogImage = await toAbsoluteImageUrl(r.cover_url);
  const articleLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: r.title,
    description: desc,
    image: ogImage,
    author: r.author ? { "@type": "Person", name: r.author } : undefined,
    publisher: {
      "@type": "Organization",
      name: "RAYO",
      logo: { "@type": "ImageObject", url: `${SITE}/og-default.png` },
    },
    datePublished: r.published_at ? new Date(r.published_at).toISOString() : undefined,
    dateModified: r.updated_at
      ? new Date(r.updated_at).toISOString()
      : r.published_at
        ? new Date(r.published_at).toISOString()
        : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "pt-BR",
  };
  const crumbs = breadcrumb([
    HOME_CRUMB,
    { name: "Blog", url: `${SITE}/blog` },
    { name: r.title, url: canonical },
  ]);
  return {
    title: `${r.title} · RAYO`,
    description: desc,
    canonical,
    ogImage,
    ogType: "article",
    alternateRss: `${SITE}/blog/feed.xml`,
    jsonLd: [articleLd, crumbs],
  };
}

async function resolveUserProfile(id: number): Promise<PublicMeta | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const { rows } = await query<{
    name: string | null;
    bio: string | null;
    avatar_url: string | null;
  }>(
    `SELECT name, bio, avatar_url FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  const name = (r.name || "").trim() || "Membro do RAYO";
  const bio = truncate((r.bio || "").trim(), 200) || `Perfil de ${name} no RAYO.`;
  const canonical = `${SITE}/u/${id}`;
  // avatar_url pode ser sentinel objstore:// ou /uploads/avatar/... — pra OG
  // precisamos de URL absoluta. toAbsoluteImageUrl assina objstore:// pra
  // signed URL pública (TTL 7d) e prefixa /uploads/... com SITE.
  const ogImage = await toAbsoluteImageUrl(r.avatar_url);
  const profileLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name,
      description: bio,
      image: ogImage,
      url: canonical,
    },
    inLanguage: "pt-BR",
  };
  return {
    title: `${name} · RAYO`,
    description: bio,
    canonical,
    ogImage,
    ogType: "profile",
    jsonLd: [profileLd],
  };
}

async function resolveTurma(id: number): Promise<PublicMeta | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const { rows } = await query<{
    title: string;
    subtitle: string | null;
    description: string | null;
    thumbnail: string | null;
    hero_cover_url: string | null;
    instructor: string | null;
  }>(
    `SELECT title, subtitle, description, thumbnail, hero_cover_url, instructor
       FROM courses
      WHERE id = $1 AND is_active = TRUE
      LIMIT 1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  const desc = truncate(
    stripMarkdown(r.subtitle || r.description || ""),
    200,
  ) || `Conheça a turma "${r.title}" no RAYO.`;
  const canonical = `${SITE}/turmas/${id}`;
  const heroOrThumb = r.hero_cover_url || r.thumbnail;
  const ogImage = await toAbsoluteImageUrl(heroOrThumb);
  const courseLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: r.title,
    description: desc,
    url: canonical,
    image: ogImage,
    provider: {
      "@type": "Organization",
      name: "RAYO",
      sameAs: SITE,
    },
    instructor: r.instructor ? { "@type": "Person", name: r.instructor } : undefined,
    inLanguage: "pt-BR",
  };
  return {
    title: `${r.title} · RAYO`,
    description: desc,
    canonical,
    ogImage,
    ogType: "website",
    jsonLd: [courseLd],
  };
}

/**
 * Resolve um path em PublicMeta — primeiro consulta o registry estático,
 * depois tenta os padrões dinâmicos (/blog/:slug, /u/:id, /turmas/:id).
 * Devolve `null` quando não existe meta pra esse path (deixa o middleware
 * pular pro fallback normal do SPA).
 *
 * Usa cache em memória de 60s (vide topo do arquivo). Falhas de DB são
 * silenciadas — log no chamador, retorna null pra não derrubar a página.
 */
export async function resolvePublicMeta(rawPath: string): Promise<PublicMeta | null> {
  const path = normalizePath(rawPath);
  // Estático tem precedência (e nem usa cache — é constante em memória).
  const staticMeta = PUBLIC_META[path];
  if (staticMeta) return staticMeta;

  // Cache hit?
  const cached = cacheGet(path);
  if (cached !== undefined) return cached;

  let resolved: PublicMeta | null = null;
  try {
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/blog\/([a-zA-Z0-9-]{1,200})$/))) {
      resolved = await resolveBlogPost(m[1]);
    } else if ((m = path.match(/^\/u\/(\d{1,10})$/))) {
      resolved = await resolveUserProfile(parseInt(m[1], 10));
    } else if ((m = path.match(/^\/turmas\/(\d{1,10})$/))) {
      resolved = await resolveTurma(parseInt(m[1], 10));
    }
  } catch {
    resolved = null;
  }

  cacheSet(path, resolved);
  return resolved;
}

/**
 * Aplica `meta` ao HTML do index do Vite/build, retornando uma nova string.
 * Idempotente o suficiente: substitui `<title>` se houver e injeta tags
 * antes de `</head>`. O `<noscript>` (quando presente) entra logo após
 * `<body ...>` para que crawlers que param de parsear no primeiro div
 * já tenham capturado o conteúdo essencial.
 */
export function applyPublicMeta(html: string, meta: PublicMeta): string {
  let out = html;

  out = out.replace(/<html\s+lang="[^"]*"/i, '<html lang="pt-BR"');

  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(meta.title)}</title>`,
    );
  }

  const ogImage = meta.ogImage || DEFAULT_OG;
  const ogType = meta.ogType || "website";
  let headTags = `
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${meta.canonical}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="RAYO" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
  `;
  if (meta.alternateRss) {
    headTags += `\n    <link rel="alternate" type="application/rss+xml" title="Blog · RAYO" href="${meta.alternateRss}" />`;
  }
  if (meta.jsonLd && meta.jsonLd.length > 0) {
    for (const ld of meta.jsonLd) {
      headTags += `\n    <script type="application/ld+json">${escapeJsonLd(ld)}</script>`;
    }
  }
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${headTags}</head>`);
  }

  if (meta.noscriptHtml) {
    const block = `<noscript>${meta.noscriptHtml}</noscript>`;
    if (/<body([^>]*)>/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, `<body$1>${block}`);
    }
  }

  return out;
}

/** Normaliza o path: remove trailing slash, devolve "/" pra raiz. */
export function normalizePath(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}
