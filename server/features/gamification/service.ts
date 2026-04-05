import { query, getClient } from "../../db/index.js";

export const XP_LEVELS = [
  { level: 1, xp: 0, title: "Iniciante" },
  { level: 2, xp: 100, title: "Aprendiz" },
  { level: 3, xp: 250, title: "Praticante" },
  { level: 4, xp: 500, title: "Experiente" },
  { level: 5, xp: 1000, title: "Mestre" },
  { level: 6, xp: 2000, title: "Mentor" },
  { level: 7, xp: 5000, title: "Líder" },
];

export const XP_REWARDS: Record<string, number> = {
  watch_lesson: 10,
  complete_exercise: 15,
  complete_course: 50,
  get_certificate: 100,
  create_post: 20,
  create_comment: 10,
  receive_like: 5,
  helpful_comment: 30,
  community_interact: 10,
  daily_mission: 25,
  weekly_mission: 100,
  streak_day: 5,
  streak_week: 50,
  daily_login: 5,
};

function calculateLevel(totalXP: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVELS[i].xp) {
      return XP_LEVELS[i].level;
    }
  }
  return 1;
}

function getXPForNextLevel(currentLevel: number): number {
  const nextLevel = XP_LEVELS.find((l) => l.level === currentLevel + 1);
  return nextLevel ? nextLevel.xp : XP_LEVELS[XP_LEVELS.length - 1].xp;
}

export function getLevelTitle(level: number): string {
  const found = XP_LEVELS.find((l) => l.level === level);
  return found ? found.title : "Iniciante";
}

