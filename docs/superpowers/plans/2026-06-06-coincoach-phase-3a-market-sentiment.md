# CoinCoach Phase 3a — Market Sentiment Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the signature `/sentiment` page from the Direction B design — a live whole-market Fear & Greed hero (gauge + history chart), an overview stat strip, and "Sentiment by Coin" / "Sentiment by Category" sections powered by a **documented, clearly-labelled momentum proxy** (no free API gives true per-coin/category sentiment), plus the "What does this mean?" guide cards and the Coach strip. Add a **Sentiment** nav item.

**Architecture:** Extend the server-side `lib/markets/` layer (ISR-cached `fetch`, pure mappers unit-tested with Vitest, `try/catch` → safe empty/null fallback). The page is an async server component that fetches everything in parallel and degrades gracefully. The only client component is the history chart's timeframe switch — it receives the **full 1-year series as props** and slices it locally, so there is still **no client-side fetching** and the `connect-src 'self'` CSP is unaffected.

**Tech Stack:** Next 15 App Router (RSC + one leaf client component), TypeScript, Tailwind v4, Vitest. Data: alternative.me Fear & Greed (current + history, no key) + CoinGecko `/coins/markets` and `/coins/categories` (no key).

## Proxy decision (per the open roadmap question — resolved: "derive a labelled proxy")

Real per-coin / per-category _sentiment_ has no free source, so we derive a **price-momentum proxy** and label it as such on the page (never presented as a social-sentiment feed):

- **Score formula (single source of truth):** `sentimentScore(changePct) = clamp(round(50 + 4 * changePct), 0, 100)`. So `0%` 24h change → `50` (Neutral), `+12.5%` → `100` (Extreme Greed), `−12.5%` → `0` (Extreme Fear). Linear, symmetric, easy to explain.
- **Per coin:** `changePct` = the coin's 24h **price** change (`change24h`, already fetched).
- **Per category:** `changePct` = the category's 24h **market-cap** change (`market_cap_change_24h` from CoinGecko `/coins/categories`). Because that is market-cap-weighted, it inherently reflects where size/volume sits — satisfying the "24h change + volume" intent without inventing a dubious direction-from-volume signal.
- **Zone + colour** mirror the design thresholds (see `sentimentZone`).
- The page carries a visible "Momentum-based proxy — not a social-sentiment feed" note next to these sections. The whole-market hero/overview use the **real** Fear & Greed index and real global stats.

**Testing note:** Repo unit-tests pure functions only (Vitest); components are verified by `corepack yarn build` + dev smoke (Phase 1/2 precedent). All new logic (mappers, proxy, zone, volatility, history selection) lands in pure functions with tests; components/route are build+smoke verified. Do not invent a component test harness.

**Conventions (repo memory):** Yarn Berry via `corepack yarn` (not on PATH). Many small, logically-scoped commits; plain sentence-style messages with **no AI-attribution / Co-Authored-By trailers**. Pre-commit Prettier hook runs — let it format, keep the tree clean.

---

## File structure

| File                                            | Responsibility                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `lib/markets/sentiment.ts` (modify)             | add `FearGreedPoint`, `mapFearGreedHistory`, `getFearGreedHistory`                              |
| `lib/markets/sentiment.test.ts` (modify)        | tests for `mapFearGreedHistory`                                                                 |
| `lib/markets/sentimentProxy.ts` (create)        | pure: `sentimentScore`, `sentimentZone`, `volatilityLabel`, `valueDaysAgo`, `coinSentimentList` |
| `lib/markets/sentimentProxy.test.ts` (create)   | tests for all of the above                                                                      |
| `lib/markets/categories.ts` (create)            | `CategorySentiment`, `mapCategories`, `getCategorySentiment`                                    |
| `lib/markets/categories.test.ts` (create)       | tests for `mapCategories`                                                                       |
| `components/Gauge.tsx` (modify)                 | add an `'xl'` size (260×140) for the hero                                                       |
| `components/Breadcrumb.tsx` (create)            | reusable breadcrumb trail                                                                       |
| `components/SentRow.tsx` (create)               | one "Sentiment by Coin" row (logo, name, bar, score, zone label)                                |
| `components/SentimentHistoryChart.tsx` (create) | `'use client'`: inline-SVG area chart + 7D/30D/90D/1Y timeframe chips                           |
| `components/Header.tsx` (modify)                | add a **Sentiment** desktop nav link                                                            |
| `data/headerNavLinks.ts` (modify)               | add **Sentiment** to the mobile nav                                                             |
| `app/sentiment/page.tsx` (create)               | the page: hero, overview strip, by-coin, by-category, guide cards, Coach                        |
| `docs/redesign-roadmap.md` (modify)             | mark Phase 3a shipped                                                                           |

