# Unit C — Topics Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated topic taxonomy — a `lib/topics.ts` registry (like `lib/sections.ts`) plus a `/topics` index and `/topics/[topic]` landing pages that aggregate articles by topic — separate from the freeform tag system (which stays for long-tail).

**Architecture:** Each `Topic` maps a curated label/slug/description to a set of tag slugs. A pure, tested `postsForTopic(posts, topic)` selects articles whose (slugified) tags intersect the topic's tag set. The index renders topic tiles with article counts; each landing page renders the topic's article grid. Topics are surfaced in the header nav, the category bar, the footer, and the sitemap. The freeform `/tags` index is unchanged.

**Tech Stack:** Next.js 15 App Router (RSC), TypeScript, Contentlayer2, github-slugger, Vitest.

---

## Background the implementer needs

- **Yarn is Berry via corepack.** `yarn` NOT on PATH. Always `corepack yarn <cmd>`.
- **Authoritative checks:** `corepack yarn tsc --noEmit`, `corepack yarn vitest run`, `corepack yarn build` (the build runs ESLint incl. `prettier/prettier` — `tsc` alone is NOT enough for `.tsx`/page files). If a formatting complaint appears, `corepack yarn prettier --write <file>` then re-verify. Trust these over IDE/LSP diagnostics.
- **Commits:** author solely as the user — NO `Co-Authored-By`/AI-attribution trailer. One commit per task. Style: 2-space indent, NO semicolons, single quotes; `prettier-plugin-tailwindcss` reorders classNames — let it.
- **Existing patterns to mirror:**
  - `lib/sections.ts` — the registry shape (`SECTIONS`, `getSection`) and `filterByType`. Topics mirror this.
  - `app/_sectionPage.tsx` — the archive layout (`allCoreContent(sortPosts(allBlogs))`, a heading, a `PostCard` grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, empty state).
  - `components/CatTile.tsx` — `CatTile({ name, count, color, href })` dark tile for the index grid.
  - `components/PostCard.tsx` — `PostCard({ post })` for article grids (`CardPost`).
  - `components/Breadcrumb.tsx` — `Breadcrumb({ items })`.
  - `app/seo.tsx` — `genPageMetadata({ title, description, ...rest })`.
  - `github-slugger` — `import { slug } from 'github-slugger'` (already a dep; used by `Tag.tsx` and `contentlayer.config.ts`). `slug('Smart Contracts') === 'smart-contracts'`.
- **Content model:** `allCoreContent(sortPosts(allBlogs))` returns `CoreContent<Blog>[]` (newest-first) with `tags: string[]`, `slug`, `title`, `postType`, `images?`, `date`.
- **Current nav state** (post Units A/B): `data/headerNavLinks.ts` has `{ href: '/tags', title: 'Tags' }`; `components/CatBar.tsx` ITEMS has `{ label: 'Topics', href: '/tags' }`; `components/Footer.tsx` Topics column has `{ label: 'All Topics', href: '/tags' }` and `{ label: 'Blog Archive', href: '/blog' }`. The freeform `/tags` route/page stays.

## File Structure

- `lib/topics.ts` — **create**: `Topic` type, `TOPICS` registry, `getTopic`, `postsForTopic`.
- `lib/topics.test.ts` — **create**: unit tests.
- `app/topics/page.tsx` — **create**: topic index (CatTile grid with counts).
- `app/topics/[topic]/page.tsx` — **create**: topic landing page (hero + PostCard grid).
- `data/headerNavLinks.ts` — **modify**: `Tags` → `Topics` (/topics).
- `components/CatBar.tsx` — **modify**: `Topics` href `/tags` → `/topics`.
- `components/Footer.tsx` — **modify**: Topics column → Topics (/topics) + All Tags (/tags) + Blog Archive (/blog).
- `app/sitemap.ts` — **modify**: add `topics` static route + a per-topic route list.

---

### Task 1: Topics registry + selector + tests

