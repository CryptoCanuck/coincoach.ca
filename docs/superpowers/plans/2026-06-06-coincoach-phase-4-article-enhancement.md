# Phase 4 — Article Page Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the blog article page (`layouts/PostLayout.tsx`) to the Direction-B "Article.html" design — a two-column layout with a rich byline/hero header, enhanced prose (pull-quote, captioned figures, inline live-price coin card), author bio, Related Stories, and a right sidebar (Market Sentiment gauge, "Coins in this story", an "Ask the Coach" placeholder, and Trending).

**Architecture:** The article remains a server-rendered RSC. All market data (the inline coin card + "Coins in this story") is fetched **server-side** in `app/blog/[...slug]/page.tsx` via a new `getMarketsByIds` helper and passed down as props — no client fetching, so the existing CSP (`connect-src 'self'`) is untouched. The inline `<CoinCard>` is an MDX component that reads server-fetched coin data through a thin client React context (`CoinDataProvider`) that wraps the MDX body, so authors place the card inline (`<CoinCard id="bitcoin" />`) without the component fetching anything itself. A new `coins: [bitcoin, ethereum]` frontmatter field (CoinGecko **ids**, consistent with Phase 3b `/charts/[id]` routing) drives both the sidebar table and which ids are available to inline cards.

**Tech Stack:** Next.js 15 App Router (RSC), TypeScript, Tailwind v4, Contentlayer2 + Pliny MDX, Vitest (pure-function tests only). CoinGecko `/coins/markets?ids=` (server-side, ISR) and alternative.me Fear & Greed (existing `getFearGreed`).

---

## Background the implementer needs

- **Yarn is Berry via corepack.** `yarn` is NOT on PATH. Always run `corepack yarn <cmd>`.
- **Authoritative checks:** `corepack yarn tsc --noEmit` (typecheck), `corepack yarn vitest run` (unit tests), `corepack yarn build` (full build incl. ESLint `prettier/prettier`). Trust these over any IDE/LSP diagnostics, which are often stale on new files.
- **Pre-commit Prettier hook** reformats staged files; the build's ESLint also enforces `prettier/prettier`. Match the existing formatting (2-space indent, no semicolons, single quotes).
- **Commits:** author solely as the user — **no** `Co-Authored-By`/AI-attribution trailers. Prefer small, logically-scoped commits (one per task here).
- **Palette tokens** (defined in `css/tailwind.css` `@theme`): `--color-amber` (brand, also `accent`), `--color-blue`, `--color-up` (green), `--color-down` (red). Tailwind utility aliases in use across the repo: `bg-surface`, `border-line`, `border-line-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-accent`, `text-up`, `text-down`, `bg-fill`, `bg-fill-2`. Reuse these — do not introduce new color literals except inside the coach gradient (which the design specifies explicitly).
- **Design reference:** `/tmp/design_handoff/coincoach/project/design_handoff_coincoach/page-article.jsx` (and `Article.html`). Numbers in the mock are placeholders; match structure/spacing/typography, not literal values.
- **`trailingSlash: true`** is on — when smoke-testing with curl, request `/blog/<slug>/` and use `-L`. React SSR inserts `<!-- -->` comment separators between adjacent dynamic+static text; account for it when grepping rendered HTML.
- **CoinGecko free tier rate-limits (HTTP 429)** after many calls in quick succession (build fires the OHLC/markets calls). If a smoke test shows missing market data, wait ~60s for the window to reset and retry; graceful empty/null fallback is expected behavior, not a bug.

## Existing components & helpers to REUSE (do not recreate)

