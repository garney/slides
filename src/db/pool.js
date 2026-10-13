import pg from "pg";
import { config } from "../config/env.js";

/** @type {pg.Pool | null} */
let pool = null;

/**
 * Convert MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...`.
 * @param {string} sql
 * @param {unknown[]} params
 */
function toPgQuery(sql, params) {
  let index = 0;
  const text = sql.replace(/\?/g, () => `$${++index}`);
  return { text, values: params };
}

/**
 * MySQL-compatible query shape: `[rows, meta]` with `meta.affectedRows`.
 * @param {string} sql
 * @param {unknown[]} [params]
 */
async function query(sql, params = []) {
  const client = getPool();
  const { text, values } = toPgQuery(sql, params);
  const result = await client.query(text, values);
  return [result.rows, { affectedRows: result.rowCount ?? 0, rowCount: result.rowCount ?? 0 }];
}

export function getPool() {
  if (!pool) {
    const connectionString = config.database.connectionString;
    if (!connectionString) {
      throw new Error("Set DATABASE_URL to your Supabase Postgres connection string");
    }
    pool = new pg.Pool({
      connectionString,
      ssl: config.database.ssl,
      max: 10,
    });
  }
  return { query };
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Boot-time safety net; prefer `npm run migrate` / Supabase migrations for production. */
export async function ensureSchema() {
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS presentations (
      id CHAR(36) NOT NULL PRIMARY KEY,
      slug VARCHAR(191) NOT NULL UNIQUE,
      title VARCHAR(512) NOT NULL,
      template_id VARCHAR(64) NOT NULL DEFAULT 'default',
      visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'authenticated')),
      document JSONB NOT NULL,
      created_by_email VARCHAR(320),
      created_by_sub VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS presentations_visibility_idx ON presentations (visibility)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS presentations_created_by_email_idx ON presentations (created_by_email)
  `);
}
