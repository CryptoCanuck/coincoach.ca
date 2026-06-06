# CoinCoach Direction B Build-out — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the shipped Direction B homepage to real market data, then build out the remaining redesign pages, ending with the AI Coach.

**Architecture:** Extend the existing server-side `lib/markets/` data layer (ISR-cached `fetch`, pure mappers unit-tested with Vitest, `try/catch` → safe empty/null fallback). Async server components fetch their own data and degrade gracefully. No client-side market fetching, so the `connect-src 'self'` CSP is unaffected.

**Tech Stack:** Next 15 App Router (RSC), TypeScript, Tailwind v4, Vitest. Data: CoinGecko public API (no key) + alternative.me Fear & Greed (no key).

**Scope note (per writing-plans scope check):** the full roadmap (`docs/redesign-roadmap.md`) spans several independent subsystems. This document details **Phase 1 (market data layer + homepage wire-up)** to executable, no-placeholder granularity. Phases 2–5 are specified at program level in [The Rest, Sequenced](#the-rest-sequenced) and each gets its own dated plan when started. AI Coach (Phase 5) is intentionally last — it needs LLM access/credentials set up first.

---

## Phase 1 — Market data layer + homepage wire-up

This phase replaces the three homepage placeholders (Market Pulse stats, the Gauge value, and Movers) with live data. It is self-contained, testable, and shippable.

### File structure

| File                                     | Responsibility                                                       |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `lib/markets/format.ts` (modify)         | add `formatCompactUsd` (e.g. `$2.41T`)                               |
| `lib/markets/format.test.ts` (modify)    | tests for `formatCompactUsd`                                         |
| `lib/markets/global.ts` (create)         | `GlobalStats` type, `mapGlobal`, `getGlobalStats`                    |
| `lib/markets/global.test.ts` (create)    | tests for `mapGlobal`                                                |
| `lib/markets/sentiment.ts` (create)      | `FearGreed` type, `mapFearGreed`, `getFearGreed`                     |
| `lib/markets/sentiment.test.ts` (create) | tests for `mapFearGreed`                                             |
| `lib/markets/coingecko.ts` (modify)      | refactor to `fetchMarkets(perPage)`, add `splitMovers` + `getMovers` |
| `lib/markets/coingecko.test.ts` (modify) | tests for `splitMovers`                                              |
| `components/MarketPulse.tsx` (create)    | async band: Gauge (live F&G) + 4 StatCards (live global stats)       |
| `components/Movers.tsx` (modify)         | use `getMovers()`                                                    |
| `app/Main.tsx` (modify)                  | render `<MarketPulse />`, drop the static band                       |

---

### Task 1: Compact USD formatter

**Files:**

- Modify: `lib/markets/format.ts`
- Test: `lib/markets/format.test.ts`

- [ ] **Step 1: Write the failing test** — append to `lib/markets/format.test.ts`:

```ts
import { formatUsd, formatPercent, changeDirection, formatCompactUsd } from './format'

describe('formatCompactUsd', () => {
  it('formats trillions with up to 2 decimals', () => {
    expect(formatCompactUsd(2_410_000_000_000)).toBe('$2.41T')
  })
  it('formats billions', () => {
    expect(formatCompactUsd(96_200_000_000)).toBe('$96.2B')
  })
  it('formats millions', () => {
    expect(formatCompactUsd(1_200_000)).toBe('$1.2M')
  })
  it('handles zero', () => {
    expect(formatCompactUsd(0)).toBe('$0')
  })
})
```

Note: leave the existing top `import` line as-is and instead update it to include `formatCompactUsd` (don't create a duplicate `import` — merge the new symbol into the existing import at line 2).

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test format`
Expected: FAIL — `formatCompactUsd is not a function`.

- [ ] **Step 3: Implement** — append to `lib/markets/format.ts`:

```ts
export function formatCompactUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn test format`
Expected: PASS (all `format` tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/markets/format.ts lib/markets/format.test.ts
git commit -m "Add compact USD formatter for market stats"
```

---

### Task 2: Global market stats

**Files:**

- Create: `lib/markets/global.ts`
- Test: `lib/markets/global.test.ts`

CoinGecko `GET /api/v3/global` returns `{ data: { active_cryptocurrencies, total_market_cap: { usd }, total_volume: { usd }, market_cap_percentage: { btc }, market_cap_change_percentage_24h_usd } }`.

- [ ] **Step 1: Write the failing test** — create `lib/markets/global.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapGlobal } from './global'

const sample = {
  data: {
    active_cryptocurrencies: 11842,
    total_market_cap: { usd: 2_410_000_000_000, eur: 0 },
    total_volume: { usd: 96_200_000_000, eur: 0 },
    market_cap_percentage: { btc: 54.3, eth: 17.1 },
    market_cap_change_percentage_24h_usd: 1.8,
  },
}

describe('mapGlobal', () => {
  it('maps the CoinGecko global payload to GlobalStats', () => {
    expect(mapGlobal(sample)).toEqual({
      totalMarketCap: 2_410_000_000_000,
      totalVolume: 96_200_000_000,
      btcDominance: 54.3,
      activeCoins: 11842,
      marketCapChange24h: 1.8,
    })
  })
  it('returns null for a malformed payload', () => {
    // @ts-expect-error testing bad input
    expect(mapGlobal(null)).toBeNull()
    // @ts-expect-error testing bad input
    expect(mapGlobal({})).toBeNull()
  })
  it('coerces missing numeric fields to 0', () => {
    const result = mapGlobal({
      data: { market_cap_percentage: {}, total_market_cap: {}, total_volume: {} },
    })
    expect(result).toEqual({
      totalMarketCap: 0,
      totalVolume: 0,
      btcDominance: 0,
      activeCoins: 0,
      marketCapChange24h: 0,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test global`
Expected: FAIL — cannot find module `./global`.

- [ ] **Step 3: Implement** — create `lib/markets/global.ts`:

```ts
export interface GlobalStats {
  totalMarketCap: number
  totalVolume: number
  btcDominance: number
  activeCoins: number
  marketCapChange24h: number
}

interface CoinGeckoGlobal {
  data?: {
    active_cryptocurrencies?: number
    total_market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    market_cap_percentage?: { btc?: number }
    market_cap_change_percentage_24h_usd?: number
  }
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

export function mapGlobal(payload: CoinGeckoGlobal): GlobalStats | null {
  const d = payload?.data
  if (!d || typeof d !== 'object') return null
  return {
    totalMarketCap: num(d.total_market_cap?.usd),
    totalVolume: num(d.total_volume?.usd),
    btcDominance: num(d.market_cap_percentage?.btc),
    activeCoins: num(d.active_cryptocurrencies),
    marketCapChange24h: num(d.market_cap_change_percentage_24h_usd),
  }
}

// Server-side, ISR-cached (5 min). Returns null on any failure so the UI degrades.
export async function getGlobalStats(): Promise<GlobalStats | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      next: { revalidate: 300 },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return mapGlobal(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn test global`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/global.ts lib/markets/global.test.ts
git commit -m "Add CoinGecko global market stats feed"
```

---

### Task 3: Fear & Greed index

**Files:**

- Create: `lib/markets/sentiment.ts`
- Test: `lib/markets/sentiment.test.ts`

alternative.me `GET https://api.alternative.me/fng/?limit=1` returns `{ data: [ { value: "64", value_classification: "Greed", timestamp: "1551157200" } ] }` (index 0 = latest; `value` is a string).

- [ ] **Step 1: Write the failing test** — create `lib/markets/sentiment.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapFearGreed } from './sentiment'

describe('mapFearGreed', () => {
  it('maps the latest data point to a FearGreed value', () => {
    const sample = {
      data: [
        { value: '64', value_classification: 'Greed', timestamp: '1551157200' },
        { value: '40', value_classification: 'Fear', timestamp: '1551070800' },
      ],
    }
    expect(mapFearGreed(sample)).toEqual({ value: 64, label: 'Greed' })
  })
  it('returns null when there is no data', () => {
    // @ts-expect-error testing bad input
    expect(mapFearGreed(null)).toBeNull()
    expect(mapFearGreed({ data: [] })).toBeNull()
  })
  it('clamps the value to 0–100 and defaults a missing label', () => {
    expect(mapFearGreed({ data: [{ value: '150', value_classification: '' }] })).toEqual({
      value: 100,
      label: 'Neutral',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test sentiment`
Expected: FAIL — cannot find module `./sentiment`.

- [ ] **Step 3: Implement** — create `lib/markets/sentiment.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn test sentiment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/sentiment.ts lib/markets/sentiment.test.ts
git commit -m "Add Fear & Greed index feed"
```

---

### Task 4: Market movers

**Files:**

- Modify: `lib/markets/coingecko.ts`
- Test: `lib/markets/coingecko.test.ts`

Refactor the fixed `ENDPOINT` into a `fetchMarkets(perPage)` helper, then add `splitMovers` (pure) and `getMovers` (fetches the top 100 by market cap and sorts by 24h change — a documented "biggest movers among the top 100" proxy; CoinGecko's free tier can't order by price change directly).

- [ ] **Step 1: Write the failing test** — append to `lib/markets/coingecko.test.ts`:

```ts
import { mapCoins, splitMovers } from './coingecko'

describe('splitMovers', () => {
  const coins = [
    { symbol: 'A', name: 'A', price: 1, change24h: 5, image: '' },
    { symbol: 'B', name: 'B', price: 1, change24h: -8, image: '' },
    { symbol: 'C', name: 'C', price: 1, change24h: 2, image: '' },
    { symbol: 'D', name: 'D', price: 1, change24h: -3, image: '' },
  ]
  it('returns the top-n gainers (desc) and losers (most negative first)', () => {
    const { gainers, losers } = splitMovers(coins, 2)
    expect(gainers.map((c) => c.symbol)).toEqual(['A', 'C'])
    expect(losers.map((c) => c.symbol)).toEqual(['B', 'D'])
  })
  it('does not mutate the input array', () => {
    const before = coins.map((c) => c.symbol)
    splitMovers(coins, 2)
    expect(coins.map((c) => c.symbol)).toEqual(before)
  })
})
```

Update the existing top import line to `import { mapCoins, splitMovers } from './coingecko'` (merge — do not add a second import).

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack yarn test coingecko`
Expected: FAIL — `splitMovers is not a function`.

- [ ] **Step 3: Implement** — replace the body of `lib/markets/coingecko.ts` below the `mapCoins` function (keep the `Coin` interface, `CoinGeckoMarket` interface, and `mapCoins` exactly as they are; replace the `ENDPOINT` const and `getTopCoins` with this):

```ts
function marketsUrl(perPage: number): string {
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&price_change_percentage=24h`
}

async function fetchMarkets(perPage: number): Promise<Coin[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(marketsUrl(perPage), {
      next: { revalidate: 60 },
      signal: controller.signal,
    })
    if (!res.ok) return []
    return mapCoins(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export function splitMovers(coins: Coin[], n = 4): { gainers: Coin[]; losers: Coin[] } {
  const sorted = [...coins].sort((a, b) => b.change24h - a.change24h)
  return { gainers: sorted.slice(0, n), losers: sorted.slice(-n).reverse() }
}

// One fetch serves the ticker, the homepage table and the rail. ISR-cached.
export async function getTopCoins(): Promise<Coin[]> {
  return fetchMarkets(10)
}

// Biggest movers among the top 100 by market cap.
export async function getMovers(): Promise<{ gainers: Coin[]; losers: Coin[] }> {
  return splitMovers(await fetchMarkets(100))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack yarn test coingecko`
Expected: PASS (existing `mapCoins` tests still green).

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coingecko.ts lib/markets/coingecko.test.ts
git commit -m "Add market movers helper and refactor markets fetch"
```

---

### Task 5: MarketPulse component (live band)

**Files:**

- Create: `components/MarketPulse.tsx`
- Modify: `app/Main.tsx`

- [ ] **Step 1: Create the component** — `components/MarketPulse.tsx`:

```tsx
import Gauge from './Gauge'
import StatCard from './StatCard'
import { getGlobalStats } from '@/lib/markets/global'
import { getFearGreed } from '@/lib/markets/sentiment'
import { formatCompactUsd, formatPercent } from '@/lib/markets/format'

export default async function MarketPulse() {
  const [stats, fng] = await Promise.all([getGlobalStats(), getFearGreed()])
  const dash = '—'
  return (
    <div className="bg-surface border-line grid overflow-hidden rounded-[10px] border md:grid-cols-[260px_1fr]">
      <div className="bg-fill-2 border-line border-b px-5 py-4 md:border-r md:border-b-0">
        <div className="mb-1 text-[15px] font-extrabold text-gray-50">Market Sentiment</div>
        <Gauge value={fng?.value ?? 50} label={fng?.label ?? 'Neutral'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Market Cap"
          value={stats ? formatCompactUsd(stats.totalMarketCap) : dash}
          sub={stats ? `${formatPercent(stats.marketCapChange24h)} (24h)` : undefined}
          up={(stats?.marketCapChange24h ?? 0) >= 0}
        />
        <StatCard label="24h Volume" value={stats ? formatCompactUsd(stats.totalVolume) : dash} />
        <StatCard
          label="BTC Dominance"
          value={stats ? `${stats.btcDominance.toFixed(1)}%` : dash}
        />
        <StatCard
          label="Active Coins"
          value={stats ? stats.activeCoins.toLocaleString('en-US') : dash}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the homepage** — in `app/Main.tsx`:

Remove the `Gauge` and `StatCard` imports (now used only inside `MarketPulse`), add `import MarketPulse from '@/components/MarketPulse'`, and replace the entire `{/* MARKET PULSE */}` `<section>` block with:

```tsx
{
  /* MARKET PULSE */
}
;<section>
  <MarketPulse />
</section>
```

- [ ] **Step 3: Verify build + format**

Run: `corepack yarn prettier --write components/MarketPulse.tsx app/Main.tsx && corepack yarn build`
Expected: build succeeds; no unused-import lint errors (confirm `Gauge`/`StatCard` were removed from `app/Main.tsx`).

- [ ] **Step 4: Commit**

```bash
git add components/MarketPulse.tsx app/Main.tsx
git commit -m "Wire homepage Market Pulse band to live global + sentiment data"
```

---

### Task 6: Movers → live data

**Files:**

- Modify: `components/Movers.tsx`

- [ ] **Step 1: Switch to `getMovers`** — replace the body of `components/Movers.tsx`:

```tsx
import { getMovers } from '@/lib/markets/coingecko'
import { formatPercent } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

// Gainers among the top-100 by market cap. The Gainers/Losers tab toggle is Phase 2.
export default async function Movers() {
  const { gainers } = await getMovers()

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line flex gap-4 border-b px-4 pt-3">
        <span className="border-accent border-b-2 pb-2.5 text-sm font-extrabold text-gray-50">
          Gainers
        </span>
        <span className="text-ink-3 pb-2.5 text-sm font-bold">Losers</span>
      </div>
      {gainers.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1.5">
          {gainers.map((c) => (
            <div key={`${c.symbol}-${c.name}`} className="flex items-center gap-2.5 px-4 py-2">
              <CoinLogo sym={c.symbol} size={20} />
              <span className="text-[13.5px] font-bold text-gray-100">{c.symbol}</span>
              <span
                className={`ml-auto text-[13.5px] font-bold ${
                  c.change24h < 0 ? 'text-down' : 'text-up'
                }`}
              >
                {formatPercent(c.change24h)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `corepack yarn build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/Movers.tsx
git commit -m "Feed Movers panel from live top-100 movers"
```

---

### Task 7: Phase 1 verification

- [ ] **Step 1: Full test suite**

Run: `corepack yarn test`
Expected: all suites pass (format, global, sentiment, coingecko, sections, structuredData).

- [ ] **Step 2: Build + smoke**

Run: `corepack yarn build`, then `corepack yarn dev` and load `/` (note the dev port from the log — port 3000 is taken by another app on this machine). Confirm the Market Pulse band shows a real gauge value, real market cap/volume/dominance/active-coin numbers, and the Movers panel lists real gainers. With the network blocked, confirm the band falls back to `—` and the page still renders.

- [ ] **Step 3: Update the roadmap** — in `docs/redesign-roadmap.md`, flip the Phase 0 rows for Market Pulse, Gauge, and Movers from 🟡 to ✅, and mark the Phase 1 global-stats / Fear & Greed / movers rows done.

```bash
git add docs/redesign-roadmap.md
git commit -m "Mark Phase 1 market data as shipped in the roadmap"
```

---

## The Rest, Sequenced

Each subsystem below becomes its own `docs/superpowers/plans/YYYY-MM-DD-*.md` (written with this same skill) when we start it. Order reflects dependencies and value. **The AI Coach is deliberately last** — it requires LLM access/credentials and a server route that don't exist yet.

### Phase 2 — Interactive polish (small, do alongside)

- **Movers tab toggle:** split `Movers` into a server fetch + a `'use client'` `MoversTabs` holding `gainers`/`losers`; tab state toggles the list. _Deliverable:_ working Gainers/Losers switch.
- **Ticker marquee:** CSS keyframe scroll on the ticker track, `pause on hover`; respect `prefers-reduced-motion`. _Deliverable:_ auto-scrolling ticker.
- **Watchlist + Converter:** ship with their host pages (Coin Detail), not before.

### Phase 3a — Market Sentiment page `/sentiment` (signature page) — **do first after Phase 1**

- **Data:** add `getFearGreedHistory(limit)` to `sentiment.ts` (alternative.me `?limit=N`, map to `{ value, timestamp }[]`, unit-tested). Per-coin/per-category sentiment has no free source — **decision required at plan time:** derive a documented proxy from 24h change + volume, or defer those two sections to a later feed. Pick before writing the plan.
- **Route:** `app/sentiment/page.tsx` + section metadata.
- **Components:** `Breadcrumb`, `SentimentHistoryChart` (inline SVG polyline/area like the mock, fed by history + `TimeframeChips`), `StatStrip` (reuse `statgrid` styling), `SentRow` + sentiment bar, category cards. Reuse `Gauge` (big size) and `CoachStrip`.
- **Nav:** add **Sentiment** to the header nav.
- _Deliverable:_ a live whole-market sentiment page; per-coin/category sections either live (proxy) or clearly-labelled "coming soon".

### Phase 3b — Coin Detail `/charts` + `/charts/[coin]`

- **Data:** `getCoin(id)` (CoinGecko `/coins/{id}` → stats, supply, ATH/ATL, links) and `getMarketChart(id, days)` (`/coins/{id}/market_chart`) — both mapped + unit-tested; **decision at plan time:** routing key (CoinGecko id vs. symbol) and chart approach (inline SVG vs. a lib like `lightweight-charts`).
- **Components:** coin header, price chart + `TimeframeChips`, `KeyStats` statgrid, About + resource chips, right rail (per-coin `Gauge`, `Converter` [client], Similar Coins `CoinTable`, latest coin-tagged news).
- **Nav:** add **Charts**; `/charts` index lists coins linking to detail.
- _Deliverable:_ per-coin pages with live stats + chart; Watchlist + Converter interactivity.

### Phase 4 — Article page `layouts/PostLayout.tsx`

- **Frontmatter:** add optional `coins: [btc, eth]` (drives the inline coin card + "Coins in this story" rail); document in `docs/frontmatter-templates.md`.
- **Layout:** breadcrumb, category tag, big H1, standfirst, byline (avatar + role + share), hero + caption, restyled MDX prose (pull-quote, inline coin card, figures; update `css/prism.css`), tags, author bio (from `data/authors/`), Related Stories grid.
- **Sidebar:** `Gauge`, "Coins in this story" `CoinTable`, an "Ask the Coach" box (static until Phase 5), Trending (recent/featured).
- _Deliverable:_ article pages matching `Article.html`.

### Phase 5 — AI Coach (LAST — needs LLM access set up first)

- **Prereqs (not code):** choose model + obtain API access/credentials (Anthropic API key in server env), decide hosting/rate-limit/cost guardrails. **Read the `claude-api` skill before planning.**
- **Backend:** a server route (`app/api/coach/route.ts`) calling the Claude API (latest model, e.g. `claude-opus-4-8`, or a Sonnet tier for cost), streaming responses, grounded in live prices/sentiment + retrieval over `data/blog` guides. "Not financial advice" guardrail in the system prompt.
- **UX:** modal or `/coach` view; wire the header CTA, `CoachStrip` input + chips, and the article "Type your question…" box; conversation state.
- _Deliverable:_ a working grounded assistant.

---

## Self-review notes

- **Spec coverage:** Phase 1 covers the three live placeholders called out in the roadmap (Market Pulse stats, Gauge, Movers). Phases 2–5 map 1:1 to roadmap Phases 2–5.
- **Type consistency:** `GlobalStats`, `FearGreed`, and `Coin` field names used in Task 5/6 match their definitions in Tasks 2/3/4 (`totalMarketCap`, `marketCapChange24h`, `value`, `label`, `change24h`, `symbol`).
- **No new test harness invented:** pure functions are unit-tested (matching the repo); components are verified via `build` + dev smoke, consistent with the existing codebase (no RTL/component tests present).