- `@/components/Breadcrumb` — `Breadcrumb({ items: { label: string; href?: string }[] })`. Last item renders as current text.
- `@/components/CategoryChip` — `CategoryChip({ type: PostType })` renders the section pill.
- `@/components/CoverImage` — `CoverImage({ src?, type, className })` (img or gradient fallback).
- `@/components/Gauge` — `Gauge({ value?: number; label?: string; size?: 'lg'|'sm'|'xl' })`. Use `size="sm"` (160×90) in the sidebar.
- `@/components/CoinLogo` — `CoinLogo({ sym: string; size?: number })`.
- `@/components/Link` — internal/external link wrapper (use for all links).
- `@/components/Tag` — `Tag({ text })` links to `/tags/<slug>`.
- `@/components/StoryCard` — `StoryCard({ post })` card with cover, chip, title, meta. `post` is `CardPost & { readingTime?: { minutes: number } }`.
- `@/components/SectionHeading` — `SectionHeading({ title, barColor?, moreLabel?, moreHref? })` (accent-bar heading).
- `@/components/TrendingList` — `TrendingList({ posts: { slug: string; title: string }[] })`.
- `@/lib/markets/format` — `formatUsd`, `formatPercent`, `changeDirection`.
- `@/lib/markets/coingecko` — `Coin` type, `mapCoins`, `getTopCoins`. **You will add `getMarketsByIds`, `marketsByIdsUrl`, `pickCoin` here.**
- `@/lib/markets/sentiment` — `getFearGreed(): Promise<{ value, label } | null>`.
- `@/lib/sections` — `getSection(type): Section | undefined` (`.title`, `.route`, `.label`).
- `pliny/utils/contentlayer` — `coreContent`, `allCoreContent`, `sortPosts`.
- `pliny/mdx-components` — `MDXLayoutRenderer({ code, components, toc? })`.

## File Structure (what each new/changed file owns)

- `contentlayer.config.ts` — **modify**: add `coins` list field to the `Blog` document type.
- `lib/markets/coingecko.ts` — **modify**: add `marketsByIdsUrl(ids)`, `getMarketsByIds(ids)`, `pickCoin(coins, id)`.
- `lib/markets/coingecko.test.ts` — **modify**: tests for `marketsByIdsUrl` and `pickCoin`.
- `components/CoinDataProvider.tsx` — **create** (client): React context carrying the article's server-fetched `Coin[]` to inline `<CoinCard>`s.
- `components/CoinCard.tsx` — **create** (client): inline coin price card MDX component; reads context.
- `components/PullQuote.tsx` — **create** (server): styled pull-quote MDX component.
- `components/Figure.tsx` — **create** (server): captioned image MDX component.
- `components/MDXComponents.tsx` — **modify**: register `CoinCard`, `PullQuote`, `Figure`.
- `components/ArticleByline.tsx` — **create** (server): avatar + author/role/date/read-time + share chips row.
- `components/AuthorBio.tsx` — **create** (server): author bio box (avatar, name, role, bio body).
- `components/CoinsInStory.tsx` — **create** (server): sidebar panel listing the article's coins (links to `/charts/[id]`).
- `components/ArticleCoachBox.tsx` — **create** (server): "Ask the Coach" placeholder panel for the sidebar.
- `components/ArticleSidebar.tsx` — **create** (server): assembles the four sidebar panels.
- `layouts/PostLayout.tsx` — **rewrite**: two-column article layout wiring everything together.
- `app/blog/[...slug]/page.tsx` — **modify**: server-fetch coin data + Fear&Greed + primary-author bio; pass to `PostLayout`.
- `css/tailwind.css` — **modify**: prose `h4` and figure/pull-quote spacing under `.prose-invert`.
- `data/blog/<one existing post>.mdx` — **modify**: add a `coins:` frontmatter entry to one real article so the feature renders during smoke (pick an existing published post).

---

### Task 1: Frontmatter field + market-by-ids data helpers

Adds the `coins` frontmatter field and the server helper that fetches those coins, plus the pure helpers the inline card and tests rely on.

**Files:**
- Modify: `contentlayer.config.ts` (Blog `fields`, ~line 101-116)
- Modify: `lib/markets/coingecko.ts`
- Modify: `lib/markets/coingecko.test.ts`

- [ ] **Step 1: Add the `coins` frontmatter field**

In `contentlayer.config.ts`, inside the `Blog` document type's `fields` object (after the `rating` field, before the closing `},` of `fields`), add:

```ts
    rating: { type: 'number' },
    coins: { type: 'list', of: { type: 'string' }, default: [] },
```

(Keep the existing `rating` line; the `coins` line is the addition. The value is a list of CoinGecko ids, e.g. `[bitcoin, ethereum]`.)

- [ ] **Step 2: Write failing tests for `marketsByIdsUrl` and `pickCoin`**

In `lib/markets/coingecko.test.ts`, update the import line and append two new `describe` blocks at the end of the file:

```ts
import { mapCoins, splitMovers, marketsByIdsUrl, pickCoin } from './coingecko'
```

