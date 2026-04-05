import { query } from "./index.js";

export async function initializeSchema() {
  console.log("[DB] Initializing database schema...");

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      segments TEXT[] DEFAULT '{}',
      interests TEXT[] DEFAULT '{}',
      goals TEXT[] DEFAULT '{}',
      content_preferences TEXT[] DEFAULT '{}',
      notification_preferences JSONB DEFAULT '{}',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      is_premium BOOLEAN DEFAULT FALSE,
      premium_plan VARCHAR(50),
      premium_expires_at TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS email_verification_codes (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(6) NOT NULL,
      attempts INTEGER DEFAULT 0,
      verified BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_verification_email ON email_verification_codes(email)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_verification_expires ON email_verification_codes(expires_at)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(10),
      tier VARCHAR(20) DEFAULT 'bronze',
      criteria_type VARCHAR(50),
      criteria_value INTEGER,
      is_premium BOOLEAN DEFAULT FALSE,
      total_awarded INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      earned_at TIMESTAMP DEFAULT NOW(),
      is_displayed BOOLEAN DEFAULT FALSE,
      UNIQUE(user_id, badge_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS xp_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      reason VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON xp_log(user_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS missions (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL DEFAULT 'daily',
      action_type VARCHAR(50) NOT NULL,
      action_count INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 0,
      badge_reward_id INTEGER REFERENCES badges(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_mission_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
      current_progress INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP,
      reward_claimed BOOLEAN DEFAULT FALSE,
      period_start DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, mission_id, period_start)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_mission_progress_user_id ON user_mission_progress(user_id)
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date DATE
  `);

  await seedBadgesAndMissions();

  console.log("[DB] Schema initialized successfully.");
}

async function seedBadgesAndMissions() {
  const { rows } = await query(`SELECT COUNT(*) as count FROM badges`);
  if (parseInt(rows[0].count) > 0) return;

  const badges = [
    { name: 'newcomer', title: 'Bem-vindo', description: 'Completou o onboarding', icon: '👋', tier: 'bronze', criteria_type: 'onboarding', criteria_value: 1 },
    { name: 'first_lesson', title: 'Primeira Aula', description: 'Assistiu primeira aula', icon: '📚', tier: 'bronze', criteria_type: 'watch_lesson', criteria_value: 1 },
    { name: 'first_course', title: 'Primeira Conquista', description: 'Completou primeiro curso', icon: '🎓', tier: 'silver', criteria_type: 'complete_course', criteria_value: 1 },
    { name: 'courses_5', title: 'Dedicado', description: 'Completou 5 cursos', icon: '📖', tier: 'gold', criteria_type: 'complete_course', criteria_value: 5 },
    { name: 'courses_10', title: 'Master Graduate', description: 'Completou 10 cursos', icon: '👨‍🎓', tier: 'platinum', criteria_type: 'complete_course', criteria_value: 10 },
    { name: 'first_certificate', title: 'Certificado', description: 'Primeiro certificado obtido', icon: '📜', tier: 'gold', criteria_type: 'certificate', criteria_value: 1 },
    { name: 'first_post', title: 'Primeira Participação', description: 'Primeiro post na comunidade', icon: '💬', tier: 'bronze', criteria_type: 'create_post', criteria_value: 1 },
    { name: 'helpful_member', title: 'Membro Útil', description: '10 comentários úteis', icon: '⭐', tier: 'silver', criteria_type: 'helpful_comment', criteria_value: 10 },
    { name: 'community_leader', title: 'Líder Comunitário', description: 'Top 10% em engajamento', icon: '👑', tier: 'platinum', criteria_type: 'community_engagement', criteria_value: 1 },
    { name: 'streak_7', title: 'Comprometido', description: '7 dias consecutivos', icon: '🔥', tier: 'silver', criteria_type: 'streak', criteria_value: 7 },
    { name: 'streak_30', title: 'Disciplinado', description: '30 dias consecutivos', icon: '⚡', tier: 'gold', criteria_type: 'streak', criteria_value: 30 },
    { name: 'streak_90', title: 'Imparável', description: '90 dias consecutivos', icon: '💪', tier: 'platinum', criteria_type: 'streak', criteria_value: 90 },
    { name: 'premium_member', title: 'Premium Member', description: 'Assinatura Premium ativa', icon: '💎', tier: 'premium', criteria_type: 'premium', criteria_value: 1, is_premium: true },
    { name: 'referral_1', title: 'Convidou um Amigo', description: '1 indicação bem-sucedida', icon: '🤝', tier: 'bronze', criteria_type: 'referral', criteria_value: 1 },
    { name: 'referral_5', title: 'Embaixador', description: '5 indicações bem-sucedidas', icon: '🌟', tier: 'gold', criteria_type: 'referral', criteria_value: 5 },
    { name: 'level_3', title: 'Praticante', description: 'Alcançou nível 3', icon: '🏅', tier: 'silver', criteria_type: 'level', criteria_value: 3 },
    { name: 'level_5', title: 'Mestre', description: 'Alcançou nível 5', icon: '🏆', tier: 'gold', criteria_type: 'level', criteria_value: 5 },
  ];

  for (const b of badges) {
    await query(
      `INSERT INTO badges (name, title, description, icon, tier, criteria_type, criteria_value, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [b.name, b.title, b.description, b.icon, b.tier, b.criteria_type, b.criteria_value, b.is_premium || false]
    );
  }

  const missions = [
    { title: 'Estudar uma aula', description: 'Assista a pelo menos 1 aula hoje', type: 'daily', action_type: 'watch_lesson', action_count: 1, xp_reward: 25 },
    { title: 'Participar da comunidade', description: 'Faça um comentário ou post', type: 'daily', action_type: 'community_interact', action_count: 1, xp_reward: 15 },
    { title: 'Manter a sequência', description: 'Acesse a plataforma por 1 dia consecutivo', type: 'daily', action_type: 'daily_login', action_count: 1, xp_reward: 10 },
    { title: 'Completar 3 aulas', description: 'Assista 3 aulas esta semana', type: 'weekly', action_type: 'watch_lesson', action_count: 3, xp_reward: 75 },
    { title: 'Explorador de conteúdo', description: 'Acesse 3 áreas diferentes da plataforma', type: 'weekly', action_type: 'explore_areas', action_count: 3, xp_reward: 50 },
    { title: 'Engajamento comunitário', description: 'Faça 5 interações na comunidade', type: 'weekly', action_type: 'community_interact', action_count: 5, xp_reward: 100 },
  ];

  for (const m of missions) {
    await query(
      `INSERT INTO missions (title, description, type, action_type, action_count, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [m.title, m.description, m.type, m.action_type, m.action_count, m.xp_reward]
    );
  }

  console.log("[DB] Seeded badges and missions.");
}
