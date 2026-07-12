import { query, getClient } from "../../db/index.js";
import { sendDataExportEmail, sendAccountDeletionEmail } from "../../lib/email.js";

interface LgpdRequestRow {
  id: number;
  user_id: number;
  request_type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface UserDataExport {
  profile: Record<string, unknown>;
  courseProgress: Record<string, unknown>[];
  lessonProgress: Record<string, unknown>[];
  posts: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  badges: Record<string, unknown>[];
  xpLog: Record<string, unknown>[];
  missions: Record<string, unknown>[];
  analyticsEvents: Record<string, unknown>[];
  lgpdRequests: Record<string, unknown>[];
  exportedAt: string;
}

export async function exportUserData(userId: number): Promise<UserDataExport> {
  const { rows: reqRows } = await query(
    `INSERT INTO lgpd_requests (user_id, request_type, status)
     VALUES ($1, 'export', 'processing')
     RETURNING id`,
    [userId]
  );
  const requestId = reqRows[0].id;

  try {
  const { rows: profileRows } = await query(
    `SELECT id, email, name, segments, interests, goals, content_preferences,
            level, xp, streak, is_premium, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  const { rows: courseProgress } = await query(
    `SELECT ucp.course_id, c.title as course_title, ucp.progress_percentage,
            ucp.completed_lessons, ucp.total_lessons, ucp.enrolled_at, ucp.completed_at
     FROM user_course_progress ucp
     JOIN courses c ON c.id = ucp.course_id
     WHERE ucp.user_id = $1`,
    [userId]
  );

  const { rows: lessonProgress } = await query(
    `SELECT ulp.lesson_id, cl.title as lesson_title, ulp.status,
            ulp.progress_seconds, ulp.completed_at, ulp.started_at
     FROM user_lesson_progress ulp
     JOIN course_lessons cl ON cl.id = ulp.lesson_id
     WHERE ulp.user_id = $1`,
    [userId]
  );

  const { rows: posts } = await query(
    `SELECT p.id, p.title, p.content, p.category, p.like_count,
            p.comment_count, p.created_at, f.name as forum_name
     FROM posts p
     JOIN forums f ON f.id = p.forum_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );

  const { rows: comments } = await query(
    `SELECT c.id, c.content, c.like_count, c.created_at, p.title as post_title
     FROM comments c
     JOIN posts p ON p.id = c.post_id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );

  const { rows: badges } = await query(
    `SELECT b.name, b.title, b.description, b.tier, ub.earned_at
     FROM user_badges ub
     JOIN badges b ON b.id = ub.badge_id
     WHERE ub.user_id = $1`,
    [userId]
  );

  const { rows: xpLog } = await query(
    `SELECT amount, reason, created_at FROM xp_log
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  const { rows: missions } = await query(
    `SELECT m.title, ump.current_progress, ump.completed, ump.completed_at, ump.period_start
     FROM user_mission_progress ump
     JOIN missions m ON m.id = ump.mission_id
     WHERE ump.user_id = $1
     ORDER BY ump.period_start DESC`,
    [userId]
  );

  const { rows: analyticsEvents } = await query(
    `SELECT event_name, metadata, created_at FROM analytics_events
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000`,
    [userId]
  );

  const { rows: lgpdRequests } = await query<LgpdRequestRow>(
    `SELECT id, request_type, status, completed_at, created_at FROM lgpd_requests
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  await query(
    `UPDATE lgpd_requests SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [requestId]
  );

  const profile = profileRows[0] as { email?: string; name?: string } | undefined;
  if (profile?.email) {
    void sendDataExportEmail(profile.email, profile.name || "Usuário");
  }

  return {
    profile: profileRows[0] || {},
    courseProgress,
    lessonProgress,
    posts,
    comments,
    badges,
    xpLog,
    missions,
    analyticsEvents,
    lgpdRequests,
    exportedAt: new Date().toISOString(),
  };
  } catch (err) {
    await query(
      `UPDATE lgpd_requests SET status = 'failed'
       WHERE id = $1`,
      [requestId]
    ).catch(() => {});
    throw err;
  }
}

export async function deleteUserData(userId: number): Promise<void> {
  const client = await getClient();
  let deletionRequestId: number | null = null;
  let transactionStarted = false;
  try {
    const { rows: userRows } = await query<{ email: string; name: string }>(
      `SELECT email, name FROM users WHERE id = $1`,
      [userId]
    );
    const originalEmail = userRows[0]?.email;
    const originalName = userRows[0]?.name || "Usuário";

    const { rows: reqRows } = await query<{ id: number }>(
      `INSERT INTO lgpd_requests (user_id, request_type, status)
       VALUES ($1, 'deletion', 'processing')
       RETURNING id`,
      [userId]
    );
    deletionRequestId = reqRows[0].id;

    if (originalEmail) {
      await sendAccountDeletionEmail(originalEmail, originalName);
    }

    await client.query("BEGIN");
    transactionStarted = true;

    await client.query(
      `UPDATE comments SET content = '[conteúdo removido por solicitação LGPD]'
       WHERE user_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE posts SET title = '[removido]', content = '[conteúdo removido por solicitação LGPD]'
       WHERE user_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE messages SET content = '[mensagem removida por solicitação LGPD]'
       WHERE sender_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE posts SET like_count = like_count - 1
       FROM post_likes pl WHERE pl.post_id = posts.id AND pl.user_id = $1`,
      [userId]
    );
    await client.query(
      `UPDATE comments SET like_count = like_count - 1
       FROM comment_likes cl WHERE cl.comment_id = comments.id AND cl.user_id = $1`,
      [userId]
    );
    await client.query(
      `UPDATE posts SET like_count = GREATEST(like_count, 0) WHERE like_count < 0`
    );
    await client.query(
      `UPDATE comments SET like_count = GREATEST(like_count, 0) WHERE like_count < 0`
    );

    await client.query(`DELETE FROM post_likes WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM comment_likes WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_lesson_progress WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_course_progress WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_mission_progress WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_badges WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM xp_log WHERE user_id = $1`, [userId]);

    // ALIANCA_PLAN.md §6 — a anonimização mantém a linha do user, então o
    // vínculo de casal precisa de limpeza explícita: o cônjuge volta ao
    // estado sem aliança (orações caem em cascata com o casal).
    await client.query(`DELETE FROM couples WHERE user_a = $1 OR user_b = $1`, [userId]);
    await client.query(
      `DELETE FROM couple_invites WHERE inviter_id = $1 OR accepted_by = $1`,
      [userId]
    );
    // Lacunas da mesma natureza detectadas na revisão: améns e inscrições
    // de push também são dados do titular e a linha do user não é deletada.
    await client.query(`DELETE FROM verse_amens WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);

    await client.query(
      `UPDATE analytics_events SET user_id = NULL WHERE user_id = $1`,
      [userId]
    );

    const anonymizedEmail = `deleted_${userId}_${Date.now()}@removed.lgpd`;
    await client.query(
      `UPDATE users SET
         name = 'Usuário Removido',
         email = $2,
         password_hash = 'DELETED',
         segments = '{}',
         interests = '{}',
         goals = '{}',
         content_preferences = '{}',
         notification_preferences = '{}',
         updated_at = NOW()
       WHERE id = $1`,
      [userId, anonymizedEmail]
    );

    await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");

    await query(
      `UPDATE lgpd_requests SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [deletionRequestId]
    );
  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }
    if (deletionRequestId !== null) {
      await query(
        `UPDATE lgpd_requests SET status = 'failed'
         WHERE id = $1`,
        [deletionRequestId]
      ).catch(() => {});
    }
    throw err;
  } finally {
    client.release();
  }
}
