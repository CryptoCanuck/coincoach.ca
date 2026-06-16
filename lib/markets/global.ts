import { dbGlobalStats } from './dbReads'

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

// DB-only (spec 1a); returns fresh-or-stale DB stats, or null when the DB has
// nothing so the UI degrades. The collector is the sole API caller.
export async function getGlobalStats(): Promise<GlobalStats | null> {
  const db = await dbGlobalStats()
  return db?.data ?? null
}
