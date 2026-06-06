export interface Coin {
  symbol: string
  name: string
  price: number
  change24h: number
  image: string
}

interface CoinGeckoMarket {
  symbol: string
  name: string
  current_price?: number | null
  price_change_percentage_24h?: number | null
  image: string
}

const ENDPOINT =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h'

export function mapCoins(payload: CoinGeckoMarket[]): Coin[] {
  if (!Array.isArray(payload)) return []
  return payload.map((c) => ({
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name,
    price: typeof c.current_price === 'number' ? c.current_price : 0,
    change24h:
      typeof c.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : 0,
    image: c.image,
  }))
}

// Server-side, ISR-cached (revalidate every 60s). Returns [] on any failure so
// the UI degrades gracefully and never throws during render.
export async function getTopCoins(): Promise<Coin[]> {
  try {
    const res = await fetch(ENDPOINT, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()
    return mapCoins(data)
  } catch {
    return []
  }
}
