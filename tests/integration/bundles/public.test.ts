// LAUNCH_PLAN.md iteração 5 — primeira cobertura de GET /api/bundles
// (trilhas curadas do marketplace, ligadas à descoberta de trilhas pagas).
import { after, afterEach, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestApp } from "../helpers/app.js";
import { withServer, request } from "../helpers/http.js";
import { getPool, closeDbPool, ensureSchema, truncateAll } from "../helpers/db.js";

before(async () => { await ensureSchema(); });
afterEach(async () => { await truncateAll(); });
after(async () => { await closeDbPool(); });

describe("Bundles / GET /api/bundles", () => {
  it("200 público com lista de bundles ativos e itens", async () => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    const { rows: bundleRows } = await getPool().query<{ id: number }>(
      `INSERT INTO marketplace_bundles (slug, title, segment, is_active)
       VALUES ($1, 'Bundle IT', 'casados', true)
       RETURNING id`,
      [`bundle-it-${suffix}`],
    );
    const bundleId = bundleRows[0].id;
    const { rows: contentRows } = await getPool().query<{ id: number }>(
      `INSERT INTO content_items (kind, title, status)
       VALUES ('livro', $1, 'published')
       RETURNING id`,
      [`Livro do Bundle ${suffix}`],
    );
    await getPool().query(
      `INSERT INTO marketplace_bundle_items (bundle_id, content_item_id, sort_order)
       VALUES ($1, $2, 0)`,
      [bundleId, contentRows[0].id],
    );

    await withServer(createTestApp(), async (base) => {
      const r = await request<{
        success: boolean;
        data: { bundles: Array<{ id: number; slug: string; items: unknown[] }> };
      }>(base, { path: "/api/bundles?segment=casados" });
      assert.equal(r.status, 200, r.rawBody);
      assert.equal(r.body.success, true);
      const mine = r.body.data.bundles.find((b) => b.id === bundleId);
      assert.ok(mine, "bundle criado deve aparecer na listagem do segmento");
      assert.equal(mine!.items.length, 1, "itens do bundle devem vir embutidos");
    });
  });

  it("400 para segmento inválido", async () => {
    await withServer(createTestApp(), async (base) => {
      const r = await request(base, { path: "/api/bundles?segment=invalido" });
      assert.equal(r.status, 400);
    });
  });
});
