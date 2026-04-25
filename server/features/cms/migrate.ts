import { query } from "../../db/index.js";

// Idempotent migration: seeds books (from legacy mockBooks) and existing
// courses into content_items so the new CMS owns the catalogue. Runs after
// schema initialization on every boot. A migration row is considered
// already-applied when a content_item with the same `slug` exists.

interface VideoSeed {
  slug: string;
  title: string;
  short_description: string;
  long_description: string;
  cover_url: string;
  duration_seconds: number;
  segments: string[];
  interests: string[];
  tags: string[];
}

// Migrated from VideoPage's `mockVideos` so the public video catalogue lives
// in the CMS. external_url is null for now — these were thumbnail-only mocks
// in the legacy code; producers can attach real media files via the upload
// endpoint, which writes to media_url.
const VIDEO_SEEDS: VideoSeed[] = [
  {
    slug: "como-transformar-seu-casamento-em-30-dias",
    title: "Como Transformar Seu Casamento em 30 Dias",
    short_description: "5 estratégias fundamentais que salvaram mais de 10.000 casamentos.",
    long_description: "Descubra as 5 estratégias fundamentais que salvaram mais de 10.000 casamentos. Jessica e Rafa Raio compartilham insights exclusivos baseados em 15 anos de experiência.",
    cover_url: "https://images.unsplash.com/photo-1522621032211-ac0031dfbddc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    duration_seconds: 45 * 60 + 32,
    segments: ["casados"], interests: ["Relacionamentos"], tags: ["casamento"],
  },
  {
    slug: "5-sinais-relacionamento-precisa-ajuda",
    title: "5 Sinais de que Seu Relacionamento Precisa de Ajuda",
    short_description: "Identifique os sinais de alerta antes que seja tarde demais.",
    long_description: "Identifique os sinais de alerta antes que seja tarde demais. Este vídeo pode salvar seu relacionamento.",
    cover_url: "https://images.unsplash.com/photo-1601573264251-9c8015828db2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    duration_seconds: 23 * 60 + 15,
    segments: ["casados", "namorando"], interests: ["Relacionamentos"], tags: ["alerta", "casamento"],
  },
  {
    slug: "educar-filhos-com-disciplina-positiva",
    title: "Como Educar Filhos com Disciplina Positiva — Método RAIO",
    short_description: "Eduque sem gritos, castigos ou chantagens.",
    long_description: "Aprenda a educar seus filhos sem gritos, castigos ou chantagens. Método testado por mais de 50.000 famílias.",
    cover_url: "https://images.unsplash.com/photo-1551498800-17cbc39c85bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    duration_seconds: 38 * 60 + 47,
    segments: ["pais"], interests: ["Parentalidade"], tags: ["disciplina", "filhos"],
  },
  {
    slug: "financas-do-casal-organizar-dinheiro",
    title: "Finanças do Casal: Como Organizar o Dinheiro sem Brigas",
    short_description: "Método definitivo para casais organizarem as finanças em harmonia.",
    long_description: "O método definitivo para casais organizarem as finanças em harmonia. Inclui planilha gratuita.",
    cover_url: "https://images.unsplash.com/photo-1758686254415-9348b5b5df01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    duration_seconds: 52 * 60 + 18,
    segments: ["casados"], interests: ["Finanças"], tags: ["finanças", "casal"],
  },
  {
    slug: "intimidade-no-casamento-reconectando",
    title: "Intimidade no Casamento: Reconectando Corpo e Alma",
    short_description: "Reavive a intimidade no casamento de forma saudável e respeitosa.",
    long_description: "Como reavivar a intimidade no casamento de forma saudável e respeitosa. Conteúdo exclusivo para casais.",
    cover_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    duration_seconds: 29 * 60 + 33,
    segments: ["casados"], interests: ["Intimidade"], tags: ["intimidade", "casal"],
  },
];

interface BookSeed {
  slug: string;
  title: string;
  author: string;
  cover_url: string;
  short_description: string;
  long_description: string;
  pages: number;
  is_premium: boolean;
  price: number;
  segments: string[];
  interests: string[];
  tags: string[];
}