**Files:**
- Create: `lib/topics.ts`
- Create: `lib/topics.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/topics.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { TOPICS, getTopic, postsForTopic } from './topics'

describe('TOPICS registry', () => {
  it('has unique slugs', () => {
    const slugs = TOPICS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('every topic has at least one mapped tag', () => {
    expect(TOPICS.every((t) => t.tags.length > 0)).toBe(true)
  })
})

describe('getTopic', () => {
  it('returns the topic for a known slug', () => {
    expect(getTopic('ethereum')?.label).toBe('Ethereum')
  })
  it('returns undefined for an unknown slug', () => {
    expect(getTopic('nope')).toBeUndefined()
  })
})

describe('postsForTopic', () => {
  const ethereum = getTopic('ethereum')!
  const posts = [
    { slug: 'a', tags: ['Ethereum', 'markets'] },
    { slug: 'b', tags: ['smart-contracts'] },
    { slug: 'c', tags: ['bitcoin'] },
    { slug: 'd' },
  ]
  it('matches posts whose slugified tags intersect the topic tag set', () => {
    expect(postsForTopic(posts, ethereum).map((p) => p.slug)).toEqual(['a', 'b'])
  })
  it('returns [] for a non-array posts argument', () => {
    // @ts-expect-error bad input
    expect(postsForTopic(null, ethereum)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack yarn vitest run lib/topics.test.ts`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 3: Implement `lib/topics.ts`**

```ts
import { slug } from 'github-slugger'

export interface Topic {
  slug: string
  label: string
  description: string
  // Tag slugs that map into this topic. A post belongs to the topic when any of
  // its (slugified) tags appears here.
  tags: string[]
  color: string
}

export const TOPICS: Topic[] = [
  {
    slug: 'bitcoin',
    label: 'Bitcoin',
    description: 'Bitcoin price action, ETFs, halving cycles and on-chain analysis.',
    tags: ['bitcoin', 'btc'],
    color: '#F2A024',
  },
  {
    slug: 'ethereum',
    label: 'Ethereum',
    description: 'Ethereum, smart contracts and the broader EVM ecosystem.',
    tags: ['ethereum', 'eth', 'smart-contracts'],
    color: '#3FA7DA',
  },
  {
    slug: 'defi',
    label: 'DeFi',
    description: 'Decentralized finance: DEXs, lending, yield and liquidity.',
    tags: ['defi', 'dex', 'yield', 'lending', 'liquidity'],
    color: '#7BC23A',
  },
  {
    slug: 'nfts',
    label: 'NFTs',
    description: 'NFTs, digital collectibles and on-chain art.',
    tags: ['nft', 'nfts', 'collectibles'],
    color: '#8B5CF6',
  },
  {
    slug: 'regulation',
    label: 'Regulation',
    description: 'Crypto law, policy, the SEC and global compliance.',
    tags: ['regulation', 'sec', 'policy', 'legal', 'compliance'],
    color: '#EB5E45',
  },
  {
    slug: 'etfs',
    label: 'ETFs',
    description: 'Spot crypto ETFs, fund flows and institutional access.',
    tags: ['etf', 'etfs', 'spot-etf'],
    color: '#F2A024',
  },
  {
    slug: 'stablecoins',
    label: 'Stablecoins',
    description: 'USDT, USDC and the mechanics of dollar-pegged crypto.',
    tags: ['stablecoin', 'stablecoins', 'usdt', 'usdc'],
    color: '#7BC23A',
  },
  {
    slug: 'layer-2',
    label: 'Layer 2',
    description: 'Rollups, scaling and Ethereum Layer 2 networks.',
    tags: ['layer-2', 'l2', 'rollups', 'scaling'],
    color: '#3FA7DA',
  },
  {
    slug: 'staking',
    label: 'Staking',
    description: 'Proof-of-stake, validators and earning yield by staking.',
    tags: ['staking', 'proof-of-stake', 'pos', 'validators'],
    color: '#7BC23A',
  },
  {
    slug: 'security',
    label: 'Wallets & Security',
    description: 'Wallets, self-custody, hardware and staying safe in crypto.',
    tags: ['wallets', 'hardware-wallet', 'security', 'custody', 'self-custody'],
    color: '#EB5E45',
  },
  {
    slug: 'mining',
    label: 'Mining',
    description: 'Bitcoin mining, hashrate and proof-of-work economics.',
    tags: ['mining', 'miners', 'hashrate'],
    color: '#F2A024',
  },
  {
    slug: 'basics',
    label: 'Crypto Basics',
    description: 'Beginner explainers and the fundamentals of crypto.',
    tags: ['basics', 'beginners', 'explainer', 'fundamentals'],
    color: '#3FA7DA',
  },
]

export function getTopic(s: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === s)
}

// Posts whose (slugified) tags intersect the topic's tag set. Input order is
// preserved (callers pass a date-sorted list).
export function postsForTopic<T extends { tags?: string[] }>(posts: T[], topic: Topic): T[] {
  if (!Array.isArray(posts)) return []
  const set = new Set(topic.tags)
  return posts.filter((p) => (p.tags ?? []).some((t) => set.has(slug(t))))
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `corepack yarn vitest run lib/topics.test.ts && corepack yarn tsc --noEmit`
Expected: all green, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/topics.ts lib/topics.test.ts
git commit -m "Add curated topics registry and postsForTopic selector"
```

