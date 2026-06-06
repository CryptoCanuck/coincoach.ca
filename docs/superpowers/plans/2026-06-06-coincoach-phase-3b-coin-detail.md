# CoinCoach Phase 3b — Coin Detail + Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Coin Detail page (`/charts/[coin]`) from the Direction B design plus a `/charts` index, with a live candlestick price chart (lightweight-charts), key stats, about + resource links, and a right rail (per-coin sentiment gauge, BTC↔USD converter, similar coins, coin-tagged news). Add a **Charts** nav item.

**Architecture:** Extend the server-side `lib/markets/` layer (ISR-cached `fetch`, pure mappers unit-tested, `try/catch` → safe fallback). Routes are keyed on the **CoinGecko `id`** (`/charts/bitcoin`), so `Coin` gains an `id` field. The price chart uses **lightweight-charts v5** (already installed) in a small client component; to keep `connect-src 'self'` intact, the page **pre-fetches all timeframe candle sets server-side** and passes them to the client, which switches locally — no client-side market fetching. Converter and watchlist are tiny client leaves fed by server data.

**Tech Stack:** Next 15 App Router (RSC + client leaves), TypeScript, Tailwind v4, Vitest, lightweight-charts v5.2. Data: CoinGecko `/coins/markets`, `/coins/{id}`, `/coins/{id}/ohlc` (no key).

### Decisions (resolved with the user)

