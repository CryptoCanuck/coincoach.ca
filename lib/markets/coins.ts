import type { CgOutcome } from './cgFetch'
import type { CoinFull } from './coinView'
import { dbCoinFull, dbOhlc } from './dbReads'

export interface ResourceLink {
  label: string
  href: string
}

// Re-export the view-models + pure mappers so callers can keep importing them
// from '@/lib/markets/coins' (the page uses CoinFull; CoinDetail stays for the
// few components that still type against the thin shape).
export type {
  CoinFull,
  PriceChanges,
  PriceExtreme,
  DevStats,
  CommunityStats,
  TickerRow,
  TreasuryHolding,
  TreasuryView,
  SimilarCoin,
  MarketStatsView,
} from './coinView'
export {
  mapDevStats,
  mapCommunityStats,
  mapTicker,
  mapTreasury,
  mapMarketStats,
  mapLinks,
} from './coinView'

export interface CoinDetail {
  id: string
  symbol: string
  name: string
  rank: number | null
  price: number
  change24h: number
  marketCap: number
  volume: number
  circulatingSupply: number
  maxSupply: number | null
  ath: number
  atl: number
  categories: string[]
  description: string
  links: ResourceLink[]
}

interface CoinGeckoCoin {
  id?: string
  symbol?: string
  name?: string
  market_cap_rank?: number | null
  categories?: (string | null)[]
  description?: { en?: string }
  links?: {
    homepage?: string[]
    whitepaper?: string
    blockchain_site?: string[]
    repos_url?: { github?: string[] }
    subreddit_url?: string
  }
  market_data?: {
    current_price?: { usd?: number }
    price_change_percentage_24h?: number
    market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    circulating_supply?: number
    max_supply?: number | null
    ath?: { usd?: number }
    atl?: { usd?: number }
  }
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Only expose http(s) links — these render as clickable external anchors, so a
// stray `javascript:`/other scheme from the API must not reach the UI.
function safeHttpUrl(raw: string | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  try {
    const protocol = new URL(trimmed).protocol
    return protocol === 'http:' || protocol === 'https:' ? trimmed : ''
  } catch {
    return ''
  }
}

export function mapCoinDetail(payload: CoinGeckoCoin): CoinDetail | null {
  if (!payload || typeof payload !== 'object' || !payload.id) return null
  const m = payload.market_data ?? {}
  const l = payload.links ?? {}

  const linkDefs: ResourceLink[] = [
    { label: 'Website', href: safeHttpUrl(l.homepage?.[0]) },
    { label: 'Whitepaper', href: safeHttpUrl(l.whitepaper) },
    { label: 'Explorer', href: safeHttpUrl(l.blockchain_site?.[0]) },
    { label: 'GitHub', href: safeHttpUrl(l.repos_url?.github?.[0]) },
    { label: 'Reddit', href: safeHttpUrl(l.subreddit_url) },
  ]

  return {
    id: payload.id,
    symbol: (payload.symbol ?? '').toUpperCase(),
    name: payload.name ?? '',
    rank: Number.isFinite(payload.market_cap_rank) ? (payload.market_cap_rank as number) : null,
    price: num(m.current_price?.usd),
    change24h: num(m.price_change_percentage_24h),
    marketCap: num(m.market_cap?.usd),
    volume: num(m.total_volume?.usd),
    circulatingSupply: num(m.circulating_supply),
    maxSupply: Number.isFinite(m.max_supply) ? (m.max_supply as number) : null,
    ath: num(m.ath?.usd),
    atl: num(m.atl?.usd),
    categories: (payload.categories ?? []).filter((c): c is string => typeof c === 'string' && !!c),
    description: stripHtml(payload.description?.en ?? ''),
    links: linkDefs.filter((x) => x.href),
  }
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export function mapOhlc(payload: number[][]): Candle[] {
  if (!Array.isArray(payload)) return []
  const out: Candle[] = []
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 5) continue
    const [ms, open, high, low, close] = row
    if (![ms, open, high, low, close].every((n) => Number.isFinite(n))) continue
    out.push({ time: Math.floor(ms / 1000), open, high, low, close })
  }
  return out
}

