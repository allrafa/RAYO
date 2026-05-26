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

  // Task #207 — magic link de confirmação por e-mail. Guardamos só o
  // hash (sha256) do token; o token cru vai no link do e-mail. Coluna
  // adicionada idempotentemente pra rodar em DBs existentes.
  await query(`
    ALTER TABLE email_verification_codes
      ADD COLUMN IF NOT EXISTS verify_token_hash VARCHAR(64)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_verification_token_hash
      ON email_verification_codes(verify_token_hash)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      requested_ip VARCHAR(45),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON password_reset_tokens(token_hash)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at)
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
      title VARCHAR(200) NOT NULL UNIQUE,
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
    CREATE TABLE IF NOT EXISTS user_xp (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_xp INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      xp_to_next_level INTEGER DEFAULT 100,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date DATE,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date DATE
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'client'
  `);

  // Task #45 — Perfil aprimorado
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `);
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT
  `);

  // Task #69/#72 — OAuth social (Google + Facebook). Apple removido em Maio/2026
  // (#72) — coluna, índice e constraint dropados de forma idempotente; nenhum
  // usuário Apple existia em produção, então é no-op em prática.
  // `password_hash` precisa virar nullable porque contas só-OAuth não têm senha local.
  // `google_id` / `facebook_id` guardam o `sub` do provider, com UNIQUE pra impedir duplicação.
  // Tudo idempotente: rodar de novo é no-op.
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)
  `);
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255)
  `);
  // Migração de remoção do Apple — drop idempotente. A ordem importa: índice
  // antes da constraint antes da coluna.
  await query(`DROP INDEX IF EXISTS idx_users_apple_id`);
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_apple_id_key'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_apple_id_key;
      END IF;
    END$$;
  `);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS apple_id`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_facebook_id_key'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_facebook_id_key UNIQUE (facebook_id);
      END IF;
    END$$;
  `);
  await query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id)`);

  await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

  // DB-level integrity guard: only the four documented roles are accepted.
  // Idempotent — does nothing if the constraint already exists.
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('client', 'producer', 'moderator', 'admin'));
      END IF;
    END$$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      thumbnail VARCHAR(500),
      duration VARCHAR(50),
      total_lessons INTEGER DEFAULT 0,
      rating NUMERIC(3,2) DEFAULT 0,
      students INTEGER DEFAULT 0,
      price NUMERIC(10,2) DEFAULT 0,
      category VARCHAR(100),
      life_context VARCHAR(50),
      level VARCHAR(50) DEFAULT 'Iniciante',
      is_premium BOOLEAN DEFAULT FALSE,
      instructor VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_courses_life_context ON courses(life_context)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS course_modules (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS course_lessons (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      duration VARCHAR(20),
      duration_seconds INTEGER DEFAULT 0,
      video_url VARCHAR(500),
      content_type VARCHAR(50) DEFAULT 'video',
      sort_order INTEGER DEFAULT 0,
      is_free_preview BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_course_lessons_module_id ON course_lessons(module_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_course_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      progress_percentage NUMERIC(5,2) DEFAULT 0,
      completed_lessons INTEGER DEFAULT 0,
      total_lessons INTEGER DEFAULT 0,
      last_lesson_id INTEGER REFERENCES course_lessons(id),
      UNIQUE(user_id, course_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON user_course_progress(user_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_lesson_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'not_started',
      progress_seconds INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      started_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, lesson_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS forums (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      icon VARCHAR(10),
      life_context VARCHAR(50),
      category VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      forum_id INTEGER NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(300),
      content TEXT NOT NULL,
      category VARCHAR(100),
      is_pinned BOOLEAN DEFAULT FALSE,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      share_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_posts_forum_id ON posts(forum_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      like_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id)`);

  // Moderation soft-hide columns (idempotent; added after posts/comments tables exist)
  await query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP
  `);
  await query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON posts(is_hidden)`);

  await query(`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP
  `);
  await query(`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_comments_is_hidden ON comments(is_hidden)`);

  await query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_id, user_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(comment_id, user_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id)`);

  // ──────────────────────────────────────────────────────────────────
  // Task #122 — Reações multi-emoji em posts e comentários.
  // Set fechado de 6 emojis (validado no service). UNIQUE(target,user)
  // garante 1 reação por par — trocar de emoji UPDATE em vez de
  // duplicar. like_count em posts/comments segue refletindo o TOTAL de
  // reações (qualquer emoji conta como engajamento) — trending e karma
  // continuam funcionando sem retrabalho. Backfill copia rows antigas
  // de post_likes/comment_likes pra ❤️ (idempotente, ON CONFLICT).
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS post_reactions (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(8) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(post_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS comment_reactions (
      id SERIAL PRIMARY KEY,
      comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(8) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(comment_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id)`);

  // Backfill — copia likes legados pra ❤️ (1x; idempotente via UNIQUE).
  await query(`
    INSERT INTO post_reactions (post_id, user_id, emoji, created_at)
    SELECT post_id, user_id, '❤️', created_at FROM post_likes
    ON CONFLICT (post_id, user_id) DO NOTHING
  `);
  await query(`
    INSERT INTO comment_reactions (comment_id, user_id, emoji, created_at)
    SELECT comment_id, user_id, '❤️', created_at FROM comment_likes
    ON CONFLICT (comment_id, user_id) DO NOTHING
  `);

  // ──────────────────────────────────────────────────────────────────
  // Task #92 — Comunidade no estilo Reddit (subreddits + karma + follows).
  // Tudo idempotente. `slug` é gerado no boot abaixo (slugify do name)
  // para forums já existentes. `posts.images` guarda um array JSON de
  // sentinels `objstore://posts/<file>` (validado na escrita).
  // ──────────────────────────────────────────────────────────────────
  await query(`ALTER TABLE forums ADD COLUMN IF NOT EXISTS slug VARCHAR(80)`);
  // Task #92 — `member_count` é SEMPRE derivado de COUNT(*) FROM forum_subscriptions
  // (ver service.ts). Removemos a coluna persistida pra eliminar drift entre o número
  // exibido e o real. Idempotente (DROP IF EXISTS).
  await query(`ALTER TABLE forums DROP COLUMN IF EXISTS member_count`);
  await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb`);

  // Backfill de slug para forums já existentes (idempotente: só roda em
  // linhas com slug NULL/vazio). Slugify simples sem dependência externa.
  const { rows: forumNeedSlug } = await query<{ id: number; name: string }>(
    `SELECT id, name FROM forums WHERE slug IS NULL OR slug = ''`,
  );
  for (const f of forumNeedSlug) {
    const base = f.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `c-${f.id}`;
    // Garante unicidade adicionando id como sufixo se colidir.
    let slug = base;
    const probe = await query(`SELECT id FROM forums WHERE slug = $1 AND id <> $2`, [slug, f.id]);
    if (probe.rows.length > 0) slug = `${base}-${f.id}`;
    await query(`UPDATE forums SET slug = $1 WHERE id = $2`, [slug, f.id]);
  }
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_forums_slug ON forums(slug)`);

  // Task #198 — comunidades enriquecidas via CMS + criação por usuário.
  // Idempotente: ALTER ADD COLUMN IF NOT EXISTS preserva fóruns seedados.
  await query(`ALTER TABLE forums ADD COLUMN IF NOT EXISTS cover_url TEXT`);
  await query(`ALTER TABLE forums ADD COLUMN IF NOT EXISTS rules TEXT`);
  await query(`ALTER TABLE forums ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  // is_official: DEFAULT TRUE no ADD COLUMN garante que linhas pré-existentes
  // (todas seedadas pelo boot) virem TRUE de uma vez só, sem precisar de
  // UPDATE recorrente. Novos INSERTs (createForumByUser/adminCreateForum)
  // passam o valor explicitamente, então o default não influencia mais.
  // Resultado: admin pode desmarcar "is_official" de uma comunidade legada
  // e o boot NÃO vai reverter na próxima reinicialização.
  await query(`ALTER TABLE forums ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT TRUE`);

  await query(`
    CREATE TABLE IF NOT EXISTS forum_subscriptions (
      forum_id INTEGER NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (forum_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_forum_subs_user ON forum_subscriptions(user_id)`);

  // Task #198 — moderadores específicos por comunidade. Independente do
  // role global (`moderator`/`admin`); um `client` pode ser moderador de
  // uma comunidade que ele criou OU foi promovido por admin global.
  await query(`
    CREATE TABLE IF NOT EXISTS forum_moderators (
      forum_id INTEGER NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (forum_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_forum_mods_user ON forum_moderators(user_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, followee_id),
      CHECK (follower_id <> followee_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows(followee_id)`);

  // Task #93 — posts salvos (Salvar/Desalvar). Per-usuário, idempotente.
  await query(`
    CREATE TABLE IF NOT EXISTS post_saves (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_post_saves_user_created ON post_saves(user_id, created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS lgpd_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_type VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_lgpd_requests_user_id ON lgpd_requests(user_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      event_name VARCHAR(100) NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_message_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT conversations_user_order CHECK (user_a_id < user_b_id),
      UNIQUE (user_a_id, user_b_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL`);

  // Task #79 — anexos (foto/áudio) e marcadores per-participante para
  // arquivar/excluir. `kind` define o tipo do payload; `attachment_url`
  // guarda a referência canônica (`objstore://...` ou URL externa); o
  // `attachment_meta` é JSONB livre (mime, tamanho, duração, etc).
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'text'`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500)`);
  await query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_meta JSONB`);

  // Task #148 — reações multi-emoji em mensagens de DM. Mesma estratégia
  // de posts/comments na Comunidade (Task #122): set fechado de 6 emojis,
  // UNIQUE(message_id, user_id) — um usuário só pode ter 1 reação por
  // mensagem (toggle/swap/remove). Validação do emoji acontece no service.
  await query(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(8) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(message_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id)`);

  // Estado per-participante da conversa: arquivar e excluir só afetam
  // o lado de quem clicou. Excluir também marca um corte (`cleared_at`)
  // para a listagem de mensagens, sem mexer no histórico do outro lado.
  await query(`
    CREATE TABLE IF NOT EXISTS conversation_user_state (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      archived_at TIMESTAMP,
      deleted_at TIMESTAMP,
      cleared_at TIMESTAMP,
      PRIMARY KEY (conversation_id, user_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_conv_user_state_user ON conversation_user_state(user_id)`);

  // ──────────────────────────────────────────────────────────────────
  // Task #71 — Notifications (DM + room for system kinds in the future).
  // Persisted feed shown in the bell dropdown; payload is JSONB so
  // future kinds (likes, mentions, follows…) can carry arbitrary metadata
  // without schema churn. `read_at IS NULL` is the unread predicate.
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind VARCHAR(40) NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT,
      link VARCHAR(500),
      payload JSONB DEFAULT '{}'::jsonb,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL`);

  // ──────────────────────────────────────────────────────────────────
  // mod_actions (Task #94) — auditoria de ações de moderação. Hoje
  // só registra `post_deleted` mas o schema é genérico (target_kind +
  // target_id) pra suportar comment_deleted/user_banned no futuro.
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS mod_actions (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_kind VARCHAR(40) NOT NULL,
      target_id INTEGER NOT NULL,
      action VARCHAR(40) NOT NULL,
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_mod_actions_target ON mod_actions(target_kind, target_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mod_actions_actor_created ON mod_actions(actor_id, created_at DESC)`);

  // Idempotency guard for DM "you have a new message" emails so a burst
  // of messages in the same conversation cannot flood the recipient's
  // inbox. Service layer enforces a 1-hour cool-down per conversation.
  await query(`
    CREATE TABLE IF NOT EXISTS dm_email_sent (
      conversation_id INTEGER PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_dm_email_sent_recipient ON dm_email_sent(recipient_id)`);

  // ──────────────────────────────────────────────────────────────────
  // CMS — content_items + child tables + media_assets
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id SERIAL PRIMARY KEY,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      filename VARCHAR(500) NOT NULL,
      original_name VARCHAR(500),
      mime_type VARCHAR(100),
      size_bytes BIGINT,
      storage_path VARCHAR(500) NOT NULL,
      public_url VARCHAR(500) NOT NULL,
      kind VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_media_assets_uploaded_by ON media_assets(uploaded_by)`);

  await query(`
    CREATE TABLE IF NOT EXISTS content_items (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(20) NOT NULL,
      title VARCHAR(300) NOT NULL,
      slug VARCHAR(320) UNIQUE,
      short_description TEXT,
      long_description TEXT,
      cover_url VARCHAR(500),
      segments TEXT[] DEFAULT '{}',
      interests TEXT[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      is_premium BOOLEAN DEFAULT FALSE,
      price NUMERIC(10,2) DEFAULT 0,

      -- type-specific fields (nullable depending on kind)
      media_url VARCHAR(500),
      external_url VARCHAR(500),
      duration_seconds INTEGER,
      transcript TEXT,
      hook TEXT,
      cta TEXT,
      author VARCHAR(200),
      pages INTEGER,

      -- link to existing courses table for kind='curso'
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,

      view_count INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'content_items' AND constraint_name = 'content_items_kind_check'
      ) THEN
        ALTER TABLE content_items
          ADD CONSTRAINT content_items_kind_check
          CHECK (kind IN ('audio','video','reels','serie','curso','livro','artigo'));
      ELSE
        -- Task #70: widen the constraint to accept 'artigo' (blog posts).
        -- DROP + re-ADD because CHECK constraints can't be altered in place.
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'content_items_kind_check'
            AND conrelid = 'content_items'::regclass
            AND pg_get_constraintdef(oid) ILIKE '%artigo%'
        ) THEN
          ALTER TABLE content_items DROP CONSTRAINT content_items_kind_check;
          ALTER TABLE content_items
            ADD CONSTRAINT content_items_kind_check
            CHECK (kind IN ('audio','video','reels','serie','curso','livro','artigo'));
        END IF;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'content_items' AND constraint_name = 'content_items_status_check'
      ) THEN
        ALTER TABLE content_items
          ADD CONSTRAINT content_items_status_check
          CHECK (status IN ('draft','published','archived'));
      ELSE
        -- Task #26: widen the constraint to accept 'archived' (older deployments
        -- created the constraint with the original 2-value definition). DROP +
        -- re-ADD is the simplest portable upgrade since CHECK constraints can't
        -- be altered in place. Scope the lookup to the content_items relation
        -- explicitly (via conrelid) so the check is unambiguous even if another
        -- table happens to use the same constraint name.
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'content_items_status_check'
            AND conrelid = 'content_items'::regclass
            AND pg_get_constraintdef(oid) ILIKE '%archived%'
        ) THEN
          ALTER TABLE content_items DROP CONSTRAINT content_items_status_check;
          ALTER TABLE content_items
            ADD CONSTRAINT content_items_status_check
            CHECK (status IN ('draft','published','archived'));
        END IF;
      END IF;
    END$$;
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_items_kind ON content_items(kind)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_items_course_id ON content_items(course_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_items_segments ON content_items USING GIN(segments)`);

  // Task #86 — colunas para integração Bunny Stream. `media_url` /
  // `external_url` continuam servindo conteúdos legados (URL colada à mão);
  // o novo fluxo grava `video_provider='bunny'` + `video_external_id=<guid>`
  // e os campos derivados são preenchidos pelo webhook de transcode.
  // Idempotente por COLUNA (não por bloco) pra cobrir bancos parcialmente
  // migrados — ex.: rollback que apagou só algumas colunas.
  await query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_provider VARCHAR(20)`);
  await query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_external_id VARCHAR(200)`);
  await query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_status VARCHAR(20)`);
  await query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_duration_sec INTEGER`);
  await query(`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_thumbnail_url VARCHAR(500)`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'content_items_video_status_check'
          AND conrelid = 'content_items'::regclass
      ) THEN
        ALTER TABLE content_items
          ADD CONSTRAINT content_items_video_status_check
          CHECK (video_status IS NULL OR video_status IN ('processing','ready','failed'));
      END IF;
    END$$;
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_content_items_video_external_id ON content_items(video_external_id) WHERE video_external_id IS NOT NULL`,
  );

  await query(`
    CREATE TABLE IF NOT EXISTS content_episodes (
      id SERIAL PRIMARY KEY,
      series_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      episode_kind VARCHAR(20) NOT NULL DEFAULT 'audio',
      media_url VARCHAR(500),
      external_url VARCHAR(500),
      duration_seconds INTEGER,
      transcript TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'content_episodes' AND constraint_name = 'content_episodes_kind_check'
      ) THEN
        ALTER TABLE content_episodes
          ADD CONSTRAINT content_episodes_kind_check
          CHECK (episode_kind IN ('audio','video'));
      END IF;
    END$$;
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_episodes_series_id ON content_episodes(series_id, sort_order)`);

  // ── Bunny Stream para episódios (Task #88) ────────────────────────
  // Mesmo contrato de content_items: provider/external_id/status/duration/thumb.
  // Webhook do Bunny atualiza ambos via lookup por GUID.
  await query(`ALTER TABLE content_episodes ADD COLUMN IF NOT EXISTS video_provider VARCHAR(20)`);
  await query(`ALTER TABLE content_episodes ADD COLUMN IF NOT EXISTS video_external_id VARCHAR(200)`);
  await query(`ALTER TABLE content_episodes ADD COLUMN IF NOT EXISTS video_status VARCHAR(20)`);
  await query(`ALTER TABLE content_episodes ADD COLUMN IF NOT EXISTS video_duration_sec INTEGER`);
  await query(`ALTER TABLE content_episodes ADD COLUMN IF NOT EXISTS video_thumbnail_url VARCHAR(500)`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'content_episodes_video_status_check'
          AND conrelid = 'content_episodes'::regclass
      ) THEN
        ALTER TABLE content_episodes
          ADD CONSTRAINT content_episodes_video_status_check
          CHECK (video_status IS NULL OR video_status IN ('processing','ready','failed'));
      END IF;
    END$$;
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_content_episodes_video_external_id ON content_episodes(video_external_id) WHERE video_external_id IS NOT NULL`,
  );

  // ──────────────────────────────────────────────────────────────────
  // Home Feed CMS — curated rails on HomePage (Task #20)
  // Self-contained card data per section; admin reorders / adds / edits.
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS home_feed_items (
      id SERIAL PRIMARY KEY,
      section VARCHAR(40) NOT NULL,
      title VARCHAR(200) NOT NULL,
      subtitle VARCHAR(240),
      image_url VARCHAR(500),
      gradient VARCHAR(120),
      badge_text VARCHAR(80),
      meta_text VARCHAR(120),
      progress INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      content_item_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE home_feed_items ADD COLUMN IF NOT EXISTS link_url VARCHAR(500)`);
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'home_feed_items_section_check'
      ) THEN
        ALTER TABLE home_feed_items
          ADD CONSTRAINT home_feed_items_section_check
          CHECK (section IN ('recently_played','made_for_you','trending','podcasts'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'home_feed_items_progress_check'
      ) THEN
        ALTER TABLE home_feed_items
          ADD CONSTRAINT home_feed_items_progress_check
          CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100));
      END IF;
      -- Note: an earlier draft of this schema added a UNIQUE (section, title)
      -- constraint to make the seed idempotent on re-runs. That made admin
      -- title edits dangerous (the next boot would reseed the original title
      -- alongside the renamed row), so it is dropped here if it exists. The
      -- seed in migrate.ts is now gated on "table is empty" instead.
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'home_feed_items_section_title_unique'
      ) THEN
        ALTER TABLE home_feed_items
          DROP CONSTRAINT home_feed_items_section_title_unique;
      END IF;
    END$$;
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_home_feed_items_section ON home_feed_items(section, sort_order)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_home_feed_items_active ON home_feed_items(is_active)`);

  // ──────────────────────────────────────────────────────────────────
  // "Hoje no RAYO" — daily completion log (Task #43).
  // One row per (user, day). UNIQUE constraint makes the
  // POST /api/home/today/complete endpoint idempotent and prevents
  // farming XP by replaying the request.
  // ──────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS home_today_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
      completed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, completed_date)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_home_today_completions_user_date ON home_today_completions(user_id, completed_date DESC)`);

  // Task #151 — Auditoria do Catálogo: zerar ratings/students fake do seed
  // legado (Task #17 retirou seedCourses, mas DBs antigos guardam números
  // como rating=4.9 students=4102 sem dados reais por trás). UPDATE
  // idempotente: só toca cursos que ainda batem EXATAMENTE com o seed
  // original (título + valor de seed) — preserva qualquer rating/students
  // que tenha sido editado manualmente no admin ou crescido organicamente.
  // Match por (title, rating) — students cresce naturalmente com matrículas
  // reais, então não dá pra usar como discriminador (id=1 já tinha
  // students=2848 vs seed 2847 quando esta migração rodou). Rating, em
  // contraste, só muda via admin/avaliações reais (ainda não temos UI),
  // então é seguro usar como sentinel "ainda é o valor fake do seed".
  await query(`
    UPDATE courses SET rating = 0, students = 0
     WHERE (title, rating) IN (
       ('Fundamentos do Relacionamento', 4.8),
       ('Comunicação Não-Violenta para Famílias', 4.9),
       ('Finanças para Casais', 4.7),
       ('Educação Positiva: Criando Filhos Resilientes', 4.9),
       ('Preparação para o Namoro Saudável', 4.6),
       ('Construindo um Noivado com Propósito', 4.8)
     )
  `);

  await seedBadgesAndMissions();
  // NOTE: seedCourses() was retired as part of Task #17 — the CMS
  // (`server/features/cms/*`) is now the authoritative source for course
  // authoring. Producers create courses via POST /api/admin/cms/courses,
  // and modules/lessons via /api/admin/cms/courses/:id/modules*. The legacy
  // seed function is kept below for historical reference but is no longer
  // invoked on boot. Existing databases that were already seeded keep their
  // data untouched (no destructive cleanup); fresh databases start empty.
  await seedForumsAndPosts();
  const { migrateCmsContent } = await import("../features/cms/migrate.js");
  await migrateCmsContent();
  const { migrateHomeFeed } = await import("../features/home-feed/migrate.js");
  await migrateHomeFeed();
  const { migrateBundles } = await import("../features/bundles/migrate.js");
  await migrateBundles();

  // Task #99 — Turmas (mini-Skool). Campos de landing rica nas `courses`,
  // tabela de interesses (modal "Em breve" sem checkout), e `class_id`
  // opcional em `posts` para comunidade escopada por turma. Tudo idempotente.
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS subtitle VARCHAR(280)`);
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS who_for JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS what_you_get JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS how_it_works TEXT`);
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS hero_cover_url VARCHAR(500)`);
  await query(`
    CREATE TABLE IF NOT EXISTS class_interests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_class_interests_course ON class_interests(course_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_class_interests_user ON class_interests(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_class_interests_created ON class_interests(created_at DESC)`);
  // Task #106 — dedupe quem já recebeu o aviso de "matrícula aberta".
  // NULL = ainda não notificado. Idempotente.
  await query(`ALTER TABLE class_interests ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP`);
  await query(`CREATE INDEX IF NOT EXISTS idx_class_interests_notified ON class_interests(course_id, notified_at)`);
  // Task #109 — contador de quantas vezes o aviso de matrícula aberta
  // foi enviado para cada interessado (bulk + reenvios individuais).
  // Backfill: linhas que já tinham `notified_at` recebem 1 (uma entrega
  // antes desta migração); demais ficam em 0.
  await query(`ALTER TABLE class_interests ADD COLUMN IF NOT EXISTS notified_count INTEGER NOT NULL DEFAULT 0`);
  await query(`UPDATE class_interests SET notified_count = 1 WHERE notified_at IS NOT NULL AND notified_count = 0`);
  await query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES courses(id) ON DELETE SET NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_posts_class_id ON posts(class_id)`);

  // Task #102 — instrutor (líder) da turma. Necessário para roteamento de
  // notificações kind=class_interest. Backfill a partir de content_items
  // (que já guarda created_by para o item espelho do tipo curso).
  await query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by)`);
  await query(`
    UPDATE courses c
       SET created_by = ci.created_by
      FROM content_items ci
     WHERE ci.kind = 'curso'
       AND ci.course_id = c.id
       AND ci.created_by IS NOT NULL
       AND c.created_by IS NULL
  `);

  // Task #102 — cooldown anti-spam para o e-mail-resumo enviado ao
  // instrutor com novos interessados em uma turma. Uma linha por turma;
  // last_sent_at é atualizado apenas quando um e-mail real foi disparado.
  await query(`
    CREATE TABLE IF NOT EXISTS class_interest_email_sent (
      course_id INTEGER PRIMARY KEY REFERENCES courses(id) ON DELETE CASCADE,
      last_sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Task #152 — Avaliações reais de cursos pelos alunos. UNIQUE(user, course)
  // garante idempotência (re-submissão = update). `courses.rating` é
  // recalculado como AVG(rating) a cada submit/update/delete via service.
  await query(`
    CREATE TABLE IF NOT EXISTS course_reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, course_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_course_reviews_user ON course_reviews(user_id)`);
  // Task #155 — moderação: avaliações ocultadas não entram na média nem na listagem.
  await query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP`);
  await query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS hidden_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_course_reviews_visible ON course_reviews(course_id) WHERE is_hidden = FALSE`);

  // Task #193 — Os índices trigram (pg_trgm GIN gin_trgm_ops sobre posts,
  // comments, forums, users) foram REMOVIDOS porque o diff de schema do
  // Publish da Replit não preserva o opclass `gin_trgm_ops` ao replicar
  // pra produção, gerando `CREATE INDEX ... USING gin ("col")` (sem
  // opclass) que falha com `data type text has no default operator class`.
  // Enquanto não houver caminho de migração que respeite opclasses, a
  // busca continua usando Seq Scan (ILIKE puro). O dataset atual é
  // pequeno o bastante pra UX se manter ok.

  // Task #205 — backfill: usuários OAuth (Google/Facebook) que entraram
  // antes dessa task receberem uma linha verified=TRUE em
  // email_verification_codes pra passar em isUserEmailVerified. Idempotente.
  try {
    const { backfillOAuthVerifiedEmails } = await import("../features/auth/service.js");
    const n = await backfillOAuthVerifiedEmails();
    if (n > 0) console.log(`[DB] Backfilled email-verified status for ${n} OAuth user(s).`);
  } catch (err) {
    console.warn(`[DB] Backfill OAuth verified emails skipped: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Task #252 — progresso de leitura de livros (MVP do Leitor PDF).
  // Uma linha por (user, conteúdo livro). `current_page` é 1-based.
  await query(`
    CREATE TABLE IF NOT EXISTS book_progress (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      current_page INTEGER NOT NULL DEFAULT 1 CHECK (current_page >= 1),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, content_id)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_book_progress_user ON book_progress(user_id);`);

  console.log("[DB] Schema initialized successfully.");
}

async function seedBadgesAndMissions() {

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
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [m.title, m.description, m.type, m.action_type, m.action_count, m.xp_reward]
    );
  }

  console.log("[DB] Seeded badges and missions.");
}

// seedCourses is a one-shot bootstrap migration. After Task #17 the CMS
// (`server/features/cms/*`) is the authoritative source for course authoring:
// producers create/edit modules and lessons via /api/admin/cms/courses/*.
// This function only runs when the `courses` table is completely empty (i.e.
// the very first boot of a fresh database). Once any course exists — whether
// from this seed or created in the CMS — it never re-seeds. Treat this as a
// historical bootstrap, not as the runtime source of truth.
async function seedCourses() {
  const { rows } = await query(`SELECT COUNT(*) as count FROM courses`);
  if (parseInt(rows[0].count) > 0) return;

  const coursesData = [
    {
      title: 'Fundamentos do Relacionamento',
      description: 'Construa uma base sólida para seu relacionamento com princípios fundamentais de comunicação, respeito e confiança.',
      thumbnail: 'https://images.unsplash.com/photo-1680603007731-d8da76c235ba?w=800&fit=crop',
      duration: '4h 30m',
      rating: 0, students: 0, price: 0, category: 'Relacionamento',
      life_context: 'casados', level: 'Iniciante', is_premium: false, instructor: 'Dr. Paulo Mendes',
      modules: [
        { title: 'Pilares do Relacionamento', description: 'Os fundamentos essenciais', lessons: [
          { title: 'Introdução: O que faz um relacionamento funcionar', duration: '12:30', duration_seconds: 750, is_free_preview: true },
          { title: 'Comunicação efetiva no dia a dia', duration: '18:45', duration_seconds: 1125 },
          { title: 'Construindo confiança mútua', duration: '15:20', duration_seconds: 920 },
          { title: 'Exercício prático: Diário de gratidão', duration: '8:10', duration_seconds: 490 },
        ]},
        { title: 'Resolvendo Conflitos', description: 'Técnicas para resolver desentendimentos', lessons: [
          { title: 'Entendendo a raiz dos conflitos', duration: '14:50', duration_seconds: 890 },
          { title: 'Técnica dos 4 passos para resolver brigas', duration: '20:15', duration_seconds: 1215 },
          { title: 'Quando buscar ajuda profissional', duration: '11:30', duration_seconds: 690 },
        ]},
        { title: 'Crescendo Juntos', description: 'Fortalecendo o vínculo ao longo do tempo', lessons: [
          { title: 'Mantendo a chama acesa', duration: '16:40', duration_seconds: 1000 },
          { title: 'Projetos de vida a dois', duration: '19:20', duration_seconds: 1160 },
          { title: 'Celebrando conquistas juntos', duration: '10:15', duration_seconds: 615 },
          { title: 'Revisão e próximos passos', duration: '8:45', duration_seconds: 525 },
        ]},
      ]
    },
    {
      title: 'Comunicação Não-Violenta para Famílias',
      description: 'Aprenda técnicas avançadas de CNV para transformar a comunicação em sua família e resolver conflitos com empatia.',
      thumbnail: 'https://images.unsplash.com/photo-1624448445915-97154f5e688c?w=800&fit=crop',
      duration: '6h 15m',
      rating: 0, students: 0, price: 297, category: 'Comunicação',
      life_context: 'casados', level: 'Avançado', is_premium: true, instructor: 'Dra. Ana Costa',
      modules: [
        { title: 'Fundamentos da CNV', description: 'O que é e como funciona', lessons: [
          { title: 'Introdução à Comunicação Não-Violenta', duration: '15:20', duration_seconds: 920, is_free_preview: true },
          { title: 'Observação vs. Julgamento', duration: '22:10', duration_seconds: 1330 },
          { title: 'Identificando sentimentos reais', duration: '18:30', duration_seconds: 1110 },
          { title: 'Necessidades universais', duration: '16:45', duration_seconds: 1005 },
        ]},
        { title: 'CNV na Prática Familiar', description: 'Aplicando no cotidiano', lessons: [
          { title: 'CNV com seu parceiro(a)', duration: '20:30', duration_seconds: 1230 },
          { title: 'CNV com filhos pequenos', duration: '19:15', duration_seconds: 1155 },
          { title: 'CNV com adolescentes', duration: '21:40', duration_seconds: 1300 },
          { title: 'Pedidos vs. Exigências', duration: '14:50', duration_seconds: 890 },
        ]},
        { title: 'Resolução de Conflitos com CNV', description: 'Transformando conflitos', lessons: [
          { title: 'Mediação familiar empática', duration: '25:10', duration_seconds: 1510 },
          { title: 'Casos práticos resolvidos', duration: '30:20', duration_seconds: 1820 },
          { title: 'Exercícios diários de CNV', duration: '12:45', duration_seconds: 765 },
        ]},
      ]
    },
    {
      title: 'Finanças para Casais',
      description: 'Organize sua vida financeira a dois. Orçamento, investimentos e planejamento para construir um futuro próspero juntos.',
      thumbnail: 'https://images.unsplash.com/photo-1588912914078-2fe5224fd8b8?w=800&fit=crop',
      duration: '5h 45m',
      rating: 0, students: 0, price: 0, category: 'Finanças',
      life_context: 'casados', level: 'Intermediário', is_premium: false, instructor: 'Carlos Oliveira',
      modules: [
        { title: 'Diagnóstico Financeiro', description: 'Entendendo sua situação atual', lessons: [
          { title: 'Mapeando receitas e despesas do casal', duration: '16:20', duration_seconds: 980, is_free_preview: true },
          { title: 'Dívidas: como sair do vermelho juntos', duration: '22:30', duration_seconds: 1350 },
          { title: 'Criando o orçamento familiar', duration: '19:45', duration_seconds: 1185 },
        ]},
        { title: 'Investindo Juntos', description: 'Construindo patrimônio', lessons: [
          { title: 'Reserva de emergência do casal', duration: '14:10', duration_seconds: 850 },
          { title: 'Tipos de investimento para famílias', duration: '25:30', duration_seconds: 1530 },
          { title: 'Planejando a aposentadoria a dois', duration: '20:15', duration_seconds: 1215 },
        ]},
        { title: 'Conversas sobre Dinheiro', description: 'Como alinhar expectativas', lessons: [
          { title: 'Quebrando tabus financeiros no casamento', duration: '18:40', duration_seconds: 1120 },
          { title: 'Conta conjunta vs. separada: o que funciona', duration: '15:50', duration_seconds: 950 },
          { title: 'Ensinando filhos sobre dinheiro', duration: '21:20', duration_seconds: 1280 },
          { title: 'Planejamento financeiro para grandes sonhos', duration: '17:30', duration_seconds: 1050 },
        ]},
      ]
    },
    {
      title: 'Educação Positiva: Criando Filhos Resilientes',
      description: 'Técnicas comprovadas de disciplina positiva para criar filhos emocionalmente inteligentes, seguros e resilientes.',
      thumbnail: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&fit=crop',
      duration: '7h 20m',
      rating: 0, students: 0, price: 347, category: 'Parentalidade',
      life_context: 'pais', level: 'Intermediário', is_premium: true, instructor: 'Dra. Maria Santos',
      modules: [
        { title: 'Bases da Educação Positiva', description: 'Fundamentos científicos', lessons: [
          { title: 'O que é disciplina positiva', duration: '14:20', duration_seconds: 860, is_free_preview: true },
          { title: 'Desenvolvimento emocional infantil', duration: '22:45', duration_seconds: 1365 },
          { title: 'Firmeza com afeto: o equilíbrio ideal', duration: '18:30', duration_seconds: 1110 },
          { title: 'Erros comuns na educação', duration: '16:15', duration_seconds: 975 },
        ]},
        { title: 'Ferramentas Práticas', description: 'Técnicas do dia a dia', lessons: [
          { title: 'Consequências naturais vs. punição', duration: '20:10', duration_seconds: 1210 },
          { title: 'Rotina e limites saudáveis', duration: '17:45', duration_seconds: 1065 },
          { title: 'Lidando com birras e crises', duration: '23:20', duration_seconds: 1400 },
          { title: 'Reforço positivo efetivo', duration: '15:30', duration_seconds: 930 },
        ]},
        { title: 'Desafios Especiais', description: 'Situações complexas', lessons: [
          { title: 'Educação de adolescentes', duration: '25:40', duration_seconds: 1540 },
          { title: 'Tecnologia e tempo de tela', duration: '19:15', duration_seconds: 1155 },
          { title: 'Separação dos pais: como proteger os filhos', duration: '22:30', duration_seconds: 1350 },
          { title: 'Criando filhos em tempos difíceis', duration: '18:50', duration_seconds: 1130 },
        ]},
      ]
    },
    {
      title: 'Preparação para o Namoro Saudável',
      description: 'Desenvolva habilidades emocionais e relacionais antes de iniciar um relacionamento. Autoconhecimento e expectativas realistas.',
      thumbnail: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&fit=crop',
      duration: '3h 50m',
      rating: 0, students: 0, price: 0, category: 'Autoconhecimento',
      life_context: 'solteiro', level: 'Iniciante', is_premium: false, instructor: 'Juliana Rodrigues',
      modules: [
        { title: 'Autoconhecimento', description: 'Conhecendo a si mesmo', lessons: [
          { title: 'Quem sou eu nos relacionamentos?', duration: '15:40', duration_seconds: 940, is_free_preview: true },
          { title: 'Padrões de apego e como identificar o seu', duration: '20:25', duration_seconds: 1225 },
          { title: 'Red flags e green flags', duration: '18:10', duration_seconds: 1090 },
        ]},
        { title: 'Habilidades Relacionais', description: 'O que praticar antes de namorar', lessons: [
          { title: 'Comunicação assertiva', duration: '16:30', duration_seconds: 990 },
          { title: 'Vulnerabilidade e autenticidade', duration: '14:50', duration_seconds: 890 },
          { title: 'Estabelecendo limites saudáveis', duration: '19:20', duration_seconds: 1160 },
        ]},
        { title: 'Começando com o Pé Direito', description: 'Iniciando um relacionamento', lessons: [
          { title: 'Expectativas realistas no namoro', duration: '17:15', duration_seconds: 1035 },
          { title: 'Primeiras conversas importantes', duration: '13:40', duration_seconds: 820 },
          { title: 'Construindo uma base sólida desde o início', duration: '21:10', duration_seconds: 1270 },
        ]},
      ]
    },
    {
      title: 'Construindo um Noivado com Propósito',
      description: 'O período de noivado é essencial para alinhar expectativas e planejar um casamento com propósito e intenção.',
      thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&fit=crop',
      duration: '4h 10m',
      rating: 0, students: 0, price: 197, category: 'Preparação',
      life_context: 'namoro', level: 'Intermediário', is_premium: false, instructor: 'Pastor Ricardo Almeida',
      modules: [
        { title: 'Alinhamento de Valores', description: 'Conversas essenciais antes do casamento', lessons: [
          { title: 'Valores e prioridades: alinhando visões', duration: '18:30', duration_seconds: 1110, is_free_preview: true },
          { title: 'Expectativas sobre filhos e família', duration: '22:15', duration_seconds: 1335 },
          { title: 'Divisão de responsabilidades', duration: '16:40', duration_seconds: 1000 },
        ]},
        { title: 'Planejamento Prático', description: 'Preparando a vida a dois', lessons: [
          { title: 'Finanças pré-casamento', duration: '20:50', duration_seconds: 1250 },
          { title: 'Moradia e logística da vida juntos', duration: '14:30', duration_seconds: 870 },
          { title: 'Cerimônia com significado', duration: '17:20', duration_seconds: 1040 },
        ]},
        { title: 'Fortalecendo o Vínculo', description: 'Crescendo juntos no noivado', lessons: [
          { title: 'Intimidade emocional no noivado', duration: '19:10', duration_seconds: 1150 },
          { title: 'Lidando com conflitos durante o noivado', duration: '21:30', duration_seconds: 1290 },
          { title: 'Preparando-se para a vida conjugal', duration: '15:45', duration_seconds: 945 },
        ]},
      ]
    },
  ];

  for (const course of coursesData) {
    const { modules, ...courseFields } = course;
    let totalLessons = 0;
    modules.forEach(m => { totalLessons += m.lessons.length; });

    const { rows: courseRows } = await query(
      `INSERT INTO courses (title, description, thumbnail, duration, total_lessons, rating, students, price, category, life_context, level, is_premium, instructor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [courseFields.title, courseFields.description, courseFields.thumbnail, courseFields.duration,
       totalLessons, courseFields.rating, courseFields.students, courseFields.price, courseFields.category,
       courseFields.life_context, courseFields.level, courseFields.is_premium, courseFields.instructor]
    );
    const courseId = courseRows[0].id;

    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi];
      const { rows: modRows } = await query(
        `INSERT INTO course_modules (course_id, title, description, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [courseId, mod.title, mod.description, mi + 1]
      );
      const moduleId = modRows[0].id;

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        await query(
          `INSERT INTO course_lessons (module_id, title, duration, duration_seconds, video_url, sort_order, is_free_preview)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [moduleId, lesson.title, lesson.duration, lesson.duration_seconds,
           `https://example.com/videos/placeholder.mp4`, li + 1, lesson.is_free_preview || false]
        );
      }
    }
  }

  console.log("[DB] Seeded courses with modules and lessons.");
}

async function seedForumsAndPosts() {
  const { rows } = await query(`SELECT COUNT(*) as count FROM forums`);
  if (parseInt(rows[0].count) > 0) return;

  const forumsData = [
    { name: 'Solteiros & Preparação', description: 'Espaço para quem está se preparando para um relacionamento saudável', icon: '🚶', life_context: 'solteiro', category: 'Relacionamento', sort_order: 1 },
    { name: 'Namoro & Noivado', description: 'Para casais que estão construindo um futuro juntos', icon: '💑', life_context: 'namoro', category: 'Relacionamento', sort_order: 2 },
    { name: 'Vida de Casados', description: 'Fortalecendo o casamento dia após dia', icon: '💍', life_context: 'casados', category: 'Relacionamento', sort_order: 3 },
    { name: 'Parentalidade', description: 'Educação dos filhos e desafios da maternidade e paternidade', icon: '👨‍👩‍👧', life_context: 'pais', category: 'Família', sort_order: 4 },
    { name: 'Finanças Familiares', description: 'Dicas e experiências sobre gestão financeira do lar', icon: '💰', life_context: null, category: 'Finanças', sort_order: 5 },
    { name: 'Fé & Propósito', description: 'Espiritualidade, propósito e crescimento pessoal', icon: '🙏', life_context: null, category: 'Espiritualidade', sort_order: 6 },
    { name: 'Geral', description: 'Conversas livres e temas variados da comunidade RAYO', icon: '💬', life_context: null, category: 'Geral', sort_order: 7 },
  ];

  const forumIds: Record<string, number> = {};
  for (const f of forumsData) {
    const { rows: fRows } = await query(
      `INSERT INTO forums (name, description, icon, life_context, category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [f.name, f.description, f.icon, f.life_context, f.category, f.sort_order]
    );
    forumIds[f.name] = fRows[0].id;
  }

  const seedUserResult = await query(`SELECT id FROM users ORDER BY id LIMIT 1`);
  let seedUserId: number;
  if (seedUserResult.rows.length > 0) {
    seedUserId = seedUserResult.rows[0].id;
  } else {
    const { rows: newUser } = await query(
      `INSERT INTO users (email, password_hash, name, segments)
       VALUES ('comunidade@rayo.app.br', 'seed_no_login', 'Equipe RAYO', '{casados}')
       ON CONFLICT (email) DO UPDATE SET name = 'Equipe RAYO'
       RETURNING id`
    );
    seedUserId = newUser[0].id;
  }

  const samplePosts = [
    { forum: 'Vida de Casados', title: null, content: 'Acabamos de completar o curso de comunicação não-violenta e já vemos uma diferença gigante no nosso relacionamento! 🙏 Alguém mais teve essa experiência?', category: 'Comunicação', is_pinned: false },
    { forum: 'Finanças Familiares', title: null, content: 'Dica valiosa: começamos a fazer reuniões mensais para falar sobre nossas finanças. Recomendo demais! 💰', category: 'Finanças', is_pinned: true },
    { forum: 'Parentalidade', title: null, content: 'Meu filho de 5 anos está na fase de perguntas difíceis. Como vocês lidam com isso? Algum livro ou recurso que recomendam?', category: 'Parentalidade', is_pinned: false },
    { forum: 'Namoro & Noivado', title: null, content: 'Estamos noivos há 3 meses e já começamos o aconselhamento pré-nupcial. Melhor decisão que tomamos! 💍', category: 'Relacionamento', is_pinned: false },
    { forum: 'Solteiros & Preparação', title: null, content: 'Aprendi que estar solteiro é o melhor momento para investir em autoconhecimento. O curso de Preparação para Namoro Saudável abriu meus olhos!', category: 'Autoconhecimento', is_pinned: false },
    { forum: 'Fé & Propósito', title: null, content: 'Vocês também fazem devocional em casal? Começamos essa prática há 2 semanas e tem sido muito especial para nós.', category: 'Espiritualidade', is_pinned: false },
    { forum: 'Geral', title: null, content: 'Adorei a plataforma RAYO! A comunidade aqui é muito acolhedora e os cursos são muito práticos. Recomendo para todos os casais!', category: 'Geral', is_pinned: true },
    { forum: 'Vida de Casados', title: null, content: 'Alguém tem dicas de como manter a conexão emocional quando ambos trabalham em horários diferentes? Sinto que estamos nos distanciando...', category: 'Relacionamento', is_pinned: false },
    { forum: 'Parentalidade', title: null, content: 'Disciplina positiva mudou a nossa família! Antes gritávamos muito e agora conseguimos resolver conflitos com calma. O curso da Dra. Maria Santos é incrível.', category: 'Parentalidade', is_pinned: false },
    { forum: 'Finanças Familiares', title: null, content: 'Conseguimos quitar nossas dívidas em 8 meses usando a planilha do curso de Finanças para Casais. Estamos livres! 🎉', category: 'Finanças', is_pinned: false },
    { forum: 'Namoro & Noivado', title: null, content: 'Como vocês lidam com as diferenças culturais no relacionamento? Eu sou do sul e meu namorado do nordeste, e às vezes os costumes são bem diferentes.', category: 'Relacionamento', is_pinned: false },
    { forum: 'Geral', title: null, content: 'Sugestão para a equipe RAYO: seria incrível ter um podcast semanal com especialistas em relacionamento! 🎙️', category: 'Geral', is_pinned: false },
  ];

  const postIds: number[] = [];
  for (const p of samplePosts) {
    const forumId = forumIds[p.forum];
    if (!forumId) continue;
    const offset = Math.floor(Math.random() * 72);
    const { rows: pRows } = await query(
      `INSERT INTO posts (forum_id, user_id, title, content, category, is_pinned, like_count, comment_count, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, NOW() - INTERVAL '${offset} hours')
       RETURNING id`,
      [forumId, seedUserId, p.title, p.content, p.category, p.is_pinned]
    );
    postIds.push(pRows[0].id);
  }

  const sampleComments = [
    'Concordo totalmente! Tive a mesma experiência.',
    'Obrigada por compartilhar! Vou tentar isso também.',
    'Que inspiração! Precisamos de mais posts assim.',
    'Recomendo o módulo 3 do curso, ajuda bastante nisso.',
    'Estamos passando pela mesma situação. Força para vocês!',
  ];
  for (let i = 0; i < Math.min(postIds.length, sampleComments.length); i++) {
    await query(
      `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)`,
      [postIds[i], seedUserId, sampleComments[i]]
    );
    await query(
      `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
      [postIds[i]]
    );
  }

  console.log("[DB] Seeded forums and community posts.");
}
