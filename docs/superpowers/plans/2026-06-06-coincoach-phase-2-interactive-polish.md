# CoinCoach Phase 2 — Interactive Homepage Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage Movers panel interactive (Gainers/Losers tab toggle) and turn the static market ticker into an auto-scrolling marquee that pauses on hover and respects reduced-motion.

**Architecture:** Keep all market fetching server-side (CSP `connect-src 'self'` stays intact). `Movers` stays an async server component that fetches `{ gainers, losers }` and hands both lists to a small `'use client'` `MoversTabs` child that owns only the tab `useState` — no client fetching. The ticker becomes a pure-CSS marquee: the existing async `Ticker` server component renders its coin list twice inside an animated track; animation, hover-pause, and `prefers-reduced-motion` handling all live in `css/tailwind.css`, so no client JS is added for the ticker.

**Tech Stack:** Next 15 App Router (RSC + a leaf client component), TypeScript, Tailwind v4 (CSS `@layer`/`@keyframes`). No new dependencies. No new data feeds.

**Testing note:** This repo has no component test harness (Vitest covers pure functions only — see `lib/markets/*.test.ts`). Phase 1 established that components are verified via `corepack yarn build` + a dev smoke check, not unit tests. Both tasks here are presentational/stateful UI with no new pure logic (`splitMovers` is already unit-tested), so verification is build + dev smoke, consistent with the codebase. Do **not** invent a new test harness.

**Conventions (from repo memory):** Yarn Berry via `corepack yarn` (yarn is not on PATH). Many small, logically-scoped commits. Commit messages are plain, sentence-style, with **no AI-attribution / Co-Authored-By trailers**. A pre-commit Prettier hook runs — let it format; if it reflows a file, re-stage and amend or include the formatted result.

---

## File structure

| File                            | Responsibility                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/MoversTabs.tsx` (create) | `'use client'` leaf: receives `gainers`/`losers`, owns tab state, renders the active list + tab header |
| `components/Movers.tsx` (modify)     | stays async server component; fetches both lists, renders `<MoversTabs .../>`                          |
| `css/tailwind.css` (modify)          | add ticker marquee `@keyframes` + `.ticker-marquee*` utilities + reduced-motion override               |
| `components/Ticker.tsx` (modify)     | render the coin list twice inside an animated, hover-pausable marquee track (label stays fixed)         |

---

## Task 1: Movers Gainers/Losers tab toggle

Split the panel into a server fetch (`Movers`) and a client tab component (`MoversTabs`). The row markup moves verbatim into the client component so the visual output is unchanged; only the tab header becomes interactive and the active list switches.

**Files:**

- Create: `components/MoversTabs.tsx`
- Modify: `components/Movers.tsx`

- [ ] **Step 1: Create the client tab component** — `components/MoversTabs.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Coin } from '@/lib/markets/coingecko'
import { formatPercent } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

type Tab = 'gainers' | 'losers'

