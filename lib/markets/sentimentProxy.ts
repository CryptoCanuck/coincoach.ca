import type { Coin } from './coingecko'
import type { FearGreedPoint } from './sentiment'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// Price-momentum proxy: 24h % change mapped onto the 0–100 Fear/Greed scale.
// 0% → 50 (Neutral); ±12.5% → the 0/100 extremes. NOT a social-sentiment reading.
export function sentimentScore(changePct: number): number {
  if (!Number.isFinite(changePct)) return 50
  return clamp(Math.round(50 + 4 * changePct), 0, 100)
}

export interface Zone {
  label: string
  color: string
}

// Thresholds + colours mirror the Direction B design (page-sentiment SentRow).
export function sentimentZone(value: number): Zone {
  if (value >= 75) return { label: 'Extreme Greed', color: '#7BC23A' }
  if (value >= 50) return { label: 'Greed', color: '#A6C83A' }
  if (value >= 35) return { label: 'Neutral', color: '#F2A024' }
  if (value >= 20) return { label: 'Fear', color: '#EB5E45' }
  return { label: 'Extreme Fear', color: '#EB5E45' }
}

// Population standard deviation of recent values → coarse volatility band.
export function volatilityLabel(values: number[]): string {
  if (!values.length) return '—'
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  const sd = Math.sqrt(variance)
  if (sd < 5) return 'Low'
  if (sd < 12) return 'Medium'
  return 'High'
}

// history is ascending (oldest→newest); daysAgo 0 = most recent point.
export function valueDaysAgo(history: FearGreedPoint[], daysAgo: number): number | null {
  const i = history.length - 1 - daysAgo
  return i >= 0 && i < history.length ? history[i].value : null
}

export interface CoinSentiment {
  symbol: string
  name: string
  score: number
}

export function coinSentimentList(coins: Coin[], limit: number): CoinSentiment[] {
  return coins.slice(0, limit).map((c) => ({
    symbol: c.symbol,
    name: c.name,
    score: sentimentScore(c.change24h),
  }))
}