---

## Task 1: Fear & Greed history feed

**Files:** modify `lib/markets/sentiment.ts`, `lib/markets/sentiment.test.ts`.

alternative.me `GET /fng/?limit=N&format=json` returns `{ data: [ {value:"64", value_classification:"Greed", timestamp:"1551157200"}, ... ] }` **newest-first**. We want chronological **ascending** points for charting.

- [ ] **Step 1: Failing test** — append to `lib/markets/sentiment.test.ts`:

```ts
import { mapFearGreed, mapFearGreedHistory } from './sentiment'

describe('mapFearGreedHistory', () => {
  it('maps and reverses to chronological ascending order', () => {
    const payload = {
      data: [
        { value: '64', value_classification: 'Greed', timestamp: '200' },
        { value: '40', value_classification: 'Fear', timestamp: '100' },
      ],
    }
    expect(mapFearGreedHistory(payload)).toEqual([
      { value: 40, timestamp: 100 },
      { value: 64, timestamp: 200 },
    ])
  })
  it('clamps values and drops non-numeric points', () => {
    const payload = {
      data: [
        { value: '150', value_classification: '', timestamp: '300' },
        { value: 'x', value_classification: '', timestamp: '250' },
      ],
    }
    expect(mapFearGreedHistory(payload)).toEqual([{ value: 100, timestamp: 300 }])
  })
  it('returns [] for malformed payloads', () => {
    // @ts-expect-error testing bad input
    expect(mapFearGreedHistory(null)).toEqual([])
    expect(mapFearGreedHistory({})).toEqual([])
  })
})
```

Make sure the existing top import line in this file becomes `import { mapFearGreed, mapFearGreedHistory } from './sentiment'` (merge — no duplicate import).

- [ ] **Step 2: Run** `corepack yarn test sentiment` → FAIL (`mapFearGreedHistory` not exported).

- [ ] **Step 3: Implement** — append to `lib/markets/sentiment.ts`:

```ts
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
```

- [ ] **Step 4: Run** `corepack yarn test sentiment` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/sentiment.ts lib/markets/sentiment.test.ts
git commit -m "Add Fear & Greed history feed"
```

---

## Task 2: Sentiment proxy + zone + volatility helpers

**Files:** create `lib/markets/sentimentProxy.ts`, `lib/markets/sentimentProxy.test.ts`.

- [ ] **Step 1: Failing test** — create `lib/markets/sentimentProxy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  sentimentScore,
  sentimentZone,
  volatilityLabel,
  valueDaysAgo,
  coinSentimentList,
} from './sentimentProxy'

describe('sentimentScore', () => {
  it('maps 0% change to neutral 50', () => {
    expect(sentimentScore(0)).toBe(50)
  })
  it('maps +12.5% to 100 and -12.5% to 0 (clamped)', () => {
    expect(sentimentScore(12.5)).toBe(100)
    expect(sentimentScore(-12.5)).toBe(0)
    expect(sentimentScore(40)).toBe(100)
    expect(sentimentScore(-40)).toBe(0)
  })
  it('rounds and handles non-finite input as neutral', () => {
    expect(sentimentScore(2.1)).toBe(58)
    // @ts-expect-error bad input
    expect(sentimentScore(undefined)).toBe(50)
  })
})

describe('sentimentZone', () => {
  it('returns the design label/colour per threshold', () => {
    expect(sentimentZone(80).label).toBe('Extreme Greed')
    expect(sentimentZone(60).label).toBe('Greed')
    expect(sentimentZone(40).label).toBe('Neutral')
    expect(sentimentZone(25).label).toBe('Fear')
    expect(sentimentZone(10).label).toBe('Extreme Fear')
    expect(sentimentZone(80).color).toBe('#7BC23A')
    expect(sentimentZone(10).color).toBe('#EB5E45')
  })
})

