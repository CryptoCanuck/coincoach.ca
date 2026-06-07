import { cgFetch } from './cgFetch'

export interface Coin {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  image: string
}

interface CoinGeckoMarket {
  id?: string
  symbol: string
  name: string
  current_price?: number | null
  price_change_percentage_24h?: number | null
  image: string
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

export function mapCoins(payload: CoinGeckoMarket[]): Coin[] {
  if (!Array.isArray(payload)) return []
  // Drop entries without an id — every coin links to /charts/[id], and an empty
  // id would produce a broken `/charts/` route downstream.
  return payload.flatMap((c) => {
    if (!c?.id) return []
    return [
      {
        id: c.id,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        price: Number.isFinite(c.current_price) ? (c.current_price as number) : 0,
        change24h: Number.isFinite(c.price_change_percentage_24h)
          ? (c.price_change_percentage_24h as number)
          : 0,
        image: c.image,
      },
    ]
  })
}

function marketsUrl(perPage: number): string {
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&price_change_percentage=24h`
}

// Markets endpoint scoped to specific CoinGecko ids (article "coins in this story").
export function marketsByIdsUrl(ids: string[]): string {
  // Encode each id but keep literal commas — CoinGecko expects a bare
  // comma-separated list (an encoded %2C would be read as a single unknown id).
  const idParam = ids.map(encodeURIComponent).join(',')
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idParam}&order=market_cap_desc&price_change_percentage=24h`
}

async function fetchMarkets(perPage: number): Promise<Coin[]> {
  const r = await cgFetch<CoinGeckoMarket[]>(marketsUrl(perPage), { revalidate: 60 })
  return r.ok ? mapCoins(r.data) : []
}

export function splitMovers(coins: Coin[], n = 4): { gainers: Coin[]; losers: Coin[] } {
  const sorted = [...coins].sort((a, b) => b.change24h - a.change24h)
  const loserStart = Math.max(n, sorted.length - n)
  return { gainers: sorted.slice(0, n), losers: sorted.slice(loserStart).reverse() }
}

// Find a coin by its CoinGecko id (used by the inline article coin card). null if absent.
export function pickCoin(coins: Coin[], id: string): Coin | null {
  return coins.find((c) => c.id === id) ?? null
}

// Top 10 by market cap — shared by the ticker and the homepage coin table
// (same URL, so Next dedupes the fetch). ISR-cached. Movers fetches separately.
export async function getTopCoins(): Promise<Coin[]> {
  return fetchMarkets(10)
}

// Biggest movers among the top 100 by market cap.
export async function getMovers(): Promise<{ gainers: Coin[]; losers: Coin[] }> {
  return splitMovers(await fetchMarkets(100))
}

// Live data for a specific set of coins (by id), server-side + ISR-cached (60s).
// [] for an empty id list or on failure. Reuses mapCoins (drops empty-id rows).
export async function getMarketsByIds(ids: string[]): Promise<Coin[]> {
  // Trim, drop blanks, and dedupe so messy `coins:` frontmatter can't trigger a
  // wasted call (e.g. ['', '  ']) or a bloated ids param with repeats.
  const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (!normalizedIds.length) return []
  const r = await cgFetch<CoinGeckoMarket[]>(marketsByIdsUrl(normalizedIds), { revalidate: 60 })
  return r.ok ? mapCoins(r.data) : []
}

export interface MarketCoin {
  id: string
  rank: number | null
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  change7d: number
  marketCap: number
  volume: number
  sparkline: number[]
}

interface CoinGeckoMarketRow {
  id?: string
  symbol?: string
  name?: string
  image?: string
  current_price?: number | null
  price_change_percentage_24h?: number | null
  price_change_percentage_7d_in_currency?: number | null
  market_cap?: number | null
  market_cap_rank?: number | null
  total_volume?: number | null
  sparkline_in_7d?: { price?: number[] }
}

// Keep the rendered sparkline small: drop non-finite points and thin a 7-day
// hourly series (~168 pts) down to `target` evenly-spaced points.
export function downsampleSparkline(points: number[], target = 24): number[] {
  const finite = (points ?? []).filter((n) => Number.isFinite(n))
  if (finite.length <= target) return finite
  const step = finite.length / target
  const out: number[] = []
  for (let i = 0; i < target; i++) out.push(finite[Math.floor(i * step)])
  return out
}

export function marketTableUrl(perPage: number): string {
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&price_change_percentage=24h,7d&sparkline=true`
}

export function mapMarketCoins(payload: CoinGeckoMarketRow[]): MarketCoin[] {
  if (!Array.isArray(payload)) return []
  return payload.flatMap((c) => {
    if (!c?.id) return []
    return [
      {
        id: c.id,
        rank: Number.isFinite(c.market_cap_rank) ? (c.market_cap_rank as number) : null,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name || '',
        image: c.image || '',
        price: num(c.current_price),
        change24h: num(c.price_change_percentage_24h),
        change7d: num(c.price_change_percentage_7d_in_currency),
        marketCap: num(c.market_cap),
        volume: num(c.total_volume),
        sparkline: downsampleSparkline(c.sparkline_in_7d?.price ?? []),
      },
    ]
  })
}

// Top `perPage` coins by market cap with 24h/7d change + sparkline. Server-side,
// ISR-cached (120s). [] on failure.
export async function getMarketTable(perPage = 100): Promise<MarketCoin[]> {
  const r = await cgFetch<CoinGeckoMarketRow[]>(marketTableUrl(perPage), { revalidate: 120 })
  return r.ok ? mapMarketCoins(r.data) : []
}
