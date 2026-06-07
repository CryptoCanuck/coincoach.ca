# Unit B — Coin Asset Hubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the coin detail page (`/charts/[coin]`) into a small asset hub by surfacing the site's news & guides about that coin — matched reliably via the `coins:` frontmatter (CoinGecko id) **plus** tag fallback — as a prominent "news & guides" section instead of the current tag-only sidebar list.

**Architecture:** A pure, tested helper `relatedPostsForCoin(posts, coin, limit)` selects matching posts (by exact `coins:` id OR a tag equal to the coin symbol/name). The page already loads all posts via `allCoreContent(sortPosts(allBlogs))`; we pass that plus the resolved coin into the helper and render the result through a new `CoinContent` server component (a `StoryCard` grid) in the main column. The existing tag-only sidebar "Latest News" box is removed (its content is superseded and promoted).

**Tech Stack:** Next.js 15 App Router (RSC), TypeScript, Contentlayer2, Vitest (pure-function tests).

---

## Background the implementer needs

- **Yarn is Berry via corepack.** `yarn` NOT on PATH. Always `corepack yarn <cmd>`.
- **Authoritative checks:** `corepack yarn tsc --noEmit`, `corepack yarn vitest run`, `corepack yarn build`. The build runs ESLint (incl. `prettier/prettier`) — a `tsc`-only check is NOT enough for `.tsx`. If a formatting complaint appears, `corepack yarn prettier --write <file>` then re-verify. Trust these over IDE/LSP diagnostics.
- **Commits:** author solely as the user — NO `Co-Authored-By`/AI-attribution trailer. One commit per task. Style: 2-space indent, NO semicolons, single quotes; `prettier-plugin-tailwindcss` reorders classNames — let it.
- **Content model:** `Blog` frontmatter includes `coins: string[]` (CoinGecko ids, added in Phase 4) and `tags: string[]`. `allCoreContent(sortPosts(allBlogs))` returns `CoreContent<Blog>[]`, already newest-first, with `coins`, `tags`, `slug`, `title`, `postType`, `images`, `date`, `readingTime` all present.
- **Existing components to reuse:** `components/StoryCard.tsx` (`StoryCard({ post })`, `post: CardPost & { readingTime?: { minutes: number } }`), `components/SectionHeading.tsx` (`SectionHeading({ title, barColor?, moreLabel?, moreHref? })`), `components/Link.tsx`. `CardPost` (from `components/PostCard.tsx`) = `{ slug, title, postType, images?, date }`.
- **The coin object** on the page is a `CoinDetail` (`lib/markets/coins.ts`): has `id: string`, `symbol: string` (UPPERCASE, e.g. `BTC`), `name: string` (e.g. `Bitcoin`).
- **The page currently** (`app/charts/[coin]/page.tsx`) computes `coinNews` inline by tag-only match and renders a titles-only "Latest {symbol} News" box in the RIGHT rail (lines ~40-47 and ~105-129). Unit B replaces that.

## File Structure

- `lib/coinContent.ts` — **create**: pure `relatedPostsForCoin` selector.
- `lib/coinContent.test.ts` — **create**: unit tests.
- `components/CoinContent.tsx` — **create** (server): the "news & guides" StoryCard grid section.
- `app/charts/[coin]/page.tsx` — **modify**: use the helper + component; remove the inline tag-only logic and the sidebar news box.

---

### Task 1: `relatedPostsForCoin` selector + tests

**Files:**
- Create: `lib/coinContent.ts`
- Create: `lib/coinContent.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/coinContent.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { relatedPostsForCoin } from './coinContent'

const coin = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }

const posts = [
  { slug: 'a', title: 'A', coins: ['bitcoin'], tags: ['markets'] },
  { slug: 'b', title: 'B', coins: [], tags: ['Bitcoin', 'etf'] },
  { slug: 'c', title: 'C', coins: [], tags: ['btc'] },
  { slug: 'd', title: 'D', coins: ['ethereum'], tags: ['defi'] },
  { slug: 'e', title: 'E' },
]

describe('relatedPostsForCoin', () => {
  it('matches by coins frontmatter id (case-insensitive)', () => {
    const out = relatedPostsForCoin([{ slug: 'x', coins: ['BITCOIN'], tags: [] }], coin)
    expect(out.map((p) => p.slug)).toEqual(['x'])
  })
  it('matches by a tag equal to the coin name or symbol (case-insensitive)', () => {
    const out = relatedPostsForCoin(posts, coin)
    expect(out.map((p) => p.slug)).toEqual(['a', 'b', 'c'])
  })
  it('excludes posts that match a different coin', () => {
    const out = relatedPostsForCoin(posts, coin)
    expect(out.map((p) => p.slug)).not.toContain('d')
    expect(out.map((p) => p.slug)).not.toContain('e')
  })
  it('preserves input order and respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ slug: `p${i}`, coins: ['bitcoin'] }))
    expect(relatedPostsForCoin(many, coin, 4).map((p) => p.slug)).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
    ])
  })
  it('returns [] for a non-array posts argument', () => {
    // @ts-expect-error bad input
    expect(relatedPostsForCoin(null, coin)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack yarn vitest run lib/coinContent.test.ts`
Expected: FAIL — `relatedPostsForCoin` is not a function / module not found.

- [ ] **Step 3: Implement `lib/coinContent.ts`**