describe('volatilityLabel', () => {
  it('classifies by standard deviation of recent values', () => {
    expect(volatilityLabel([50, 50, 50, 50])).toBe('Low')
    expect(volatilityLabel([40, 50, 60, 50])).toBe('Medium')
    expect(volatilityLabel([10, 90, 20, 80])).toBe('High')
    expect(volatilityLabel([])).toBe('—')
  })
})

describe('valueDaysAgo', () => {
  const hist = [
    { value: 10, timestamp: 1 },
    { value: 20, timestamp: 2 },
    { value: 30, timestamp: 3 },
  ] // ascending; last = today
  it('reads back from the most recent point', () => {
    expect(valueDaysAgo(hist, 0)).toBe(30)
    expect(valueDaysAgo(hist, 1)).toBe(20)
    expect(valueDaysAgo(hist, 2)).toBe(10)
  })
  it('returns null when out of range or empty', () => {
    expect(valueDaysAgo(hist, 5)).toBeNull()
    expect(valueDaysAgo([], 0)).toBeNull()
  })
})

describe('coinSentimentList', () => {
  it('maps coins to scored rows, preserving order', () => {
    const coins = [
      { symbol: 'BTC', name: 'Bitcoin', price: 1, change24h: 5, image: '' },
      { symbol: 'ETH', name: 'Ethereum', price: 1, change24h: -2.5, image: '' },
    ]
    expect(coinSentimentList(coins, 5)).toEqual([
      { symbol: 'BTC', name: 'Bitcoin', score: 70 },
      { symbol: 'ETH', name: 'Ethereum', score: 40 },
    ])
  })
  it('respects the limit', () => {
    const coins = Array.from({ length: 12 }, (_, i) => ({
      symbol: `C${i}`,
      name: `Coin ${i}`,
      price: 1,
      change24h: 0,
      image: '',
    }))
    expect(coinSentimentList(coins, 8)).toHaveLength(8)
  })
})
```

- [ ] **Step 2: Run** `corepack yarn test sentimentProxy` → FAIL (cannot find module).

- [ ] **Step 3: Implement** — create `lib/markets/sentimentProxy.ts`:

```ts
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
```

- [ ] **Step 4: Run** `corepack yarn test sentimentProxy` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/sentimentProxy.ts lib/markets/sentimentProxy.test.ts
git commit -m "Add documented sentiment proxy, zone, and volatility helpers"
```

---

## Task 3: Category sentiment feed

**Files:** create `lib/markets/categories.ts`, `lib/markets/categories.test.ts`.

CoinGecko `GET /api/v3/coins/categories` returns `[{ id, name, market_cap, market_cap_change_24h, ... }]` (already confirmed live).

- [ ] **Step 1: Failing test** — create `lib/markets/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapCategories } from './categories'

const sample = [
  { name: 'Smart Contract Platform', market_cap: 1_700_000_000_000, market_cap_change_24h: -6.25 },
  { name: 'Memecoins', market_cap: 90_000_000_000, market_cap_change_24h: 8 },
  { name: 'Tiny', market_cap: 1_000, market_cap_change_24h: 2 },
  { name: 'Bad', market_cap: null, market_cap_change_24h: 1 },
]

describe('mapCategories', () => {
  it('sorts by market cap desc, scores via the proxy, and limits', () => {
    expect(mapCategories(sample, 2)).toEqual([
      { name: 'Smart Contract Platform', change24h: -6.25, score: 25 },
      { name: 'Memecoins', change24h: 8, score: 82 },
    ])
  })
  it('skips entries without a finite market cap and coerces missing change to 0', () => {
    const out = mapCategories(
      [{ name: 'NoChange', market_cap: 5, market_cap_change_24h: null }],
      10
    )
    expect(out).toEqual([{ name: 'NoChange', change24h: 0, score: 50 }])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error bad input
    expect(mapCategories(null, 8)).toEqual([])
  })
})
```

(Score check: `-6.25 → round(50+4*-6.25)=25`; `8 → round(50+32)=82`.)

- [ ] **Step 2: Run** `corepack yarn test categories` → FAIL (cannot find module).

- [ ] **Step 3: Implement** — create `lib/markets/categories.ts`:

```ts
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
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/categories', {
      next: { revalidate: 600 },
      signal: controller.signal,
    })
    if (!res.ok) return []
    return mapCategories(await res.json(), limit)
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run** `corepack yarn test categories` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/categories.ts lib/markets/categories.test.ts
git commit -m "Add CoinGecko category sentiment feed"
```