---

### Task 2: `/topics` index page

**Files:**
- Create: `app/topics/page.tsx`

- [ ] **Step 1: Create `app/topics/page.tsx`**

```tsx
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import CatTile from '@/components/CatTile'
import { TOPICS, postsForTopic } from '@/lib/topics'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Topics',
  description: 'Browse crypto news and guides by topic — Bitcoin, Ethereum, DeFi, regulation and more.',
  alternates: { canonical: '/topics' },
})

export default function TopicsPage() {
  const posts = allCoreContent(sortPosts(allBlogs))
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Topics' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Topics</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Browse our coverage by theme. Looking for something more specific? See all{' '}
        <a href="/tags" className="text-blue font-semibold">
          tags
        </a>
        .
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {TOPICS.map((topic) => (
          <CatTile
            key={topic.slug}
            name={topic.label}
            count={postsForTopic(posts, topic).length}
            color={topic.color}
            href={`/topics/${topic.slug}`}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `corepack yarn tsc --noEmit && corepack yarn build`
Expected: exit 0; `/topics` builds. If `app/tag-data.json` shows modified, `git checkout app/tag-data.json`.

- [ ] **Step 3: Commit**

```bash
git add app/topics/page.tsx
git commit -m "Add /topics index page"
```

---

### Task 3: `/topics/[topic]` landing page

**Files:**
- Create: `app/topics/[topic]/page.tsx`

- [ ] **Step 1: Create `app/topics/[topic]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import PostCard from '@/components/PostCard'
import Link from '@/components/Link'
import { TOPICS, getTopic, postsForTopic } from '@/lib/topics'
import { genPageMetadata } from 'app/seo'

export const generateStaticParams = async () => TOPICS.map((t) => ({ topic: t.slug }))

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: s } = await params
  const topic = getTopic(s)
  if (!topic) return genPageMetadata({ title: 'Topic not found' })
  return genPageMetadata({
    title: topic.label,
    description: topic.description,
    alternates: { canonical: `/topics/${topic.slug}` },
  })
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: s } = await params
  const topic = getTopic(s)
  if (!topic) notFound()
  const posts = postsForTopic(allCoreContent(sortPosts(allBlogs)), topic)

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Topics', href: '/topics' }, { label: topic.label }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">{topic.label}</h1>
      <p className="text-ink-2 mt-1.5 max-w-2xl text-sm font-medium">{topic.description}</p>
      {posts.length === 0 ? (
        <p className="text-ink-2 mt-8 text-sm">
          No {topic.label} articles yet —{' '}
          <Link href="/news" className="text-blue font-semibold">
            browse all news ›
          </Link>
        </p>
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

- [ ] **Step 2: Typecheck + build**

Run: `corepack yarn tsc --noEmit && corepack yarn build`
Expected: exit 0; the build prerenders one page per topic (generateStaticParams). If `app/tag-data.json` shows modified, `git checkout app/tag-data.json`.

- [ ] **Step 3: Commit**

```bash
git add app/topics/[topic]/page.tsx
git commit -m "Add /topics/[topic] landing page"
```

---

### Task 4: Surface Topics in nav + sitemap

**Files:**
- Modify: `data/headerNavLinks.ts`
- Modify: `components/CatBar.tsx`
- Modify: `components/Footer.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Header nav — `Tags` → `Topics`**

In `data/headerNavLinks.ts`, change the entry `{ href: '/tags', title: 'Tags' }` to:
```ts
  { href: '/topics', title: 'Topics' },
```
(Leave all other entries unchanged. The `/tags` route still exists; it is reached from the footer and the topics index.)

- [ ] **Step 2: CatBar — point `Topics` at `/topics`**

In `components/CatBar.tsx`, change the ITEMS entry `{ label: 'Topics', href: '/tags' }` to:
```ts
  { label: 'Topics', href: '/topics' },
```

- [ ] **Step 3: Footer — Topics column**

In `components/Footer.tsx`, in the `Topics` column's `links`, replace:
```ts
      { label: 'All Topics', href: '/tags' },
      { label: 'Blog Archive', href: '/blog' },
```
with:
```ts
      { label: 'Topics', href: '/topics' },
      { label: 'All Tags', href: '/tags' },
      { label: 'Blog Archive', href: '/blog' },
```

- [ ] **Step 4: Sitemap — add topics**

In `app/sitemap.ts`:
- Add the import after the existing imports:
```ts
import { TOPICS } from '@/lib/topics'
```
- Add `'topics'` to the `staticRoutes` array:
```ts
  const staticRoutes = ['', 'blog', 'tags', 'charts', 'topics'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified,
  }))
