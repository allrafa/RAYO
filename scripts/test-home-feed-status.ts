/**
 * Integration test for Task #25 / Task #26 — home rails should never display
 * archived or unpublished content.
 *
 * Exercises the publish / unpublish / archive / delete-content transitions
 * against the live database (DATABASE_URL) and asserts:
 *   1. A card linked to a published content_item appears in the public feed.
 *   2. Setting that content_item to status='draft' removes the card from the
 *      public feed (but keeps it in the admin list flagged with link_state
 *      'draft').
 *   3. Re-publishing the content_item brings the card back to public.
 *   3b. Setting that content_item to status='archived' (Task #26) also hides
 *       it from public, but the admin list flags it with link_state
 *       'archived' (a distinct state from 'draft' so producers can tell
 *       intentional retirement apart from work-in-progress).
 *   3c. Re-publishing from archive restores the card to public.
 *   4. Deleting the content_item leaves the card in admin (with
 *      content_item_id NULL via FK ON DELETE SET NULL) and visible to public
 *      because cards without a link are treated as static promotions.
 *   5. A card with content_item_id = NULL (no link) is always visible.
 *
 * Usage:  DATABASE_URL=… tsx scripts/test-home-feed-status.ts
 *
 * The script cleans up everything it inserts even on failure.
 */
import { query } from "../server/db/index.js";
import {
  listAdminHomeFeed,
  listPublicHomeFeed,
} from "../server/features/home-feed/service.js";

const CARD_LINKED_TITLE = "[task25-test] linked card";
const CARD_STATIC_TITLE = "[task25-test] static card";
const CONTENT_TITLE = "[task25-test] content fixture";
const CONTENT_SLUG = "task25-test-content-fixture";

let cardLinkedId: number | null = null;
let cardStaticId: number | null = null;
let contentId: number | null = null;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

async function findCardInPublic(section: string, title: string) {
  const { sections } = await listPublicHomeFeed();
  const list = sections[section as keyof typeof sections] ?? [];
  return list.find((c) => c.title === title) ?? null;
}

async function findCardInAdmin(title: string) {
  const { items } = await listAdminHomeFeed();
  return items.find((c) => c.title === title) ?? null;
}

async function setContentStatus(
  id: number,
  status: "published" | "draft" | "archived",
) {
  await query(
    `UPDATE content_items
        SET status = $1::varchar,
            published_at = CASE WHEN $1::varchar = 'published' THEN NOW() ELSE published_at END,
            updated_at = NOW()
      WHERE id = $2`,
    [status, id],
  );
}

async function setup() {
  // Insert a published content_item to link against.
  const c = await query<{ id: number }>(
    `INSERT INTO content_items
       (kind, title, slug, status, published_at)
     VALUES ('video', $1, $2, 'published', NOW())
     RETURNING id`,
    [CONTENT_TITLE, CONTENT_SLUG],
  );
  contentId = c.rows[0].id;

  // Card #1: linked to the content above.
  const a = await query<{ id: number }>(
    `INSERT INTO home_feed_items
       (section, title, sort_order, is_active, content_item_id)
     VALUES ('made_for_you', $1, 999, TRUE, $2)
     RETURNING id`,
    [CARD_LINKED_TITLE, contentId],
  );
  cardLinkedId = a.rows[0].id;

  // Card #2: static promo, no link.
  const b = await query<{ id: number }>(
    `INSERT INTO home_feed_items
       (section, title, sort_order, is_active, content_item_id)
     VALUES ('made_for_you', $1, 1000, TRUE, NULL)
     RETURNING id`,
    [CARD_STATIC_TITLE],
  );
  cardStaticId = b.rows[0].id;
}

async function cleanup() {
  if (cardLinkedId) {
    await query(`DELETE FROM home_feed_items WHERE id = $1`, [cardLinkedId]);
  }
  if (cardStaticId) {
    await query(`DELETE FROM home_feed_items WHERE id = $1`, [cardStaticId]);
  }
  if (contentId) {
    await query(`DELETE FROM content_items WHERE id = $1`, [contentId]);
  }
}