export async function addXP(
  userId: number,
  amount: number,
  reason: string
): Promise<{ newTotalXP: number; newLevel: number; leveledUp: boolean }> {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE users SET xp = xp + $1, updated_at = NOW() WHERE id = $2
       RETURNING xp, level`,
      [amount, userId]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      throw new Error("User not found");
    }

    const newTotalXP = rows[0].xp;
    const currentLevel = rows[0].level;
    const newLevel = calculateLevel(newTotalXP);
    const leveledUp = newLevel > currentLevel;

    if (leveledUp) {
      await client.query(`UPDATE users SET level = $1 WHERE id = $2`, [newLevel, userId]);
    }

    await client.query(
      `INSERT INTO xp_log (user_id, amount, reason) VALUES ($1, $2, $3)`,
      [userId, amount, reason]
    );

    const xpToNext = getXPForNextLevel(newLevel);
    await client.query(
      `INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level, current_streak, longest_streak, last_activity_date, updated_at)
       VALUES ($1, $2, $3, $4, 0, 0, NULL, NOW())
       ON CONFLICT (user_id) DO UPDATE SET total_xp = $2, current_level = $3, xp_to_next_level = $4, updated_at = NOW()`,
      [userId, newTotalXP, newLevel, xpToNext]
    );

    await client.query("COMMIT");

    if (leveledUp && [3, 5].includes(newLevel)) {
      await unlockBadge(userId, `level_${newLevel}`);
    }

    return { newTotalXP, newLevel, leveledUp };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateStreak(userId: number): Promise<{
  currentStreak: number;
  streakBroken: boolean;
  longestStreak: number;
}> {
  const { rows } = await query(
    `SELECT streak, longest_streak, last_activity_date FROM users WHERE id = $1`,
    [userId]
  );
  if (rows.length === 0) throw new Error("User not found");

  const user = rows[0];
  const today = new Date().toISOString().split("T")[0];
  const lastActivity = user.last_activity_date
    ? new Date(user.last_activity_date).toISOString().split("T")[0]
    : null;

  if (lastActivity === today) {
    return {
      currentStreak: user.streak,
      streakBroken: false,
      longestStreak: user.longest_streak || user.streak,
    };
  }

  let newStreak: number;
  let streakBroken = false;

  if (!lastActivity) {
    newStreak = 1;
  } else {
    const lastDate = new Date(lastActivity);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = user.streak + 1;
      await addXP(userId, XP_REWARDS.streak_day, "streak_day");
    } else {
      newStreak = 1;
      streakBroken = user.streak > 0;
    }
  }

  const longestStreak = Math.max(newStreak, user.longest_streak || 0);

  await query(
    `UPDATE users SET streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = NOW() WHERE id = $4`,
    [newStreak, longestStreak, today, userId]
  );

  await query(
    `INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level, current_streak, longest_streak, last_activity_date, updated_at)
     VALUES ($1, (SELECT xp FROM users WHERE id = $1), (SELECT level FROM users WHERE id = $1), $5, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET current_streak = $2, longest_streak = $3, last_activity_date = $4, updated_at = NOW()`,
    [userId, newStreak, longestStreak, today, getXPForNextLevel(user.level || 1)]
  );

  if ([7, 30, 90].includes(newStreak)) {
    await unlockBadge(userId, `streak_${newStreak}`);
  }

  return { currentStreak: newStreak, streakBroken, longestStreak };
}

export async function unlockBadge(
  userId: number,
  badgeName: string
): Promise<{ unlocked: boolean; badge?: { id: number; title: string; icon: string } }> {
  const { rows: badgeRows } = await query(
    `SELECT id, title, icon FROM badges WHERE name = $1`,
    [badgeName]
  );
  if (badgeRows.length === 0) return { unlocked: false };

  const badge = badgeRows[0];

  const { rows: inserted } = await query(
    `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)
     ON CONFLICT (user_id, badge_id) DO NOTHING
     RETURNING id`,
    [userId, badge.id]
  );

  if (inserted.length === 0) return { unlocked: false };

  await query(
    `UPDATE badges SET total_awarded = total_awarded + 1 WHERE id = $1`,
    [badge.id]
  );

  return { unlocked: true, badge: { id: badge.id, title: badge.title, icon: badge.icon } };
}

export async function getGamificationProfile(userId: number) {
  const { rows: userRows } = await query(
    `SELECT xp, level, streak, longest_streak, last_activity_date FROM users WHERE id = $1`,
    [userId]
  );
  if (userRows.length === 0) throw new Error("User not found");

  const user = userRows[0];
  const currentLevel = user.level;
  const xpForNextLevel = getXPForNextLevel(currentLevel);
  const currentLevelXP = XP_LEVELS.find((l) => l.level === currentLevel)?.xp || 0;
  const xpInCurrentLevel = user.xp - currentLevelXP;
  const xpNeededForNext = xpForNextLevel - currentLevelXP;

  const { rows: badgeCount } = await query(
    `SELECT COUNT(*) as count FROM user_badges WHERE user_id = $1`,
    [userId]
  );

  return {
    xp: user.xp,
    level: currentLevel,
    levelTitle: getLevelTitle(currentLevel),
    streak: user.streak,
    longestStreak: user.longest_streak || 0,
    lastActivityDate: user.last_activity_date,
    xpForNextLevel,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercentage: xpNeededForNext > 0 ? Math.min((xpInCurrentLevel / xpNeededForNext) * 100, 100) : 100,
    totalBadges: parseInt(badgeCount[0].count),
    levels: XP_LEVELS,
  };
}

export async function getUserBadges(userId: number) {
  const { rows: allBadges } = await query(
    `SELECT b.*, ub.earned_at, ub.is_displayed,
            CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned
     FROM badges b
     LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
     ORDER BY b.tier DESC, b.name ASC`,
    [userId]
  );

  return allBadges.map((b) => ({
    id: b.id,
    name: b.name,
    title: b.title,
    description: b.description,
    icon: b.icon,
    tier: b.tier,
    isPremium: b.is_premium,
    earned: b.earned,
    earnedAt: b.earned_at,
    isDisplayed: b.is_displayed,
  }));
}

export async function getUserMissions(userId: number) {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = getStartOfWeek();

  const { rows: missions } = await query(
    `SELECT m.*, 
            ump.current_progress, ump.completed, ump.completed_at, ump.reward_claimed
     FROM missions m
     LEFT JOIN user_mission_progress ump 
       ON ump.mission_id = m.id 
       AND ump.user_id = $1
       AND ump.period_start = CASE 
         WHEN m.type = 'daily' THEN $2::date
         WHEN m.type = 'weekly' THEN $3::date
         ELSE $2::date
       END
     WHERE m.is_active = true
     ORDER BY m.type ASC, m.id ASC`,
    [userId, today, startOfWeek]
  );

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    actionType: m.action_type,
    actionCount: m.action_count,
    xpReward: m.xp_reward,
    currentProgress: m.current_progress || 0,
    targetProgress: m.action_count,
    completed: m.completed || false,
    completedAt: m.completed_at,
    rewardClaimed: m.reward_claimed || false,
  }));
}

export async function recordMissionProgress(
  userId: number,
  actionType: string,
  incrementBy = 1
): Promise<{ missionsCompleted: string[] }> {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = getStartOfWeek();
  const missionsCompleted: string[] = [];

  const { rows: matchingMissions } = await query(
    `SELECT id, type, action_type, action_count, xp_reward FROM missions WHERE action_type = $1 AND is_active = true`,
    [actionType]
  );

  for (const mission of matchingMissions) {
    const periodStart = mission.type === "daily" ? today : startOfWeek;

    await query(
      `INSERT INTO user_mission_progress (user_id, mission_id, current_progress, period_start)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (user_id, mission_id, period_start) DO NOTHING`,
      [userId, mission.id, periodStart]
    );

    const { rows: progressRows } = await query(
      `UPDATE user_mission_progress 
       SET current_progress = LEAST(current_progress + $1, $4)
       WHERE user_id = $2 AND mission_id = $3 AND period_start = $5 AND completed = false
       RETURNING current_progress`,
      [incrementBy, userId, mission.id, mission.action_count, periodStart]
    );

    if (progressRows.length > 0 && progressRows[0].current_progress >= mission.action_count) {
      await query(
        `UPDATE user_mission_progress 
         SET completed = true, completed_at = NOW()
         WHERE user_id = $1 AND mission_id = $2 AND period_start = $3`,
        [userId, mission.id, periodStart]
      );
      missionsCompleted.push(mission.id.toString());
    }
  }

  return { missionsCompleted };
}

export const checkMissionProgress = recordMissionProgress;

export async function claimMissionReward(
  userId: number,
  missionId: number
): Promise<{ success: boolean; xpAwarded: number }> {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = getStartOfWeek();

  const { rows } = await query(
    `UPDATE user_mission_progress ump
     SET reward_claimed = true
     FROM missions m
     WHERE m.id = ump.mission_id
       AND ump.user_id = $1 AND ump.mission_id = $2
       AND ump.completed = true AND ump.reward_claimed = false
       AND ump.period_start IN ($3::date, $4::date)
     RETURNING m.xp_reward, m.type`,
    [userId, missionId, today, startOfWeek]
  );

  if (rows.length === 0) return { success: false, xpAwarded: 0 };

  const xpAwarded = rows[0].xp_reward;
  await addXP(userId, xpAwarded, `${rows[0].type}_mission`);

  return { success: true, xpAwarded };
}

function getStartOfWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split("T")[0];
}
