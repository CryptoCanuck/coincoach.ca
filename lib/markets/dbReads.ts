// DB-first reads for the market-data layer (docs/market-data.md). Each read
// returns the existing UI types plus a `fresh` flag; callers serve fresh DB
// data, fall through to the CoinGecko API otherwise, and use stale DB rows as
// a last resort when the API also fails.
//
// Every function returns null when DATABASE_URL is unset (build, local dev
// without the stack) or the database is unreachable — callers then behave
// exactly as before this layer existed. Server-only.
import type { Pool } from 'pg'
import { mapCoinDetail, stripHtml, type Candle, type CoinDetail, type Timeframe } from './coins'
import {
  mapCommunityStats,
  mapDevStats,
  mapLinks,
  mapMarketStats,
  mapTicker,
  mapTreasury,
  type CoinFull,
  type RawMarketStats,
  type RawTickerRow,
  type RawTreasuryHolding,
  type RawTreasuryTotals,
  type SimilarCoin,
  type TickerRow,
  type TreasuryView,
} from './coinView'
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

// CoinFull freshness keys off the market row (coin_markets_latest.fetched_at) —
// the price/cap numbers users watch. Identity/profile columns refresh on a
// slower detail rotation, but the market row is what makes the page feel live.

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

// Row shape for the CoinFull query: identity/profile columns from `coins`, the
// full market row from `coin_markets_latest`, and aggregated category names.
interface CoinFullRow extends RawMarketStats {
  id: string
  symbol: string | null
  name: string | null
  image_url: string | null
  rank: number | null
  asset_platform_id: string | null
  genesis_date: string | null // cast to text in SQL (YYYY-MM-DD)
  hashing_algorithm: string | null
  block_time_minutes: number | string | null
  description_en: string | null
  links: unknown
  sentiment_votes_up_pct: number | string | null
  sentiment_votes_down_pct: number | string | null
  watchlist_users: number | string | null
  dev_data: unknown
  community_data: unknown
  cats: string[] | null
  fetched_at: Date | null
}

const numCol = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? (n as number) : null
}

/**
 * CoinFull (the redesigned page's view-model) assembled from coins +
 * coin_markets_latest + category names. DB-only: returns the row whether fresh
 * or stale (the `fresh` flag drives the on-page "Updated …" note, never a
 * fetch). null only when the coin row is absent — the caller renders the soft
 * "gathering data" state for that miss.
 */
export async function dbCoinFull(id: string): Promise<DbRead<CoinFull> | null> {
  const rows = await query<CoinFullRow>(
    // genesis_date is a DATE — cast to text so it arrives as 'YYYY-MM-DD'
    // without a JS Date timezone round-trip that could shift it a day.
    `SELECT c.id, c.symbol, c.name, c.image_url, c.asset_platform_id,
       c.genesis_date::text AS genesis_date, c.hashing_algorithm, c.block_time_minutes,
       c.description_en, c.links,
       c.sentiment_votes_up_pct, c.sentiment_votes_down_pct, c.watchlist_users,
       c.dev_data, c.community_data,
       m.market_cap_rank AS rank,
       m.price_usd AS price,
       m.pct_change_1h AS pct_1h, m.pct_change_24h AS pct_24h,
       m.pct_change_7d AS pct_7d, m.pct_change_30d AS pct_30d, m.pct_change_1y AS pct_1y,
       m.market_cap, m.market_cap_change_24h AS mcap_change_24h,
       m.market_cap_change_pct_24h AS mcap_change_pct_24h,
       m.fully_diluted_valuation AS fdv,
       m.total_volume AS volume, m.high_24h, m.low_24h,
       m.circulating_supply, m.total_supply, m.max_supply,
       m.ath, m.ath_change_pct, m.ath_date,
       m.atl, m.atl_change_pct, m.atl_date,
       (SELECT array_agg(cat.name ORDER BY cat.name)
          FROM coin_categories cc JOIN categories cat ON cat.id = cc.category_id
          WHERE cc.coin_id = c.id) AS cats,
       m.fetched_at
     FROM coins c
     LEFT JOIN coin_markets_latest m ON m.coin_id = c.id
     WHERE c.id = $1`,
    [id]
  )
  const r = rows?.[0]
  // null vs []: query() returns null only on a DB outage; an absent coin yields
  // an empty array. Both mean "no CoinFull" to the caller, which is correct —
  // an outage shows the unavailable panel, a real miss shows "gathering".
  if (!r) return null

  const stats = mapMarketStats(r)
  const data: CoinFull = {
    id: r.id,
    symbol: (r.symbol ?? '').toUpperCase(),
    name: r.name ?? '',
    image: r.image_url,
    rank: r.rank,
    categories: r.cats ?? [],

    price: stats.price,
    changes: stats.changes,
    marketCap: stats.marketCap,
    marketCapChange24hAbs: stats.marketCapChange24hAbs,
    marketCapChange24hPct: stats.marketCapChange24hPct,
    fdv: stats.fdv,
    volume: stats.volume,
    high24h: stats.high24h,
    low24h: stats.low24h,
    circulatingSupply: stats.circulatingSupply,
    totalSupply: stats.totalSupply,
    maxSupply: stats.maxSupply,
    ath: stats.ath,
    atl: stats.atl,

    description: stripHtml(r.description_en ?? ''),
    links: mapLinks(r.links),
    genesisDate: r.genesis_date,
    hashingAlgorithm: r.hashing_algorithm,
    blockTimeMinutes: numCol(r.block_time_minutes),
    assetPlatform: r.asset_platform_id,

    sentimentVotesUpPct: numCol(r.sentiment_votes_up_pct),
    sentimentVotesDownPct: numCol(r.sentiment_votes_down_pct),
    watchlistUsers: numCol(r.watchlist_users),

    dev: mapDevStats(r.dev_data),
    community: mapCommunityStats(r.community_data),
  }
  return { fresh: isFresh(r.fetched_at, FRESH_MS.markets), data }
}

