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

  console.log("[DB] Schema initialized successfully.");
}
