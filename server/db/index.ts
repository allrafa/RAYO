import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err);
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[DB] Slow query (${duration}ms):`, text);
  }
  return result;
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW() as now");
    return !!result.rows[0];
  } catch {
    return false;
  }
}

/**
 * Task #234 — Fecha o pool global. Usado por integration tests no
 * `after()` pra liberar conexões idle imediatamente (sem isso o
 * processo trava por ~30s aguardando `idleTimeoutMillis`). Em
 * produção esta função NÃO é chamada — o processo só termina via
 * SIGTERM e o pool é finalizado pelo runtime.
 */
export async function closeDb(): Promise<void> {
  await pool.end().catch(() => {});
}

export default pool;
