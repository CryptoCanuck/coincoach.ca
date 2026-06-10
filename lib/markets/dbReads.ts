// DB-first reads for the market-data layer (docs/market-data.md). Each read
// returns the existing UI types plus a `fresh` flag; callers serve fresh DB
// data, fall through to the CoinGecko API otherwise, and use stale DB rows as
// a last resort when the API also fails.
//
// Every function returns null when DATABASE_URL is unset (build, local dev
// without the stack) or the database is unreachable — callers then behave
// exactly as before this layer existed. Server-only.
import type { Pool } from 'pg'
import { mapCoinDetail, type Candle, type CoinDetail, type Timeframe } from './coins'
import { downsampleSparkline, type Coin, type MarketCoin } from './coingecko'
import type { GlobalStats } from './global'
import type { FearGreed, FearGreedPoint } from './sentiment'

// Freshness windows: comfortably above each collector cadence (collector/
// config.mjs) so one missed poll doesn't flap reads to the API, but tight
// enough that a dead collector stops masquerading as live data.
const FRESH_MS = {
  markets: 25 * 60_000, // cadence 10 min
  global: 75 * 60_000, // cadence 30 min
  categories: 13 * 60 * 60_000, // cadence 6 h
  fearGreedDays: 2, // daily index
}

export interface DbRead<T> {
  fresh: boolean
  data: T
}

let pool: Pool | null | undefined

async function getPool(): Promise<Pool | null> {
  if (pool !== undefined) return pool
  const url = process.env.DATABASE_URL
  if (!url) {
    pool = null
    return pool
  }
  const pg = await import('pg')
  pool = new pg.default.Pool({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 2000,
    statement_timeout: 4000,
  })
  // Never crash the server over a DB hiccup; reads fail soft to the API path.
  pool.on('error', () => {})
  return pool
}

async function query<R>(text: string, params: unknown[]): Promise<R[] | null> {
  const p = await getPool()
  if (!p) return null
  try {
    const res = await p.query(text, params)
    return res.rows as R[]
  } catch {
    return null
  }
}

const isFresh = (fetchedAt: Date | null, windowMs: number): boolean =>
  !!fetchedAt && Date.now() - fetchedAt.getTime() < windowMs

interface MarketRow {
  id: string
  symbol: string | null
  name: string | null
  image_url: string | null
  rank: number | null
  price: number | null
  chg24: number | null
  chg7: number | null
  mcap: number | null
  vol: number | null
  spark: number[] | null
  fetched_at: Date
}

const MARKET_SELECT = `
  SELECT c.id, c.symbol, c.name, c.image_url,
    m.market_cap_rank AS rank,
    m.price_usd::float8 AS price,
    m.pct_change_24h::float8 AS chg24,
    m.pct_change_7d::float8 AS chg7,
    m.market_cap::float8 AS mcap,
    m.total_volume::float8 AS vol,
    m.sparkline_7d AS spark,
    m.fetched_at
  FROM coin_markets_latest m
  JOIN coins c ON c.id = m.coin_id`

function toCoin(r: MarketRow): Coin {
  return {
    id: r.id,
    symbol: (r.symbol ?? '').toUpperCase(),
    name: r.name ?? '',
    price: r.price ?? 0,
    change24h: r.chg24 ?? 0,
    image: r.image_url ?? '',
  }
}

function marketsFresh(rows: MarketRow[]): boolean {
  return rows.length > 0 && isFresh(rows[0].fetched_at, FRESH_MS.markets)
}

/** Top `limit` coins by market cap (ticker, homepage, movers). */
export async function dbTopCoins(limit: number): Promise<DbRead<Coin[]> | null> {
  const rows = await query<MarketRow>(
    `${MARKET_SELECT} ORDER BY m.market_cap_rank NULLS LAST LIMIT $1`,
    [limit]
  )
  if (!rows?.length) return null
  return { fresh: marketsFresh(rows), data: rows.map(toCoin) }
}

/**
 * Coins by id (article coin cards). null unless the DB covers every requested
 * id — a partial answer would silently drop coins from the page, so partial
 * coverage falls through to the API.
 */
export async function dbMarketsByIds(ids: string[]): Promise<DbRead<Coin[]> | null> {
  const rows = await query<MarketRow>(
    `${MARKET_SELECT} WHERE m.coin_id = ANY($1::text[]) ORDER BY m.market_cap_rank NULLS LAST`,
    [ids]
  )
  if (!rows || rows.length < ids.length) return null
  return { fresh: marketsFresh(rows), data: rows.map(toCoin) }
}