- **Routing key:** CoinGecko `id` (`/charts/bitcoin`). `Coin` gains `id`; `mapCoins` reads it from the markets payload.
- **Chart tech:** lightweight-charts v5 candlestick. v5 API: `createChart(el, opts)` → `chart.addSeries(CandlestickSeries, {...})` → `series.setData([{ time, open, high, low, close }])` with `time` as **UNIX seconds (number)**; responsive via `autoSize: true`; cleanup via `chart.remove()`.
- **Timeframes:** `24H / 7D / 1M / 1Y` → CoinGecko `/ohlc?days=` `1 / 7 / 30 / 365`. (The design's `1H` and `ALL` are dropped: free-tier OHLC granularity bottoms out at 30-min candles and `ALL` payloads are unbounded; this keeps the pre-fetched payload small. Documented on-page implicitly by the available chips.)
- **CSP:** unchanged. lightweight-charts is bundled (`script-src 'self'` already allows it); all CoinGecko fetches stay server-side; the client chart only receives props. No new dependency beyond the already-committed `lightweight-charts`.

**Testing note:** Repo unit-tests pure functions only; components/routes are verified by `corepack yarn build` + dev smoke (Phase 1–3a precedent). All new logic (mappers, helpers) is unit-tested; the chart/converter/pages are build + smoke verified. Do not invent a component test harness.

**Conventions (repo memory):** Yarn Berry via `corepack yarn` (not on PATH). Many small, logically-scoped commits; plain sentence-style messages with **no AI-attribution / Co-Authored-By trailers**. Pre-commit Prettier hook runs — let it format, keep the tree clean. IDE shows stale "Cannot find module" diagnostics for new files; trust `corepack yarn tsc --noEmit` (exit 0) + `corepack yarn build`.

---

## File structure

| File                                       | Responsibility                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `lib/markets/coingecko.ts` (modify)        | add `id` to `Coin` + `mapCoins`                                             |
| `lib/markets/coingecko.test.ts` (modify)   | assert `id` mapping                                                          |
| `lib/markets/coins.ts` (create)            | `CoinDetail`/`Candle` types, `mapCoinDetail`, `getCoin`, `mapOhlc`, `getOhlc`, `priceVolatilityPct` |
| `lib/markets/coins.test.ts` (create)       | tests for `mapCoinDetail`, `mapOhlc`, `priceVolatilityPct`                  |
| `components/PriceChart.tsx` (create)       | `'use client'` lightweight-charts candlestick + timeframe chips             |
| `components/WatchlistButton.tsx` (create)  | `'use client'` localStorage star toggle                                     |
| `components/Converter.tsx` (create)        | `'use client'` coin↔USD converter                                          |
| `components/CoinHeader.tsx` (create)       | coin header (logo, name, rank, price, change, actions)                      |
| `components/KeyStats.tsx` (create)         | the Key Stats statgrid                                                       |
| `components/SimilarCoins.tsx` (create)     | rail list of other coins linking to their detail pages                      |
| `components/Header.tsx` (modify)           | add a **Charts** desktop nav link                                           |
| `data/headerNavLinks.ts` (modify)          | add **Charts** to the mobile nav                                            |
| `app/charts/page.tsx` (create)             | `/charts` index (table of coins → detail)                                   |
| `app/charts/[coin]/page.tsx` (create)      | the Coin Detail page + `generateMetadata`                                   |
| `docs/redesign-roadmap.md` (modify)        | mark Phase 3b shipped                                                       |

---

## Task 1: Add `id` to `Coin`

**Files:** modify `lib/markets/coingecko.ts`, `lib/markets/coingecko.test.ts`.

- [ ] **Step 1: Failing test** — in `lib/markets/coingecko.test.ts`, find the existing `mapCoins` test and add an `id` assertion. Add this test inside the existing `describe('mapCoins', ...)` block (or as a new `it` next to it):

```ts
it('maps the CoinGecko id through', () => {
  const out = mapCoins([
    {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      current_price: 1,
      price_change_percentage_24h: 2,
      image: 'x',
    },
  ])
  expect(out[0].id).toBe('bitcoin')
})
```

- [ ] **Step 2: Run** `corepack yarn test coingecko` → FAIL (`id` is `undefined`).

- [ ] **Step 3: Implement** — in `lib/markets/coingecko.ts`:

Add `id: string` as the first field of the `Coin` interface:

```ts
export interface Coin {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  image: string
}
```

Add `id?: string` to the `CoinGeckoMarket` interface (first field), and map it in `mapCoins` (add as the first mapped property):

```ts
id: c.id || '',
```

- [ ] **Step 4: Run** `corepack yarn test coingecko` → PASS (existing tests still green — adding a field doesn't break them).

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coingecko.ts lib/markets/coingecko.test.ts
git commit -m "Add CoinGecko id to the Coin model"
```

---

## Task 2: Coin detail feed

**Files:** create `lib/markets/coins.ts`, `lib/markets/coins.test.ts`.

CoinGecko `GET /api/v3/coins/{id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false` returns `{ id, symbol, name, market_cap_rank, categories: [], description: { en }, links: { homepage:[], whitepaper, blockchain_site:[], repos_url:{ github:[] }, subreddit_url }, market_data: { current_price:{usd}, price_change_percentage_24h, market_cap:{usd}, total_volume:{usd}, circulating_supply, max_supply, ath:{usd}, atl:{usd} } }`.

- [ ] **Step 1: Failing test** — create `lib/markets/coins.test.ts` (start with the detail tests; OHLC + volatility tests are appended in Tasks 3):

```ts
import { describe, it, expect } from 'vitest'
import { mapCoinDetail } from './coins'

const sample = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  market_cap_rank: 1,
  categories: ['Cryptocurrency', 'Layer 1 (L1)'],
  description: { en: 'Bitcoin is a <a href="x">decentralized</a> currency.' },
  links: {
    homepage: ['https://bitcoin.org', ''],
    whitepaper: 'https://bitcoin.org/bitcoin.pdf',
    blockchain_site: ['https://mempool.space', ''],
    repos_url: { github: ['https://github.com/bitcoin/bitcoin'] },
    subreddit_url: 'https://reddit.com/r/bitcoin',
  },
  market_data: {
    current_price: { usd: 67412.08 },
    price_change_percentage_24h: 2.4,
    market_cap: { usd: 1_330_000_000_000 },
    total_volume: { usd: 38_400_000_000 },
    circulating_supply: 19_680_000,
    max_supply: 21_000_000,
    ath: { usd: 73750 },
    atl: { usd: 67.81 },
  },
}

describe('mapCoinDetail', () => {
  it('maps the CoinGecko coin payload to CoinDetail', () => {
    const d = mapCoinDetail(sample)!
    expect(d.id).toBe('bitcoin')
    expect(d.symbol).toBe('BTC')
    expect(d.name).toBe('Bitcoin')
    expect(d.rank).toBe(1)
    expect(d.price).toBe(67412.08)
    expect(d.change24h).toBe(2.4)
    expect(d.marketCap).toBe(1_330_000_000_000)
    expect(d.volume).toBe(38_400_000_000)
    expect(d.circulatingSupply).toBe(19_680_000)
    expect(d.maxSupply).toBe(21_000_000)
    expect(d.ath).toBe(73750)
    expect(d.atl).toBe(67.81)
    expect(d.categories).toEqual(['Cryptocurrency', 'Layer 1 (L1)'])
  })
  it('strips HTML from the description', () => {
    expect(mapCoinDetail(sample)!.description).toBe('Bitcoin is a decentralized currency.')
  })
  it('collects only non-empty resource links', () => {
    expect(mapCoinDetail(sample)!.links).toEqual([
      { label: 'Website', href: 'https://bitcoin.org' },
      { label: 'Whitepaper', href: 'https://bitcoin.org/bitcoin.pdf' },
      { label: 'Explorer', href: 'https://mempool.space' },
      { label: 'GitHub', href: 'https://github.com/bitcoin/bitcoin' },
      { label: 'Reddit', href: 'https://reddit.com/r/bitcoin' },
    ])
  })
  it('returns null and coerces missing fields safely', () => {
    // @ts-expect-error bad input
    expect(mapCoinDetail(null)).toBeNull()
    const bare = mapCoinDetail({ id: 'x', symbol: 'x', name: 'X' })!
    expect(bare.price).toBe(0)
    expect(bare.maxSupply).toBeNull()
    expect(bare.links).toEqual([])
    expect(bare.categories).toEqual([])
  })
})
```

- [ ] **Step 2: Run** `corepack yarn test coins` → FAIL (cannot find module).

- [ ] **Step 3: Implement** — create `lib/markets/coins.ts`:

```ts
export interface ResourceLink {
  label: string
  href: string
}

export interface CoinDetail {
  id: string
  symbol: string
  name: string
  rank: number | null
  price: number
  change24h: number
  marketCap: number
  volume: number
  circulatingSupply: number
  maxSupply: number | null
  ath: number
  atl: number
  categories: string[]
  description: string
  links: ResourceLink[]
}

interface CoinGeckoCoin {
  id?: string
  symbol?: string
  name?: string
  market_cap_rank?: number | null
  categories?: (string | null)[]
  description?: { en?: string }
  links?: {
    homepage?: string[]
    whitepaper?: string
    blockchain_site?: string[]
    repos_url?: { github?: string[] }
    subreddit_url?: string
  }
  market_data?: {
    current_price?: { usd?: number }
    price_change_percentage_24h?: number
    market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    circulating_supply?: number
    max_supply?: number | null
    ath?: { usd?: number }
    atl?: { usd?: number }
  }
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mapCoinDetail(payload: CoinGeckoCoin): CoinDetail | null {
  if (!payload || typeof payload !== 'object' || !payload.id) return null
  const m = payload.market_data ?? {}
  const l = payload.links ?? {}

  const linkDefs: ResourceLink[] = [
    { label: 'Website', href: l.homepage?.[0] ?? '' },
    { label: 'Whitepaper', href: l.whitepaper ?? '' },
    { label: 'Explorer', href: l.blockchain_site?.[0] ?? '' },
    { label: 'GitHub', href: l.repos_url?.github?.[0] ?? '' },
    { label: 'Reddit', href: l.subreddit_url ?? '' },
  ]

  return {
    id: payload.id,
    symbol: (payload.symbol ?? '').toUpperCase(),
    name: payload.name ?? '',
    rank: Number.isFinite(payload.market_cap_rank) ? (payload.market_cap_rank as number) : null,
    price: num(m.current_price?.usd),
    change24h: num(m.price_change_percentage_24h),
    marketCap: num(m.market_cap?.usd),
    volume: num(m.total_volume?.usd),
    circulatingSupply: num(m.circulating_supply),
    maxSupply: Number.isFinite(m.max_supply) ? (m.max_supply as number) : null,
    ath: num(m.ath?.usd),
    atl: num(m.atl?.usd),
    categories: (payload.categories ?? []).filter((c): c is string => typeof c === 'string' && !!c),
    description: stripHtml(payload.description?.en ?? ''),
    links: linkDefs.filter((x) => x.href),
  }
}

// Server-side, ISR-cached (5 min). null on failure.
export async function getCoin(id: string): Promise<CoinDetail | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      id
    )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    const res = await fetch(url, { next: { revalidate: 300 }, signal: controller.signal })
    if (!res.ok) return null
    return mapCoinDetail(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run** `corepack yarn test coins` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coins.ts lib/markets/coins.test.ts
git commit -m "Add CoinGecko coin detail feed"
```

---

## Task 3: OHLC feed + volatility helper

**Files:** modify `lib/markets/coins.ts`, `lib/markets/coins.test.ts`.

CoinGecko `GET /api/v3/coins/{id}/ohlc?vs_currency=usd&days=N` returns `[[ms, open, high, low, close], ...]` ascending. lightweight-charts wants `time` in **seconds**.

- [ ] **Step 1: Failing test** — append to `lib/markets/coins.test.ts`:

```ts
import { mapOhlc, priceVolatilityPct } from './coins'

describe('mapOhlc', () => {
  it('maps [ms,o,h,l,c] tuples to second-based candles', () => {
    expect(
      mapOhlc([
        [1_600_000_000_000, 10, 12, 9, 11],
        [1_600_086_400_000, 11, 13, 10, 12],
      ])
    ).toEqual([
      { time: 1_600_000_000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1_600_086_400, open: 11, high: 13, low: 10, close: 12 },
    ])
  })
  it('drops malformed tuples and returns [] for non-arrays', () => {
    expect(mapOhlc([[1_600_000_000_000, 10, 12, 9]])).toEqual([])
    // @ts-expect-error bad input
    expect(mapOhlc(null)).toEqual([])
  })
})

describe('priceVolatilityPct', () => {
  it('returns the stddev of close-to-close returns as a percent', () => {
    // flat closes → 0 volatility
    const flat = [
      { time: 1, open: 0, high: 0, low: 0, close: 100 },
      { time: 2, open: 0, high: 0, low: 0, close: 100 },
      { time: 3, open: 0, high: 0, low: 0, close: 100 },
    ]
    expect(priceVolatilityPct(flat)).toBe(0)
  })
  it('returns null with fewer than 2 candles', () => {
    expect(priceVolatilityPct([])).toBeNull()
    expect(priceVolatilityPct([{ time: 1, open: 0, high: 0, low: 0, close: 5 }])).toBeNull()
  })
})
```

- [ ] **Step 2: Run** `corepack yarn test coins` → FAIL (`mapOhlc` not exported).

- [ ] **Step 3: Implement** — append to `lib/markets/coins.ts`:

```ts
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export function mapOhlc(payload: number[][]): Candle[] {
  if (!Array.isArray(payload)) return []
  const out: Candle[] = []
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 5) continue
    const [ms, open, high, low, close] = row
    if (![ms, open, high, low, close].every((n) => Number.isFinite(n))) continue
    out.push({ time: Math.floor(ms / 1000), open, high, low, close })
  }
  return out
}

// Std-dev of close-to-close percentage returns over the series, as a percent.
// null when there aren't enough points to compute a return.
export function priceVolatilityPct(candles: Candle[]): number | null {
  if (candles.length < 2) return null
  const returns: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close
    if (prev !== 0) returns.push(((candles[i].close - prev) / prev) * 100)
  }
  if (!returns.length) return null
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance)
}

