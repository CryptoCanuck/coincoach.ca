/**
 * One-shot history backfill for the market-data DB (docs/market-data.md).
 * For each tracked coin (or an explicit list) it seeds, marked source='provider':
 *
 *   - 365 days of daily price/market-cap/volume ticks (/market_chart)
 *   - 30 days of 4h candles  (/ohlc?days=30)  → serves the 1M chart frame
 *   - 365 days of 4d candles (/ohlc?days=365) → serves the 1Y chart frame
 *
 * Provider candle seeds age out of dbOhlc's recency window within days; the
 * derived roll-ups take over as our own ticks accumulate (1M after ~3 weeks,
 * 1Y after ~200 days). Until then the API fallback covers the gap, so this
 * script is a head start, not a requirement. Re-running is safe: coins with a
 * recent 4d seed are skipped, and all writes upsert.
 *
 * Calls go through the collector's budget guard (3 calls per coin), so a large
 * run may stop early and can simply be re-run the next day.
 *
 * Usage:
 *   DATABASE_URL=... COINGECKO_API_KEY=... node scripts/backfill-market-history.mjs [slug ...]
 */
import pg from 'pg'
import { cgGet, sleep, BudgetExceededError } from '../collector/cg.mjs'
import { config } from '../collector/config.mjs'

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

async function ensurePastPartitions(pool) {
  await pool.query(
    `SELECT ensure_coin_ticks_partition((date_trunc('month', now()) - (n || ' month')::interval)::date)
     FROM generate_series(0, 13) AS n`
  )
}

async function seedDailyTicks(pool, id) {
  const data = await cgGet(pool, `/coins/${id}/market_chart`, {
    vs_currency: 'usd',
    days: '365',
    interval: 'daily',
  })
  const byTs = new Map()
  for (const [i, [ms, price]] of (data.prices ?? []).entries()) {
    byTs.set(ms, {
      ts: new Date(ms).toISOString(),
      price: num(price),
      mcap: num(data.market_caps?.[i]?.[1]),
      vol: num(data.total_volumes?.[i]?.[1]),
    })
  }
  const rows = [...byTs.values()]
  await pool.query(
    `INSERT INTO coin_ticks (coin_id, ts, price_usd, market_cap, volume_24h, source)
     SELECT $2, r.ts, r.price, r.mcap, r.vol, 'provider'
     FROM jsonb_to_recordset($1::jsonb) AS r(ts timestamptz, price numeric, mcap numeric, vol numeric)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(rows), id]
  )
  return rows.length
}

async function seedCandles(pool, id, days, interval) {
  const data = await cgGet(pool, `/coins/${id}/ohlc`, { vs_currency: 'usd', days: String(days) })
  const rows = (Array.isArray(data) ? data : [])
    .filter((r) => Array.isArray(r) && r.length >= 5 && r.every((n) => Number.isFinite(n)))
    .map(([ms, open, high, low, close]) => ({
      ts: new Date(ms).toISOString(),
      open,
      high,
      low,
      close,
    }))
  await pool.query(
    `INSERT INTO coin_candles (coin_id, candle_interval, bucket_ts, open, high, low, close, source)
     SELECT $2, $3, r.ts, r.open, r.high, r.low, r.close, 'provider'
     FROM jsonb_to_recordset($1::jsonb) AS r(ts timestamptz, open numeric, high numeric, low numeric, close numeric)
     ON CONFLICT (coin_id, candle_interval, bucket_ts) DO UPDATE SET
       open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close
     WHERE coin_candles.source = 'provider'`,
    [JSON.stringify(rows), id, interval]
  )
  return rows.length
}

async function main() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set')
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 2 })
  await ensurePastPartitions(pool)

  let ids = process.argv.slice(2)
  if (!ids.length) {
    const { rows } = await pool.query(
      'SELECT id FROM coins WHERE tracked >= 1 ORDER BY market_cap_rank NULLS LAST'
    )
    ids = rows.map((r) => r.id)
  }
  console.log(`backfill: ${ids.length} coin(s)`)

  let done = 0
  let failed = 0
  for (const id of ids) {
    const { rows: seeded } = await pool.query(
      `SELECT 1 FROM coin_candles
       WHERE coin_id = $1 AND candle_interval = '4d' AND source = 'provider'
         AND bucket_ts > now() - interval '7 days'
       LIMIT 1`,
      [id]
    )
    if (seeded.length) {
      console.log(`${id}: already seeded, skipping`)
      continue
    }
    try {
      const ticks = await seedDailyTicks(pool, id)
      await sleep(config.pacingMs)
      const c4h = await seedCandles(pool, id, 30, '4h')
      await sleep(config.pacingMs)
      const c4d = await seedCandles(pool, id, 365, '4d')
      await sleep(config.pacingMs)
      done++
      console.log(`${id}: ${ticks} daily ticks, ${c4h} 4h candles, ${c4d} 4d candles`)
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        console.warn(`stopping: ${err.message} — re-run later to continue`)
        break
      }
      console.error(`${id}: ${err.message}`)
      failed++
    }
  }
  console.log(`backfill: ${done}/${ids.length} coin(s) seeded`)
  await pool.end()
  // Surface partial failures to the caller (CI/cron) instead of a false exit 0.
  if (failed) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