```ts
export interface CoinRef {
  id: string
  symbol: string
  name: string
}

// Posts whose `coins:` frontmatter references this coin's CoinGecko id, OR whose
// tags name the coin (by symbol or name). Input order is preserved (callers pass
// a date-sorted list); capped at `limit`. Match is case-insensitive.
export function relatedPostsForCoin<T extends { coins?: string[]; tags?: string[] }>(
  posts: T[],
  coin: CoinRef,
  limit = 6
): T[] {
  if (!Array.isArray(posts)) return []
  const id = coin.id.toLowerCase()
  const sym = coin.symbol.toLowerCase()
  const name = coin.name.toLowerCase()
  return posts
    .filter((p) => {
      const byCoins = (p.coins ?? []).some((c) => c.toLowerCase() === id)
      const byTag = (p.tags ?? []).some((t) => {
        const tag = t.toLowerCase()
        return tag === sym || tag === name
      })
      return byCoins || byTag
    })
    .slice(0, limit)
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `corepack yarn vitest run lib/coinContent.test.ts && corepack yarn tsc --noEmit`
Expected: all green, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/coinContent.ts lib/coinContent.test.ts
git commit -m "Add relatedPostsForCoin selector for coin asset hubs"
```

---

### Task 2: `CoinContent` section component

**Files:**
- Create: `components/CoinContent.tsx`

- [ ] **Step 1: Create `components/CoinContent.tsx`**

```tsx
import type { CardPost } from './PostCard'
import StoryCard from './StoryCard'
import SectionHeading from './SectionHeading'
import Link from './Link'

type Story = CardPost & { readingTime?: { minutes: number } }

// "News & guides about <coin>" section for the coin detail page. Renders a
// StoryCard grid, or a friendly empty state linking to all news.
export default function CoinContent({
  posts,
  coinName,
  symbol,
}: {
  posts: Story[]
  coinName: string
  symbol: string
}) {
  return (
    <div>
      <SectionHeading title={`${coinName} news & guides`} barColor="var(--color-blue)" />
      {posts.length === 0 ? (
        <p className="text-ink-2 text-sm">
          No {symbol} stories yet —{' '}
          <Link href="/news" className="text-blue font-semibold">
            browse all news ›
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {posts.map((post) => (
            <StoryCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `corepack yarn tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/CoinContent.tsx
git commit -m "Add CoinContent section component"
```

---

### Task 3: Wire the helper + section into the coin page; remove the sidebar news box

**Files:**
- Modify: `app/charts/[coin]/page.tsx`

- [ ] **Step 1: Update imports**

In `app/charts/[coin]/page.tsx`, add:
```ts
import CoinContent from '@/components/CoinContent'
import { relatedPostsForCoin } from '@/lib/coinContent'
```
(`allCoreContent`, `sortPosts`, `allBlogs`, and `Link` are already imported — keep them; `Link` is still used by the About-links block.)

- [ ] **Step 2: Replace the inline `coinNews` computation**

Find this block (around lines 40-47):
```ts
  const posts = allCoreContent(sortPosts(allBlogs))
  const sym = coin.symbol.toLowerCase()
  const nameLower = coin.name.toLowerCase()
  const coinNews = posts
    .filter((p) =>
      (p.tags ?? []).some((t) => t.toLowerCase() === sym || t.toLowerCase() === nameLower)
    )
    .slice(0, 4)
```
Replace it with:
```ts
  const posts = allCoreContent(sortPosts(allBlogs))
  const relatedPosts = relatedPostsForCoin(posts, coin, 6)
```

- [ ] **Step 3: Add the `CoinContent` section to the LEFT (main) column**

In the main column `<div className="flex flex-col gap-6">`, AFTER the `{(coin.description || coin.links.length > 0) && ( ... )}` About block and before the closing `</div>` of that column, add:
```tsx
          <CoinContent posts={relatedPosts} coinName={coin.name} symbol={coin.symbol} />
```

- [ ] **Step 4: Remove the sidebar "Latest {symbol} News" box**

Delete this entire block from the RIGHT rail (around lines 105-129):
```tsx
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
                    className="border-line-2 text-ink-2 border-b py-2.5 text-[13.5px] font-semibold last:border-b-0 hover:text-gray-50"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
```
The RIGHT rail now ends after `<SimilarCoins coins={similar} />`.

- [ ] **Step 5: Typecheck + build**

Run: `corepack yarn tsc --noEmit && corepack yarn build`
Expected: exit 0; build completes with no TS/ESLint errors. Crucially, confirm there is no `coinNews` reference left (ESLint would flag the unused/undefined var) and `Link` is still used (the About block uses it). If `app/tag-data.json` shows modified after build, run `git checkout app/tag-data.json`.

- [ ] **Step 6: Commit**

```bash
git add app/charts/[coin]/page.tsx
git commit -m "Surface coin news and guides via coins frontmatter on the coin page"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- Match by `coins:` frontmatter id (the Phase-4 signal) + tag fallback → Task 1 `relatedPostsForCoin`. ✓
- Tested pure helper → Task 1 tests. ✓
- Prominent "news & guides" section (StoryCard grid) in the main column → Tasks 2 + 3. ✓
- Remove the superseded tag-only sidebar list → Task 3 Step 4. ✓
- Graceful empty state → Task 2. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**3. Type consistency:** `relatedPostsForCoin<T extends { coins?; tags? }>` accepts `CoreContent<Blog>[]` (which has `coins`, `tags`) and returns the same `T[]`, satisfying `StoryCard`'s `CardPost & { readingTime? }` (CoreContent<Blog> includes slug/title/postType/images/date/readingTime). `CoinRef` (id/symbol/name) is satisfied by the `CoinDetail` coin object. ✓

---

## Notes / risks for the executor

- The match is intentionally **exact** (tag equals symbol or full name), mirroring the existing page logic — not a substring match (avoids `eth` matching `ethereum`, `tether`, etc.).
- `relatedPostsForCoin` preserves input order; the page passes a date-sorted list, so results are newest-first without extra sorting.
- After all tasks: final holistic review, then **superpowers:finishing-a-development-branch** → PR (branch `unit-b-coin-hubs`) → CodeRabbit → triage → merge.