const BOOK_SEEDS: BookSeed[] = [
  {
    slug: "os-5-pilares-de-um-casamento-feliz",
    title: "Os 5 Pilares de um Casamento Feliz",
    author: "Dr. João Silva",
    cover_url: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop",
    short_description: "Os fundamentos essenciais para construir um relacionamento duradouro e feliz.",
    long_description: "Descubra os fundamentos essenciais para construir um relacionamento duradouro e feliz. Este livro apresenta estratégias práticas baseadas em décadas de pesquisa e experiência clínica.",
    pages: 200, is_premium: false, price: 0,
    segments: ["casados"], interests: ["Relacionamentos"],
    tags: ["casamento", "relacionamento", "família"],
  },
  {
    slug: "educacao-positiva-criando-filhos-resilientes",
    title: "Educação Positiva: Criando Filhos Resilientes",
    author: "Dra. Maria Santos",
    cover_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=600&fit=crop",
    short_description: "Técnicas comprovadas de disciplina positiva.",
    long_description: "Aprenda técnicas comprovadas de disciplina positiva para criar filhos emocionalmente inteligentes e resilientes. Com exemplos práticos e estudos de caso reais.",
    pages: 280, is_premium: true, price: 39.90,
    segments: ["pais"], interests: ["Parentalidade"],
    tags: ["filhos", "educação", "parentalidade"],
  },
  {
    slug: "financas-do-casal-prosperidade-juntos",
    title: "Finanças do Casal: Prosperidade Juntos",
    author: "Carlos Oliveira",
    cover_url: "https://images.unsplash.com/photo-1554224311-beee460201e4?w=400&h=600&fit=crop",
    short_description: "Organize suas finanças familiares e construa prosperidade juntos.",
    long_description: "Organize suas finanças familiares e construa prosperidade juntos. Métodos práticos para orçamento, investimentos e planejamento financeiro a dois.",
    pages: 156, is_premium: false, price: 0,
    segments: ["casados", "noivos"], interests: ["Finanças"],
    tags: ["finanças", "casal", "investimentos"],
  },
  {
    slug: "comunicacao-nao-violenta-em-familia",
    title: "Comunicação Não-Violenta em Família",
    author: "Ana Paula Costa",
    cover_url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=600&fit=crop",
    short_description: "Transforme a comunicação em sua família com técnicas de CNV.",
    long_description: "Transforme a comunicação em sua família com técnicas de CNV. Aprenda a expressar necessidades, ouvir com empatia e resolver conflitos de forma construtiva.",
    pages: 188, is_premium: false, price: 0,
    segments: ["casados", "pais"], interests: ["Comunicação"],
    tags: ["comunicação", "CNV", "família"],
  },
  {
    slug: "a-arte-de-educar-sem-gritar",
    title: "A Arte de Educar sem Gritar",
    author: "Pedro Henrique Lima",
    cover_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=600&fit=crop",
    short_description: "Estratégias eficazes para educar sem gritos.",
    long_description: "Descubra estratégias eficazes para educar seus filhos sem gritos, ameaças ou punições. Baseado em neurociência e psicologia infantil.",
    pages: 224, is_premium: true, price: 29.90,
    segments: ["pais"], interests: ["Parentalidade"],
    tags: ["educação", "disciplina", "parentalidade"],
  },
  {
    slug: "intimidade-e-conexao-no-casamento",
    title: "Intimidade e Conexão no Casamento",
    author: "Juliana Rodrigues",
    cover_url: "https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=600&fit=crop",
    short_description: "Fortaleça a intimidade emocional e física em seu casamento.",
    long_description: "Fortaleça a intimidade emocional e física em seu casamento. Um guia prático para casais que desejam aprofundar sua conexão.",
    pages: 176, is_premium: true, price: 34.90,
    segments: ["casados"], interests: ["Relacionamentos"],
    tags: ["intimidade", "casamento", "conexão"],
  },
  {
    slug: "proposito-de-vida-encontrando-seu-chamado",
    title: "Propósito de Vida: Encontrando seu Chamado",
    author: "Ricardo Almeida",
    cover_url: "https://images.unsplash.com/photo-1513001900722-370f803f498d?w=400&h=600&fit=crop",
    short_description: "Descubra seu propósito e viva uma vida com significado.",
    long_description: "Descubra seu propósito e viva uma vida com significado. Exercícios práticos e reflexões profundas para encontrar sua vocação.",
    pages: 240, is_premium: false, price: 0,
    segments: ["solteiro", "namoro"], interests: ["Propósito"],
    tags: ["propósito", "vocação", "significado"],
  },
  {
    slug: "gestao-do-tempo-para-pais-ocupados",
    title: "Gestão do Tempo para Pais Ocupados",
    author: "Fernanda Martins",
    cover_url: "https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=400&h=600&fit=crop",
    short_description: "Organize sua rotina e encontre equilíbrio.",
    long_description: "Organize sua rotina e encontre equilíbrio entre trabalho, família e autocuidado. Técnicas práticas de gestão de tempo para pais modernos.",
    pages: 192, is_premium: true, price: 27.90,
    segments: ["pais"], interests: ["Produtividade"],
    tags: ["tempo", "produtividade", "pais"],
  },
  {
    slug: "saude-mental-da-familia-moderna",
    title: "Saúde Mental da Família Moderna",
    author: "Dr. Lucas Ferreira",
    cover_url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=600&fit=crop",
    short_description: "Cuide da saúde mental de toda a família.",
    long_description: "Cuide da saúde mental de toda a família. Estratégias para lidar com ansiedade, estresse e desafios emocionais do mundo moderno.",
    pages: 264, is_premium: false, price: 0,
    segments: ["casados", "pais", "solteiro"], interests: ["Saúde Mental"],
    tags: ["saúde mental", "ansiedade", "família"],
  },
  {
    slug: "criando-vinculos-seguros-com-seus-filhos",
    title: "Criando Vínculos Seguros com seus Filhos",
    author: "Beatriz Camargo",
    cover_url: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=600&fit=crop",
    short_description: "Entenda a teoria do apego e como criar vínculos seguros.",
    long_description: "Entenda a teoria do apego e como criar vínculos seguros que durarão a vida toda. Baseado em pesquisas científicas sobre desenvolvimento infantil.",
    pages: 208, is_premium: true, price: 32.90,
    segments: ["pais"], interests: ["Parentalidade"],
    tags: ["apego", "vínculos", "desenvolvimento"],
  },
];

