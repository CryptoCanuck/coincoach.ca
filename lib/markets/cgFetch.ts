// Centralizes every CoinGecko request so the API key is attached in exactly one
// place. Server-only (imported by server components / route handlers). The key
// is read from env at call time and never logged.
//
// Auth (per CoinGecko docs):
//   Demo plan (free): host api.coingecko.com, header `x-cg-demo-api-key`
//   Pro plan (paid):  host pro-api.coingecko.com, header `x-cg-pro-api-key`
// Default is Demo; set COINGECKO_API_PLAN=pro to switch.

function isPro(): boolean {
  return process.env.COINGECKO_API_PLAN?.toLowerCase() === 'pro'
}

export function cgHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY
  if (!key) return {}
  return isPro() ? { 'x-cg-pro-api-key': key } : { 'x-cg-demo-api-key': key }
}

export function cgUrl(url: string): string {
  return isPro() ? url.replace('https://api.coingecko.com', 'https://pro-api.coingecko.com') : url
}

export type CgOutcome<T> =
  | { ok: true; data: T }
  // status is the HTTP status for a non-2xx response, or null for a
  // network error / timeout / abort.
  | { ok: false; status: number | null }

export async function cgFetch<T>(
  url: string,
  opts: { revalidate: number; timeoutMs?: number }
): Promise<CgOutcome<T>> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000)
  try {
    const res = await fetch(cgUrl(url), {
      next: { revalidate: opts.revalidate },
      signal: controller.signal,
      headers: cgHeaders(),
    })
    if (!res.ok) return { ok: false, status: res.status }
    return { ok: true, data: (await res.json()) as T }
  } catch {
    return { ok: false, status: null }
  } finally {
    clearTimeout(timeoutId)
  }
}