const OHLC_DAYS = { '24H': 1, '7D': 7, '1M': 30, '1Y': 365 } as const
export type Timeframe = keyof typeof OHLC_DAYS
export const TIMEFRAMES = Object.keys(OHLC_DAYS) as Timeframe[]

// Server-side, ISR-cached (5 min). [] on failure.
export async function getOhlc(id: string, frame: Timeframe): Promise<Candle[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      id
    )}/ohlc?vs_currency=usd&days=${OHLC_DAYS[frame]}`
    const res = await fetch(url, { next: { revalidate: 300 }, signal: controller.signal })
    if (!res.ok) return []
    return mapOhlc(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

// All timeframes in parallel → a map the client chart switches between.
export async function getAllOhlc(id: string): Promise<Record<Timeframe, Candle[]>> {
  const entries = await Promise.all(
    TIMEFRAMES.map(async (f) => [f, await getOhlc(id, f)] as const)
  )
  return Object.fromEntries(entries) as Record<Timeframe, Candle[]>
}
```

- [ ] **Step 4: Run** `corepack yarn test coins` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coins.ts lib/markets/coins.test.ts
git commit -m "Add OHLC feed and price-volatility helper"
```

---

## Task 4: PriceChart (client, lightweight-charts v5)

**Files:** create `components/PriceChart.tsx`.

Receives the pre-fetched candle map + the timeframe list; renders a candlestick chart and switches series data locally on chip change. No fetching.

- [ ] **Step 1: Implement** — create `components/PriceChart.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { Candle, Timeframe } from '@/lib/markets/coins'

