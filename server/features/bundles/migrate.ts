import { query } from "../../db/index.js";

const VALID_SEGMENTS = ["solteiro", "namoro", "noivos", "casados", "pais"] as const;
type Segment = (typeof VALID_SEGMENTS)[number];

export async function migrateBundles(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_bundles (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      subtitle VARCHAR(300),
      description TEXT,
      segment VARCHAR(20) NOT NULL,
      cover_url TEXT,
      accent_color VARCHAR(20),
      item_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_bundles_segment_check'
      ) THEN
        ALTER TABLE marketplace_bundles
          ADD CONSTRAINT marketplace_bundles_segment_check
          CHECK (segment IN ('solteiro','namoro','noivos','casados','pais'));
      END IF;
    END$$;
  `);

  await query(
    `CREATE INDEX IF NOT EXISTS idx_bundles_segment ON marketplace_bundles(segment, sort_order)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_bundles_active ON marketplace_bundles(is_active)`
  );

  const seeds: Array<{
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    segment: Segment;
    accent_color: string;
    item_count: number;
    sort_order: number;
  }> = [
    {
      slug: "solteiro-identidade",
      title: "Identidade & propósito",
      subtitle: "Para quem está se preparando",
      description:
        "Conteúdos para conhecer a si mesmo, fortalecer a fé e construir uma base saudável antes do próximo passo.",
      segment: "solteiro",
      accent_color: "#C99056",
      item_count: 6,
      sort_order: 0,
    },
    {
      slug: "namoro-fundamentos",
      title: "Fundamentos do namoro",
      subtitle: "Conexão com intenção",
      description:
        "Comunicação, limites e visão de futuro para namoros que constroem ao invés de só ocupar tempo.",
      segment: "namoro",
      accent_color: "#B97A4A",
      item_count: 5,
      sort_order: 0,
    },
    {
      slug: "noivos-preparacao",
      title: "Preparando o sim",
      subtitle: "Antes do altar",
      description:
        "Finanças, expectativas, família de origem e os combinados práticos que poucos casais fazem antes de casar.",
      segment: "noivos",
      accent_color: "#A86A3A",
      item_count: 7,
      sort_order: 0,
    },
    {
      slug: "casados-comunicacao",
      title: "Comunicação no casamento",
      subtitle: "Falar e ser ouvido",
      description:
        "Ferramentas práticas para conversas difíceis, perdão e reconexão no dia a dia do casal.",
      segment: "casados",
      accent_color: "#9A5C2E",
      item_count: 8,
      sort_order: 0,
    },
    {
      slug: "casados-intimidade",
      title: "Intimidade e cumplicidade",
      subtitle: "Reacender o vínculo",
      description:
        "Caminhos para reaproximação afetiva, sexual e espiritual no casamento de longa duração.",
      segment: "casados",
      accent_color: "#C99056",
      item_count: 5,
      sort_order: 1,
    },
    {
      slug: "pais-primeiros-anos",
      title: "Primeiros anos em família",
      subtitle: "Bebês e infância",
      description:
        "Sono, rotina, vínculo afetivo e os primeiros combinados do casal como pais.",
      segment: "pais",
      accent_color: "#B97A4A",
      item_count: 6,
      sort_order: 0,
    },
    {
      slug: "pais-adolescentes",
      title: "Pais de adolescentes",
      subtitle: "Diálogo sem perder a autoridade",
      description:
        "Como manter conexão, limites firmes e fé viva com filhos entre 11 e 19 anos.",
      segment: "pais",
      accent_color: "#A86A3A",
      item_count: 7,
      sort_order: 1,
    },
  ];

  let inserted = 0;
  for (const s of seeds) {
    const { rowCount } = await query(
      `INSERT INTO marketplace_bundles
         (slug, title, subtitle, description, segment, accent_color, item_count, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.title, s.subtitle, s.description, s.segment, s.accent_color, s.item_count, s.sort_order]
    );
    inserted += rowCount ?? 0;
  }

  if (inserted > 0) {
    console.log(`[Bundles] Seeded ${inserted}/${seeds.length} curated bundles (missing slugs filled in).`);
  }
}
