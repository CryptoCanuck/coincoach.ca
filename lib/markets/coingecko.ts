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

async function fetchMarkets(perPage: number): Promise<Coin[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(marketsUrl(perPage), {
      next: { revalidate: 60 },
      signal: controller.signal,
    })
    if (!res.ok) return []
    return mapCoins(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export function splitMovers(coins: Coin[], n = 4): { gainers: Coin[]; losers: Coin[] } {
  const sorted = [...coins].sort((a, b) => b.change24h - a.change24h)
  const loserStart = Math.max(n, sorted.length - n)
  return { gainers: sorted.slice(0, n), losers: sorted.slice(loserStart).reverse() }
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