/** Market table rows with 7d change + sparkline. */
export async function dbMarketTable(limit: number): Promise<DbRead<MarketCoin[]> | null> {
  const rows = await query<MarketRow>(
    `${MARKET_SELECT} ORDER BY m.market_cap_rank NULLS LAST LIMIT $1`,
    [limit]
  )
  if (!rows?.length) return null
  return {
    fresh: marketsFresh(rows),
    data: rows.map((r) => ({
      id: r.id,
      rank: r.rank,
      symbol: (r.symbol ?? '').toUpperCase(),
      name: r.name ?? '',
      image: r.image_url ?? '',
      price: r.price ?? 0,
      change24h: r.chg24 ?? 0,
      change7d: r.chg7 ?? 0,
      marketCap: r.mcap ?? 0,
      volume: r.vol ?? 0,
      sparkline: downsampleSparkline(r.spark ?? []),
    })),
  }
}

export async function dbGlobalStats(): Promise<DbRead<GlobalStats> | null> {
  const rows = await query<{
    mcap: number | null
    vol: number | null
    btc: number | null
    active: number | null
    chg: number | null
    fetched_at: Date
  }>(
    `SELECT total_market_cap_usd::float8 AS mcap, total_volume_usd::float8 AS vol,
       (dominance->>'btc')::float8 AS btc, active_cryptocurrencies AS active,
       market_cap_change_pct_24h::float8 AS chg, fetched_at
     FROM global_latest WHERE id`,
    []
  )
  const r = rows?.[0]
  if (!r) return null
  return {
    fresh: isFresh(r.fetched_at, FRESH_MS.global),
    data: {
      totalMarketCap: r.mcap ?? 0,
      totalVolume: r.vol ?? 0,
      btcDominance: r.btc ?? 0,
      activeCoins: r.active ?? 0,
      marketCapChange24h: r.chg ?? 0,
    },
  }
}

export async function dbFearGreed(): Promise<DbRead<FearGreed> | null> {
  const rows = await query<{ value: number; classification: string; age_days: number }>(
    `SELECT value, classification,
       (current_date - day)::int AS age_days
     FROM fear_greed ORDER BY day DESC LIMIT 1`,
    []
  )
  const r = rows?.[0]
  if (!r) return null
  return {
    fresh: r.age_days < FRESH_MS.fearGreedDays,
    data: { value: Math.max(0, Math.min(100, r.value)), label: r.classification || 'Neutral' },
  }
}

/** Last `limit` daily points, oldest first (epoch seconds, as the chart expects). */
export async function dbFearGreedHistory(limit: number): Promise<DbRead<FearGreedPoint[]> | null> {
  const rows = await query<{ value: number; ts: string; age_days: number }>(
    `SELECT value, extract(epoch FROM day)::bigint::text AS ts,
       (current_date - day)::int AS age_days
     FROM fear_greed ORDER BY day DESC LIMIT $1`,
    [limit]
  )
  if (!rows?.length) return null
  return {
    fresh: rows[0].age_days < FRESH_MS.fearGreedDays,
    data: rows
      .map((r) => ({ value: Math.max(0, Math.min(100, r.value)), timestamp: Number(r.ts) }))
      .reverse(),
  }
}

/** Top categories by market cap with 24h change (sentiment page). */
export async function dbCategories(
  limit: number
): Promise<DbRead<{ name: string; change24h: number }[]> | null> {
  const rows = await query<{ name: string; chg: number | null; updated_at: Date }>(
    `SELECT name, market_cap_change_24h_pct::float8 AS chg, updated_at
     FROM categories WHERE market_cap IS NOT NULL
     ORDER BY market_cap DESC LIMIT $1`,
    [limit]
  )
  if (!rows?.length) return null
  return {
    fresh: isFresh(rows[0].updated_at, FRESH_MS.categories),
    data: rows.map((r) => ({ name: r.name, change24h: r.chg ?? 0 })),
  }
}

/**
 * Coin detail assembled from coins + coin_markets_latest + category names.
 * Only coins the detail job has profiled qualify (description/links present);
 * everything else falls through to the API, including unknown ids (so the
 * page's real 404 handling still comes from upstream).
 */
