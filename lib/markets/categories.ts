import { dbCategories } from './dbReads'
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

// DB-only (spec 1a): fresh-or-stale category rows from the collector, or [] when
// the DB has nothing.
export async function getCategorySentiment(limit = 8): Promise<CategorySentiment[]> {
  const db = await dbCategories(limit)
  if (!db) return []
  return db.data.map((c) => ({ ...c, score: sentimentScore(c.change24h) }))
}
