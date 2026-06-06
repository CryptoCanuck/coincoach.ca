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

// Server-side, ISR-cached (1 h — the index updates daily). Null on failure.
export async function getFearGreed(): Promise<FearGreed | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1&format=json', {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return mapFearGreed(await res.json())
  } catch {
    return null
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

// Server-side, ISR-cached (1 h). Up to ~1 year of daily points. [] on failure.
export async function getFearGreedHistory(limit = 365): Promise<FearGreedPoint[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`https://api.alternative.me/fng/?limit=${limit}&format=json`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    if (!res.ok) return []
    return mapFearGreedHistory(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
