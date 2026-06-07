# Unit A — Markets Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the existing `/charts` index into a full Markets hub — a sortable coin table with Top / Gainers / Losers / Volume tabs, client-side search, 24h & 7d change, market cap, volume, and a 7-day sparkline — and remove the leftover starter `/projects` page.

**Architecture:** A new richer market dataset (`MarketCoin`) is fetched **server-side** (CoinGecko `/coins/markets` with `sparkline=true&price_change_percentage=24h,7d`) once per request (ISR-cached) and passed to a client `MarketsTable` that sorts/filters the SAME dataset locally — no client fetching, so CSP `connect-src 'self'` stays intact. Coin rows continue to link to the existing `/charts/[coin]` detail page (unchanged).

**Tech Stack:** Next.js 15 App Router (RSC + one client leaf), TypeScript, Tailwind v4, Vitest (pure-function tests). CoinGecko public markets endpoint, server-side.

---

## Background the implementer needs

- **Yarn is Berry via corepack.** `yarn` is NOT on PATH. Always `corepack yarn <cmd>`.
- **Authoritative checks:** `corepack yarn tsc --noEmit`, `corepack yarn vitest run`, `corepack yarn build`. Trust these over IDE/LSP diagnostics (often stale on new files).
- **Pre-commit Prettier hook + build ESLint** enforce: 2-space indent, NO semicolons, single quotes. `prettier-plugin-tailwindcss` reorders classNames — let it.
- **Commits:** author solely as the user — NO `Co-Authored-By`/AI-attribution trailer. One commit per task.
- **Palette/utility aliases already in the repo:** `bg-paper`, `bg-surface`, `bg-header`, `border-line`, `border-line-2`, `bg-fill`, `bg-fill-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-accent`, `bg-accent`, `text-up`, `text-down`, `text-gray-50`, `text-gray-100`. Reuse the SAME classes the existing components use (see `components/CoinTable.tsx`, `components/MoversTabs.tsx`).
- **Existing data layer** (`lib/markets/coingecko.ts`): `Coin` type, `mapCoins` (drops empty-id rows), `getTopCoins`, `getMovers`, `getMarketsByIds`, `pickCoin`, `marketsByIdsUrl`. The existing `fetchMarkets`/`marketsUrl` use the AbortController + `next:{revalidate}` + try/catch/finally pattern — copy it.
- **Format helpers** (`lib/markets/format.ts`): `formatUsd`, `formatCompactUsd`, `formatPercent`, `changeDirection` (`'up'|'down'|'flat'`).
- **Existing components to reuse:** `components/CoinLogo.tsx` (`CoinLogo({ sym, size })`), `components/Link.tsx`, `components/Breadcrumb.tsx` (`Breadcrumb({ items: { label, href? }[] })`).
- **Detail route stays `/charts/[coin]`** — rows link there. We are only changing the `/charts` INDEX page.
- **CoinGecko free tier rate-limits (429)** after bursts; graceful empty fallback (`[]`) is expected behavior. `trailingSlash: true` is on.

## File Structure

- `lib/markets/coingecko.ts` — **modify**: add `MarketCoin` type, `marketTableUrl`, `mapMarketCoins`, `downsampleSparkline`, `getMarketTable`, and a private `num` helper.
- `lib/markets/coingecko.test.ts` — **modify**: tests for `marketTableUrl`, `mapMarketCoins`, `downsampleSparkline`.
- `components/Sparkline.tsx` — **create** (server): tiny inline-SVG 7-day sparkline.
- `components/MarketsTable.tsx` — **create** (client): tabs + search + responsive coin table.
- `app/charts/page.tsx` — **rewrite**: render the Markets hub.
- `data/headerNavLinks.ts` — **modify**: relabel `Charts` → `Markets` (href stays `/charts`).
- `components/CatBar.tsx` — **modify**: replace the `Projects` entry with `Markets` (`/charts`).
- `components/Footer.tsx` — **modify**: add `Markets` to the Discover column; remove the `Projects` link.
- `components/CoinTable.tsx` — **modify**: point the "View all ›" link to `/charts`.
- **Delete:** `app/projects/page.tsx`, `data/projectsData.ts`, `components/Card.tsx` (Card is used only by the projects page — verify with grep before deleting).