---

## Task 4: Gauge `xl` size for the hero

**Files:** modify `components/Gauge.tsx`.

The current `Gauge` accepts `size: 'lg' | 'sm'` with fixed pixel dims; the SVG `viewBox` is fixed (`0 0 200 108`) so it scales cleanly to any width/height. Add an `'xl'` size for the hero (≈260×140).

- [ ] **Step 1: Widen the size union + dims** — in `components/Gauge.tsx`:

Change the prop type `size?: 'lg' | 'sm'` to `size?: 'lg' | 'sm' | 'xl'`.

Replace the `dims` line:

```tsx
const dims = size === 'lg' ? { w: 200, h: 108, needle: 92 } : { w: 160, h: 90, needle: 72 }
```

with:

```tsx
const dims =
  size === 'xl'
    ? { w: 260, h: 140, needle: 120 }
    : size === 'lg'
      ? { w: 200, h: 108, needle: 92 }
      : { w: 160, h: 90, needle: 72 }
```

And update the readout font-size ternary so `xl` is largest. Replace:

```tsx
size === 'lg' ? 'text-[38px]' : 'text-[28px]'
```

with:

```tsx
size === 'xl' ? 'text-[48px]' : size === 'lg' ? 'text-[38px]' : 'text-[28px]'
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds (existing `lg`/`sm` call sites unaffected).

- [ ] **Step 3: Commit**

```bash
git add components/Gauge.tsx
git commit -m "Add an xl Gauge size for the sentiment hero"
```

---

## Task 5: Breadcrumb component

**Files:** create `components/Breadcrumb.tsx`.

- [ ] **Step 1: Implement** — create `components/Breadcrumb.tsx`:

```tsx
import Link from './Link'

export interface Crumb {
  label: string
  href?: string
}

