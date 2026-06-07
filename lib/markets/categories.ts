import { cgFetch } from './cgFetch'
import { sentimentScore } from './sentimentProxy'

export interface CategorySentiment {
  name: string
  change24h: number
  score: number
}

interface CoinGeckoCategory {
  name?: string
  market_cap?: number | null
  market_cap_change_24h?: number | null
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

export function mapCategories(payload: CoinGeckoCategory[], limit: number): CategorySentiment[] {
  if (!Array.isArray(payload)) return []
  return payload
    .filter((c) => c && typeof c.name === 'string' && Number.isFinite(c.market_cap))
    .sort((a, b) => (b.market_cap as number) - (a.market_cap as number))
    .slice(0, limit)
    .map((c) => {
      const change24h = num(c.market_cap_change_24h)
      return { name: c.name as string, change24h, score: sentimentScore(change24h) }
    })
}

// Server-side, ISR-cached (10 min). [] on failure.
export async function getCategorySentiment(limit = 8): Promise<CategorySentiment[]> {
  const r = await cgFetch<CoinGeckoCategory[]>(
    'https://api.coingecko.com/api/v3/coins/categories',
    { revalidate: 600 }
  )
  return r.ok ? mapCategories(r.data, limit) : []
}