```
- After the `sectionRoutes` definition, add:
```ts
  const topicRoutes = TOPICS.map((topic) => ({
    url: `${siteUrl}/topics/${topic.slug}`,
    lastModified,
  }))
```
- Change the return to include `topicRoutes`:
```ts
  return [...staticRoutes, ...sectionRoutes, ...topicRoutes, ...blogRoutes]
```

- [ ] **Step 5: Typecheck + build**

Run: `corepack yarn tsc --noEmit && corepack yarn build`
Expected: exit 0; build completes with no TS/ESLint errors. If `app/tag-data.json` shows modified, `git checkout app/tag-data.json`.

- [ ] **Step 6: Commit**

```bash
git add data/headerNavLinks.ts components/CatBar.tsx components/Footer.tsx app/sitemap.ts
git commit -m "Surface Topics in nav and sitemap"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- Curated `topics` registry (`lib/topics.ts`, mirrors `lib/sections.ts`) → Task 1. ✓
- `/topics` index with per-topic article counts → Task 2. ✓
- `/topics/[topic]` landing pages (hero + article grid, static-generated) → Task 3. ✓
- Tags stay for long-tail (`/tags` untouched; topics index links to it) → Tasks 2/4. ✓
- Surfaced in header nav, CatBar, Footer, sitemap → Task 4. ✓
- Pure selector tested → Task 1 tests. ✓

**2. Placeholder scan:** No TBD/TODO; complete code in every step. ✓

**3. Type consistency:** `Topic` (slug/label/description/tags/color) is used by `CatTile` (name←label, count←postsForTopic length, color, href) and the landing page. `postsForTopic<T extends { tags? }>` accepts `CoreContent<Blog>[]` (has `tags`) and returns the same `T[]`, satisfying `PostCard`'s `CardPost`. `getTopic` returns `Topic | undefined`. `TOPICS` slugs feed `generateStaticParams` and the sitemap. ✓

---

## Notes / risks for the executor

- Topic→tag mappings are curated and intentionally broader than current content; most topics will be empty until more articles exist (the landing pages degrade gracefully). This is deliberate SEO scaffolding — do NOT prune topics to only those with content.
- Matching uses `github-slugger`'s `slug()` on each post tag so `'Ethereum'`, `'ethereum'`, and `'Smart Contracts'` all normalize before comparison; topic `tags` are stored pre-slugged.
- The legacy `/tags` index page keeps its current (starter) styling — restyling it to the dark theme is out of scope for this unit.
- Topic landing pages aggregate ARTICLES only for now; surfacing related market data per topic is a possible later enhancement.
- After all tasks: final holistic review, then **superpowers:finishing-a-development-branch** → PR (branch `unit-c-topics-taxonomy`) → CodeRabbit → triage → merge.
