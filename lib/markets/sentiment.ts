import { dbFearGreed, dbFearGreedHistory } from './dbReads'

export interface FearGreed {
  value: number
  label: string
}

interface FngPayload {
  data?: { value?: string; value_classification?: string; timestamp?: string }[]
}

export function mapFearGreed(payload: FngPayload): FearGreed | null {
  const latest = payload?.data?.[0]
  if (!latest) return null
  const raw = Number(latest.value)
  const value = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 50
  return { value, label: latest.value_classification || 'Neutral' }
}

// DB-only (spec 1a): the collector fills the fear_greed table; views read it
// fresh-or-stale, or null when empty. No per-view alternative.me fetch.
export async function getFearGreed(): Promise<FearGreed | null> {
  const db = await dbFearGreed()
  return db?.data ?? null
}

export interface FearGreedPoint {
  value: number
  timestamp: number
}

export function mapFearGreedHistory(payload: FngPayload): FearGreedPoint[] {
  const data = payload?.data
  if (!Array.isArray(data)) return []
  const points: FearGreedPoint[] = []
  for (const d of data) {
    const raw = Number(d?.value)
    const ts = Number(d?.timestamp)
    if (!Number.isFinite(raw) || !Number.isFinite(ts)) continue
    points.push({ value: Math.max(0, Math.min(100, raw)), timestamp: ts })
  }
  // API is newest-first; charts want oldest-first.
  return points.reverse()
}

// DB-only (spec 1a). Up to ~1 year of daily points; [] when the table is empty.
export async function getFearGreedHistory(limit = 365): Promise<FearGreedPoint[]> {
  const db = await dbFearGreedHistory(limit)
  return db?.data ?? []
}
