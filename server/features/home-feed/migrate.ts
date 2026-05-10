import { query } from "../../db/index.js";

// One-shot seed of home feed cards migrated from the legacy hardcoded
// arrays in `src/components/HomePage.tsx` (categories.recentlyPlayed,
// categories.madeForYou, categories.trending, categories.podcasts).
//
// IMPORTANT: this seed only runs when the `home_feed_items` table is
// completely empty. We deliberately do NOT use a UNIQUE (section, title)
// upsert key here — producers are expected to rename, delete, or reorder
// these cards via the admin UI, and we must never resurrect old titles
// after a producer edits them. Once the table has any rows (whether
// seeded, edited, or producer-created), this function is a no-op.

interface SeedItem {
  section: "recently_played" | "made_for_you" | "trending" | "podcasts";
  title: string;
  subtitle: string | null;
  image_url: string | null;
  gradient: string | null;
  badge_text: string | null;
  meta_text: string | null;
  progress: number | null;
  sort_order: number;
}

const SEEDS: SeedItem[] = [
  // recently_played
  {
    section: "recently_played",
    title: "Como resolver conflitos",
    subtitle: "Série • Ep. 1/5",
    image_url:
      "https://images.unsplash.com/photo-1758524944375-7d61202cc481?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "18:32",
    meta_text: null,
    progress: 65,
    sort_order: 0,
  },
  {
    section: "recently_played",
    title: "Linguagens do Amor",
    subtitle: "Curso Prático",
    image_url:
      "https://images.unsplash.com/photo-1680603007731-d8da76c235ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "24:15",
    meta_text: null,
    progress: 30,
    sort_order: 1,
  },
  {
    section: "recently_played",
    title: "Educação Financeira",
    subtitle: "Para Casais",
    image_url:
      "https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "31:45",
    meta_text: null,
    progress: 0,
    sort_order: 2,
  },

  // made_for_you
  {
    section: "made_for_you",
    title: "Mix Relacionamentos",
    subtitle: "Baseado no seu perfil",
    image_url:
      "https://images.unsplash.com/photo-1624448445915-97154f5e688c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: "from-purple-500 to-pink-500",
    badge_text: null,
    meta_text: null,
    progress: null,
    sort_order: 0,
  },
  {
    section: "made_for_you",
    title: "Descobertas Semanais",
    subtitle: "Novos conteúdos para você",
    image_url:
      "https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: "from-green-500 to-blue-500",
    badge_text: null,
    meta_text: null,
    progress: null,
    sort_order: 1,
  },
  {
    section: "made_for_you",
    title: "Radar de Releases",
    subtitle: "Últimos lançamentos",
    image_url:
      "https://images.unsplash.com/photo-1628676348963-f88c671333f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: "from-orange-500 to-red-500",
    badge_text: null,
    meta_text: null,
    progress: null,
    sort_order: 2,
  },

  // trending
  {
    section: "trending",
    title: "Top 50 RAYO Brasil",
    subtitle: "Os mais assistidos",
    image_url:
      "https://images.unsplash.com/photo-1744805624952-dab790f6b3bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "1",
    meta_text: "2.3M",
    progress: null,
    sort_order: 0,
  },
  {
    section: "trending",
    title: "Viral do Relacionamento",
    subtitle: "Trending now",
    image_url:
      "https://images.unsplash.com/photo-1680603007731-d8da76c235ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "2",
    meta_text: "1.8M",
    progress: null,
    sort_order: 1,
  },
  {
    section: "trending",
    title: "Família em Foco",
    subtitle: "Conteúdo para pais",
    image_url:
      "https://images.unsplash.com/photo-1628676348963-f88c671333f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "3",
    meta_text: "1.5M",
    progress: null,
    sort_order: 2,
  },

  // podcasts
  {
    section: "podcasts",
    title: "RAYO Talks",
    subtitle: "Conversas transformadoras",
    image_url:
      "https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "Podcast",
    meta_text: "12 episódios",
    progress: null,
    sort_order: 0,
  },
  {
    section: "podcasts",
    title: "Histórias Reais",
    subtitle: "Testemunhos inspiradores",
    image_url:
      "https://images.unsplash.com/photo-1605041140728-fecfe5b22e16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080",
    gradient: null,
    badge_text: "Podcast",
    meta_text: "8 episódios",
    progress: null,
    sort_order: 1,
  },
];

export async function migrateHomeFeed() {
  // Only seed when the table is empty. After producers begin curating
  // (creating, editing, or deleting cards), this becomes a no-op so we
  // never resurrect old titles that were renamed or removed in admin.
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM home_feed_items`,
  );
  const existing = Number(rows[0]?.count ?? 0);
  if (existing > 0) {
    console.log(`[HomeFeed] Seed skipped: ${existing} cards already curated.`);
    return;
  }
  for (const s of SEEDS) {
    await query(
      `INSERT INTO home_feed_items
         (section, title, subtitle, image_url, gradient, badge_text,
          meta_text, progress, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, TRUE)`,
      [
        s.section, s.title, s.subtitle, s.image_url, s.gradient, s.badge_text,
        s.meta_text, s.progress, s.sort_order,
      ],
    );
  }
  console.log(`[HomeFeed] First-run seed: ${SEEDS.length} cards inserted.`);
}
