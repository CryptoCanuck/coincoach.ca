# Market Data Reliability (API key + resilience) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the production failures (coin pages 404, charts empty, prices frozen) by routing every CoinGecko call through one keyed `cgFetch` helper, distinguishing a genuinely-unknown coin (404) from a transient outage (429/timeout), prerendering the top coins, and showing an honest "Updated HH:MM UTC" freshness label.

**Root cause being fixed:** all `lib/markets/*` fetches hit the **unauthenticated** `api.coingecko.com`, which 429s after a few rapid calls. `getCoin` maps any non-200 → `null` → the coin page calls `notFound()`, so a rate-limited coin is indistinguishable from a nonexistent one. Reproduced: keyless burst (markets + 3 OHLC) returns `429`; the same burst **with** an `x-cg-demo-api-key` header returns `200`.

**Architecture:** A new server-only `lib/markets/cgFetch.ts` injects the Demo API key header (`x-cg-demo-api-key`) when `COINGECKO_API_KEY` is set, applies the 5s abort timeout, and returns a discriminated `CgOutcome<T>` (`{ok:true,data}` | `{ok:false,status}`). All existing fetchers are refactored onto it, preserving their current return contracts (`[]`/`null` on failure). The coin page uses a new `getCoinDetail` returning `ok | not-found | unavailable` so a transient outage renders a soft "temporarily unavailable" panel instead of a hard 404. The key lives only in env (Portainer / gitignored `.env.local`), never in git.

**Tech Stack:** Next.js 15 App Router (server components + ISR), TypeScript, Tailwind v4, Vitest.

**Liveness decision (locked):** keep the server-side ISR model (~60s); add an honest "Updated HH:MM UTC" label. No client-side price polling (CSP `connect-src 'self'`). The lazy-OHLC `/api` route is a SEPARATE later PR (call-reduction), out of scope here.

---

## File Structure

- `lib/markets/cgFetch.ts` (new) — keyed fetch helper + `cgHeaders`/`cgUrl` (pure, testable) + `CgOutcome`.
- `lib/markets/cgFetch.test.ts` (new) — unit tests for header/url selection.
- `lib/markets/coingecko.ts` — refactor `fetchMarkets`, `getMarketsByIds`, `getMarketTable` onto `cgFetch`.
- `lib/markets/global.ts` — refactor `getGlobalStats`.
- `lib/markets/categories.ts` — refactor `getCategorySentiment`.
- `lib/markets/coins.ts` — refactor `getOhlc`; add `coinUrl`/`ohlcUrl` builders; add `CoinFetch`, pure `classifyCoin`, `getCoinDetail`; make `getCoin` a thin wrapper.
- `lib/markets/coins.test.ts` — add `classifyCoin` tests.
- `components/MarketDataUnavailable.tsx` (new) — soft outage panel.
- `components/FreshnessNote.tsx` (new) — "Updated HH:MM UTC" server component.
- `app/charts/[coin]/page.tsx` — use `getCoinDetail`; add `generateStaticParams`; render freshness on the chart panel.
- `app/charts/page.tsx` — render freshness on the markets hub.
- `.env.example` — document `COINGECKO_API_KEY` (+ optional `COINGECKO_API_PLAN`).

**Repo conventions (apply to every task):**
- Yarn Berry: run yarn via `corepack yarn ...` (NOT on PATH).
- Commits authored solely by the user — NEVER add `Co-Authored-By`/AI-attribution trailers.
- `.tsx`/page work MUST be verified with `corepack yarn build` (ESLint enforces prettier + `@next/next/no-html-link-for-pages`); tsc alone is insufficient. After any build/dev run, `git checkout app/tag-data.json`.
- A gitignored `.env.local` already holds `COINGECKO_API_KEY` for local build/smoke tests. NEVER print the key into committed files or PR text. The key is a secret.
- Editor LSP may show stale "module not found" on new files — trust `corepack yarn build`/`vitest`.

---

### Task 1: `cgFetch` keyed helper + tests

