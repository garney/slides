import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { config } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const connectionString = config.database.connectionString;
  if (!connectionString) {
    throw new Error("Set DATABASE_URL to your Supabase Postgres connection string");
  }

  const client = new pg.Client({
    connectionString,
    ssl: config.database.ssl,
  });
  await client.connect();

  const migrationsDir = path.join(__dirname, "../../db/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !file.startsWith("000_"))
    .sort();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(64) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const existing = await client.query("SELECT version FROM schema_migrations WHERE version = $1", [
      version,
    ]);

    if (existing.rowCount > 0) {
      console.log(`Skip ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    console.log(`Applied ${file}`);
  }

  await client.end();
  console.log("Migrations complete.");
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
