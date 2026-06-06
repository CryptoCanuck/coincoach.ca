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
