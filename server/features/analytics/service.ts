import { query } from "../../db/index.js";

interface EventMetadata {
  [key: string]: string | number | boolean | null;
}

export async function trackEvent(
  userId: number | null,
  eventName: string,
  metadata?: EventMetadata
): Promise<void> {
  try {
    await query(
      `INSERT INTO analytics_events (user_id, event_name, metadata)
       VALUES ($1, $2, $3)`,
      [userId, eventName, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error("[Analytics] Failed to track event:", eventName, err);
  }
}
