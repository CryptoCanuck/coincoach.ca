/**
 * Minimal forward-only migration runner: applies db/migrations/*.sql in
 * filename order, each inside its own transaction, recording applied files in
 * schema_migrations. The collector calls migrate() at startup; it can also be
 * run directly (DATABASE_URL=... node db/migrate.mjs).
 */
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')
// Arbitrary app-wide lock id so concurrent starts cannot race the runner.
const ADVISORY_LOCK_ID = 7_426_001

export async function migrate(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set')
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID])
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`
    )
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()
    const { rows } = await client.query('SELECT filename FROM schema_migrations')
    const applied = new Set(rows.map((r) => r.filename))

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`migrate: applied ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`migration ${file} failed: ${err.message}`)
      }
    }
  } finally {
    await client.end()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
