import { query } from "../../db/index.js";
import { XP_LEVELS, getLevelTitle } from "../gamification/service.js";

interface UserRow {
  id: number;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  longest_streak: number;
  segments: string[] | null;
  interests: string[] | null;
  goals: string[] | null;
}

interface ProgressRow {
  course_id: number;
  progress_percentage: string;
  completed_lessons: number;
  total_lessons: number;
  last_lesson_id: number | null;
  enrolled_at: string;
  completed_at: string | null;
  title: string;
  thumbnail: string;
  category: string;
  life_context: string;
  instructor: string;
  duration: string;
}

interface CourseRow {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  life_context: string;
  level: string;
  duration: string;
  total_lessons: number;
  rating: string;
  students: number;
  instructor: string;
  is_premium: boolean;
}

interface PostRow {
  id: number;
  content: string;
  category: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name: string;
  forum_name: string;
  forum_icon: string;
}

interface MissionRow {
  id: number;
  title: string;
  description: string;
  type: string;
  action_type: string;
  action_count: number;
  xp_reward: number;
  current_progress: string;
  completed: boolean;
  reward_claimed: boolean;
}

interface WeeklyXPRow {
  weekly_xp: string;
}

function calculateLevel(totalXP: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVELS[i].xp) return XP_LEVELS[i].level;
  }
  return 1;
}

function getXPForNextLevel(currentLevel: number): number {
  const next = XP_LEVELS.find((l) => l.level === currentLevel + 1);
  return next ? next.xp : XP_LEVELS[XP_LEVELS.length - 1].xp;
}

function getCurrentLevelXP(level: number): number {
  const found = XP_LEVELS.find((l) => l.level === level);
  return found ? found.xp : 0;
}

function getMissionIcon(actionType: string): string {
  const icons: Record<string, string> = {
    watch_lesson: "📚",
    complete_course: "🎓",
    create_post: "✍️",
    community_interact: "💬",
    daily_login: "🔥",
    streak_day: "⚡",
  };
  return icons[actionType] || "🎯";
}

function mapProgressToCourse(r: ProgressRow) {
  return {
    id: r.course_id,
    title: r.title,
    thumbnail: r.thumbnail,
    category: r.category,
    instructor: r.instructor,
    duration: r.duration,
    progress: parseFloat(r.progress_percentage),
    completedLessons: r.completed_lessons,
    totalLessons: r.total_lessons,
  };
}