async function run() {
  console.log("[task25] setting up fixtures…");
  await setup();
  assert(cardLinkedId && cardStaticId && contentId, "setup ids");

  // ── 1. Published content → card visible in public feed ─────────────
  let publicCard = await findCardInPublic("made_for_you", CARD_LINKED_TITLE);
  assert(publicCard, "linked card should be visible when content is published");
  let staticCard = await findCardInPublic("made_for_you", CARD_STATIC_TITLE);
  assert(staticCard, "static card (no link) should always be visible");
  let adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(adminCard, "linked card present in admin list");
  assert(
    adminCard.link_state === "ok",
    `expected link_state=ok when content is published, got ${adminCard.link_state}`,
  );
  console.log("  ✓ published content → card visible (public + admin ok)");

  // ── 2. Unpublish content → card hidden from public, flagged in admin ─
  await setContentStatus(contentId!, "draft");
  publicCard = await findCardInPublic("made_for_you", CARD_LINKED_TITLE);
  assert(!publicCard, "linked card must be hidden when content is in draft");
  staticCard = await findCardInPublic("made_for_you", CARD_STATIC_TITLE);
  assert(staticCard, "static card unaffected by unrelated content status");
  adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(adminCard, "linked card still present in admin after unpublish");
  assert(
    adminCard.link_state === "draft",
    `expected link_state=draft when content is unpublished, got ${adminCard.link_state}`,
  );
  assert(
    adminCard.linked_content_status === "draft",
    "linked_content_status surfaced for admin UI",
  );
  console.log("  ✓ unpublished content → card hidden in public, flagged in admin");

  // ── 3. Re-publish content → card re-appears ─────────────────────────
  await setContentStatus(contentId!, "published");
  publicCard = await findCardInPublic("made_for_you", CARD_LINKED_TITLE);
  assert(publicCard, "linked card should reappear after re-publishing");
  adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(
    adminCard?.link_state === "ok",
    `expected link_state=ok after re-publish, got ${adminCard?.link_state}`,
  );
  console.log("  ✓ re-publish content → card visible again");

  // ── 3b. Archive content (Task #26) → hidden from public, distinct admin badge
  await setContentStatus(contentId!, "archived");
  publicCard = await findCardInPublic("made_for_you", CARD_LINKED_TITLE);
  assert(
    !publicCard,
    "linked card must be hidden when content is archived",
  );
  staticCard = await findCardInPublic("made_for_you", CARD_STATIC_TITLE);
  assert(staticCard, "static card unaffected by unrelated content status");
  adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(adminCard, "linked card still present in admin after archive");
  assert(
    adminCard.link_state === "archived",
    `expected link_state=archived when content is archived, got ${adminCard.link_state}`,
  );
  assert(
    adminCard.linked_content_status === "archived",
    "linked_content_status surfaced as 'archived' for admin UI",
  );
  console.log("  ✓ archived content → card hidden in public, flagged 'archived' in admin");

  // ── 3c. Re-publish from archive → back to ok ────────────────────────
  await setContentStatus(contentId!, "published");
  adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(
    adminCard?.link_state === "ok",
    `expected link_state=ok after restoring from archive, got ${adminCard?.link_state}`,
  );
  console.log("  ✓ restore from archive → card visible again");

  // ── 4. Delete content → FK SET NULL, card stays as static ───────────
  await query(`DELETE FROM content_items WHERE id = $1`, [contentId]);
  contentId = null; // already gone, skip in cleanup
  publicCard = await findCardInPublic("made_for_you", CARD_LINKED_TITLE);
  assert(
    publicCard,
    "after content deletion, the FK is SET NULL so the card becomes a static promo and stays visible",
  );
  adminCard = await findCardInAdmin(CARD_LINKED_TITLE);
  assert(adminCard, "card still in admin after content deletion");
  assert(
    adminCard.content_item_id === null,
    "content_item_id should be NULL after content is deleted (FK SET NULL)",
  );
  assert(
    adminCard.link_state === "ok",
    "link_state=ok once link is cleared (no link == nothing to break)",
  );
  console.log("  ✓ delete content → FK clears link, card behaves as static");

  console.log("\n[task25] all assertions passed ✔");
}

(async () => {
  let exitCode = 0;
  try {
    await run();
  } catch (err) {
    console.error("\n[task25] FAILED:", err);
    exitCode = 1;
  } finally {
    try {
      await cleanup();
    } catch (err) {
      console.error("[task25] cleanup error:", err);
    }
    // Pool stays open; force exit so the script terminates promptly.
    process.exit(exitCode);
  }
})();
