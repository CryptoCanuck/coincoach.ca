import { cgFetch } from './cgFetch'

export interface GlobalStats {
  totalMarketCap: number
  totalVolume: number
  btcDominance: number
  activeCoins: number
  marketCapChange24h: number
}

interface CoinGeckoGlobal {
  data?: {
    active_cryptocurrencies?: number
    total_market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    market_cap_percentage?: { btc?: number }
    market_cap_change_percentage_24h_usd?: number
  }
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

export function mapGlobal(payload: CoinGeckoGlobal): GlobalStats | null {
  const d = payload?.data
  if (!d || typeof d !== 'object') return null
  return {
    totalMarketCap: num(d.total_market_cap?.usd),
    totalVolume: num(d.total_volume?.usd),
    btcDominance: num(d.market_cap_percentage?.btc),
    activeCoins: num(d.active_cryptocurrencies),
    marketCapChange24h: num(d.market_cap_change_percentage_24h_usd),
  }
}

// Server-side, ISR-cached (5 min). Returns null on any failure so the UI degrades.
export async function getGlobalStats(): Promise<GlobalStats | null> {
  const r = await cgFetch<CoinGeckoGlobal>('https://api.coingecko.com/api/v3/global', {
    revalidate: 300,
  })
  return r.ok ? mapGlobal(r.data) : null
}