// Std-dev of close-to-close percentage returns over the series, as a percent.
// null when there aren't enough points to compute a return.
export function priceVolatilityPct(candles: Candle[]): number | null {
  if (candles.length < 2) return null
  const returns: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close
    if (prev !== 0) returns.push(((candles[i].close - prev) / prev) * 100)
  }
  if (!returns.length) return null
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

const OHLC_DAYS = { '24H': 1, '7D': 7, '1M': 30, '3M': 90, '1Y': 365, MAX: 'max' } as const
export type Timeframe = keyof typeof OHLC_DAYS
export const TIMEFRAMES = Object.keys(OHLC_DAYS) as Timeframe[]

// Pure: maps a raw cgFetch outcome to a UI-ready status. Kept (and unit-tested)
// for completeness, but no longer on the request path — views are DB-only (spec
// 1a), so getCoinDetail never calls the API. CoinGecko returns 404 for an
// unknown id (real not-found); 429/5xx/timeout (null) is a transient outage.
export function classifyCoin(outcome: CgOutcome<CoinGeckoCoin>): CoinFetchLegacy {
  if (outcome.ok) {
    const coin = mapCoinDetail(outcome.data)
    return coin ? { status: 'ok', coin } : { status: 'not-found' }
  }
  return outcome.status === 404 ? { status: 'not-found' } : { status: 'unavailable' }
}

// Legacy classifier result (still used by classifyCoin's unit tests).
export type CoinFetchLegacy =
  | { status: 'ok'; coin: CoinDetail }
  | { status: 'not-found' }
  | { status: 'unavailable' }

// DB-only result for the page (spec 1a — nothing on the request path calls
// CoinGecko). 'ok' = coin present in the DB (fresh OR stale; the freshness flag
// drives the on-page "Updated …" note, never a fetch). 'gathering' = the coin
// row is absent — the collector sweeps the whole universe, so a miss is a
// brand-new listing the next sweep will pick up; the page shows a soft
// "gathering data" state rather than a hard 404 (DB-only, we can't cheaply tell
// a brand-new listing from a non-coin, so an absent row always reads 'gathering').
export type CoinFetch = { status: 'ok'; coin: CoinFull; fresh: boolean } | { status: 'gathering' }

// DB-only (spec 1a): assemble CoinFull from Postgres. Stale rows still render
// (with the freshness note); an absent row is the soft "gathering" state.
export async function getCoinDetail(id: string): Promise<CoinFetch> {
  const db = await dbCoinFull(id)
  if (!db) return { status: 'gathering' }
  return { status: 'ok', coin: db.data, fresh: db.fresh }
}

// Thin wrapper for callers (e.g. generateMetadata) that only need the coin or null.
export async function getCoin(id: string): Promise<CoinFull | null> {
  const r = await getCoinDetail(id)
  return r.status === 'ok' ? r.coin : null
}

// Distinguishes a genuine (possibly empty) response from a DB outage, so callers
// (e.g. the lazy-load route) can surface that rather than caching an empty
// success. DB-only (spec 1a): no API fallback — { ok: false } now means the DB
// was unreachable, and an empty-but-reachable DB returns { ok: true, candles: [] }.
export type OhlcResult = { ok: true; candles: Candle[] } | { ok: false }

export async function getOhlcResult(id: string, frame: Timeframe): Promise<OhlcResult> {
  // DB-only: candle roll-ups (observed + provider-seeded) serve the frame once
  // they have enough coverage and recency. While history is still accumulating
  // for the longer frames dbOhlc returns null — we surface that as an empty
  // (but successful) chart, never an API call.
  const db = await dbOhlc(id, frame)
  return { ok: true, candles: db ?? [] }
}

// Convenience wrapper: candles, or [] when there are none.
export async function getOhlc(id: string, frame: Timeframe): Promise<Candle[]> {
  const res = await getOhlcResult(id, frame)
  return res.ok ? res.candles : []
}
