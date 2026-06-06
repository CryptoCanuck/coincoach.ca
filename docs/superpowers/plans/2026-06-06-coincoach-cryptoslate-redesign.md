# CoinCoach CryptoSlate-style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin CoinCoach into a dark, crypto-native news magazine (CryptoSlate-style) — Midnight palette, live-rail homepage, card-grid sections, polished article pages — plus a small cached CoinGecko market-data layer (ticker + Top Coins widget).

**Architecture:** Restyle in place on the existing Contentlayer/MDX + App Router app. Swap the Tailwind v4 `@theme` tokens to the Midnight palette and force dark mode; rebuild the layout shell (ticker + header + footer), homepage, section pages, and article page from shared server components (`Card`, `CategoryChip`, `Ticker`, `TopCoins`, `TrendingList`, `ArticleMeta`). Market data comes from one server-side, ISR-cached CoinGecko fetch (`lib/markets`).

**Tech Stack:** Next.js 15 (App Router, RSC), Tailwind CSS v4, Contentlayer2, Inter (`next/font`), Vitest, CoinGecko public API.

**Conventions:**
- Package manager **Yarn Berry**: run `corepack yarn <cmd>` (test: `corepack yarn test`, build: `corepack yarn build`).
- Commits: authored as `CryptoCanuck <support@rimdc.com>`, **no AI/co-author attribution**. Make **small, logically-scoped commits**.
- Reference spec: `docs/superpowers/specs/2026-06-06-coincoach-cryptoslate-redesign-design.md`.
- Visual reference mockup: `.superpowers/brainstorm/1660629-1780755643/content/home-hifi.html`.

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `css/tailwind.css` | Midnight palette tokens, base dark bg/text, Inter default (T1) |
| `app/theme-providers.tsx` | Force dark theme (T1) |
| `components/Header.tsx`, `components/MobileNav.tsx`, `components/Footer.tsx` | Restyled shell, ThemeSwitch removed (T1, T8) |
| `lib/sections.ts` | `SECTIONS` extended with `label` + `chipClass`; `getSection` (T2) |
| `components/CategoryChip.tsx` | Colour-coded `postType` chip (T2) |
| `lib/markets/format.ts` (+ test) | Pure formatters (T3) |
| `lib/markets/coingecko.ts` (+ test) | `getTopCoins()` fetch+map, `Coin` type (T4) |
| `components/Ticker.tsx`, `components/TopCoins.tsx` | Market components (T5) |
| `components/PostCard.tsx`, `components/ArticleMeta.tsx`, `components/CoverImage.tsx` | Card + meta + cover/fallback (T6) |
| `components/TrendingList.tsx` | Recent-posts rail (T7) |
| `components/LayoutWrapper.tsx` | Ticker + header + main + footer (T8) |
| `app/Main.tsx` | Magazine homepage (T9) |
| `app/_sectionPage.tsx` | Card-grid section pages (T10) |
| `layouts/PostLayout.tsx` | Restyled article page + related + share (T11) |
| `docs/frontmatter-templates.md` | Document `images` cover usage (T12) |

---

## Task 1: Midnight theme tokens + dark-only + Inter

**Files:**
- Modify: `css/tailwind.css`
- Modify: `app/theme-providers.tsx`
- Modify: `components/Header.tsx` (remove ThemeSwitch only)

- [ ] **Step 1: Replace the color tokens and add base styles in `css/tailwind.css`.** In the `@theme` block, replace the `--color-primary-*` ramp with a cyan ramp and add semantic Midnight tokens. Replace the existing `--color-primary-50` … `--color-primary-950` lines with:

```css
  /* Accent (cyan) */
  --color-primary-50: #ecfeff;
  --color-primary-100: #cffafe;
  --color-primary-200: #a5f3fc;
  --color-primary-300: #67e8f9;
  --color-primary-400: #22d3ee;
  --color-primary-500: #06b6d4;
  --color-primary-600: #0891b2;
  --color-primary-700: #0e7490;
  --color-primary-800: #155e75;
  --color-primary-900: #164e63;
  --color-primary-950: #083344;

  /* Midnight surfaces */
  --color-base: #0b1220;
  --color-ticker: #060b16;
  --color-header: #0f1a2e;
  --color-surface: #131c31;
  --color-line: #1e293b;
  --color-accent: #22d3ee;
  --color-up: #34d399;
  --color-down: #f43f5e;

  /* Category colours */
  --color-news: #3b82f6;
  --color-guide: #10b981;
  --color-breakdown: #a855f7;
  --color-review: #f59e0b;
```