export default function PriceChart({
  data,
  frames,
}: {
  data: Record<string, Candle[]>
  frames: Timeframe[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [frame, setFrame] = useState<Timeframe>(frames.includes('1M') ? '1M' : frames[0])

  const hasData = frames.some((f) => (data[f]?.length ?? 0) > 0)

  useEffect(() => {
    if (!containerRef.current || !hasData) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#97a3b2', fontFamily: 'inherit' },
      grid: { vertLines: { color: '#1b232f' }, horzLines: { color: '#1b232f' } },
      rightPriceScale: { borderColor: '#232c38' },
      timeScale: { borderColor: '#232c38', timeVisible: true },
      crosshair: { mode: 0 },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#7BC23A',
      downColor: '#EB5E45',
      borderVisible: false,
      wickUpColor: '#7BC23A',
      wickDownColor: '#EB5E45',
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [hasData])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    series.setData(data[frame] ?? [])
    chartRef.current?.timeScale().fitContent()
  }, [frame, data])

  const chipBase = 'rounded-md px-2.5 py-1 text-[12px] font-bold'
  return (
    <div className="bg-surface border-line rounded-[10px] border p-4">
      <div className="mb-3 flex items-center">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-extrabold text-gray-50">Price</span>
          <span className="text-ink-3 text-[12.5px] font-semibold">USD · Candlestick</span>
        </div>
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Chart timeframe">
          {frames.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={frame === f}
              onClick={() => setFrame(f)}
              className={
                frame === f ? `${chipBase} bg-fill text-gray-50` : `${chipBase} text-ink-3 hover:text-ink-2`
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div ref={containerRef} className="h-[300px] w-full" />
      ) : (
        <p className="text-ink-3 py-24 text-center text-sm">Chart data unavailable.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds (confirms lightweight-charts v5 imports resolve through Next's bundler). If the import of `CandlestickSeries` / types fails, check `node_modules/lightweight-charts` is v5.x (it is, `^5.2.0`).

- [ ] **Step 3: Commit**

```bash
git add components/PriceChart.tsx
git commit -m "Add the candlestick price chart"
```

---

## Task 5: WatchlistButton (client)

**Files:** create `components/WatchlistButton.tsx`.

localStorage-backed star toggle. Hydration-safe (reads storage in `useEffect`).

- [ ] **Step 1: Implement** — create `components/WatchlistButton.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

const KEY = 'cc:watchlist'

function readList(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export default function WatchlistButton({ coinId }: { coinId: string }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(readList().includes(coinId))
  }, [coinId])

  const toggle = () => {
    const list = readList()
    const next = list.includes(coinId) ? list.filter((x) => x !== coinId) : [...list, coinId]
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures (private mode, quota)
    }
    setOn(next.includes(coinId))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`border-line flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors ${
        on ? 'text-accent' : 'text-ink hover:text-gray-50'
      }`}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
      {on ? 'Watching' : 'Watchlist'}
    </button>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/WatchlistButton.tsx
git commit -m "Add a localStorage watchlist toggle button"
```

---

## Task 6: Converter (client)

**Files:** create `components/Converter.tsx`.

Two-way coin↔USD converter using the live price prop.

- [ ] **Step 1: Implement** — create `components/Converter.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function Converter({ symbol, price }: { symbol: string; price: number }) {
  const [coinAmt, setCoinAmt] = useState('1')
  const [usdAmt, setUsdAmt] = useState(price ? price.toFixed(2) : '0')

  const onCoin = (v: string) => {
    setCoinAmt(v)
    const n = parseFloat(v)
    setUsdAmt(Number.isFinite(n) ? (n * price).toFixed(2) : '')
  }
  const onUsd = (v: string) => {
    setUsdAmt(v)
    const n = parseFloat(v)
    setCoinAmt(Number.isFinite(n) && price ? (n / price).toFixed(8) : '')
  }

  const rowClass =
    'bg-fill-2 border-line flex h-11 items-center gap-2.5 rounded-lg border px-3'
  const inputClass = 'ml-auto w-full bg-transparent text-right text-sm font-bold text-gray-50 outline-none'

  return (
    <div className="bg-surface border-line rounded-[10px] border p-4">
      <div className="mb-3 text-[15px] font-extrabold text-gray-50">Converter</div>
      <label className={`${rowClass} mb-2.5`}>
        <span className="text-ink-2 w-12 text-[13.5px] font-bold">{symbol}</span>
        <input
          type="number"
          inputMode="decimal"
          value={coinAmt}
          onChange={(e) => onCoin(e.target.value)}
          aria-label={`Amount in ${symbol}`}
          className={inputClass}
        />
      </label>
      <label className={rowClass}>
        <span className="text-ink-2 w-12 text-[13.5px] font-bold">USD</span>
        <input
          type="number"
          inputMode="decimal"
          value={usdAmt}
          onChange={(e) => onUsd(e.target.value)}
          aria-label="Amount in USD"
          className={inputClass}
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/Converter.tsx
git commit -m "Add a coin/USD converter"
```

---

## Task 7: CoinHeader

**Files:** create `components/CoinHeader.tsx`.

Server component; takes a `CoinDetail`. Renders logo, name+ticker+rank, category line, price + 24h change, and the `WatchlistButton` + a static "Ask about X" coach chip.

- [ ] **Step 1: Implement** — create `components/CoinHeader.tsx`:

```tsx
import CoinLogo from './CoinLogo'
import WatchlistButton from './WatchlistButton'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { CoinDetail } from '@/lib/markets/coins'

export default function CoinHeader({ coin }: { coin: CoinDetail }) {
  const dir = changeDirection(coin.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <div className="border-line flex flex-wrap items-center gap-4 border-b py-6">
      <CoinLogo sym={coin.symbol} size={56} />
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-[26px] font-black tracking-tight text-gray-50">{coin.name}</span>
          <span className="text-ink-3 text-sm font-bold">{coin.symbol}</span>
          {coin.rank !== null && (
            <span className="bg-amber/15 text-amber rounded-md px-2 py-0.5 text-[11px] font-bold">
              Rank #{coin.rank}
            </span>
          )}
        </div>
        {coin.categories.length > 0 && (
          <div className="text-ink-3 mt-1 text-[12.5px] font-semibold">
            {coin.categories.slice(0, 2).join(' · ')}
          </div>
        )}
      </div>
      <div className="ml-auto text-right">
        <div className="text-[28px] font-black tracking-tight text-gray-50">
          {formatUsd(coin.price)}
        </div>
        <div className={`mt-0.5 text-[15px] font-bold ${changeClass}`}>
          {formatPercent(coin.change24h)} (24h)
        </div>
      </div>
      <div className="flex gap-2.5">
        <WatchlistButton coinId={coin.id} />
        <span className="bg-accent flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-extrabold text-[#3a2400]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#3a2400]" />
          Ask about {coin.symbol}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/CoinHeader.tsx
git commit -m "Add the coin detail header"
```

---

## Task 8: KeyStats

**Files:** create `components/KeyStats.tsx`.

The 8-cell stat grid. Takes the `CoinDetail` + an optional volatility percent.

- [ ] **Step 1: Implement** — create `components/KeyStats.tsx`:

```tsx
import { formatUsd, formatCompactUsd } from '@/lib/markets/format'
import type { CoinDetail } from '@/lib/markets/coins'

const dash = '—'

function supply(n: number | null, symbol: string): string {
  if (n === null || !Number.isFinite(n) || n === 0) return dash
  return `${formatCompactUsd(n).replace('$', '')} ${symbol}`
}

export default function KeyStats({
  coin,
  volatilityPct,
}: {
  coin: CoinDetail
  volatilityPct: number | null
}) {
  const cells: [string, string][] = [
    ['Market Cap', coin.marketCap ? formatCompactUsd(coin.marketCap) : dash],
    ['24h Volume', coin.volume ? formatCompactUsd(coin.volume) : dash],
    ['Circulating Supply', supply(coin.circulatingSupply, coin.symbol)],
    ['Max Supply', supply(coin.maxSupply, coin.symbol)],
    ['All-Time High', coin.ath ? formatUsd(coin.ath) : dash],
    ['All-Time Low', coin.atl ? formatUsd(coin.atl) : dash],
    ['Rank', coin.rank !== null ? `#${coin.rank}` : dash],
    ['Volatility (30d)', volatilityPct === null ? dash : `${volatilityPct.toFixed(1)}%`],
  ]
  return (
    <div className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-4">
      {cells.map(([k, v]) => (
        <div key={k} className="border-line border-r border-b p-3.5 last:border-r-0">
          <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{k}</div>
          <div className="mt-1 text-[15px] font-extrabold text-gray-50">{v}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/KeyStats.tsx
git commit -m "Add the coin Key Stats grid"
```

---

## Task 9: SimilarCoins

**Files:** create `components/SimilarCoins.tsx`.

Rail list of other coins linking to their `/charts/[id]` detail pages.

- [ ] **Step 1: Implement** — create `components/SimilarCoins.tsx`:

```tsx
import Link from './Link'
import CoinLogo from './CoinLogo'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { Coin } from '@/lib/markets/coingecko'

export default function SimilarCoins({ coins }: { coins: Coin[] }) {
  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line border-b px-4 py-3.5 text-[15px] font-extrabold text-gray-50">
        Similar Coins
      </div>
      {coins.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1">
          {coins.map((c) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <Link
                key={c.id || c.symbol}
                href={`/charts/${c.id}`}
                className="hover:bg-fill-2 flex items-center gap-3 px-4 py-2.5"
              >
                <CoinLogo sym={c.symbol} size={22} />
                <span className="text-[13.5px] font-bold text-gray-100">{c.symbol}</span>
                <span className="ml-auto text-[13.5px] font-bold text-gray-100">
                  {formatUsd(c.price)}
                </span>
                <span className={`w-[52px] text-right text-[13px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/SimilarCoins.tsx
git commit -m "Add the Similar Coins rail"
```

---

## Task 10: /charts index page

**Files:** create `app/charts/page.tsx`.

A table of the top coins, each linking to its detail page.

- [ ] **Step 1: Implement** — create `app/charts/page.tsx`:

```tsx
import Link from '@/components/Link'
import CoinLogo from '@/components/CoinLogo'
import Breadcrumb from '@/components/Breadcrumb'
import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Charts',
  description: 'Live prices and candlestick charts for the top cryptocurrencies.',
  alternates: { canonical: '/charts' },
})

export default async function ChartsPage() {
  const coins = await getTopCoins()
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Charts' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Charts</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Live prices for the top coins — open one for its candlestick chart and stats.
      </p>

      <div className="bg-surface border-line mt-6 overflow-hidden rounded-[10px] border">
        {coins.length === 0 ? (
          <p className="text-ink-2 px-4 py-6 text-sm">Market data unavailable.</p>
        ) : (
          coins.map((c, i) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <Link
                key={c.id || c.symbol}
                href={`/charts/${c.id}`}
                className="border-line-2 hover:bg-fill-2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span className="text-ink-3 w-5 text-xs font-bold">{i + 1}</span>
                <CoinLogo sym={c.symbol} size={24} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-gray-100">{c.name}</span>
                  <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
                </div>
                <span className="ml-auto text-sm font-bold text-gray-100">{formatUsd(c.price)}</span>
                <span className={`w-[64px] text-right text-[13px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → `/charts` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add app/charts/page.tsx
git commit -m "Add the /charts index page"
```

---

## Task 11: /charts/[coin] detail page

**Files:** create `app/charts/[coin]/page.tsx`.

Assembles the page. Dynamic route keyed on CoinGecko id. `notFound()` when the coin can't be fetched. Pulls coin-tagged news from contentlayer.

- [ ] **Step 1: Implement** — create `app/charts/[coin]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Link from '@/components/Link'
import Breadcrumb from '@/components/Breadcrumb'
import CoinHeader from '@/components/CoinHeader'
import PriceChart from '@/components/PriceChart'
import KeyStats from '@/components/KeyStats'
import SectionHeading from '@/components/SectionHeading'
import Converter from '@/components/Converter'
import SimilarCoins from '@/components/SimilarCoins'
import Gauge from '@/components/Gauge'
import { getCoin, getAllOhlc, priceVolatilityPct, TIMEFRAMES } from '@/lib/markets/coins'
import { getTopCoins } from '@/lib/markets/coingecko'
import { sentimentScore } from '@/lib/markets/sentimentProxy'
import { genPageMetadata } from 'app/seo'

export async function generateMetadata({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  const coin = await getCoin(id)
  if (!coin) return genPageMetadata({ title: 'Coin not found' })
  return genPageMetadata({
    title: `${coin.name} (${coin.symbol}) Price & Chart`,
    description: `Live ${coin.name} price, candlestick chart, key stats and ${coin.symbol} news.`,
    alternates: { canonical: `/charts/${coin.id}` },
  })
}

export default async function CoinDetailPage({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  const [coin, ohlc, top] = await Promise.all([getCoin(id), getAllOhlc(id), getTopCoins()])
  if (!coin) notFound()

  const volatility = priceVolatilityPct(ohlc['1M'] ?? [])
  const similar = top.filter((c) => c.id !== coin.id).slice(0, 5)

  const posts = allCoreContent(sortPosts(allBlogs))
  const sym = coin.symbol.toLowerCase()
  const nameLower = coin.name.toLowerCase()
  const coinNews = posts
    .filter((p) => (p.tags ?? []).some((t) => t.toLowerCase() === sym || t.toLowerCase() === nameLower))
    .slice(0, 4)

  return (
    <div className="py-2">
      <div className="pt-5">
        <Breadcrumb
          items={[{ label: 'Charts', href: '/charts' }, { label: `${coin.name} (${coin.symbol})` }]}
        />
      </div>
      <CoinHeader coin={coin} />

      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <PriceChart data={ohlc} frames={TIMEFRAMES} />

          <div>
            <SectionHeading title="Key Stats" />
            <KeyStats coin={coin} volatilityPct={volatility} />
          </div>

          {(coin.description || coin.links.length > 0) && (
            <div>
              <SectionHeading title={`About ${coin.name}`} barColor="var(--color-blue)" />
              {coin.description && (
                <p className="text-ink-2 text-[14px] leading-relaxed">{coin.description}</p>
              )}
              {coin.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {coin.links.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="border-line bg-fill-2 text-ink hover:text-gray-50 rounded-lg border px-3 py-1.5 text-[13px] font-semibold"
                    >
                      {l.label} ↗
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <div className="flex flex-col gap-5">
          <div className="bg-surface border-line flex flex-col items-center rounded-[10px] border p-4">
            <div className="mb-1 self-start text-[15px] font-extrabold text-gray-50">
              {coin.symbol} Sentiment
            </div>
            <Gauge value={sentimentScore(coin.change24h)} label="Momentum" size="sm" />
            <div className="text-ink-3 mt-1 text-[11px]">24h momentum proxy</div>
          </div>

          <Converter symbol={coin.symbol} price={coin.price} />

          <SimilarCoins coins={similar} />

          <div className="bg-surface border-line rounded-[10px] border p-4">
            <div className="mb-2 text-[15px] font-extrabold text-gray-50">
              Latest {coin.symbol} News
            </div>
            {coinNews.length === 0 ? (
              <p className="text-ink-3 text-sm">
                No {coin.symbol} stories yet —{' '}
                <Link href="/news" className="text-blue font-semibold">
                  browse all news ›
                </Link>
              </p>
            ) : (
              <div className="flex flex-col">
                {coinNews.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="border-line-2 hover:text-gray-50 text-ink-2 border-b py-2.5 text-[13.5px] font-semibold last:border-b-0"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build + format**

Run: `corepack yarn prettier --write 'app/charts/**/*.tsx' && corepack yarn build`
Expected: build succeeds; `/charts/[coin]` shows as a dynamic route (`ƒ`).

- [ ] **Step 3: Commit**

```bash
git add app/charts/[coin]/page.tsx
git commit -m "Add the Coin Detail page"
```

---

## Task 12: Charts nav item + verification + roadmap

**Files:** modify `components/Header.tsx`, `data/headerNavLinks.ts`, `docs/redesign-roadmap.md`.

- [ ] **Step 1: Desktop nav** — in `components/Header.tsx`, add a Charts link next to the Sentiment one (same className), inside `<nav>`:

```tsx
<Link
  href="/charts"
  className="text-[15px] font-semibold text-gray-300 transition-colors hover:text-white"
>
  Charts
</Link>
```

- [ ] **Step 2: Mobile nav** — in `data/headerNavLinks.ts`, add `{ href: '/charts', title: 'Charts' }` after the Sentiment entry.

- [ ] **Step 3: Full test suite** — `corepack yarn test` → all pass (existing + new `coins` and `coingecko` id tests).

- [ ] **Step 4: Build + dev smoke** — `corepack yarn build`, then `corepack yarn dev` and load `/charts` and `/charts/bitcoin` (read the dev port from the log). Confirm:
  - `/charts` lists coins; clicking one opens its detail page.
  - Detail: header price/change/rank, the **candlestick chart renders** and the 24H/7D/1M/1Y chips switch it, Key Stats populated, About text + resource links, right rail (per-coin momentum gauge, working Converter, Similar Coins linking to other detail pages, coin news or the browse-all fallback).
  - Header shows a working **Charts** link.
  - A bad id (`/charts/not-a-coin`) renders the 404 page (via `notFound()`), and with the network blocked the page degrades (chart "unavailable", stats `—`).

- [ ] **Step 5: Update the roadmap** — in `docs/redesign-roadmap.md`, mark Phase 3b shipped (new `/charts` + `/charts/[id]`, candlestick chart, converter, watchlist, similar coins, coin news), flip the Phase 1 per-coin-detail / OHLC rows to done, and note **Charts** added to nav.

- [ ] **Step 6: Commit**

```bash
git add components/Header.tsx data/headerNavLinks.ts docs/redesign-roadmap.md
git commit -m "Add Charts nav item and mark Phase 3b shipped"
```

---

## Self-review notes

- **Spec coverage:** Matches `page-coin.jsx` — breadcrumb, coin header (logo/name/rank/price/change/Watchlist/Ask), price chart + timeframe chips, Key Stats grid, About + resource chips, right rail (per-coin gauge, Converter, Similar Coins, coin news), plus the `/charts` index and a **Charts** nav item. `1H`/`ALL` chips intentionally dropped (free-tier OHLC limits) — documented in Decisions.
- **Type consistency:** `Coin` gains `id` (Task 1) used by `SimilarCoins`/index links; `CoinDetail`/`Candle`/`Timeframe`/`TIMEFRAMES` (Tasks 2–3) feed `CoinHeader`/`KeyStats`/`PriceChart`/the page; `sentimentScore` (3a) reused for the per-coin gauge; `priceVolatilityPct` feeds `KeyStats`.
- **No client fetching / CSP:** all CoinGecko calls are server-side; `PriceChart`/`Converter`/`WatchlistButton` are client leaves fed by props/localStorage only. `connect-src 'self'` holds; lightweight-charts is bundled (`script-src 'self'`). No CSP edits.
- **Graceful degradation:** `getCoin` null → `notFound()`; `getAllOhlc`/`getTopCoins` → [] with chart/rail fallbacks; missing stats → `—`; no coin news → browse-all link.
- **No new test harness:** new pure logic (`mapCoins` id, `mapCoinDetail`, `mapOhlc`, `priceVolatilityPct`) unit-tested; components/pages build + smoke verified.
