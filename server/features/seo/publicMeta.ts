// Task #99 (extensão) — SEO/SSR-leve para rotas públicas (marketing,
// privacy, terms, excluir-dados). O frontend é SPA (React + Vite), então
// o HTML cru servido pra crawlers/bots que não rodam JS (Facebook bot,
// WhatsApp link preview, Slack unfurl, GoogleBot legacy, validadores de
// painel OAuth, etc.) sai praticamente vazio: só o `<div id="root">`.
//
// Esse módulo faz duas coisas pra cada request de rota pública:
//   1. Injeta no `<head>` as tags certas: <title>, <meta description>,
//      <link rel="canonical">, OpenGraph completo (FB/LinkedIn/WhatsApp)
//      e Twitter Card. Sem JS, todo crawler já enxerga título e preview.
//   2. (Opcional, por rota) Injeta um bloco `<noscript>` com o conteúdo
//      essencial em HTML estático. Necessário para validadores que
//      checam se a página fala do assunto certo (ex: o painel de Login
//      do Facebook exige uma URL de instruções de exclusão de dados que
//      seja "uma página válida" — sem JS ele só vê o que estiver no HTML
//      cru). Também ajuda em acessibilidade e em buscadores antigos.

const SITE = (process.env.PUBLIC_SITE_URL || "https://rayo.app.br").replace(
  /\/+$/,
  "",
);
const DEFAULT_OG = `${SITE}/og-default.png`;

export interface PublicMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  /** HTML estático para `<noscript>`. Opcional — se ausente, só meta tags. */
  noscriptHtml?: string;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Conteúdo plain-HTML mínimo que descreve a página de exclusão de dados.
// Espelha as seções da SPA. Mantenha curto: o objetivo é o crawler do
// Facebook conseguir validar a URL como uma página de instruções real,
// não substituir a página interativa.
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

// Registry: path exato (sem trailing slash) -> meta. Adicionar nova rota
// pública aqui é o único lugar a tocar — o middleware faz o resto.
export const PUBLIC_META: Record<string, PublicMeta> = {
  "/": {
    title: "RAYO — Conteúdo, comunidade e práticas para fortalecer famílias",
    description:
      "Plataforma digital para famílias em cinco contextos de vida: Solteiro, Namoro, Noivos, Casados e Pais. Cursos, comunidade, missões e turmas.",
    canonical: `${SITE}/`,
  },
  "/recursos": {
    title: "Recursos · RAYO",
    description:
      "Conheça os recursos do RAYO: turmas, comunidade, missões, cursos, áudios, livros e mais.",
    canonical: `${SITE}/recursos`,
  },
  "/como-funciona": {
    title: "Como funciona · RAYO",
    description:
      "Entenda como o RAYO acompanha cada fase da sua família com conteúdo, comunidade e práticas guiadas.",
    canonical: `${SITE}/como-funciona`,
  },
  "/empresa": {
    title: "Empresa · RAYO",
    description:
      "Quem somos, missão, valores e o time por trás do RAYO.",
    canonical: `${SITE}/empresa`,
  },
  "/contato": {
    title: "Contato · RAYO",
    description:
      "Suporte, parcerias, imprensa, ideias para o produto. Respondemos em até um dia útil.",
    canonical: `${SITE}/contato`,
  },
  "/faq": {
    title: "Perguntas frequentes · RAYO",
    description:
      "Respostas rápidas sobre conta, planos, conteúdo, comunidade e privacidade no RAYO.",
    canonical: `${SITE}/faq`,
  },
  "/imprensa": {
    title: "Imprensa · RAYO",
    description:
      "Materiais para imprensa, kit de marca e canais oficiais para falar com o RAYO.",
    canonical: `${SITE}/imprensa`,
  },
  "/blog": {
    title: "Blog · RAYO",
    description:
      "Reflexões, práticas e estudos sobre família, relacionamentos e formação espiritual.",
    canonical: `${SITE}/blog`,
  },
  "/privacy": {
    title: "Política de Privacidade · RAYO",
    description:
      "Como o RAYO coleta, usa, armazena e protege seus dados pessoais — em conformidade com a LGPD.",
    canonical: `${SITE}/privacy`,
  },
  "/terms": {
    title: "Termos de Uso · RAYO",
    description:
      "Termos e condições para uso da plataforma RAYO.",
    canonical: `${SITE}/terms`,
  },
  "/excluir-dados": {
    title: "Exclusão de dados · RAYO",
    description:
      "Como excluir sua conta e todos os dados pessoais associados ao RAYO. Conformidade LGPD + Login do Google e Facebook.",
    canonical: `${SITE}/excluir-dados`,
    noscriptHtml: EXCLUIR_DADOS_NOSCRIPT,
  },
};

/**
 * Aplica `meta` ao HTML do index do Vite/build, retornando uma nova string.
 * Idempotente o suficiente: substitui `<title>` se houver e injeta tags
 * antes de `</head>`. O `<noscript>` (quando presente) entra logo após
 * `<body ...>` para que crawlers que param de parsear no primeiro div
 * já tenham capturado o conteúdo essencial.
 */
export function applyPublicMeta(html: string, meta: PublicMeta): string {
  let out = html;

  // Garante lang correto (template original está com "en" — corrigir só
  // pra rotas públicas é seguro e não afeta o app autenticado, que
  // recebe o mesmo HTML mas não é indexado).
  out = out.replace(/<html\s+lang="[^"]*"/i, '<html lang="pt-BR"');

  // Substitui o <title> default. Se não houver <title>, injeta junto com
  // o resto antes de </head>.
  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(meta.title)}</title>`,
    );
  }

  const ogImage = meta.ogImage || DEFAULT_OG;
  const headTags = `
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${meta.canonical}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="RAYO" />
    <meta property="og:locale" content="pt_BR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
  `;
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