```ts
describe('marketsByIdsUrl', () => {
  it('joins ids with commas and url-encodes them', () => {
    expect(marketsByIdsUrl(['bitcoin', 'ethereum'])).toBe(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin%2Cethereum&order=market_cap_desc&price_change_percentage=24h'
    )
  })
})

describe('pickCoin', () => {
  const coins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 1, change24h: 1, image: '' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2, change24h: 2, image: '' },
  ]
  it('returns the coin matching the id', () => {
    expect(pickCoin(coins, 'ethereum')?.symbol).toBe('ETH')
  })
  it('returns null when no coin matches', () => {
    expect(pickCoin(coins, 'dogecoin')).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `corepack yarn vitest run lib/markets/coingecko.test.ts`
Expected: FAIL — `marketsByIdsUrl is not a function` / `pickCoin is not a function`.

- [ ] **Step 4: Implement `marketsByIdsUrl`, `getMarketsByIds`, `pickCoin`**

In `lib/markets/coingecko.ts`, add the URL builder near `marketsUrl` (after the `marketsUrl` function, ~line 35):

```ts
// Markets endpoint scoped to specific CoinGecko ids (article "coins in this story").
export function marketsByIdsUrl(ids: string[]): string {
  const idParam = encodeURIComponent(ids.join(','))
  return `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idParam}&order=market_cap_desc&price_change_percentage=24h`
}
```

Add `pickCoin` after `splitMovers` (~line 58):

```ts
// Find a coin by its CoinGecko id (used by the inline article coin card). null if absent.
export function pickCoin(coins: Coin[], id: string): Coin | null {
  return coins.find((c) => c.id === id) ?? null
}
```

Add the fetcher after `getMovers` (end of file):

```ts
// Live data for a specific set of coins (by id), server-side + ISR-cached (60s).
// [] for an empty id list or on failure. Reuses mapCoins (drops empty-id rows).
export async function getMarketsByIds(ids: string[]): Promise<Coin[]> {
  if (!ids.length) return []
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(marketsByIdsUrl(ids), {
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
```

- [ ] **Step 5: Run tests + typecheck to verify they pass**

Run: `corepack yarn vitest run lib/markets/coingecko.test.ts && corepack yarn tsc --noEmit`
Expected: PASS (all tests green), tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add contentlayer.config.ts lib/markets/coingecko.ts lib/markets/coingecko.test.ts
git commit -m "Add coins frontmatter field and getMarketsByIds helper"
```

---

### Task 2: Article byline component

A reusable byline row: avatar, author name, "role · date · read time", and share chips.

**Files:**
- Create: `components/ArticleByline.tsx`

- [ ] **Step 1: Create `components/ArticleByline.tsx`**

```tsx
import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

interface BylineProps {
  authorName: string
  authorAvatar?: string
  occupation?: string
  date: string
  readingTime?: number
  shareUrl: string
  title: string
}

// Article byline: avatar + author/role/date/read-time + share chips (design `.byline`).
export default function ArticleByline({
  authorName,
  authorAvatar,
  occupation,
  date,
  readingTime,
  shareUrl,
  title,
}: BylineProps) {
  const meta = [
    occupation,
    formatDate(date, siteMetadata.locale),
    typeof readingTime === 'number' ? `${Math.ceil(readingTime)} min read` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const chip =
    'border-line bg-fill text-ink-2 hover:text-ink flex h-[34px] items-center rounded-lg border px-3 text-[13px] font-bold'

  return (
    <div className="border-line my-5 flex items-center gap-3 border-b pb-5">
      {authorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={authorAvatar} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <div className="bg-fill h-11 w-11 rounded-full" />
      )}
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-100">By {authorName}</div>
        <div className="text-ink-3 mt-0.5 text-[12.5px] font-semibold">{meta}</div>
      </div>
      <div className="flex gap-2">
        <a
          className={chip}
          target="_blank"
          rel="noopener noreferrer"
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
        >
          𝕏
        </a>
        <a
          className={chip}
          target="_blank"
          rel="noopener noreferrer"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        >
          in
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/ArticleByline.tsx
git commit -m "Add ArticleByline component"
```

---

### Task 3: Prose MDX components — PullQuote, Figure, inline CoinCard + provider

The inline coin card reads server-fetched data via a client context so it never fetches itself.

**Files:**
- Create: `components/CoinDataProvider.tsx`
- Create: `components/CoinCard.tsx`
- Create: `components/PullQuote.tsx`
- Create: `components/Figure.tsx`
- Modify: `components/MDXComponents.tsx`
- Modify: `css/tailwind.css` (prose-invert block, ~line 151-164)

- [ ] **Step 1: Create the client context `components/CoinDataProvider.tsx`**

```tsx
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Coin } from '@/lib/markets/coingecko'

// Carries the article's server-fetched coin data to inline <CoinCard> MDX nodes,
// so the card renders live prices without any client-side fetching (CSP-safe).
const CoinDataContext = createContext<Coin[]>([])

export function CoinDataProvider({ coins, children }: { coins: Coin[]; children: ReactNode }) {
  return <CoinDataContext.Provider value={coins}>{children}</CoinDataContext.Provider>
}

export function useCoinData(): Coin[] {
  return useContext(CoinDataContext)
}
```

- [ ] **Step 2: Create the inline card `components/CoinCard.tsx`**

```tsx
'use client'

import { pickCoin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import { useCoinData } from './CoinDataProvider'

// Inline live-price card for a coin referenced in the article body:
//   <CoinCard id="bitcoin" />
// The id must be listed in the post's `coins:` frontmatter. Renders nothing if
// the coin isn't in the provided data (missing id or market data unavailable).
export default function CoinCard({ id }: { id: string }) {
  const coin = pickCoin(useCoinData(), id)
  if (!coin) return null
  const dir = changeDirection(coin.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <div className="bg-surface border-line my-7 flex items-center gap-4 rounded-[10px] border px-[18px] py-4 not-prose">
      <CoinLogo sym={coin.symbol} size={40} />
      <div>
        <div className="text-[15px] font-extrabold text-gray-100">
          {coin.name} · {coin.symbol}
        </div>
        <div className="text-ink-3 text-[12.5px] font-semibold">
          Live price referenced in this article
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className="text-xl font-black text-gray-50">{formatUsd(coin.price)}</div>
        <div className={`text-[13px] font-bold ${changeClass}`}>
          {formatPercent(coin.change24h)} (24h)
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/PullQuote.tsx`**

```tsx
import type { ReactNode } from 'react'

// Amber pull-quote inside article prose (design `.pull`).
export default function PullQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-accent text-ink my-7 border-l-[3px] pl-5 text-[19px] leading-snug font-bold not-prose">
      {children}
    </blockquote>
  )
}
```

- [ ] **Step 4: Create `components/Figure.tsx`**

```tsx
// Captioned figure for article prose: <Figure src="/x.png" alt="" caption="Figure 1 — ..." />
export default function Figure({
  src,
  alt = '',
  caption,
}: {
  src: string
  alt?: string
  caption?: string
}) {
  return (
    <figure className="my-7 not-prose">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full rounded-[10px]" />
      {caption ? (
        <figcaption className="text-ink-3 mt-2 text-xs font-semibold">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
```

- [ ] **Step 5: Register the MDX components**

Replace the contents of `components/MDXComponents.tsx` with:

```tsx
import TOCInline from 'pliny/ui/TOCInline'
import Pre from 'pliny/ui/Pre'
import BlogNewsletterForm from 'pliny/ui/BlogNewsletterForm'
import type { MDXComponents } from 'mdx/types'
import Image from './Image'
import CustomLink from './Link'
import TableWrapper from './TableWrapper'
import CoinCard from './CoinCard'
import PullQuote from './PullQuote'
import Figure from './Figure'

export const components: MDXComponents = {
  Image,
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsletterForm,
  CoinCard,
  PullQuote,
  Figure,
}
```

- [ ] **Step 6: Add prose spacing for `h4` under `.prose-invert`**

In `css/tailwind.css`, inside the existing `.prose-invert { ... }` block (after the `& :where(h1, h2, h3, h4, h5, h6)` rule, ~line 163), add an `h4` rule:

```css
    & :where(h1, h2, h3, h4, h5, h6) {
      color: var(--color-gray-100);
    }
    & h4 {
      margin-top: 1.6em;
      margin-bottom: 0.6em;
      font-size: 1.15em;
      font-weight: 800;
    }
```

- [ ] **Step 7: Verify typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add components/CoinDataProvider.tsx components/CoinCard.tsx components/PullQuote.tsx components/Figure.tsx components/MDXComponents.tsx css/tailwind.css
git commit -m "Add PullQuote, Figure, and inline CoinCard MDX components"
```

---

### Task 4: Author bio box

**Files:**
- Create: `components/AuthorBio.tsx`

- [ ] **Step 1: Create `components/AuthorBio.tsx`**

```tsx
import type { ReactNode } from 'react'

// Author bio box at the foot of an article (design author `.panel`). `children`
// is the author's rendered MDX bio (optional).
export default function AuthorBio({
  name,
  avatar,
  occupation,
  children,
}: {
  name: string
  avatar?: string
  occupation?: string
  children?: ReactNode
}) {
  return (
    <div className="bg-surface border-line mt-8 flex items-start gap-4 rounded-[10px] border px-[22px] py-5">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
      ) : (
        <div className="bg-fill h-14 w-14 flex-none rounded-full" />
      )}
      <div>
        <div className="text-[15px] font-extrabold text-gray-100">{name}</div>
        {occupation ? (
          <div className="text-blue mt-0.5 mb-2 text-[12.5px] font-bold">{occupation}</div>
        ) : null}
        {children ? (
          <div className="prose prose-invert text-ink-2 max-w-none text-[13.5px] leading-relaxed">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/AuthorBio.tsx
git commit -m "Add AuthorBio component"
```

---

### Task 5: Sidebar panels (CoinsInStory, ArticleCoachBox, ArticleSidebar)

Assembles the right rail: Market Sentiment gauge, "Coins in this story", "Ask the Coach" placeholder, and Trending.

**Files:**
- Create: `components/CoinsInStory.tsx`
- Create: `components/ArticleCoachBox.tsx`
- Create: `components/ArticleSidebar.tsx`

- [ ] **Step 1: Create `components/CoinsInStory.tsx`**

```tsx
import type { Coin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import Link from './Link'

// Sidebar panel listing the coins referenced by the article (from `coins:`
// frontmatter). Each row links to its /charts/[id] detail page. Renders nothing
// when there are no coins so the parent can omit the panel.
export default function CoinsInStory({ coins }: { coins: Coin[] }) {
  if (!coins.length) return null
  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line border-b px-4 py-3.5 text-[15px] font-extrabold text-gray-50">
        Coins in this story
      </div>
      <div className="py-1">
        {coins.map((c, i) => {
          const dir = changeDirection(c.change24h)
          const changeClass =
            dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
          return (
            <Link
              key={c.id}
              href={`/charts/${c.id}`}
              className={`hover:bg-fill-2 flex items-center gap-3 px-4 py-2.5 ${
                i < coins.length - 1 ? 'border-line-2 border-b' : ''
              }`}
            >
              <CoinLogo sym={c.symbol} size={22} />
              <div className="flex flex-col leading-tight">
                <span className="text-[13.5px] font-bold text-gray-100">{c.name}</span>
                <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
              </div>
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
    </div>
  )
}
```

- [ ] **Step 2: Create `components/ArticleCoachBox.tsx`**

```tsx
// "Ask the Coach" sidebar placeholder (design coach panel). Presentational only —
// wiring the input to the assistant backend is Phase 5.
export default function ArticleCoachBox() {
  return (
    <div className="rounded-[10px] bg-gradient-to-br from-[#10151E] to-[#1A2632] p-5 text-white">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="bg-accent flex h-[30px] w-[30px] items-center justify-center rounded-lg text-base font-black text-[#3a2400]">
          ✦
        </div>
        <div className="text-base font-extrabold">Ask the Coach</div>
      </div>
      <p className="mb-3.5 text-[13px] leading-relaxed text-[#B6C0CD]">
        Confused by something in this article? Ask for a plain-English explainer.
      </p>
      <div className="flex h-10 items-center rounded-lg border border-white/15 bg-white/[0.08] px-3 text-[13px] text-[#7E8A99]">
        Type your question…
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/ArticleSidebar.tsx`**

```tsx
import type { Coin } from '@/lib/markets/coingecko'
import type { FearGreed } from '@/lib/markets/sentiment'
import Gauge from './Gauge'
import CoinsInStory from './CoinsInStory'
import ArticleCoachBox from './ArticleCoachBox'
import TrendingList from './TrendingList'

interface SidebarProps {
  fearGreed: FearGreed | null
  coins: Coin[]
  trending: { slug: string; title: string }[]
}

// Right rail for the article page: sentiment gauge, coins-in-story, coach box,
// trending. Each panel degrades gracefully when its data is empty.
export default function ArticleSidebar({ fearGreed, coins, trending }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-[22px]">
      <div className="bg-surface border-line rounded-[10px] border px-4 pt-[18px] pb-5">
        <div className="mb-1.5 text-[15px] font-extrabold text-gray-50">Market Sentiment</div>
        <Gauge value={fearGreed?.value ?? 50} label={fearGreed?.label ?? 'Neutral'} size="sm" />
      </div>
      <CoinsInStory coins={coins} />
      <ArticleCoachBox />
      {trending.length > 0 && (
        <div className="bg-surface border-line rounded-[10px] border p-4">
          <TrendingList posts={trending} />
        </div>
      )}
    </aside>
  )
}
```

> Note: `FearGreed` is exported from `lib/markets/sentiment.ts` (`export interface FearGreed { value: number; label: string }`). Import it as a type.

- [ ] **Step 4: Verify typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/CoinsInStory.tsx components/ArticleCoachBox.tsx components/ArticleSidebar.tsx
git commit -m "Add article sidebar panels"
```

---

### Task 6: Rewrite PostLayout into the two-column article

Wires the header, prose (wrapped in the coin-data provider), footer (tags, author bio, related), and sidebar.

**Files:**
- Rewrite: `layouts/PostLayout.tsx`

- [ ] **Step 1: Rewrite `layouts/PostLayout.tsx`**

```tsx
import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog, Authors } from 'contentlayer/generated'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { slug as slugify } from 'github-slugger'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import StoryCard from '@/components/StoryCard'
import SectionHeading from '@/components/SectionHeading'
import Breadcrumb from '@/components/Breadcrumb'
import ArticleByline from '@/components/ArticleByline'
import AuthorBio from '@/components/AuthorBio'
import ArticleSidebar from '@/components/ArticleSidebar'
import { CoinDataProvider } from '@/components/CoinDataProvider'
import { filterByType, getSection } from '@/lib/sections'
import type { Coin } from '@/lib/markets/coingecko'
import type { FearGreed } from '@/lib/markets/sentiment'
import siteMetadata from '@/data/siteMetadata'

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails?: CoreContent<Authors>[]
  authorBio?: ReactNode
  coins?: Coin[]
  fearGreed?: FearGreed | null
  children: ReactNode
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostLayout({
  content,
  authorDetails,
  authorBio,
  coins = [],
  fearGreed = null,
  children,
}: LayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slug, date, title, summary, tags, readingTime, images, postType } = content as any
  const shareUrl = `${siteMetadata.siteUrl}/blog/${slug}`
  const section = getSection(postType)
  const sortedPosts = allCoreContent(sortPosts(allBlogs))

  const related = filterByType(sortedPosts, postType)
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
  const trending = sortedPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 5)
    .map((p) => ({ slug: p.slug, title: p.title }))

  const author = authorDetails?.[0]
  const primaryTag = tags?.[0] as string | undefined

  const crumbs = [
    ...(section ? [{ label: section.title, href: section.route }] : []),
    ...(primaryTag ? [{ label: primaryTag, href: `/tags/${slugify(primaryTag)}` }] : []),
    { label: title },
  ]

  return (
    <article className="py-[18px]">
      <Breadcrumb items={crumbs} />

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0">
          <CategoryChip type={postType} />
          <h1 className="mt-3.5 max-w-[760px] text-[34px] leading-[1.1] font-black tracking-tight text-gray-50 sm:text-[40px]">
            {title}
          </h1>
          {summary ? (
            <p className="text-ink-2 mt-3.5 max-w-[720px] text-[15px] leading-relaxed font-medium">
              {summary}
            </p>
          ) : null}

          <ArticleByline
            authorName={author?.name ?? 'CoinCoach'}
            authorAvatar={author?.avatar}
            occupation={author?.occupation}
            date={date}
            readingTime={readingTime?.minutes}
            shareUrl={shareUrl}
            title={title}
          />

          <CoverImage
            src={firstImage(images)}
            type={postType}
            className="h-[300px] w-full rounded-[10px] sm:h-[380px]"
          />

          <CoinDataProvider coins={coins}>
            <div className="prose prose-invert mt-7 max-w-none">{children}</div>
          </CoinDataProvider>

          {tags && tags.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {tags.map((t: string) => (
                <Tag key={t} text={t} />
              ))}
            </div>
          )}

          {author && (
            <AuthorBio name={author.name} avatar={author.avatar} occupation={author.occupation}>
              {authorBio}
            </AuthorBio>
          )}

          {related.length > 0 && (
            <div className="mt-9">
              <SectionHeading title="Related Stories" />
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
                {related.map((post) => (
                  <StoryCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <ArticleSidebar fearGreed={fearGreed} coins={coins} trending={trending} />
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0. (If `StoryCard`'s `post` type complains about `readingTime`, note `allCoreContent` items include `readingTime`; the `CardPost & { readingTime? }` shape is satisfied. If TS still complains, the related items are `CoreContent<Blog>` which include `readingTime` — no cast needed.)

- [ ] **Step 3: Commit**

```bash
git add layouts/PostLayout.tsx
git commit -m "Rewrite PostLayout as two-column Article layout"
```

---

### Task 7: Wire the page route + verify end-to-end

Fetch market data, Fear & Greed, and the primary author's rendered bio in the route, and pass them to `PostLayout`. Add a `coins:` entry to one real article to exercise the feature.

**Files:**
- Modify: `app/blog/[...slug]/page.tsx`
- Modify: one existing file under `data/blog/` (add `coins:` frontmatter)

- [ ] **Step 1: Pass coin data, Fear&Greed, and author bio from the route**

In `app/blog/[...slug]/page.tsx`:

(a) Add imports near the existing imports at the top:

```ts
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { getMarketsByIds } from '@/lib/markets/coingecko'
import { getFearGreed } from '@/lib/markets/sentiment'
```

(`MDXLayoutRenderer` is already imported in this file — do not duplicate it; add only the two market imports.)

(b) In the `Page` component, after `const Layout = layouts[post.layout || defaultLayout]` and before the `return`, add:

```ts
  // Live data for the article sidebar + inline coin cards (server-side, CSP-safe).
  const coinIds = (post.coins ?? []) as string[]
  const [coins, fearGreed] = await Promise.all([getMarketsByIds(coinIds), getFearGreed()])

  // The primary author's MDX body becomes the bio paragraph in the author box.
  const primaryAuthorSlug = authorList[0]
  const primaryAuthorDoc = allAuthors.find((p) => p.slug === primaryAuthorSlug)
  const authorBio = primaryAuthorDoc ? (
    <MDXLayoutRenderer code={primaryAuthorDoc.body.code} components={components} />
  ) : null
```

(c) Replace the `<Layout ...>` opening tag in the `return` so it forwards the new props (only `PostLayout` consumes them; `PostSimple`/`PostBanner` ignore extras, but to stay type-safe pass them unconditionally — see note below):

```tsx
      <Layout
        content={mainContent}
        authorDetails={authorDetails}
        authorBio={authorBio}
        coins={coins}
        fearGreed={fearGreed}
        next={next}
        prev={prev}
      >
        <MDXLayoutRenderer code={post.body.code} components={components} toc={post.toc} />
      </Layout>
```

> **Type note:** `layouts` is a map of three layout components with differing prop types, so TS infers a union and may reject the extra props. If `corepack yarn tsc --noEmit` reports an error on `<Layout ...>`, resolve it the same way the starter already handles `any` in layouts: change the `layouts` object access to render `PostLayout` explicitly when it's the resolved layout, OR cast: `const Layout = layouts[post.layout || defaultLayout] as typeof PostLayout`. Use the cast — it's the smallest change and matches the file's existing `as Blog`/`as Authors` style. Verify the other two layouts still render (they ignore the extra props at runtime).

- [ ] **Step 2: Typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0 (apply the cast from the type note if needed).

- [ ] **Step 3: Add `coins:` to one real article + an inline card**

Pick an existing published (`draft` not true) post under `data/blog/` — list them with `ls data/blog`. Open it and:

(a) add a `coins:` line to its frontmatter, e.g.:

```yaml
coins: [bitcoin, ethereum]
```

(b) optionally insert an inline card in the body where the coin is discussed:

```mdx
<CoinCard id="bitcoin" />
```

Choose ids that exist on CoinGecko (`bitcoin`, `ethereum`, `solana`, etc.). This makes the sidebar "Coins in this story" and the inline card render during smoke.

- [ ] **Step 4: Full build**

Run: `corepack yarn build`
Expected: build completes; no TypeScript/ESLint errors. (The build regenerates `app/tag-data.json`; if it shows as modified in `git status`, restore it — `git checkout app/tag-data.json` — unless your edited article changed tag counts intentionally.)

- [ ] **Step 5: Dev smoke test**

Start dev on the remote-accessible host and curl the edited article:

```bash
corepack yarn dev --hostname 0.0.0.0 --port 3000 &
sleep 8
curl -sL http://0.0.0.0:3000/blog/<edited-slug>/ | grep -o 'Coins in this story\|Ask the Coach\|Related Stories\|Market Sentiment' | sort -u
kill %1
```

Expected: the grep finds `Ask the Coach`, `Market Sentiment`, `Related Stories`, and (if CoinGecko isn't rate-limiting) `Coins in this story`. If `Coins in this story` is missing, confirm it's a 429 rate-limit (graceful fallback) by retrying after ~60s — the panel is intentionally omitted when `coins` is empty.

- [ ] **Step 6: Commit**

```bash
git add app/blog/[...slug]/page.tsx data/blog/<edited-file>.mdx
git commit -m "Wire live coin data and author bio into the article page"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage** (against roadmap Phase 4 + the chosen "full Article.html" scope):
- Breadcrumb (Section › tag › title) → Task 6. ✓
- Category tag, big H1, standfirst, byline (avatar, author/role/date/read-time, share) → Tasks 2, 6. ✓
- Hero image + caption → hero via `CoverImage` (Task 6); captioned figures in-body via `Figure` (Task 3). ✓
- Prose `h4` subheads, amber pull-quote, inline coin data card, figures → Tasks 3 (+ css). ✓
- Tag chips, author bio box, Related Stories 3-card grid (same `postType`) → Tasks 4, 6. ✓
- Right sidebar: Sentiment gauge, "Coins in this story", "Ask the Coach", Trending → Tasks 5, 6. ✓
- Frontmatter `coins: [...]` (CoinGecko ids) driving inline card + sidebar → Tasks 1, 7. ✓
- CSP intact (server-only fetches) → `getMarketsByIds`/`getFearGreed` server-side, data passed as props; `CoinDataProvider` only ferries already-fetched data. ✓
- "Ask the Coach" is a placeholder (Phase 5 wires it) → `ArticleCoachBox`. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases" left; every code step has complete code. ✓

**3. Type consistency:** `Coin` (id, symbol, name, price, change24h, image) used consistently across `getMarketsByIds`/`pickCoin`/`CoinCard`/`CoinsInStory`/`ArticleSidebar`/`PostLayout`. `FearGreed` (value, label) used in `ArticleSidebar`/`PostLayout`/page. `pickCoin(coins, id)` signature matches its call in `CoinCard`. `Crumb` shape (`{label, href?}`) matches `Breadcrumb`. `TrendingItem` (`{slug, title}`) matches `TrendingList`. ✓

---

## Notes / risks for the executor

- **Client component importing `pickCoin` from `coingecko.ts`:** `coingecko.ts` has no `server-only` marker and its fetch helpers are inert when unused, so importing the pure `pickCoin` into the client `CoinCard` is safe. Do **not** add `import 'server-only'` to `coingecko.ts`.
- **`not-prose`** is applied to `CoinCard`/`PullQuote`/`Figure` so the typography plugin doesn't restyle their internals. Keep it.
- **Author bio MDX**: rendering the author's `body.code` reuses the standard MDX pipeline; it's wrapped in a small `prose prose-invert` block inside `AuthorBio`. The default author bio is one short sentence — acceptable.
- After all tasks: dispatch the final holistic reviewer, then use **superpowers:finishing-a-development-branch** to open the PR (branch name e.g. `phase-4-article-enhancement`), wait for CodeRabbit, triage, merge.