/**
 * Top exchange markets for a coin (coin_tickers joined to exchanges), ordered by
 * USD volume, dropping anomalous/stale rows. [] when the coin has no tickers; the
 * page hides the "Where to buy" section then. DB-only.
 */
export async function dbCoinTickers(id: string, limit: number): Promise<TickerRow[]> {
  const rows = await query<RawTickerRow>(
    `SELECT t.exchange_id, t.exchange_name, t.base, t.target,
       t.last_usd, t.volume_usd, t.spread_pct, t.trade_url,
       e.name AS ex_name, e.image_url AS ex_image, e.trust_score AS ex_trust
     FROM coin_tickers t
     LEFT JOIN exchanges e ON e.id = t.exchange_id
     WHERE t.coin_id = $1
       AND COALESCE(t.is_anomaly, false) = false
       AND COALESCE(t.is_stale, false) = false
     ORDER BY t.volume_usd DESC NULLS LAST
     LIMIT $2`,
    [id, limit]
  )
  if (!rows?.length) return []
  return rows.map(mapTicker)
}

/**
 * Treasury totals + ranked public-company holdings (treasury_totals +
 * treasury_holdings). Only meaningful for bitcoin/ethereum; null when the coin
 * has no treasury data so the page hides the section. DB-only.
 */
export async function dbTreasury(id: string): Promise<TreasuryView | null> {
  const totals = await query<RawTreasuryTotals>(
    `SELECT total_holdings, total_value_usd, market_cap_dominance
     FROM treasury_totals WHERE coin_id = $1`,
    [id]
  )
  const holdings = await query<RawTreasuryHolding>(
    `SELECT company_symbol, name, country, total_holdings,
       total_entry_value_usd, total_current_value_usd, pct_of_supply
     FROM treasury_holdings WHERE coin_id = $1
     ORDER BY total_holdings DESC NULLS LAST`,
    [id]
  )
  // No totals row and no holdings → not a treasury coin; hide the section.
  if (!totals?.length && !holdings?.length) return null
  return mapTreasury(totals?.[0] ?? null, holdings ?? [])
}

/**
 * Coins sharing a category with `id`, ranked by market cap, excluding self.
 * Powers the "Similar coins" row (replaces the top-coins stand-in). [] when the
 * coin has no categorized peers. DB-only.
 */
export async function dbSimilarByCategory(id: string, limit: number): Promise<SimilarCoin[]> {
  const rows = await query<{
    id: string
    symbol: string | null
    name: string | null
    image_url: string | null
    rank: number | null
    price: number | null
    chg24: number | null
  }>(
    `SELECT DISTINCT ON (c.id)
       c.id, c.symbol, c.name, c.image_url,
       m.market_cap_rank AS rank,
       m.price_usd::float8 AS price,
       m.pct_change_24h::float8 AS chg24
     FROM coin_categories cc
     JOIN coin_categories peer ON peer.category_id = cc.category_id AND peer.coin_id <> cc.coin_id
     JOIN coins c ON c.id = peer.coin_id
     LEFT JOIN coin_markets_latest m ON m.coin_id = c.id
     WHERE cc.coin_id = $1
     ORDER BY c.id, m.market_cap_rank NULLS LAST`,
    [id]
  )
  if (!rows?.length) return []
  // DISTINCT ON requires id-first ordering; re-sort by rank for the final list.
  return rows
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      symbol: (r.symbol ?? '').toUpperCase(),
      name: r.name ?? '',
      image: r.image_url,
      rank: r.rank,
      price: r.price,
      change24h: r.chg24,
    }))
}

// Chart frames try candle intervals in order: the tick roll-up first (our own
// observations, finest grain), then the provider-seeded interval the backfill
// script stores for that frame (scripts/backfill-market-history.mjs). Each
// candidate's minCandles guards against serving a visibly truncated chart while
// history is still accumulating; dbOhlc returns null until one candidate has
// both the coverage and recency a frame needs (the page shows an empty chart
// then — never an API call, per spec 1a).
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
  '3M': {
    lookback: '90 days',
    maxAgeMs: 3 * 86_400_000,
    candidates: [
      { interval: '1d', minCandles: 60 },
      { interval: '4h', minCandles: 360 },
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
  MAX: {
    // 'max' has no fixed window; use a generous lookback that covers the
    // deepest seeded frames without being unbounded.
    lookback: '4000 days',
    maxAgeMs: 10 * 86_400_000,
    candidates: [
      { interval: '1d', minCandles: 300 },
      { interval: '4d', minCandles: 100 },
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
