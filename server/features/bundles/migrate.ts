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

  // Join table: bundle ↔ item. Task #264 — uma trilha agora pode conter
  // CURSOS (courses) E conteúdos não-curso (livros/áudios/vídeos/séries de
  // content_items). Cada linha referencia exatamente UM dos dois.
  // CREATE produz o schema novo pra bancos limpos; os ALTERs abaixo migram
  // bancos antigos que ainda têm a PK composta (bundle_id, course_id) e
  // course_id NOT NULL.
  await query(`
    CREATE TABLE IF NOT EXISTS marketplace_bundle_items (
      id SERIAL PRIMARY KEY,
      bundle_id INTEGER NOT NULL REFERENCES marketplace_bundles(id) ON DELETE CASCADE,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Upgrade de bancos antigos (idempotente, por coluna/constraint).
  await query(
    `ALTER TABLE marketplace_bundle_items ADD COLUMN IF NOT EXISTS content_item_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE`
  );
  // Troca a PK composta legada por uma surrogate id (necessário pra permitir
  // course_id NULL em linhas de conteúdo). A PK precisa cair ANTES do DROP NOT
  // NULL — Postgres não permite afrouxar uma coluna que ainda compõe a PK.
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'marketplace_bundle_items_pkey'
          AND conrelid = 'marketplace_bundle_items'::regclass
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marketplace_bundle_items' AND column_name = 'id'
      ) THEN
        ALTER TABLE marketplace_bundle_items DROP CONSTRAINT marketplace_bundle_items_pkey;
      END IF;
    END$$;
  `);
  await query(`ALTER TABLE marketplace_bundle_items ALTER COLUMN course_id DROP NOT NULL`);
  await query(`ALTER TABLE marketplace_bundle_items ADD COLUMN IF NOT EXISTS id SERIAL`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'marketplace_bundle_items_pkey'
          AND conrelid = 'marketplace_bundle_items'::regclass
      ) THEN
        ALTER TABLE marketplace_bundle_items ADD PRIMARY KEY (id);
      END IF;
    END$$;
  `);
  // Exatamente uma referência por linha (curso XOR conteúdo).
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'marketplace_bundle_items_one_ref_check'
          AND conrelid = 'marketplace_bundle_items'::regclass
      ) THEN
        ALTER TABLE marketplace_bundle_items
          ADD CONSTRAINT marketplace_bundle_items_one_ref_check
          CHECK (
            (course_id IS NOT NULL)::int + (content_item_id IS NOT NULL)::int = 1
          );
      END IF;
    END$$;
  `);
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_bundle_course ON marketplace_bundle_items(bundle_id, course_id) WHERE course_id IS NOT NULL`
  );
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_bundle_content ON marketplace_bundle_items(bundle_id, content_item_id) WHERE content_item_id IS NOT NULL`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON marketplace_bundle_items(bundle_id, sort_order)`
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

  // Idempotently link each bundle to up to 6 active courses matching its
  // segment (life_context). Existing links are preserved (PK conflict no-op),
  // and bundle.item_count is refreshed to reflect actual links.
  const { rows: bundleRows } = await query<{ id: number; segment: string }>(
    `SELECT id, segment FROM marketplace_bundles WHERE is_active = true`
  );
  for (const b of bundleRows) {
    const { rows: courseRows } = await query<{ id: number }>(
      `SELECT id FROM courses
        WHERE is_active = true AND life_context = $1
        ORDER BY students DESC, id ASC
        LIMIT 6`,
      [b.segment]
    );
    let order = 0;
    for (const c of courseRows) {
      // Guarded insert (em vez de ON CONFLICT) porque a unicidade agora vem
      // de um índice parcial (WHERE course_id IS NOT NULL), que não é alvo
      // estável de inferência de ON CONFLICT.
      await query(
        `INSERT INTO marketplace_bundle_items (bundle_id, course_id, sort_order)
         SELECT $1, $2, $3
          WHERE NOT EXISTS (
            SELECT 1 FROM marketplace_bundle_items
             WHERE bundle_id = $1 AND course_id = $2
          )`,
        [b.id, c.id, order++]
      );
    }
  }
  // Use a LEFT JOIN-style subquery so bundles with zero linked items also
  // converge to 0 (a plain GROUP BY would skip them).
  await query(`
    UPDATE marketplace_bundles b
       SET item_count = sub.c
      FROM (
        SELECT b2.id AS bundle_id,
               COUNT(mbi.bundle_id)::int AS c
          FROM marketplace_bundles b2
          LEFT JOIN marketplace_bundle_items mbi ON mbi.bundle_id = b2.id
         GROUP BY b2.id
      ) sub
     WHERE sub.bundle_id = b.id
       AND b.item_count IS DISTINCT FROM sub.c
  `);
}