Also change the `--font-sans` line so Inter is the default font family. Replace:
```css
  --font-sans: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji',
    'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
```
with:
```css
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji',
    'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
```

- [ ] **Step 2: Add base background/text in `css/tailwind.css`.** Find the `@layer base {` block and add these rules inside it (after the existing `*` border rule):

```css
  html {
    color-scheme: dark;
  }
  body {
    background-color: var(--color-base);
    color: #e5e7eb;
  }
  h1, h2, h3, h4 {
    color: #f1f5f9;
  }
```

- [ ] **Step 3: Force dark theme in `app/theme-providers.tsx`.** Replace the file contents with:

```tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Ensure `<html>` is dark by default.** In `app/layout.tsx`, find the `<html ...>` opening tag and make sure its className includes `dark` (so SSR renders dark before hydration). If it reads e.g. `<html lang={siteMetadata.language} className="scroll-smooth" suppressHydrationWarning>`, change the className to `"dark scroll-smooth"`. (If a `dark` class is already present, leave it.)

- [ ] **Step 5: Remove the theme switch from the header.** In `components/Header.tsx`, delete the `import ThemeSwitch from './ThemeSwitch'` line and remove the `<ThemeSwitch />` element from the JSX. Leave everything else for now (full header restyle is Task 8). `components/ThemeSwitch.tsx` stays on disk, unused.

- [ ] **Step 6: Build and verify dark theme applies.**

Run: `corepack yarn build`
Expected: PASS. Then:
```bash
grep -c "var(--color-base)" .next/static/css/*.css 2>/dev/null || echo "check css emitted"
grep -rc "ThemeSwitch" components/Header.tsx || echo "ThemeSwitch removed from header (correct)"
```
Expected: build succeeds; `ThemeSwitch` no longer referenced in Header.

- [ ] **Step 7: Commit.**
```bash
git add css/tailwind.css app/theme-providers.tsx app/layout.tsx components/Header.tsx
git commit -m "Add Midnight dark theme tokens and force dark mode"
```

---

## Task 2: Section colours + CategoryChip (TDD)

**Files:**
- Modify: `lib/sections.ts`
- Test: `lib/sections.test.ts` (extend)
- Create: `components/CategoryChip.tsx`

- [ ] **Step 1: Extend the section tests.** In `lib/sections.test.ts`, add this block after the existing `SECTIONS registry` describe:

```ts
describe('section presentation', () => {
  it('gives every section a singular label and a chip class', () => {
    for (const s of SECTIONS) {
      expect(typeof s.label).toBe('string')
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.chipClass).toMatch(/^bg-/)
    }
  })
  it('maps types to expected labels', () => {
    expect(getSection('news')?.label).toBe('News')
    expect(getSection('guide')?.label).toBe('Guide')
    expect(getSection('breakdown')?.label).toBe('Breakdown')
    expect(getSection('review')?.label).toBe('Review')
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail.**

Run: `corepack yarn test`
Expected: FAIL — `label`/`chipClass` are undefined on `Section`.

- [ ] **Step 3: Extend `Section` in `lib/sections.ts`.** Replace the `Section` interface and `SECTIONS` array with:

```ts
export interface Section {
  type: PostType
  route: string
  title: string
  label: string
  description: string
  chipClass: string
}

export const SECTIONS: Section[] = [
  { type: 'news', route: '/news', title: 'News', label: 'News', description: 'The latest cryptocurrency and blockchain news.', chipClass: 'bg-news text-white' },
  { type: 'guide', route: '/guides', title: 'Guides', label: 'Guide', description: 'Practical guides and explainers for crypto.', chipClass: 'bg-guide text-[#06210f]' },
  { type: 'breakdown', route: '/breakdowns', title: 'Token Breakdowns', label: 'Breakdown', description: 'In-depth breakdowns of crypto tokens and projects.', chipClass: 'bg-breakdown text-white' },
  { type: 'review', route: '/reviews', title: 'Reviews', label: 'Review', description: 'Honest reviews of exchanges, wallets, and tools.', chipClass: 'bg-review text-[#231405]' },
]
```
(Leave `getSection` and `filterByType` unchanged.)

- [ ] **Step 4: Run tests to verify they pass.**

Run: `corepack yarn test`
Expected: PASS — all section + structuredData tests pass.

- [ ] **Step 5: Create `components/CategoryChip.tsx`.**

```tsx
import { getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'

export default function CategoryChip({ type }: { type: PostType }) {
  const section = getSection(type)
  if (!section) return null
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wide uppercase ${section.chipClass}`}
    >
      {section.label}
    </span>
  )
}
```

- [ ] **Step 6: Commit.**
```bash
git add lib/sections.ts lib/sections.test.ts components/CategoryChip.tsx
git commit -m "Add section colours and CategoryChip component"
```

---

## Task 3: Market formatters (TDD)

**Files:**
- Create: `lib/markets/format.ts`
- Test: `lib/markets/format.test.ts`

> Note: `vitest.config.ts` includes `lib/**/*.test.ts`, so `lib/markets/format.test.ts` is picked up automatically.

- [ ] **Step 1: Write failing tests.** Create `lib/markets/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatUsd, formatPercent, changeDirection } from './format'