**Files:**
- Create: `lib/markets/cgFetch.ts`
- Test: `lib/markets/cgFetch.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/markets/cgFetch.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { cgHeaders, cgUrl } from './cgFetch'

const ORIGINAL = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('cgHeaders', () => {
  it('returns no auth header when no key is set', () => {
    delete process.env.COINGECKO_API_KEY
    expect(cgHeaders()).toEqual({})
  })
  it('sends the demo header by default when a key is set', () => {
    process.env.COINGECKO_API_KEY = 'CG-test'
    delete process.env.COINGECKO_API_PLAN
    expect(cgHeaders()).toEqual({ 'x-cg-demo-api-key': 'CG-test' })
  })
  it('sends the pro header when the plan is pro', () => {
    process.env.COINGECKO_API_KEY = 'CG-test'
    process.env.COINGECKO_API_PLAN = 'pro'
    expect(cgHeaders()).toEqual({ 'x-cg-pro-api-key': 'CG-test' })
  })
})

describe('cgUrl', () => {
  const url = 'https://api.coingecko.com/api/v3/global'
  it('leaves the public/demo host untouched', () => {
    delete process.env.COINGECKO_API_PLAN
    expect(cgUrl(url)).toBe(url)
  })
  it('rewrites the host to pro-api on the pro plan', () => {
    process.env.COINGECKO_API_PLAN = 'pro'
    expect(cgUrl(url)).toBe('https://pro-api.coingecko.com/api/v3/global')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack yarn vitest run lib/markets/cgFetch.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/markets/cgFetch.ts`**

```ts
// Centralizes every CoinGecko request so the API key is attached in exactly one
// place. Server-only (imported by server components / route handlers). The key
// is read from env at call time and never logged.
//
// Auth (per CoinGecko docs):
//   Demo plan (free): host api.coingecko.com, header `x-cg-demo-api-key`
//   Pro plan (paid):  host pro-api.coingecko.com, header `x-cg-pro-api-key`
// Default is Demo; set COINGECKO_API_PLAN=pro to switch.

function isPro(): boolean {
  return process.env.COINGECKO_API_PLAN === 'pro'
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `corepack yarn vitest run lib/markets/cgFetch.test.ts`
Expected: PASS. Also `corepack yarn tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/cgFetch.ts lib/markets/cgFetch.test.ts
git commit -m "Add keyed cgFetch helper for CoinGecko requests"
```

---

### Task 2: Route `coingecko.ts`, `global.ts`, `categories.ts` through `cgFetch`

**Files:**
- Modify: `lib/markets/coingecko.ts` (`fetchMarkets`, `getMarketsByIds`, `getMarketTable`)
- Modify: `lib/markets/global.ts` (`getGlobalStats`)
- Modify: `lib/markets/categories.ts` (`getCategorySentiment`)

Preserve every public signature and the existing failure fallbacks (`[]`/`null`). Keep the URL-builder functions (`marketsUrl`, `marketsByIdsUrl`, `marketTableUrl`) exactly as-is — their unit tests assert on them.

- [ ] **Step 1: Refactor `coingecko.ts`**

Add the import at the top:

```ts
import { cgFetch } from './cgFetch'
```

Replace the body of `fetchMarkets` with:

```ts
async function fetchMarkets(perPage: number): Promise<Coin[]> {
  const r = await cgFetch<CoinGeckoMarket[]>(marketsUrl(perPage), { revalidate: 60 })
  return r.ok ? mapCoins(r.data) : []
}
```

Replace the body of `getMarketsByIds` (keep the id-normalization guard):

```ts
export async function getMarketsByIds(ids: string[]): Promise<Coin[]> {
  // Trim, drop blanks, and dedupe so messy `coins:` frontmatter can't trigger a
  // wasted call (e.g. ['', '  ']) or a bloated ids param with repeats.
  const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (!normalizedIds.length) return []
  const r = await cgFetch<CoinGeckoMarket[]>(marketsByIdsUrl(normalizedIds), { revalidate: 60 })
  return r.ok ? mapCoins(r.data) : []
}
```

Replace the body of `getMarketTable`:

```ts
export async function getMarketTable(perPage = 100): Promise<MarketCoin[]> {
  const r = await cgFetch<CoinGeckoMarketRow[]>(marketTableUrl(perPage), { revalidate: 120 })
  return r.ok ? mapMarketCoins(r.data) : []
}
```

Remove the now-unused `AbortController`/`setTimeout` plumbing from those three functions. The `num` helper and the URL builders stay.

- [ ] **Step 2: Refactor `global.ts`**

```ts
import { cgFetch } from './cgFetch'

// ...mapGlobal unchanged...

// Server-side, ISR-cached (5 min). Returns null on any failure so the UI degrades.
export async function getGlobalStats(): Promise<GlobalStats | null> {
  const r = await cgFetch<CoinGeckoGlobal>('https://api.coingecko.com/api/v3/global', {
    revalidate: 300,
  })
  return r.ok ? mapGlobal(r.data) : null
}
```

- [ ] **Step 3: Refactor `categories.ts`**

```ts
import { cgFetch } from './cgFetch'

