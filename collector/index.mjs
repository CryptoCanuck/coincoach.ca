/**
 * Market-data collector entrypoint: applies migrations, then runs jobs on
 * fixed cadences (collector/config.mjs). Cadence state lives in
 * collector_state so restarts do not re-fire daily jobs, and the CoinGecko
 * budget guard in cg.mjs skips API jobs once the trailing-24h call count
 * reaches the cap (they retry on a later tick).
 */
import pg from 'pg'
import { migrate } from '../db/migrate.mjs'
import { config } from './config.mjs'
import { BudgetExceededError } from './cg.mjs'
import * as jobs from './jobs.mjs'

const TICK_MS = 30_000

// Run order matters on first start: tracked coins and reference rows land
// before the jobs that reference them.
const JOBS = [
  'articleCoins',
  'markets',
  'global',
  'fearGreed',
  'trending',
  'categories',
  'candles',
  'housekeeping',
  'tickers',
  'detail',
  'treasury',
  'exchanges',
].map((name) => ({ name, run: jobs[name], intervalMs: config.intervalsMin[name] * 60_000 }))

async function loadState(pool) {
  const { rows } = await pool.query('SELECT job, last_run FROM collector_state')
  return new Map(rows.map((r) => [r.job, r.last_run ? r.last_run.getTime() : 0]))
}

async function saveState(pool, job, ok, message) {
  await pool.query(
    `INSERT INTO collector_state (job, last_run, last_ok, last_error)
     VALUES ($1, now(), CASE WHEN $2 THEN now() END, $3)
     ON CONFLICT (job) DO UPDATE SET last_run = now(),
       last_ok = CASE WHEN $2 THEN now() ELSE collector_state.last_ok END,
       last_error = $3`,
    [job, ok, ok ? null : message]
  )
}

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set')
  await migrate(config.databaseUrl)
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 3 })
  const lastRun = await loadState(pool)
  let stopping = false
  let running = false

  const tick = async () => {
    if (running || stopping) return
    running = true
    try {
      for (const job of JOBS) {
        if (stopping) break
        if (Date.now() - (lastRun.get(job.name) ?? 0) < job.intervalMs) continue
        try {
          const result = await job.run(pool)
          lastRun.set(job.name, Date.now())
          await saveState(pool, job.name, true, null)
          console.log(`${job.name}: ${result}`)
        } catch (err) {
          if (err instanceof BudgetExceededError) {
            // Leave last_run untouched so the job retries once budget frees up.
            console.warn(`${job.name}: skipped (${err.message})`)
          } else {
            lastRun.set(job.name, Date.now())
            await saveState(pool, job.name, false, err.message).catch(() => {})
            console.error(`${job.name}: ${err.message}`)
          }
        }
      }
    } finally {
      running = false
    }
  }

  const timer = setInterval(tick, TICK_MS)
  await tick()

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`)
    stopping = true
    clearInterval(timer)
    await pool.end().catch((err) => console.error(`pool.end failed: ${err.message}`))
    process.exit(0)
  }
  // once() so a second signal can't run shutdown concurrently mid-teardown.
  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