export async function dbCoinDetail(id: string): Promise<DbRead<CoinDetail> | null> {
  const rows = await query<{
    id: string
    symbol: string
    name: string
    rank: number | null
    description_en: string | null
    links: object | null
    price: number | null
    chg24: number | null
    mcap: number | null
    vol: number | null
    circ: number | null
    max: number | null
    ath: number | null
    atl: number | null
    cats: string[] | null
    detail_refreshed_at: Date | null
    fetched_at: Date | null
  }>(
    `SELECT c.id, c.symbol, c.name, m.market_cap_rank AS rank,
       c.description_en, c.links,
       m.price_usd::float8 AS price, m.pct_change_24h::float8 AS chg24,
       m.market_cap::float8 AS mcap, m.total_volume::float8 AS vol,
       m.circulating_supply::float8 AS circ, m.max_supply::float8 AS max,
       m.ath::float8 AS ath, m.atl::float8 AS atl,
       (SELECT array_agg(cat.name ORDER BY cat.name)
          FROM coin_categories cc JOIN categories cat ON cat.id = cc.category_id
          WHERE cc.coin_id = c.id) AS cats,
       c.detail_refreshed_at, m.fetched_at
     FROM coins c
     LEFT JOIN coin_markets_latest m ON m.coin_id = c.id
     WHERE c.id = $1`,
    [id]
  )
  const r = rows?.[0]
  if (!r || !r.detail_refreshed_at || !r.fetched_at) return null
  // Reuse the canonical mapper (HTML stripping, link scheme checks) by
  // reassembling the upstream payload shape from the stored columns.
  const coin = mapCoinDetail({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    market_cap_rank: r.rank,
    categories: r.cats ?? [],
    description: { en: r.description_en ?? '' },
    links: r.links ?? {},
    market_data: {
      current_price: { usd: r.price ?? undefined },
      price_change_percentage_24h: r.chg24 ?? undefined,
      market_cap: { usd: r.mcap ?? undefined },
      total_volume: { usd: r.vol ?? undefined },
      circulating_supply: r.circ ?? undefined,
      max_supply: r.max,
      ath: { usd: r.ath ?? undefined },
      atl: { usd: r.atl ?? undefined },
    },
  })
  if (!coin) return null
  return { fresh: isFresh(r.fetched_at, FRESH_MS.markets), data: coin }
}

// Chart frames try candle intervals in order: the tick roll-up first (our own
// observations, finest grain), then the provider-seeded interval the backfill
// script stores for that frame (scripts/backfill-market-history.mjs). Each
// candidate's minCandles guards against serving a visibly truncated chart
// while history is still accumulating — the API fallback covers those frames
// until backfill/accumulation catches up.
const FRAME_CANDLES: Record<
  Timeframe,
  {
    lookback: string
    maxAgeMs: number
    candidates: { interval: string; minCandles: number }[]
  }
> = {
  '24H': {
    lookback: '24 hours',
    maxAgeMs: 2 * 3_600_000,
    candidates: [
      { interval: '1h', minCandles: 12 },
      { interval: '30m', minCandles: 24 },
    ],
  },
  '7D': {
    lookback: '7 days',
    maxAgeMs: 5 * 3_600_000,
    candidates: [
      { interval: '1h', minCandles: 84 },
      { interval: '4h', minCandles: 30 },
    ],
  },
  '1M': {
    lookback: '30 days',
    maxAgeMs: 2 * 86_400_000,
    candidates: [
      { interval: '1d', minCandles: 21 },
      { interval: '4h', minCandles: 120 },
    ],
  },
  '1Y': {
    lookback: '365 days',
    maxAgeMs: 5 * 86_400_000,
    candidates: [
      { interval: '1d', minCandles: 200 },
      { interval: '4d', minCandles: 70 },
    ],
  },
}

/** Candles for a chart frame; null unless coverage and recency both hold. */
export async function dbOhlc(id: string, frame: Timeframe): Promise<Candle[] | null> {
  const f = FRAME_CANDLES[frame]
  for (const candidate of f.candidates) {
    const rows = await query<{ t: string; open: number; high: number; low: number; close: number }>(
      `SELECT extract(epoch FROM bucket_ts)::bigint::text AS t,
         open::float8 AS open, high::float8 AS high, low::float8 AS low, close::float8 AS close
       FROM coin_candles
       WHERE coin_id = $1 AND candle_interval = $2 AND bucket_ts >= now() - $3::interval
       ORDER BY bucket_ts`,
      [id, candidate.interval, f.lookback]
    )
    if (!rows || rows.length < candidate.minCandles) continue
    const newest = Number(rows[rows.length - 1].t) * 1000
    if (Date.now() - newest > f.maxAgeMs) continue
    return rows.map((r) => ({
      time: Number(r.t),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
    }))
  }
  return null
}