describe('formatUsd', () => {
  it('formats large prices with thousands separators and no decimals', () => {
    expect(formatUsd(68420)).toBe('$68,420')
  })
  it('formats sub-dollar prices with up to 4 decimals', () => {
    expect(formatUsd(0.6234)).toBe('$0.6234')
  })
  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0.00')
  })
})

describe('formatPercent', () => {
  it('adds a + sign and 2 decimals for gains', () => {
    expect(formatPercent(2.1)).toBe('+2.10%')
  })
  it('keeps the - sign for losses', () => {
    expect(formatPercent(-0.8)).toBe('-0.80%')
  })
  it('treats null/undefined as 0', () => {
    expect(formatPercent(null)).toBe('+0.00%')
  })
})

describe('changeDirection', () => {
  it('returns up/down/flat', () => {
    expect(changeDirection(1.2)).toBe('up')
    expect(changeDirection(-0.1)).toBe('down')
    expect(changeDirection(0)).toBe('flat')
    expect(changeDirection(null)).toBe('flat')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `corepack yarn test`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Implement `lib/markets/format.ts`.**

```ts
export function formatUsd(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (value === 0) return '$0.00'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function formatPercent(value: number | null | undefined): string {
  const n = typeof value === 'number' ? value : 0
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function changeDirection(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (typeof value !== 'number' || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `corepack yarn test`
Expected: PASS — all format tests pass.

- [ ] **Step 5: Commit.**
```bash
git add lib/markets/format.ts lib/markets/format.test.ts
git commit -m "Add market data formatters"
```

---

## Task 4: CoinGecko data source (TDD the mapper)

**Files:**
- Create: `lib/markets/coingecko.ts`
- Test: `lib/markets/coingecko.test.ts`

- [ ] **Step 1: Write failing tests for the mapper.** Create `lib/markets/coingecko.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapCoins } from './coingecko'

const sample = [
  {
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 68420,
    price_change_percentage_24h: 2.13,
    image: 'https://assets.coingecko.com/btc.png',
  },
  {
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 3512,
    price_change_percentage_24h: -1.02,
    image: 'https://assets.coingecko.com/eth.png',
  },
]

describe('mapCoins', () => {
  it('maps the CoinGecko payload to Coin objects with upper-case symbols', () => {
    const coins = mapCoins(sample)
    expect(coins).toEqual([
      { symbol: 'BTC', name: 'Bitcoin', price: 68420, change24h: 2.13, image: 'https://assets.coingecko.com/btc.png' },
      { symbol: 'ETH', name: 'Ethereum', price: 3512, change24h: -1.02, image: 'https://assets.coingecko.com/eth.png' },
    ])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error testing bad input
    expect(mapCoins(null)).toEqual([])
    // @ts-expect-error testing bad input
    expect(mapCoins({})).toEqual([])
  })
  it('coerces missing change to 0', () => {
    const coins = mapCoins([{ symbol: 'x', name: 'X', current_price: 1, image: '' }])
    expect(coins[0].change24h).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `corepack yarn test`
Expected: FAIL — cannot find module `./coingecko`.

- [ ] **Step 3: Implement `lib/markets/coingecko.ts`.**

```ts
export interface Coin {
  symbol: string
  name: string
  price: number
  change24h: number
  image: string
}

interface CoinGeckoMarket {
  symbol: string
  name: string
  current_price: number
  price_change_percentage_24h?: number | null
  image: string
}

const ENDPOINT =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h'

export function mapCoins(payload: CoinGeckoMarket[]): Coin[] {
  if (!Array.isArray(payload)) return []
  return payload.map((c) => ({
    symbol: (c.symbol || '').toUpperCase(),
    name: c.name,
    price: c.current_price,
    change24h: typeof c.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : 0,
    image: c.image,
  }))
}

// Server-side, ISR-cached (revalidate every 60s). Returns [] on any failure so
// the UI degrades gracefully and never throws during render.
export async function getTopCoins(): Promise<Coin[]> {
  try {
    const res = await fetch(ENDPOINT, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()
    return mapCoins(data)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `corepack yarn test`
Expected: PASS — all coingecko mapper tests pass.

- [ ] **Step 5: Commit.**
```bash
git add lib/markets/coingecko.ts lib/markets/coingecko.test.ts
git commit -m "Add CoinGecko market data source"
```

---

## Task 5: Ticker + TopCoins components

**Files:**
- Create: `components/Ticker.tsx`
- Create: `components/TopCoins.tsx`

- [ ] **Step 1: Create `components/Ticker.tsx`.**

```tsx
import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'

export default async function Ticker() {
  const coins = await getTopCoins()
  if (coins.length === 0) return null
  return (
    <div className="bg-ticker border-line border-b">
      <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 py-1.5 text-[12.5px] whitespace-nowrap text-gray-400">
        {coins.map((c) => {
          const dir = changeDirection(c.change24h)
          return (
            <span key={c.symbol} className="shrink-0">
              <span className="font-semibold text-gray-100">{c.symbol}</span>{' '}
              {formatUsd(c.price)}{' '}
              <span className={dir === 'down' ? 'text-down' : 'text-up'}>
                {formatPercent(c.change24h)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/TopCoins.tsx`.**

```tsx
import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'

export default async function TopCoins() {
  const coins = (await getTopCoins()).slice(0, 5)
  return (
    <div className="bg-surface border-line rounded-xl border p-3">
      <h3 className="text-accent mb-1.5 text-xs font-semibold tracking-wider uppercase">Top coins</h3>
      {coins.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">Market data unavailable.</p>
      ) : (
        coins.map((c) => {
          const dir = changeDirection(c.change24h)
          return (
            <div
              key={c.symbol}
              className="border-line flex items-center justify-between border-b py-1.5 text-sm last:border-b-0"
            >
              <span className="font-semibold text-gray-100">{c.name}</span>
              <span className="text-gray-300">
                {formatUsd(c.price)}{' '}
                <span className={dir === 'down' ? 'text-down' : 'text-up'}>
                  {formatPercent(c.change24h)}
                </span>
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build to verify components compile.**

Run: `corepack yarn build`
Expected: PASS (components aren't rendered anywhere yet; this just checks they typecheck/compile).

- [ ] **Step 4: Commit.**
```bash
git add components/Ticker.tsx components/TopCoins.tsx
git commit -m "Add Ticker and TopCoins market components"
```

---

## Task 6: PostCard + CoverImage + ArticleMeta

**Files:**
- Create: `components/CoverImage.tsx`
- Create: `components/ArticleMeta.tsx`
- Create: `components/PostCard.tsx`

- [ ] **Step 1: Create `components/CoverImage.tsx`** (renders the post image, or a category-coloured gradient fallback).

```tsx
import type { PostType } from '@/lib/structuredData'

const GRADIENTS: Record<PostType, string> = {
  news: 'from-blue-700 to-base',
  guide: 'from-emerald-700 to-base',
  breakdown: 'from-purple-700 to-base',
  review: 'from-amber-700 to-base',
}

export default function CoverImage({
  src,
  type,
  className = '',
}: {
  src?: string
  type: PostType
  className?: string
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`object-cover ${className}`} />
  }
  return <div className={`bg-gradient-to-br ${GRADIENTS[type]} ${className}`} />
}
```

- [ ] **Step 2: Create `components/ArticleMeta.tsx`.**

```tsx
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

export default function ArticleMeta({
  date,
  readingTime,
  author = 'CoinCoach',
}: {
  date: string
  readingTime?: number
  author?: string
}) {
  return (
    <div className="mt-1.5 text-xs text-gray-400">
      <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
      {' · '}
      {author}
      {typeof readingTime === 'number' ? ` · ${Math.ceil(readingTime)} min read` : ''}
    </div>
  )
}
```

- [ ] **Step 3: Create `components/PostCard.tsx`.** Accepts a core-content post (from `allCoreContent`).

```tsx
import Link from '@/components/Link'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import type { PostType } from '@/lib/structuredData'

export interface CardPost {
  slug: string
  title: string
  postType: PostType
  images?: string[] | string
  date: string
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostCard({ post }: { post: CardPost }) {
  return (
    <article className="bg-surface border-line overflow-hidden rounded-lg border transition-colors hover:border-gray-600">
      <Link href={`/blog/${post.slug}`}>
        <CoverImage src={firstImage(post.images)} type={post.postType} className="h-24 w-full" />
        <div className="p-2.5">
          <CategoryChip type={post.postType} />
          <h4 className="mt-1.5 text-[13.5px] leading-snug font-semibold text-gray-100">
            {post.title}
          </h4>
        </div>
      </Link>
    </article>
  )
}
```

- [ ] **Step 4: Build to verify compile.**

Run: `corepack yarn build`
Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add components/CoverImage.tsx components/ArticleMeta.tsx components/PostCard.tsx
git commit -m "Add PostCard, CoverImage and ArticleMeta components"
```

---

## Task 7: TrendingList component

**Files:**
- Create: `components/TrendingList.tsx`

- [ ] **Step 1: Create `components/TrendingList.tsx`.**

```tsx
import Link from '@/components/Link'

export interface TrendingItem {
  slug: string
  title: string
}

export default function TrendingList({ posts }: { posts: TrendingItem[] }) {
  return (
    <div>
      <h3 className="text-accent mb-0.5 text-xs font-semibold tracking-wider uppercase">Trending</h3>
      {posts.map((post, i) => (
        <div key={post.slug} className="border-line flex gap-2.5 border-b py-2.5 last:border-b-0">
          <span className="text-accent min-w-[18px] text-[15px] font-extrabold">{i + 1}</span>
          <Link
            href={`/blog/${post.slug}`}
            className="text-[13.5px] leading-snug font-semibold text-gray-100 hover:text-accent"
          >
            {post.title}
          </Link>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify compile.**

Run: `corepack yarn build`
Expected: PASS.

- [ ] **Step 3: Commit.**
```bash
git add components/TrendingList.tsx
git commit -m "Add TrendingList component"
```

---

## Task 8: Layout shell — ticker, header, footer

**Files:**
- Modify: `components/LayoutWrapper.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/Footer.tsx`
- Modify: `components/MobileNav.tsx` (only if it references ThemeSwitch / needs dark styling)

- [ ] **Step 1: Add the Ticker above the header in `components/LayoutWrapper.tsx`.** Replace the file with:

```tsx
import { Inter } from 'next/font/google'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import { ReactNode } from 'react'
import Header from './Header'
import Ticker from './Ticker'

interface Props {
  children: ReactNode
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const LayoutWrapper = ({ children }: Props) => {
  return (
    <div className={`${inter.variable} flex min-h-screen flex-col font-sans`}>
      <Ticker />
      <Header />
      <SectionContainer>
        <main className="mb-auto">{children}</main>
      </SectionContainer>
      <Footer />
    </div>
  )
}

export default LayoutWrapper
```
> Note: `--font-inter` is referenced by the `--font-sans` token set in Task 1.

- [ ] **Step 2: Restyle `components/Header.tsx`.** Replace the file with a sticky Midnight header (CoinCoach wordmark with cyan "Coach", section nav, Kbar search button, mobile nav). Use this:

```tsx
import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import MobileNav from './MobileNav'
import SearchButton from './SearchButton'

const Header = () => {
  return (
    <header className="bg-header border-line sticky top-0 z-50 border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" aria-label={siteMetadata.headerTitle}>
          <div className="text-xl font-extrabold tracking-tight text-gray-100">
            Coin<span className="text-accent">Coach</span>
          </div>
        </Link>
        <div className="flex items-center gap-5">
          <nav className="hidden gap-5 text-sm font-medium text-gray-300 sm:flex">
            {headerNavLinks
              .filter((link) => link.href !== '/')
              .map((link) => (
                <Link key={link.title} href={link.href} className="hover:text-accent">
                  {link.title}
                </Link>
              ))}
          </nav>
          <SearchButton />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export default Header
```

- [ ] **Step 3: Build and confirm the header/ticker compose.**

Run: `corepack yarn build`
Expected: PASS. Header renders with ticker above it (the ticker shows only if CoinGecko responds during build/runtime; `[]` → hidden, which is fine).

- [ ] **Step 4: Restyle `components/Footer.tsx`.** Replace the file with:

```tsx
import Link from './Link'
import siteMetadata from '@/data/siteMetadata'

export default function Footer() {
  return (
    <footer className="border-line mt-10 border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-[12.5px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} {siteMetadata.headerTitle} — Crypto news, guides, breakdowns &amp;
          reviews
        </div>
        <div className="flex gap-4">
          <Link href="/feed.xml" className="hover:text-accent">
            RSS
          </Link>
          <Link href="/about" className="hover:text-accent">
            About
          </Link>
          <Link href="/tags" className="hover:text-accent">
            Tags
          </Link>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Check `components/MobileNav.tsx` styling.** Open it; if it references `ThemeSwitch`, remove that import/usage. Ensure its panel uses dark surfaces — if it uses `bg-white dark:bg-gray-950`, that's fine under forced dark. No change needed beyond removing any ThemeSwitch usage. If no ThemeSwitch is referenced, leave the file unchanged.

- [ ] **Step 6: Build to verify.**

Run: `corepack yarn build`
Expected: PASS.

- [ ] **Step 7: Commit.**
```bash
git add components/LayoutWrapper.tsx components/Header.tsx components/Footer.tsx components/MobileNav.tsx
git commit -m "Restyle layout shell with ticker, header and footer"
```

---

## Task 9: Magazine homepage

**Files:**
- Modify: `app/Main.tsx`
- Verify: `app/page.tsx` (passes `posts` to `Main`)

- [ ] **Step 1: Inspect `app/page.tsx`** to confirm it renders `<Main posts={...} />` with sorted core-content posts. (It does in the starter: `const posts = allCoreContent(sortPosts(allBlogs)); return <Main posts={posts} />`.) No change needed; if it differs, adapt Step 2's prop usage accordingly.

- [ ] **Step 2: Replace `app/Main.tsx`** with the magazine layout (hero split + rail + topic bands). The component is an async server component so it can render the async `TopCoins`.

```tsx
import Link from '@/components/Link'
import PostCard from '@/components/PostCard'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import ArticleMeta from '@/components/ArticleMeta'
import TrendingList from '@/components/TrendingList'
import TopCoins from '@/components/TopCoins'
import { SECTIONS, filterByType } from '@/lib/sections'

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Home({ posts }: { posts: any[] }) {
  const lead = posts.find((p) => p.postType === 'news') ?? posts[0]
  const trending = posts.filter((p) => p.slug !== lead?.slug).slice(0, 4)

  return (
    <div className="py-6">
      {/* Hero split */}
      {lead && (
        <section className="grid gap-5 md:grid-cols-[1.7fr_1fr]">
          <article className="bg-surface border-line overflow-hidden rounded-xl border">
            <Link href={`/blog/${lead.slug}`}>
              <CoverImage src={firstImage(lead.images)} type={lead.postType} className="h-56 w-full" />
              <div className="p-4">
                <CategoryChip type={lead.postType} />
                <h1 className="mt-2.5 text-2xl leading-tight font-extrabold tracking-tight text-gray-50">
                  {lead.title}
                </h1>
                <ArticleMeta date={lead.date} readingTime={lead.readingTime?.minutes} />
              </div>
            </Link>
          </article>
          <aside className="flex flex-col gap-4">
            <TrendingList posts={trending} />
            <TopCoins />
          </aside>
        </section>
      )}

      {/* Topic bands */}
      {SECTIONS.map((section) => {
        const sectionPosts = filterByType(posts, section.type).slice(0, 4)
        if (sectionPosts.length === 0) return null
        return (
          <section key={section.type} className="border-line mt-6 border-t pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">{section.title}</h2>
              <Link href={section.route} className="text-accent text-xs font-semibold">
                View all ›
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {sectionPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Build and verify homepage renders.**

Run: `corepack yarn build`
Expected: PASS. Then confirm the hero + a band render in the static HTML:
```bash
grep -c "Welcome to CoinCoach" .next/server/app/index.html
grep -c "View all" .next/server/app/index.html
```
Expected: lead headline present; at least one "View all" band link present.

- [ ] **Step 4: Commit.**
```bash
git add app/Main.tsx
git commit -m "Rebuild homepage as magazine layout"
```

---

## Task 10: Card-grid section pages

**Files:**
- Modify: `app/_sectionPage.tsx`

- [ ] **Step 1: Replace `app/_sectionPage.tsx`** with a card-grid listing (drops `ListLayoutWithTags`, keeps the section title/description and `sectionMetadata` with its canonical from the prior work).

```tsx
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import PostCard from '@/components/PostCard'
import { filterByType, getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

export function sectionMetadata(type: PostType): Metadata {
  const section = getSection(type)!
  return {
    ...genPageMetadata({ title: section.title, description: section.description }),
    alternates: { canonical: section.route },
  }
}

export default function SectionPage({ type }: { type: PostType }) {
  const section = getSection(type)!
  const posts = filterByType(allCoreContent(sortPosts(allBlogs)), type)

  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-50">{section.title}</h1>
      <p className="mt-2 text-gray-400">{section.description}</p>
      {posts.length === 0 ? (
        <p className="mt-8 text-gray-400">No posts yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
```
> The four `app/<section>/page.tsx` wrappers already import `SectionPage` + `sectionMetadata` — no change needed there.

- [ ] **Step 2: Build and verify a section page renders as a grid.**

Run: `corepack yarn build`
Expected: PASS. Then:
```bash
grep -c "Ledger Nano X Review" .next/server/app/reviews.html
grep -c "What Is Staking" .next/server/app/reviews.html
```
Expected: reviews page shows the review (≥1) and not the guide (0).

- [ ] **Step 3: Commit.**
```bash
git add app/_sectionPage.tsx
git commit -m "Convert section pages to card grid"
```

---

## Task 11: Article page restyle + related + share

**Files:**
- Modify: `layouts/PostLayout.tsx`

- [ ] **Step 1: Inspect `layouts/PostLayout.tsx`** to learn its props. In the starter it is `function PostLayout({ content, authorDetails, next, prev, children })` where `content` is the core post (has `title`, `date`, `tags`, `slug`, `postType` after our schema change, `readingTime`, `images`). Note the prop names for Step 2.

- [ ] **Step 2: Replace `layouts/PostLayout.tsx`** with a Midnight article layout: cover hero, category chip, title, meta, prose body, tags, share, and a related-posts strip.

```tsx
import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import Tag from '@/components/Tag'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import ArticleMeta from '@/components/ArticleMeta'
import PostCard from '@/components/PostCard'
import { filterByType } from '@/lib/sections'
import siteMetadata from '@/data/siteMetadata'

interface LayoutProps {
  content: CoreContent<Blog>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authorDetails?: any[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostLayout({ content, children }: LayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slug, date, title, tags, readingTime, images, postType } = content as any
  const shareUrl = `${siteMetadata.siteUrl}/blog/${slug}`
  const related = filterByType(allCoreContent(sortPosts(allBlogs)), postType)
    .filter((p) => p.slug !== slug)
    .slice(0, 3)

  return (
    <article className="py-8">
      <div className="mx-auto max-w-3xl">
        <CategoryChip type={postType} />
        <PageTitle>{title}</PageTitle>
        <ArticleMeta date={date} readingTime={readingTime?.minutes} />
        <CoverImage
          src={firstImage(images)}
          type={postType}
          className="mt-5 h-64 w-full rounded-xl"
        />
        <div className="prose prose-invert mt-6 max-w-none">{children}</div>

        {tags && tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((t: string) => (
              <Tag key={t} text={t} />
            ))}
          </div>
        )}

        <div className="border-line mt-8 flex gap-4 border-t pt-4 text-sm text-gray-400">
          <span>Share:</span>
          <a
            className="hover:text-accent"
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
          >
            X
          </a>
          <a
            className="hover:text-accent"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          >
            LinkedIn
          </a>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-12 max-w-5xl">
          <h2 className="mb-3 text-lg font-bold text-gray-100">Related</h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {related.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
```
> This drops the author sidebar and prev/next nav for a cleaner magazine read. The `app/blog/[...slug]/page.tsx` still injects JSON-LD and passes `content`/`children`; it passes extra props (`authorDetails`, `next`, `prev`) which this component accepts but ignores — no change needed there.

- [ ] **Step 3: Build and verify an article renders with the new layout + related.**

Run: `corepack yarn build`
Expected: PASS. Then:
```bash
grep -c "Related" .next/server/app/blog/ledger-nano-x-review.html
grep -c "prose-invert" .next/server/app/blog/ledger-nano-x-review.html
```
Expected: article shows a "Related" strip and the inverted prose body.

- [ ] **Step 4: Commit.**
```bash
git add layouts/PostLayout.tsx
git commit -m "Restyle article page with cover, share and related posts"
```

---

## Task 12: Docs + final verification

**Files:**
- Modify: `docs/frontmatter-templates.md`

- [ ] **Step 1: Document cover images** in `docs/frontmatter-templates.md`. Add this section near the top (after the intro paragraph):

```markdown
## Cover images

Each article may set an optional cover image used by cards and the article hero:

\`\`\`yaml
images: ['/static/images/my-cover.jpg']
\`\`\`

Place the file under `public/static/images/`. When `images` is omitted, a
category-coloured gradient placeholder is shown automatically.
```

- [ ] **Step 2: Full verification.**

Run: `corepack yarn test`
Expected: PASS — all unit tests (structuredData + sections + format + coingecko mapper).

Run: `corepack yarn build`
Expected: clean build. Then:
```bash
ls .next/standalone/server.js public/search.json public/news/feed.xml
grep -rl "draft-example" public/search.json public/feed.xml 2>/dev/null && echo "DRAFT LEAK (BAD)" || echo "draft excluded (correct)"
```
Expected: standalone server + feeds + search present; no draft leak.

- [ ] **Step 3: Commit and push.**
```bash
git add docs/frontmatter-templates.md
git commit -m "Document cover image frontmatter"
git push origin master
```
> Note: this plan commits to `master`. If executed on a branch (recommended), push that branch and open a PR instead.

---

## Self-Review Notes

- **Spec coverage:** global theme + dark-only + Inter (T1), section colours/chips (T2), market formatters (T3), CoinGecko source (T4), Ticker/TopCoins (T5), Card/Cover/Meta (T6), TrendingList (T7), layout shell w/ ticker (T8), magazine homepage (T9), card-grid sections (T10), article restyle + related + share (T11), cover-image docs + verification (T12). Market data is server-side + ISR-cached + graceful-empty per spec; CSP unchanged.
- **postType everywhere:** all post reads use `postType` (the Contentlayer field), consistent with the prior build. `CardPost`/card code read `post.postType` and `post.images`.
- **Type consistency:** `Coin { symbol, name, price, change24h, image }` defined in T4 and consumed identically in T5. `formatUsd/formatPercent/changeDirection` signatures match between T3 and T5. `CategoryChip`/section `chipClass`/`label` from T2 used by T5/T6/T9/T11.
- **Tailwind tokens:** semantic utilities (`bg-surface`, `border-line`, `text-accent`, `bg-news`, `text-up`/`text-down`, `bg-ticker`, `bg-header`) come from the `--color-*` tokens added in T1, so they exist before first use in T5+.
- **Coin logos / images:** v1 renders coin text only (no CoinGecko images), so CSP/`remotePatterns` are untouched. Article/card images use local `images` paths or gradient fallbacks via `CoverImage` (plain `<img>`, no remote domain needed).
- **Reduced-scope guardrail:** no token-detail live pages, no light mode — matches spec non-goals.