// ...mapCategories unchanged...

// Server-side, ISR-cached (10 min). [] on failure.
export async function getCategorySentiment(limit = 8): Promise<CategorySentiment[]> {
  const r = await cgFetch<unknown>('https://api.coingecko.com/api/v3/coins/categories', {
    revalidate: 600,
  })
  return r.ok ? mapCategories(r.data, limit) : []
}
```

(If `mapCategories` has a specific payload type, use that as the `cgFetch<...>` type argument instead of `unknown`, matching its parameter type. Check its signature and keep types aligned.)

- [ ] **Step 4: Verify**

Run: `corepack yarn vitest run lib/markets/` — existing mapper/URL tests stay green.
Run: `corepack yarn tsc --noEmit` — clean.
Run: `corepack yarn build` — succeeds. Then `git checkout app/tag-data.json`.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coingecko.ts lib/markets/global.ts lib/markets/categories.ts
git commit -m "Route market, global, and category fetches through cgFetch"
```

---

### Task 3: Coin detail resilience — `getCoinDetail` (404 vs unavailable)

**Files:**
- Modify: `lib/markets/coins.ts`
- Test: `lib/markets/coins.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `lib/markets/coins.test.ts` (import `classifyCoin` and the existing helpers):

```ts
import { classifyCoin } from './coins'

const validPayload = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  market_data: { current_price: { usd: 1 } },
}