export async function getDashboard(userId: number) {
  const { rows: userRows } = await query<UserRow>(
    `SELECT id, name, email, level, xp, streak, longest_streak, segments, interests, goals
     FROM users WHERE id = $1`,
    [userId]
  );
  if (userRows.length === 0) throw new Error("User not found");
  const user = userRows[0];

  const level = calculateLevel(user.xp);
  const xpForNext = getXPForNextLevel(level);
  const currentLevelXP = getCurrentLevelXP(level);
  const xpInLevel = user.xp - currentLevelXP;
  const xpNeeded = xpForNext - currentLevelXP;
  const levelProgress = xpNeeded > 0 ? Math.round((xpInLevel / xpNeeded) * 100) : 100;

  const gamification = {
    level,
    levelTitle: getLevelTitle(level),
    xp: user.xp,
    streak: user.streak,
    longestStreak: user.longest_streak,
    xpForNextLevel: xpForNext,
    levelProgress,
  };

  const { rows: progressRows } = await query<ProgressRow>(
    `SELECT ucp.course_id, ucp.progress_percentage, ucp.completed_lessons,
            ucp.total_lessons, ucp.last_lesson_id, ucp.enrolled_at, ucp.completed_at,
            c.title, c.thumbnail, c.category, c.life_context, c.instructor, c.duration
     FROM user_course_progress ucp
     JOIN courses c ON c.id = ucp.course_id
     WHERE ucp.user_id = $1
     ORDER BY ucp.enrolled_at DESC`,
    [userId]
  );

  const coursesInProgress = progressRows
    .filter((r) => !r.completed_at && parseFloat(r.progress_percentage) > 0)
    .map(mapProgressToCourse);

  const enrolledNotStarted = progressRows
    .filter((r) => !r.completed_at && parseFloat(r.progress_percentage) === 0)
    .map((r) => ({
      ...mapProgressToCourse(r),
      progress: 0,
      completedLessons: 0,
    }));

  const completedCount = progressRows.filter((r) => r.completed_at).length;

  const userSegments: string[] = user.segments || [];
  const userInterests: string[] = user.interests || [];
  const lifeContextFilter = userSegments.length > 0 ? userSegments : [];

  let recommendedCourses: CourseRow[] = [];
  if (lifeContextFilter.length > 0 || userInterests.length > 0) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (lifeContextFilter.length > 0) {
      conditions.push(`c.life_context = ANY($${paramIdx})`);
      params.push(lifeContextFilter);
      paramIdx++;
    }
    if (userInterests.length > 0) {
      conditions.push(`c.category = ANY($${paramIdx})`);
      params.push(userInterests);
      paramIdx++;
    }

    params.push(userId);
    const userIdParam = paramIdx;

    const { rows: recRows } = await query<CourseRow>(
      `SELECT c.id, c.title, c.description, c.thumbnail, c.category, c.life_context,
              c.level, c.duration, c.total_lessons, c.rating, c.students, c.instructor, c.is_premium
       FROM courses c
       WHERE c.is_active = true
         AND (${conditions.join(" OR ")})
         AND c.id NOT IN (SELECT course_id FROM user_course_progress WHERE user_id = $${userIdParam})
       ORDER BY c.students DESC
       LIMIT 6`,
      params
    );
    recommendedCourses = recRows;
  }

  if (recommendedCourses.length < 6) {
    const excludeIds = [
      ...recommendedCourses.map((c) => c.id),
      ...progressRows.map((r) => r.course_id),
    ];
    const placeholders = excludeIds.length > 0
      ? `AND c.id NOT IN (${excludeIds.map((_, i) => `$${i + 2}`).join(",")})`
      : "";
    const { rows: moreRows } = await query<CourseRow>(
      `SELECT c.id, c.title, c.description, c.thumbnail, c.category, c.life_context,
              c.level, c.duration, c.total_lessons, c.rating, c.students, c.instructor, c.is_premium
       FROM courses c
       WHERE c.is_active = true ${placeholders}
       ORDER BY c.students DESC
       LIMIT $1`,
      [6 - recommendedCourses.length, ...excludeIds]
    );
    recommendedCourses = [...recommendedCourses, ...moreRows];
  }

  const forumWhere = lifeContextFilter.length > 0
    ? `AND (f.life_context = ANY($1) OR f.life_context IS NULL)`
    : ``;
  const forumParams = lifeContextFilter.length > 0 ? [lifeContextFilter] : [];
  const { rows: recentPosts } = await query<PostRow>(
    `SELECT p.id, p.content, p.category, p.like_count, p.comment_count,
            p.created_at, u.name AS author_name, f.name AS forum_name, f.icon AS forum_icon
     FROM posts p
     JOIN users u ON u.id = p.user_id
     JOIN forums f ON f.id = p.forum_id
     WHERE 1=1 ${forumWhere}
     ORDER BY p.created_at DESC
     LIMIT 5`,
    forumParams
  );

  const { rows: missionRows } = await query<MissionRow>(
    `SELECT m.id, m.title, m.description, m.type, m.action_type,
            m.action_count, m.xp_reward,
            COALESCE(ump.current_progress, 0) AS current_progress,
            COALESCE(ump.completed, false) AS completed,
            COALESCE(ump.reward_claimed, false) AS reward_claimed
     FROM missions m
     LEFT JOIN user_mission_progress ump ON ump.mission_id = m.id
       AND ump.user_id = $1
       AND ump.period_start = (
         CASE WHEN m.type = 'daily'
              THEN CURRENT_DATE
              ELSE date_trunc('week', CURRENT_DATE)::date
         END
       )
     WHERE m.is_active = true
     ORDER BY m.type, m.id`,
    [userId]
  );

  const { rows: weeklyXPRows } = await query<WeeklyXPRow>(
    `SELECT COALESCE(SUM(amount), 0) AS weekly_xp
     FROM xp_log
     WHERE user_id = $1
       AND created_at >= date_trunc('week', CURRENT_DATE)`,
    [userId]
  );
  const weeklyXP = parseInt(weeklyXPRows[0].weekly_xp);

  return {
    greeting: {
      name: user.name,
      segments: user.segments || [],
    },
    gamification,
    weeklyXP,
    completedCoursesCount: completedCount,
    coursesInProgress,
    enrolledNotStarted,
    recommendedCourses: recommendedCourses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnail: c.thumbnail,
      category: c.category,
      lifeContext: c.life_context,
      level: c.level,
      duration: c.duration,
      totalLessons: c.total_lessons,
      rating: parseFloat(c.rating),
      students: c.students,
      instructor: c.instructor,
      isPremium: c.is_premium,
    })),
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      content: p.content.length > 150 ? p.content.substring(0, 150) + "..." : p.content,
      category: p.category,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      createdAt: p.created_at,
      authorName: p.author_name,
      forumName: p.forum_name,
      forumIcon: p.forum_icon,
    })),
    missions: missionRows.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      actionCount: m.action_count,
      currentProgress: parseInt(m.current_progress),
      completed: m.completed,
      rewardClaimed: m.reward_claimed,
      rewardXP: m.xp_reward,
      icon: getMissionIcon(m.action_type),
    })),
  };
}