// Breadcrumb trail (design `.crumb`). The last item renders as plain current text.
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-ink-3 flex items-center gap-2 text-[13px] font-semibold"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-2">
            {item.href && !last ? (
              <Link href={item.href} className="hover:text-ink-2">
                {item.label}
              </Link>
            ) : (
              <span
                className={last ? 'text-ink-2' : undefined}
                aria-current={last ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!last && <span className="text-ink-3">›</span>}
          </span>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds (component is unused until Task 8 — that's fine; build won't error on an unused module).

- [ ] **Step 3: Commit**

```bash
git add components/Breadcrumb.tsx
git commit -m "Add a reusable Breadcrumb component"
```

---

## Task 6: SentRow component (Sentiment by Coin)

**Files:** create `components/SentRow.tsx`.

Mirrors the design `SentRow`: logo, name+ticker, a coloured horizontal bar, the score, and the zone label.

- [ ] **Step 1: Implement** — create `components/SentRow.tsx`:

```tsx
import CoinLogo from './CoinLogo'
import { sentimentZone } from '@/lib/markets/sentimentProxy'

export default function SentRow({
  symbol,
  name,
  score,
}: {
  symbol: string
  name: string
  score: number
}) {
  const { label, color } = sentimentZone(score)
  return (
    <div className="border-line-2 flex items-center gap-3.5 border-b py-3 last:border-b-0">
      <CoinLogo sym={symbol} size={26} />
      <div className="w-[120px] min-w-0">
        <div className="truncate text-sm font-bold text-gray-100">{name}</div>
        <div className="text-ink-3 text-[11.5px] font-semibold">{symbol}</div>
      </div>
      <div className="bg-fill h-[7px] flex-1 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <div className="w-[42px] text-right text-[15px] font-extrabold" style={{ color }}>
        {score}
      </div>
      <div className="text-ink-2 hidden w-[104px] text-right text-[12.5px] font-bold sm:block">
        {label}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/SentRow.tsx
git commit -m "Add SentRow for the Sentiment by Coin list"
```

---

## Task 7: SentimentHistoryChart (client) + timeframe chips

**Files:** create `components/SentimentHistoryChart.tsx`.

Receives the **full** ascending history (up to 1 year) and slices locally on chip change — no client fetching. Draws an inline-SVG area + line scaled to the 0–100 range.

- [ ] **Step 1: Implement** — create `components/SentimentHistoryChart.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { FearGreedPoint } from '@/lib/markets/sentiment'

const FRAMES: { id: string; days: number }[] = [
  { id: '7D', days: 7 },
  { id: '30D', days: 30 },
  { id: '90D', days: 90 },
  { id: '1Y', days: 365 },
]

const W = 760
const H = 220

export default function SentimentHistoryChart({ data }: { data: FearGreedPoint[] }) {
  const [frame, setFrame] = useState('30D')
  const days = FRAMES.find((f) => f.id === frame)?.days ?? 30
  const series = data.slice(-days)

  const chipBase = 'rounded-md px-2.5 py-1 text-[12px] font-bold'
  return (
    <div className="bg-surface border-line flex flex-col rounded-[10px] border p-5">
      <div className="mb-3 flex items-center">
        <div className="text-base font-extrabold text-gray-50">Fear &amp; Greed History</div>
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Chart timeframe">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={frame === f.id}
              onClick={() => setFrame(f.id)}
              className={
                frame === f.id
                  ? `${chipBase} bg-fill text-gray-50`
                  : `${chipBase} text-ink-3 hover:text-ink-2`
              }
            >
              {f.id}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[200px] flex-1">
        {series.length < 2 ? (
          <p className="text-ink-3 py-16 text-center text-sm">History unavailable.</p>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0"
            aria-hidden="true"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
              <line key={g} x1="0" y1={g * H} x2={W} y2={g * H} stroke="#1B232F" strokeWidth="1" />
            ))}
            {(() => {
              const step = W / (series.length - 1)
              const pts = series.map(
                (p, i) => `${(i * step).toFixed(1)},${(H - (p.value / 100) * H).toFixed(1)}`
              )
              const line = pts.join(' ')
              const area = `${pts.join(' ')} ${W},${H} 0,${H}`
              return (
                <>
                  <polygon fill="rgba(242,160,36,.09)" points={area} />
                  <polyline fill="none" stroke="#F2A024" strokeWidth="2.5" points={line} />
                </>
              )
            })()}
          </svg>
        )}
      </div>

      <div className="text-ink-3 mt-2.5 flex justify-between text-[11.5px] font-semibold">
        <span>{days >= 365 ? '1y ago' : `${days}d ago`}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/SentimentHistoryChart.tsx
git commit -m "Add the Fear & Greed history chart with timeframe chips"
```

---

## Task 8: The /sentiment page

**Files:** create `app/sentiment/page.tsx`.

Assembles everything. Server component; one parallel fetch; graceful fallbacks. Pulls up to 3 real guide posts for the "What does this mean?" cards (falls back to a single /guides link if none).

- [ ] **Step 1: Implement** — create `app/sentiment/page.tsx`:

```tsx
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import Breadcrumb from '@/components/Breadcrumb'
import Gauge from '@/components/Gauge'
import StatCard from '@/components/StatCard'
import SectionHeading from '@/components/SectionHeading'
import SentRow from '@/components/SentRow'
import SentimentHistoryChart from '@/components/SentimentHistoryChart'
import CoachStrip from '@/components/CoachStrip'
import Link from '@/components/Link'
import { getFearGreed, getFearGreedHistory } from '@/lib/markets/sentiment'
import { getGlobalStats } from '@/lib/markets/global'
import { getTopCoins } from '@/lib/markets/coingecko'
import { getCategorySentiment } from '@/lib/markets/categories'
import {
  coinSentimentList,
  sentimentZone,
  volatilityLabel,
  valueDaysAgo,
} from '@/lib/markets/sentimentProxy'
import { filterByType } from '@/lib/sections'

export const metadata = genPageMetadata({
  title: 'Crypto Market Sentiment',
  description:
    'The Fear & Greed index plus a momentum read across the top coins and categories — so you can gauge the market mood before you act.',
  alternates: { canonical: '/sentiment' },
})

const dash = '—'

export default async function SentimentPage() {
  const [fng, history, stats, coins, cats] = await Promise.all([
    getFearGreed(),
    getFearGreedHistory(365),
    getGlobalStats(),
    getTopCoins(),
    getCategorySentiment(8),
  ])

  const coinRows = coinSentimentList(coins, 8)
  const yesterday = valueDaysAgo(history, 1)
  const lastWeek = valueDaysAgo(history, 7)
  const volatility = volatilityLabel(history.slice(-30).map((p) => p.value))
  const fmtStat = (v: number | null) => (v === null ? dash : `${v} · ${sentimentZone(v).label}`)

  const guides = filterByType(allCoreContent(sortPosts(allBlogs)), 'guide').slice(0, 3)

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Market Sentiment' }]} />

      {/* TITLE */}
      <div className="mt-5">
        <span className="text-accent text-[11px] font-extrabold tracking-[0.14em] uppercase">
          Live Market Mood
        </span>
        <h1 className="mt-2 text-[34px] font-black tracking-tight text-gray-50">
          Crypto Market Sentiment
        </h1>
        <p className="text-ink-2 mt-1.5 max-w-[640px] text-sm font-medium">
          The Fear &amp; Greed index, updated hourly — with a momentum read across the top coins and
          categories so you can read the room before you act.
        </p>
      </div>

      {/* HERO: gauge + history */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="bg-surface border-line flex flex-col items-center justify-center rounded-[10px] border p-6">
          <div className="mb-1.5 self-start text-[15px] font-extrabold text-gray-50">Today</div>
          <Gauge value={fng?.value ?? 50} label={fng?.label ?? 'Neutral'} size="xl" />
          <div className="text-ink-3 mt-4 flex gap-4 text-xs font-bold">
            <span className="text-down">0 Fear</span>
            <span>·</span>
            <span className="text-amber">50 Neutral</span>
            <span>·</span>
            <span className="text-up">100 Greed</span>
          </div>
        </div>
        <SentimentHistoryChart data={history} />
      </div>

      {/* OVERVIEW STRIP */}
      <div className="bg-surface border-line mt-5 grid grid-cols-2 overflow-hidden rounded-[10px] border md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Sentiment" value={fng ? fmtStat(fng.value) : dash} />
        <StatCard label="Yesterday" value={fmtStat(yesterday)} />
        <StatCard label="Last Week" value={fmtStat(lastWeek)} />
        <StatCard label="Volatility" value={volatility} />
        <StatCard
          label="BTC Dominance"
          value={stats ? `${stats.btcDominance.toFixed(1)}%` : dash}
        />
      </div>

      {/* PROXY DISCLOSURE */}
      <p className="text-ink-3 mt-4 text-[12px]">
        Per-coin and per-category readings are a momentum proxy derived from 24h price/market-cap
        change — not a social-sentiment feed.
      </p>

      {/* BY COIN + BY CATEGORY */}
      <div className="mt-3 grid gap-7 lg:grid-cols-2">
        <div>
          <SectionHeading title="Sentiment by Coin" />
          <div className="bg-surface border-line rounded-[10px] border px-[18px] py-1">
            {coinRows.length === 0 ? (
              <p className="text-ink-2 py-4 text-sm">Market data unavailable.</p>
            ) : (
              coinRows.map((c) => (
                <SentRow key={c.symbol} symbol={c.symbol} name={c.name} score={c.score} />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionHeading title="Sentiment by Category" barColor="var(--color-blue)" />
          {cats.length === 0 ? (
            <div className="bg-surface border-line rounded-[10px] border p-4">
              <p className="text-ink-2 text-sm">Category data unavailable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {cats.map((cat) => {
                const { color } = sentimentZone(cat.score)
                return (
                  <div key={cat.name} className="bg-surface border-line rounded-[10px] border p-4">
                    <div className="mb-3 flex items-center">
                      <span className="truncate text-sm font-extrabold text-gray-100">
                        {cat.name}
                      </span>
                      <span className="ml-auto text-lg font-black" style={{ color }}>
                        {cat.score}
                      </span>
                    </div>
                    <div className="bg-fill h-[7px] overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${cat.score}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* WHAT THIS MEANS */}
      {guides.length > 0 && (
        <div className="mt-8">
          <SectionHeading title="What does this mean?" barColor="var(--color-green)" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <Link
                key={g.slug}
                href={`/blog/${g.slug}`}
                className="bg-surface border-line hover:border-ink-3 block rounded-[10px] border p-5 transition-colors"
              >
                <span className="bg-guide rounded-full px-2.5 py-1 text-[11px] font-bold text-[#06210f]">
                  Guide
                </span>
                <div className="mt-3 text-base font-extrabold tracking-tight text-gray-50">
                  {g.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* COACH */}
      <div className="mt-8">
        <CoachStrip />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build + format**

Run: `corepack yarn prettier --write app/sentiment/page.tsx && corepack yarn build`
Expected: build succeeds; `/sentiment` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add app/sentiment/page.tsx
git commit -m "Add the Market Sentiment page"
```

---

## Task 9: Add the Sentiment nav item

**Files:** modify `components/Header.tsx`, `data/headerNavLinks.ts`.

- [ ] **Step 1: Desktop nav** — in `components/Header.tsx`, inside the `<nav>` block, after the `{SECTIONS.map(...)}` expression and before `</nav>`, add a Sentiment link matching the existing link styling:

```tsx
<Link
  href="/sentiment"
  className="text-[15px] font-semibold text-gray-300 transition-colors hover:text-white"
>
  Sentiment
</Link>
```

- [ ] **Step 2: Mobile nav** — in `data/headerNavLinks.ts`, add `{ href: '/sentiment', title: 'Sentiment' }` after the Reviews entry:

```ts
const headerNavLinks = [
  { href: '/', title: 'Home' },
  { href: '/news', title: 'News' },
  { href: '/guides', title: 'Guides' },
  { href: '/breakdowns', title: 'Breakdowns' },
  { href: '/reviews', title: 'Reviews' },
  { href: '/sentiment', title: 'Sentiment' },
  { href: '/tags', title: 'Tags' },
  { href: '/about', title: 'About' },
]

export default headerNavLinks
```

- [ ] **Step 3: Verify** `corepack yarn build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/Header.tsx data/headerNavLinks.ts
git commit -m "Add Sentiment to the header and mobile nav"
```

---

## Task 10: Phase 3a verification + roadmap

- [ ] **Step 1: Full test suite**

Run: `corepack yarn test`
Expected: all suites pass — existing 34 plus the new sentiment-history, sentimentProxy, and categories tests.

- [ ] **Step 2: Build + dev smoke**

Run: `corepack yarn build`, then `corepack yarn dev` and load `/sentiment` (read the dev port from the log — 3000 may be taken). Confirm:

- The hero gauge shows the live Fear & Greed value/label; the history chart draws a line and the 7D/30D/90D/1Y chips re-slice it.
- The overview strip shows Sentiment / Yesterday / Last Week / Volatility / BTC Dominance with real values (or `—` where history is short).
- "Sentiment by Coin" lists the top coins with coloured bars/scores; "Sentiment by Category" shows category cards; the proxy disclosure line is visible.
- The header shows a working **Sentiment** link.
- With the network blocked, the page still renders: gauge falls back to 50/Neutral, chart shows "History unavailable.", and the by-coin/by-category sections show their unavailable messages.

- [ ] **Step 3: Update the roadmap** — in `docs/redesign-roadmap.md`, flip the Phase 3a section / row to shipped (live whole-market F&G + history; per-coin/category = documented momentum proxy), and note the new `/sentiment` route + Sentiment nav item. Mark the Phase 1 "Per-coin & per-category sentiment" row as resolved via the proxy.

```bash
git add docs/redesign-roadmap.md
git commit -m "Mark Phase 3a Market Sentiment page as shipped"
```

---

## Self-review notes

- **Spec coverage:** Matches `page-sentiment.jsx` — breadcrumb, title block, hero (xl gauge + legend, history chart + chips), 5-cell overview strip, Sentiment by Coin (`SentRow`), Sentiment by Category cards, "What does this mean?" guide cards, CoachStrip. Per-coin/category use the labelled momentum proxy (resolved open decision); whole-market uses real F&G + global stats.
- **Type consistency:** `FearGreedPoint` (Task 1) is consumed by `valueDaysAgo`/the chart; `Coin` fields (`symbol`/`name`/`change24h`) feed `coinSentimentList`; `sentimentScore` is the single scorer used by both `coinSentimentList` and `mapCategories`; `CategorySentiment`/`CoinSentiment` shapes match their consumers in the page.
- **No client fetching:** the only client component (`SentimentHistoryChart`) receives the full series as props and slices locally; everything else is server-fetched. CSP `connect-src 'self'` holds.
- **Graceful degradation:** every feed returns null/[] on failure and every consumer renders a fallback (`—`, "unavailable", "History unavailable.").
- **No new test harness:** all new pure logic is unit-tested; components/route are build + dev-smoke verified, per the established pattern.