export async function migrateCmsContent() {
  // 1) Seed books — `ON CONFLICT (slug) DO NOTHING` makes this safe under
  // concurrent boots and against re-runs (slug is the natural key).
  for (const b of BOOK_SEEDS) {
    await query(
      `INSERT INTO content_items
        (kind, title, slug, short_description, long_description, cover_url,
         segments, interests, tags, status, is_premium, price, author, pages, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        "livro", b.title, b.slug, b.short_description, b.long_description, b.cover_url,
        b.segments, b.interests, b.tags, "published", b.is_premium, b.price,
        b.author, b.pages,
      ]
    );
  }

  // 2) Reflect existing courses (legacy seedCourses) as content_items kind='curso'.
  // The `course_id` column is the immutable join key; checking it first
  // avoids re-inserting when an admin renames the course (which would change
  // the derived slug). Falls back to slug-based ON CONFLICT for race safety.
  const { rows: courses } = await query(
    `SELECT id, title, description, thumbnail, life_context, is_premium, price, category, instructor
       FROM courses`
  );
  for (const c of courses) {
    const { rows: exists } = await query(
      `SELECT id FROM content_items WHERE course_id = $1 LIMIT 1`,
      [c.id]
    );
    if (exists.length > 0) continue;
    const slug = `curso-${c.id}-${slugifyText(c.title)}`.slice(0, 280);
    const segments = c.life_context ? [c.life_context] : [];
    await query(
      `INSERT INTO content_items
        (kind, title, slug, short_description, long_description, cover_url,
         segments, interests, tags, status, is_premium, price, author, course_id, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        "curso", c.title, slug, c.description?.slice(0, 240) ?? null, c.description ?? null,
        c.thumbnail, segments, c.category ? [c.category] : [], [],
        "published", c.is_premium, c.price ?? 0, c.instructor, c.id,
      ]
    );
  }

  // 3) Seed videos migrated from legacy mockVideos in VideoPage. Uses the
  // same ON CONFLICT (slug) DO NOTHING pattern for idempotency.
  for (const v of VIDEO_SEEDS) {
    await query(
      `INSERT INTO content_items
        (kind, title, slug, short_description, long_description, cover_url,
         segments, interests, tags, status, is_premium, price,
         duration_seconds, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [
        "video", v.title, v.slug, v.short_description, v.long_description, v.cover_url,
        v.segments, v.interests, v.tags, "published", false, 0,
        v.duration_seconds,
      ]
    );
  }

  console.log("[CMS] Migration ensured: books seeded, courses reflected, videos seeded.");
}

function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