---

### Task 1: Market-table data layer

**Files:**
- Modify: `lib/markets/coingecko.ts`
- Modify: `lib/markets/coingecko.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the top import of `lib/markets/coingecko.test.ts` (extend the existing import line):
```ts
import {
  mapCoins,
  splitMovers,
  marketsByIdsUrl,
  pickCoin,
  marketTableUrl,
  mapMarketCoins,
  downsampleSparkline,
} from './coingecko'
```

Append these describe blocks at the end of the file:
```ts
describe('marketTableUrl', () => {
  it('requests markets with 24h+7d change and sparkline', () => {
    expect(marketTableUrl(100)).toBe(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=true'
    )
  })
})

describe('downsampleSparkline', () => {
  it('returns finite points unchanged when at or below the target', () => {
    expect(downsampleSparkline([1, 2, 3], 24)).toEqual([1, 2, 3])
  })
  it('drops non-finite points', () => {
    expect(downsampleSparkline([1, NaN, 3], 24)).toEqual([1, 3])
  })
  it('downsamples to the target count when longer', () => {
    const input = Array.from({ length: 100 }, (_, i) => i)
    expect(downsampleSparkline(input, 10)).toHaveLength(10)
  })
})

describe('mapMarketCoins', () => {
  const row = {
    id: 'bitcoin',
    market_cap_rank: 1,
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://x/btc.png',
    current_price: 67000,
    price_change_percentage_24h: 2.5,
    price_change_percentage_7d_in_currency: -3.1,
    market_cap: 1_300_000_000_000,
    total_volume: 40_000_000_000,
    sparkline_in_7d: { price: [1, 2, 3] },
  }
  it('maps a market row to a MarketCoin', () => {
    expect(mapMarketCoins([row])).toEqual([
      {
        id: 'bitcoin',
        rank: 1,
        symbol: 'BTC',
        name: 'Bitcoin',
        image: 'https://x/btc.png',
        price: 67000,
        change24h: 2.5,
        change7d: -3.1,
        marketCap: 1_300_000_000_000,
        volume: 40_000_000_000,
        sparkline: [1, 2, 3],
      },
    ])
  })
  it('drops rows with no id and coerces non-finite numbers to 0', () => {
    const out = mapMarketCoins([
      { symbol: 'x', name: 'X' },
      { id: 'y', symbol: 'y', name: 'Y', current_price: null, market_cap_rank: null },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('y')
    expect(out[0].price).toBe(0)
    expect(out[0].rank).toBeNull()
    expect(out[0].sparkline).toEqual([])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error bad input
    expect(mapMarketCoins(null)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack yarn vitest run lib/markets/coingecko.test.ts`
Expected: FAIL — `marketTableUrl`/`mapMarketCoins`/`downsampleSparkline` are not functions.

- [ ] **Step 3: Implement the data layer**

In `lib/markets/coingecko.ts`, add a private numeric coercion helper near the top (after the `CoinGeckoMarket` interface, before `mapCoins`):
```ts
const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)
```

At the end of the file, add:
```ts
export interface MarketCoin {
  id: string
  rank: number | null
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  change7d: number
  marketCap: number
  volume: number
  sparkline: number[]
}

interface CoinGeckoMarketRow {
  id?: string
  symbol?: string
  name?: string
  image?: string
  current_price?: number | null
  price_change_percentage_24h?: number | null
  price_change_percentage_7d_in_currency?: number | null
  market_cap?: number | null
  market_cap_rank?: number | null
  total_volume?: number | null
  sparkline_in_7d?: { price?: number[] }
}

// Keep the rendered sparkline small: drop non-finite points and thin a 7-day
// hourly series (~168 pts) down to `target` evenly-spaced points.
export function downsampleSparkline(points: number[], target = 24): number[] {
  const finite = (points ?? []).filter((n) => Number.isFinite(n))
  if (finite.length <= target) return finite
  const step = finite.length / target
  const out: number[] = []
  for (let i = 0; i < target; i++) out.push(finite[Math.floor(i * step)])
  return out
}

export function marketTableUrl(perPage: number): string {
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&price_change_percentage=24h,7d&sparkline=true`
}

export function mapMarketCoins(payload: CoinGeckoMarketRow[]): MarketCoin[] {
  if (!Array.isArray(payload)) return []
  return payload.flatMap((c) => {
    if (!c?.id) return []
    return [
      {
        id: c.id,
        rank: Number.isFinite(c.market_cap_rank) ? (c.market_cap_rank as number) : null,
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name || '',
        image: c.image || '',
        price: num(c.current_price),
        change24h: num(c.price_change_percentage_24h),
        change7d: num(c.price_change_percentage_7d_in_currency),
        marketCap: num(c.market_cap),
        volume: num(c.total_volume),
        sparkline: downsampleSparkline(c.sparkline_in_7d?.price ?? []),
      },
    ]
  })
}

// Top `perPage` coins by market cap with 24h/7d change + sparkline. Server-side,
// ISR-cached (120s). [] on failure.
export async function getMarketTable(perPage = 100): Promise<MarketCoin[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(marketTableUrl(perPage), {
      next: { revalidate: 120 },
      signal: controller.signal,
    })
    if (!res.ok) return []
    return mapMarketCoins(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `corepack yarn vitest run lib/markets/coingecko.test.ts && corepack yarn tsc --noEmit`
Expected: all green, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coingecko.ts lib/markets/coingecko.test.ts
git commit -m "Add market-table data layer with sparkline and 7d change"
```

---

### Task 2: Sparkline component

**Files:**
- Create: `components/Sparkline.tsx`

- [ ] **Step 1: Create `components/Sparkline.tsx`**

```tsx
// Tiny 7-day price sparkline (inline SVG). Green when the period ends up, red
// when down. Renders nothing for fewer than 2 points.
export default function Sparkline({ data, className = '' }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null
  const w = 80
  const h = 24
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const up = data[data.length - 1] >= data[0]
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#7BC23A' : '#EB5E45'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
```

(The `#7BC23A` / `#EB5E45` hexes are the same up/down greens/reds used by `components/Gauge.tsx`.)

- [ ] **Step 2: Typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/Sparkline.tsx
git commit -m "Add Sparkline component"
```

---

### Task 3: MarketsTable client component

**Files:**
- Create: `components/MarketsTable.tsx`

- [ ] **Step 1: Create `components/MarketsTable.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { MarketCoin } from '@/lib/markets/coingecko'
import { formatUsd, formatCompactUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import Link from './Link'
import Sparkline from './Sparkline'

type Tab = 'top' | 'gainers' | 'losers' | 'volume'

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
  { id: 'volume', label: 'Volume' },
]

function sortFor(tab: Tab, coins: MarketCoin[]): MarketCoin[] {
  const arr = [...coins]
  switch (tab) {
    case 'gainers':
      return arr.sort((a, b) => b.change24h - a.change24h)
    case 'losers':
      return arr.sort((a, b) => a.change24h - b.change24h)
    case 'volume':
      return arr.sort((a, b) => b.volume - a.volume)
    default:
      return arr.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
  }
}

function changeClass(value: number): string {
  const dir = changeDirection(value)
  return dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
}

export default function MarketsTable({ coins }: { coins: MarketCoin[] }) {
  const [tab, setTab] = useState<Tab>('top')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? coins.filter(
        (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      )
    : coins
  const rows = sortFor(tab, filtered)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex h-[34px] items-center rounded-full border px-4 text-[13px] font-bold transition-colors ${
                tab === t.id
                  ? 'border-accent bg-accent text-[#2a1c05]'
                  : 'border-line bg-surface text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto w-full sm:w-auto">
          <span className="sr-only">Search coins</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coins…"
            className="border-line bg-surface text-ink h-[34px] w-full rounded-lg border px-3 text-sm font-medium sm:w-56"
          />
        </label>
      </div>

      <div className="bg-surface border-line overflow-hidden rounded-[10px] border">
        {/* header */}
        <div className="border-line text-ink-3 flex items-center gap-3 border-b px-4 py-2.5 text-[11px] font-bold tracking-wide uppercase">
          <span className="w-6">#</span>
          <span className="flex-1">Coin</span>
          <span className="w-[92px] text-right">Price</span>
          <span className="w-[64px] text-right">24h</span>
          <span className="hidden w-[64px] text-right lg:inline">7d</span>
          <span className="hidden w-[96px] text-right lg:inline">Mkt Cap</span>
          <span className="hidden w-[96px] text-right lg:inline">Volume</span>
          <span className="hidden w-[80px] text-right lg:inline">7d Chart</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-ink-2 px-4 py-6 text-sm">
            {coins.length === 0 ? 'Market data unavailable.' : 'No coins match your search.'}
          </p>
        ) : (
          rows.map((c, i) => (
            <Link
              key={c.id}
              href={`/charts/${c.id}`}
              className={`hover:bg-fill-2 flex items-center gap-3 px-4 py-3 ${
                i < rows.length - 1 ? 'border-line-2 border-b' : ''
              }`}
            >
              <span className="text-ink-3 w-6 text-xs font-bold">{c.rank ?? i + 1}</span>
              <CoinLogo sym={c.symbol} size={24} />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-bold text-gray-100">{c.name}</span>
                <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
              </div>
              <span className="w-[92px] text-right text-sm font-bold text-gray-100">
                {formatUsd(c.price)}
              </span>
              <span className={`w-[64px] text-right text-[13px] font-bold ${changeClass(c.change24h)}`}>
                {formatPercent(c.change24h)}
              </span>
              <span
                className={`hidden w-[64px] text-right text-[13px] font-bold lg:inline ${changeClass(c.change7d)}`}
              >
                {formatPercent(c.change7d)}
              </span>
              <span className="hidden w-[96px] text-right text-[13px] font-semibold text-gray-100 lg:inline">
                {formatCompactUsd(c.marketCap)}
              </span>
              <span className="hidden w-[96px] text-right text-[13px] font-semibold text-gray-100 lg:inline">
                {formatCompactUsd(c.volume)}
              </span>
              <span className="hidden w-[80px] justify-end lg:flex">
                <Sparkline data={c.sparkline} />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/MarketsTable.tsx
git commit -m "Add MarketsTable client component"
```

---

### Task 4: Rewrite the /charts hub page

**Files:**
- Rewrite: `app/charts/page.tsx`

- [ ] **Step 1: Replace the entire contents of `app/charts/page.tsx` with:**

```tsx
import Breadcrumb from '@/components/Breadcrumb'
import MarketsTable from '@/components/MarketsTable'
import { getMarketTable } from '@/lib/markets/coingecko'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Markets',
  description: 'Live prices, market caps, volume and 7-day trends for the top cryptocurrencies.',
  alternates: { canonical: '/charts' },
})

export default async function MarketsPage() {
  const coins = await getMarketTable(100)
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Markets' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Markets</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Live prices for the top 100 coins — sort by gainers, losers or volume, search, and open
        any coin for its chart and stats.
      </p>
      <div className="mt-6">
        <MarketsTable coins={coins} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Build**

Run: `corepack yarn build`
Expected: completes, no TS/ESLint errors. If `app/tag-data.json` shows modified afterward, run `git checkout app/tag-data.json`.

- [ ] **Step 4: Commit**

```bash
git add app/charts/page.tsx
git commit -m "Rewrite /charts index as the Markets hub"
```

---

### Task 5: Nav relabel + remove the /projects page

**Files:**
- Modify: `data/headerNavLinks.ts`
- Modify: `components/CatBar.tsx`
- Modify: `components/Footer.tsx`
- Modify: `components/CoinTable.tsx`
- Delete: `app/projects/page.tsx`, `data/projectsData.ts`, `components/Card.tsx`

- [ ] **Step 1: Verify `Card` is only used by the projects page**

Run: `grep -rn "components/Card\|from './Card'" app components`
Expected: the ONLY match is `app/projects/page.tsx`. If `Card` is referenced anywhere else, DO NOT delete `components/Card.tsx` — report it as a concern and skip that deletion.

- [ ] **Step 2: Relabel the header nav `Charts` → `Markets`**

In `data/headerNavLinks.ts`, change the Charts entry (keep the href `/charts`):
```ts
  { href: '/charts', title: 'Markets' },
```
(Leave every other entry unchanged.)

- [ ] **Step 3: Replace the `Projects` entry with `Markets` in `components/CatBar.tsx`**

In the `ITEMS` array, replace:
```ts
  { label: 'Projects', href: '/projects' },
```
with:
```ts
  { label: 'Markets', href: '/charts' },
```

- [ ] **Step 4: Update `components/Footer.tsx`**

In the `COLUMNS` array:
- In the `Discover` column's `links`, add a Markets link after `Reviews`:
  ```ts
      { label: 'Reviews', href: '/reviews' },
      { label: 'Markets', href: '/charts' },
  ```
- In the `Topics` column's `links`, REMOVE the line:
  ```ts
      { label: 'Projects', href: '/projects' },
  ```

- [ ] **Step 5: Fix the `CoinTable` "View all ›" link**

In `components/CoinTable.tsx`, change:
```tsx
        <Link href="/projects" className="text-blue text-xs font-bold">
```
to:
```tsx
        <Link href="/charts" className="text-blue text-xs font-bold">
```

- [ ] **Step 6: Delete the projects page and its now-unused files**

```bash
git rm app/projects/page.tsx data/projectsData.ts components/Card.tsx
```
(Only include `components/Card.tsx` if Step 1 confirmed it is unused elsewhere.)

- [ ] **Step 7: Typecheck + build**

Run: `corepack yarn tsc --noEmit && corepack yarn build`
Expected: exit 0; build completes with no TS/ESLint errors and NO reference to `/projects` or `projectsData` remains (the build would fail on a dangling import otherwise). If `app/tag-data.json` shows modified, `git checkout app/tag-data.json`.

- [ ] **Step 8: Verify no dangling references**

Run: `grep -rn "/projects\|projectsData\|components/Card" app components data`
Expected: no matches.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove leftover projects page and surface Markets in nav"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- Full sortable coin table → Task 3 (`MarketsTable`). ✓
- Top / Gainers / Losers / Volume tabs → Task 3 `sortFor`. ✓
- Client-side search → Task 3 query filter. ✓
- 24h & 7d change, market cap, volume, sparkline → Tasks 1 (data) + 2 (Sparkline) + 3 (columns). ✓
- Server-side fetch, CSP-safe (client only sorts/filters the passed array) → Tasks 1 + 4. ✓
- Rows link to existing `/charts/[coin]` → Task 3. ✓
- Remove `/projects` + fix `CoinTable` link + nav cleanup → Task 5. ✓
- Relabel section to Markets → Tasks 4 (H1/metadata) + 5 (nav). ✓
- "New" tab intentionally omitted (CoinGecko free tier has no reliable "recently added" feed); sector filters deferred to the Topics unit — noted, not silently dropped.

**2. Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**3. Type consistency:** `MarketCoin` fields (id, rank, symbol, name, image, price, change24h, change7d, marketCap, volume, sparkline) are produced by `mapMarketCoins` and consumed identically in `MarketsTable`/`Sparkline`. `getMarketTable` returns `MarketCoin[]`, consumed by the page → `MarketsTable`. `downsampleSparkline`/`marketTableUrl`/`mapMarketCoins` signatures match their tests. ✓

---

## Notes / risks for the executor

- The client `MarketsTable` imports the `MarketCoin` **type** and `pickCoin` is NOT needed here; only format helpers + `MarketCoin` type are imported from the data layer — type-only import keeps the server fetch code out of the client bundle conceptually (and `coingecko.ts` has no `server-only` marker, so even value imports are safe).
- Keep the sparkline column and the 7d/mktcap/volume columns `hidden lg:*` so the table stays usable on mobile (rank + coin + price + 24h only on small screens).
- After all tasks: final holistic review, then **superpowers:finishing-a-development-branch** → PR (branch `unit-a-markets-hub`) → wait for CodeRabbit → triage → merge.