describe('classifyCoin', () => {
  it('returns ok with the mapped coin on a successful, mappable response', () => {
    const r = classifyCoin({ ok: true, data: validPayload })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.coin.id).toBe('bitcoin')
  })
  it('returns not-found when the payload cannot be mapped (no id)', () => {
    expect(classifyCoin({ ok: true, data: {} }).status).toBe('not-found')
  })
  it('returns not-found on a 404', () => {
    expect(classifyCoin({ ok: false, status: 404 }).status).toBe('not-found')
  })
  it('returns unavailable on a 429 (rate limit)', () => {
    expect(classifyCoin({ ok: false, status: 429 }).status).toBe('unavailable')
  })
  it('returns unavailable on a network error / timeout (null status)', () => {
    expect(classifyCoin({ ok: false, status: null }).status).toBe('unavailable')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `corepack yarn vitest run lib/markets/coins.test.ts`
Expected: FAIL (`classifyCoin` not exported).

- [ ] **Step 3: Implement in `coins.ts`**

Add the `cgFetch` import and a URL builder, refactor `getOhlc` and `getCoin`, and add the resilience API. Replace the existing `getCoin` and `getOhlc` implementations:

```ts
import { cgFetch, type CgOutcome } from './cgFetch'

// URL builders (also unit-testable / reused by the lazy-OHLC route later).
export function coinUrl(id: string): string {
  return `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    id
  )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
}

export function ohlcUrl(id: string, frame: Timeframe): string {
  return `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${OHLC_DAYS[frame]}`
}

export type CoinFetch =
  | { status: 'ok'; coin: CoinDetail }
  | { status: 'not-found' }
  | { status: 'unavailable' }

// Pure: maps a raw cgFetch outcome to a UI-ready status. CoinGecko returns 404
// for an unknown id (real not-found); 429/5xx/timeout (null) is a transient
// outage the page should show softly rather than 404.
export function classifyCoin(outcome: CgOutcome<CoinGeckoCoin>): CoinFetch {
  if (outcome.ok) {
    const coin = mapCoinDetail(outcome.data)
    return coin ? { status: 'ok', coin } : { status: 'not-found' }
  }
  return outcome.status === 404 ? { status: 'not-found' } : { status: 'unavailable' }
}

// Server-side, ISR-cached (5 min). Distinguishes unknown vs temporarily-down.
export async function getCoinDetail(id: string): Promise<CoinFetch> {
  return classifyCoin(await cgFetch<CoinGeckoCoin>(coinUrl(id), { revalidate: 300 }))
}

// Thin wrapper for callers (e.g. generateMetadata) that only need the coin or null.
export async function getCoin(id: string): Promise<CoinDetail | null> {
  const r = await getCoinDetail(id)
  return r.status === 'ok' ? r.coin : null
}

// Server-side, ISR-cached (5 min). [] on failure.
export async function getOhlc(id: string, frame: Timeframe): Promise<Candle[]> {
  const r = await cgFetch<number[][]>(ohlcUrl(id, frame), { revalidate: 300 })
  return r.ok ? mapOhlc(r.data) : []
}
```

Note: `CoinGeckoCoin` is already declared in this file; `mapCoinDetail`, `OHLC_DAYS`, `Timeframe`, `Candle`, `mapOhlc` already exist. Remove the old `AbortController`/`setTimeout` bodies from `getCoin`/`getOhlc`. `getAllOhlc` is unchanged (still calls `getOhlc`).

- [ ] **Step 4: Verify**

Run: `corepack yarn vitest run lib/markets/coins.test.ts` — PASS.
Run: `corepack yarn tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add lib/markets/coins.ts lib/markets/coins.test.ts
git commit -m "Distinguish unknown coins from transient CoinGecko outages"
```

---

### Task 4: Soft outage panel + freshness label components

**Files:**
- Create: `components/MarketDataUnavailable.tsx`
- Create: `components/FreshnessNote.tsx`

- [ ] **Step 1: `MarketDataUnavailable.tsx` (server component)**

```tsx
import Link from '@/components/Link'

// Shown when CoinGecko is temporarily unreachable / rate-limited (as opposed to a
// genuinely unknown coin, which 404s). Keeps the route alive so ISR can recover.
export default function MarketDataUnavailable({ label }: { label?: string }) {
  return (
    <div className="bg-surface border-line mt-6 rounded-[10px] border p-8 text-center">
      <h1 className="text-xl font-extrabold text-gray-50">
        {label ? `${label} data is temporarily unavailable` : 'Market data is temporarily unavailable'}
      </h1>
      <p className="text-ink-2 mx-auto mt-2 max-w-md text-sm">
        Live pricing is refreshing right now. Please try again in a moment.
      </p>
      <Link href="/charts" className="text-blue mt-5 inline-block text-sm font-semibold">
        ← Back to Markets
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: `FreshnessNote.tsx` (server component)**

```tsx
// Honest "as of" stamp. Rendered server-side during (re)generation, so it reflects
// when this ISR view was produced — i.e. how fresh the cached market data is.
// UTC keeps it deterministic regardless of server locale; no client clock is read,
// so there is no hydration mismatch.
export default function FreshnessNote({ className = '' }: { className?: string }) {
  const now = new Date()
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  return (
    <span className={`text-ink-3 text-[11px] font-semibold ${className}`}>
      Updated {hh}:{mm} UTC
    </span>
  )
}
```

- [ ] **Step 3: Verify**

Run: `corepack yarn tsc --noEmit` — clean. (Build verification happens in Task 5 where they're used.)

- [ ] **Step 4: Commit**

```bash
git add components/MarketDataUnavailable.tsx components/FreshnessNote.tsx
git commit -m "Add soft market-data outage panel and freshness label"
```

---

### Task 5: Wire the coin page (resilience + static params + freshness) and markets hub

**Files:**
- Modify: `app/charts/[coin]/page.tsx`
- Modify: `app/charts/page.tsx`

- [ ] **Step 1: Update `app/charts/[coin]/page.tsx`**

Change the imports: replace `getCoin` with `getCoinDetail` for the page (keep `getCoin` import for `generateMetadata`), and import the new pieces + `getMarketTable`:

```ts
import { getCoin, getCoinDetail, getAllOhlc, priceVolatilityPct, TIMEFRAMES } from '@/lib/markets/coins'
import { getTopCoins, getMarketTable } from '@/lib/markets/coingecko'
import MarketDataUnavailable from '@/components/MarketDataUnavailable'
import FreshnessNote from '@/components/FreshnessNote'
```

Add `generateStaticParams` after the imports (prerender the top coins; `dynamicParams` stays at its default `true`, so any other coin still renders on demand — now succeeding because of the key):

```ts
// Prebuild the most-trafficked coin pages; the long tail renders on demand.
export async function generateStaticParams() {
  const top = await getMarketTable(15)
  return top.map((c) => ({ coin: c.id }))
}
```

Replace the start of the default export (the `getCoin` + `notFound` lines) with the three-way resilient branch:

```ts
export default async function CoinDetailPage({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  // Confirm the coin exists before firing the dependent (OHLC + markets) calls.
  const result = await getCoinDetail(id)
  if (result.status === 'not-found') notFound()
  if (result.status === 'unavailable') {
    return (
      <div className="py-2">
        <div className="pt-5">
          <Breadcrumb items={[{ label: 'Charts', href: '/charts' }, { label: id }]} />
        </div>
        <MarketDataUnavailable label={id} />
      </div>
    )
  }
  const coin = result.coin
  const [ohlc, top] = await Promise.all([getAllOhlc(id), getTopCoins()])
  // ...rest unchanged (volatility, similar, posts, render)...
```

Then add the freshness label into the chart panel area. In the LEFT column, change the `PriceChart` block so the freshness stamp sits just above it:

```tsx
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-end">
              <FreshnessNote />
            </div>
            <PriceChart data={ohlc} frames={TIMEFRAMES} />
          </div>
```

(Keep everything else in the file identical.)

- [ ] **Step 2: Update `app/charts/page.tsx` (markets hub)**

Add the freshness label next to the H1. Import it and render it. Read the current file first; place `<FreshnessNote />` in the header row so it reads e.g. "Markets … Updated HH:MM UTC". Minimal change:

```tsx
import FreshnessNote from '@/components/FreshnessNote'
// ...
      <div className="mt-5 flex items-center justify-between gap-3">
        <h1 className="text-[34px] font-black tracking-tight text-gray-50">Markets</h1>
        <FreshnessNote />
      </div>
```

(Adapt to the file's existing H1 markup — keep the existing classes on the H1; just wrap it in a flex row with the note. Do not change `getMarketTable`/`MarketsTable`.)

- [ ] **Step 3: Verify with the key (smoke the real fix)**

Run: `corepack yarn build` — succeeds; `/charts/[coin]` shows as having static params (15 prebuilt). Then `git checkout app/tag-data.json`.

Smoke locally with the key (`.env.local` is loaded by `next start`/`next dev`):
- `corepack yarn dev` (or `start` after build), then in another shell:
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/charts/ethereum/` → expect `200` (was 404).
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/charts/solana/` → expect `200`.
  - `curl -s http://localhost:3000/charts/ | grep -o "Updated [0-9:]* UTC" | head -1` → shows the stamp.
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/charts/definitely-not-a-coin/` → expect `404` (genuine unknown still 404s).
- Stop the dev server. If CoinGecko rate-limits mid-smoke (no key loaded / quota), retry after a minute; the key should keep it 200.

- [ ] **Step 4: Commit**

```bash
git add 'app/charts/[coin]/page.tsx' app/charts/page.tsx
git commit -m "Make coin pages resilient, prebuild top coins, show data freshness"
```

---

### Task 6: Document the env var

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append to `.env.example`**

```bash
# CoinGecko market data. Create a free Demo key at
# https://www.coingecko.com/en/api (Demo plan). Without a key the public API
# rate-limits (HTTP 429) and prices/charts fail. Set COINGECKO_API_PLAN=pro
# only if using a paid Pro key.
COINGECKO_API_KEY=
COINGECKO_API_PLAN=
```

- [ ] **Step 2: Confirm no secret is committed**

Run: `git grep -n "CG-" -- . ':!*.lock'` → expect NO match (the real key must live only in the untracked `.env.local` / Portainer). Run `git status` and confirm `.env.local` is NOT staged.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "Document the CoinGecko API key env var"
```

---

## Self-Review

- **Spec coverage:** key helper (T1) → every CoinGecko fetcher uses it so all calls are keyed (T2, T3) → 404-vs-outage resilience (T3) → soft UI + freshness (T4) → page wiring + static params + smoke (T5) → env doc (T6). The reported bugs (coin 404s, empty charts, frozen prices) are all downstream of "calls were unkeyed" → fixed by T1–T3 + the key in env.
- **Contract stability:** all existing public signatures and `[]`/`null` fallbacks preserved; URL-builder + mapper unit tests untouched → stay green.
- **Type consistency:** `CgOutcome<T>` is the single shared result type; `classifyCoin` consumes `CgOutcome<CoinGeckoCoin>`; `getCoin` remains `Promise<CoinDetail | null>` for `generateMetadata`.
- **Secret hygiene:** key only via env; `.env.local` gitignored; `.env.example` has an empty placeholder; explicit no-`CG-`-in-git check (T6).
- **Scope guard:** lazy-OHLC `/api` route + PriceChart fetch-on-demand are intentionally a SEPARATE follow-up PR (call reduction), NOT in this plan. PriceChart already degrades per-frame, so it needs no change here once the key populates all frames.
