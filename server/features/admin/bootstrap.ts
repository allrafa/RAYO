import { query } from "../../db/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Promotes accounts whose email is listed in the `ADMIN_EMAILS` env var
 * (comma-separated) to the `admin` role. Idempotent: only updates rows whose
 * current role is below `admin`. Run once at boot after schema initialization.
 *
 * Example:
 *   ADMIN_EMAILS="founder@raio.app,ops@raio.app"
 */
export async function bootstrapAdminsFromEnv(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw || raw.trim().length === 0) {
    logger.info("AdminBootstrap", "ADMIN_EMAILS not set; skipping admin bootstrap.");
    return;
  }

  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (emails.length === 0) {
    logger.info("AdminBootstrap", "ADMIN_EMAILS contained no valid entries.");
    return;
  }

  const { rows } = await query<{ id: number; email: string; role: string }>(
    `UPDATE users
     SET role = 'admin', updated_at = NOW()
     WHERE LOWER(email) = ANY($1::text[])
       AND role <> 'admin'
     RETURNING id, email, role`,
    [emails],
  );

  if (rows.length === 0) {
    logger.info(
      "AdminBootstrap",
      `No accounts promoted (none of the ${emails.length} configured emails matched non-admin users).`,
    );
    return;
  }

  for (const row of rows) {
    logger.info("AdminBootstrap", `Promoted ${row.email} (id=${row.id}) to admin.`);
  }
}