export default function MoversTabs({ gainers, losers }: { gainers: Coin[]; losers: Coin[] }) {
  const [tab, setTab] = useState<Tab>('gainers')
  const list = tab === 'gainers' ? gainers : losers

  const tabClass = (active: boolean) =>
    active
      ? 'border-accent border-b-2 pb-2.5 text-sm font-extrabold text-gray-50'
      : 'text-ink-3 hover:text-ink-2 pb-2.5 text-sm font-bold'

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line flex gap-4 border-b px-4 pt-3">
        <button
          type="button"
          onClick={() => setTab('gainers')}
          aria-pressed={tab === 'gainers'}
          className={tabClass(tab === 'gainers')}
        >
          Gainers
        </button>
        <button
          type="button"
          onClick={() => setTab('losers')}
          aria-pressed={tab === 'losers'}
          className={tabClass(tab === 'losers')}
        >
          Losers
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1.5">
          {list.map((c) => (
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

Notes for the implementer:

- `Coin` is exported from `lib/markets/coingecko.ts` (`export interface Coin { symbol; name; price; change24h; image }`). Import it as a type.
- The row markup, empty-state copy, and all class names are copied unchanged from the current `Movers.tsx` so the Gainers view is pixel-identical to today.
- Tabs are real `<button>`s for keyboard/focus accessibility (the repo sets focus-visible outlines on `button` in `css/tailwind.css`). Do not use `<span>`s.

- [ ] **Step 2: Reduce `Movers.tsx` to a server fetch wrapper** — replace the entire body of `components/Movers.tsx`:

```tsx
import { getMovers } from '@/lib/markets/coingecko'
import MoversTabs from './MoversTabs'

// Top-100-by-market-cap movers. Fetch is server-side; the Gainers/Losers
// toggle is a thin client child so no market data is fetched in the browser.
export default async function Movers() {
  const { gainers, losers } = await getMovers()
  return <MoversTabs gainers={gainers} losers={losers} />
}
```

- [ ] **Step 3: Verify build + format**

Run: `corepack yarn prettier --write components/MoversTabs.tsx components/Movers.tsx && corepack yarn build`
Expected: build succeeds; no unused-import or type errors. (`getMovers` already returns `{ gainers, losers }` — confirmed in `lib/markets/coingecko.ts`.)

- [ ] **Step 4: Commit**

```bash
git add components/MoversTabs.tsx components/Movers.tsx
git commit -m "Add Gainers/Losers toggle to the Movers panel"
```

---

## Task 2: Ticker marquee (auto-scroll, pause on hover, reduced-motion safe)

Turn the horizontally-scrollable ticker into a continuous marquee. The `MARKET ▾` label stays fixed; the coin list scrolls leftward and loops seamlessly. Seamlessness is achieved by rendering the coin list **twice** in one track and animating the track by exactly `-50%` — so each coin item carries its spacing as a right margin (uniform across the doubled list) rather than a flex `gap` (which would leave an uneven seam at the join).

**Files:**

- Modify: `css/tailwind.css`
- Modify: `components/Ticker.tsx`

- [ ] **Step 1: Add the marquee CSS** — append a new block to `css/tailwind.css` (after the existing `@layer utilities { ... }` block; the file currently has no `@keyframes` or animation rules):

```css
@layer utilities {
  .ticker-marquee {
    overflow: hidden;
  }
  .ticker-track {
    display: flex;
    width: max-content;
    flex-wrap: nowrap;
    animation: ticker-scroll 40s linear infinite;
  }
  .ticker-marquee:hover .ticker-track {
    animation-play-state: paused;
  }
}

@keyframes ticker-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-marquee {
    overflow-x: auto;
  }
  .ticker-track {
    animation: none;
  }
}
```

Notes for the implementer:

- `width: max-content` lets the track size to its full doubled content so the `-50%` translate equals exactly one copy.
- Hover-pause is pure CSS (`animation-play-state: paused`) — no JS.
- Under `prefers-reduced-motion: reduce` the animation is off and the viewport becomes horizontally scrollable so all coins remain reachable.
- Keep this consistent with the file's existing 2-space indentation and `@layer` usage.

- [ ] **Step 2: Render the coin list twice in an animated track** — replace the body of `components/Ticker.tsx`:

```tsx
import { getTopCoins } from '@/lib/markets/coingecko'
import type { Coin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

function TickerItem({ c }: { c: Coin }) {
  const dir = changeDirection(c.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <span className="mr-6 flex shrink-0 items-center gap-2 text-[12.5px] font-semibold whitespace-nowrap text-gray-300">
      <CoinLogo sym={c.symbol} size={16} />
      <span className="font-bold text-gray-400">{c.symbol}</span>
      <span>{formatUsd(c.price)}</span>
      <span className={`text-xs ${changeClass}`}>{formatPercent(c.change24h)}</span>
    </span>
  )
}

export default async function Ticker() {
  const coins = await getTopCoins()
  if (coins.length === 0) return null
  return (
    <div className="bg-ticker border-line border-b">
      <div className="mx-auto flex h-[38px] max-w-[1440px] items-center gap-6 overflow-hidden px-5 sm:px-10">
        <span className="text-accent shrink-0 text-[12.5px] font-extrabold tracking-wide whitespace-nowrap">
          MARKET ▾
        </span>
        <div className="ticker-marquee no-scrollbar flex-1">
          <div className="ticker-track">
            {coins.map((c) => (
              <TickerItem key={`a-${c.symbol}-${c.name}`} c={c} />
            ))}
            <div className="flex" aria-hidden="true">
              {coins.map((c) => (
                <TickerItem key={`b-${c.symbol}-${c.name}`} c={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Notes for the implementer:

- Each `TickerItem` carries `mr-6` so spacing is uniform across the doubled list — that is what makes the `-50%` loop seamless. Do **not** add a flex `gap` to `.ticker-track`.
- The second copy is wrapped in an `aria-hidden="true"` container so screen readers announce the coins only once.
- `no-scrollbar` (already defined in the repo and used by the old ticker) hides the scrollbar that appears in the reduced-motion (`overflow-x: auto`) fallback.
- The `Coin` type is imported from `lib/markets/coingecko.ts`. `formatUsd`, `formatPercent`, `changeDirection` come from `lib/markets/format.ts` (unchanged signatures).

- [ ] **Step 3: Verify build + format**

Run: `corepack yarn prettier --write components/Ticker.tsx css/tailwind.css && corepack yarn build`
Expected: build succeeds; no type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add components/Ticker.tsx css/tailwind.css
git commit -m "Make the market ticker an auto-scrolling marquee"
```

---

## Task 3: Phase 2 verification

- [ ] **Step 1: Full test suite (regression)**

Run: `corepack yarn test`
Expected: all existing suites still pass (format, global, sentiment, coingecko, sections, structuredData) — Phase 2 adds no tests but must not break any.

- [ ] **Step 2: Build**

Run: `corepack yarn build`
Expected: succeeds.

- [ ] **Step 3: Dev smoke**

Run: `corepack yarn dev`, then load `/` (read the actual dev port from the log — port 3000 is taken by another app on this machine; `grep -oE "localhost:[0-9]+"` the dev output). Confirm:

- The Movers panel shows Gainers by default; clicking **Losers** switches to the losers list (most-negative first) and the active underline moves; clicking **Gainers** switches back. Tabs are keyboard-focusable.
- The ticker auto-scrolls leftward and loops without a visible jump; hovering the ticker pauses it; the `MARKET ▾` label stays fixed.
- With the network blocked (so feeds return empty), the Movers panel shows "Market data unavailable." and the ticker renders nothing (returns `null`) without crashing the page.

- [ ] **Step 4: Update the roadmap** — in `docs/redesign-roadmap.md`:
  - In the Phase 0 table, change the Movers row note from "(Gainers/Losers toggle → Phase 2)" to reflect the toggle now shipped (✅), and update the Ticker row if it references marquee-as-future.
  - In the Phase 2 table, mark the "Movers Gainers/Losers toggle" and "Ticker marquee (auto-scroll, pause on hover)" rows as done.

```bash
git add docs/redesign-roadmap.md
git commit -m "Mark Phase 2 Movers toggle and ticker marquee as shipped"
```

---

## Self-review notes

- **Spec coverage:** Covers the two unblocked Phase 2 items from `docs/redesign-roadmap.md` (Movers toggle, ticker marquee) and the matching bullets in the main plan's "Phase 2 — Interactive polish" section. Watchlist/Converter are intentionally deferred (they ship with their host Coin Detail page, per the roadmap) and timeframe chips belong to Phase 3.
- **Type consistency:** `Coin` (`symbol`/`name`/`price`/`change24h`/`image`) and `getMovers(): { gainers, losers }` match `lib/markets/coingecko.ts`; `formatPercent`/`formatUsd`/`changeDirection` signatures match `lib/markets/format.ts`.
- **No client fetching:** `MoversTabs` receives data as props from the server `Movers`; the ticker uses zero client JS. CSP `connect-src 'self'` is unaffected.
- **No new test harness:** consistent with Phase 1 — pure logic is already unit-tested; UI verified by build + dev smoke.
