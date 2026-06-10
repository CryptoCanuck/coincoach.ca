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

// DB-first (docs/market-data.md); server-side, ISR-cached (1 h — the index
// updates daily) on the API path. Null on failure.
export async function getFearGreed(): Promise<FearGreed | null> {
  const db = await dbFearGreed()
  if (db?.fresh) return db.data
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1&format=json', {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) return db?.data ?? null
    return mapFearGreed(await res.json()) ?? db?.data ?? null
  } catch {
    return db?.data ?? null
  } finally {
    clearTimeout(timeoutId)
  }
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

// DB-first; server-side, ISR-cached (1 h) on the API path. Up to ~1 year of
// daily points. [] on failure.
export async function getFearGreedHistory(limit = 365): Promise<FearGreedPoint[]> {
  const db = await dbFearGreedHistory(limit)
  if (db?.fresh) return db.data
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) return db?.data ?? []
    const mapped = mapFearGreedHistory(await res.json())
    return mapped.length ? mapped : (db?.data ?? [])
  } catch {
    return db?.data ?? []
  } finally {
    clearTimeout(timeoutId)
  }
}
