# CoinCoach Content Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a production-ready, SEO-strong CoinCoach content site on the `tailwind-nextjs-starter-blog` base, with four content sections (News, Guides, Token Breakdowns, Reviews), AI-draftable MDX content, newsletter + search, and a self-hosted Docker/Portainer deploy.

**Architecture:** Scaffold from the maintained `tailwind-nextjs-starter-blog` (Next 15 App Router, MDX via Contentlayer2, Tailwind, Pliny). Content is flat MDX under `data/blog/` with a required `type` enum field; section landing pages at `/news`, `/guides`, `/breakdowns`, `/reviews` are filtered archive views, while individual articles keep the canonical `/blog/<slug>` URL (preserves all starter machinery: RSS, search index, tags, pagination, structured data). Per-`type` JSON-LD (NewsArticle / Article / Review) and per-section RSS feeds drive SEO. Pure logic (structured-data builder, section filter) is extracted into `lib/` and unit-tested with Vitest. Ships as a standalone Docker image deployed as a Portainer compose stack.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Contentlayer2, MDX, Pliny, Vitest, Docker, Portainer.

**Conventions:**
- Package manager: **yarn** (the starter ships `yarn.lock`).
- Commits: authored as `CryptoCanuck <support@rimdc.com>`. **Never** add AI/co-author trailers.
- Reference spec: `docs/superpowers/specs/2026-06-05-coincoach-content-backbone-design.md`.

---

## File Structure

Files created or modified by this plan (relative to repo root):

| Path | Responsibility |
|------|----------------|
| `package.json`, `next.config.js`, `contentlayer.config.ts`, etc. | Scaffolded from starter (Task 1) |
| `lib/structuredData.ts` | Pure builder: maps a post's `type` → schema.org JSON-LD (Task 3) |
| `lib/structuredData.test.ts` | Unit tests for the builder (Task 3) |
| `lib/sections.ts` | Section registry + `getPostsByType` / type-validation helpers (Task 5) |
| `lib/sections.test.ts` | Unit tests for section helpers (Task 5) |
| `vitest.config.ts` | Vitest setup (Task 2) |
| `contentlayer.config.ts` | Add `type`, `reviewedItem`, `rating` fields; use `lib/structuredData` (Task 3) |
| `data/blog/*.mdx` | Seed articles, one per section + one draft (Task 4) |
| `data/siteMetadata.js` | CoinCoach branding, URL, newsletter provider (Tasks 7, 8) |
| `data/headerNavLinks.ts` | Section navigation (Task 5) |
| `app/news/page.tsx`, `app/guides/page.tsx`, `app/breakdowns/page.tsx`, `app/reviews/page.tsx` | Section landing pages (Task 5) |
| `app/_sectionPage.tsx` | Shared section-listing component used by the four pages (Task 5) |
| `scripts/rss.mjs` | Add per-section RSS feeds (Task 6) |
| `Dockerfile`, `.dockerignore`, `docker-compose.yml` | Standalone image + Portainer stack (Task 9) |
| `docs/content-style-guide.md`, `docs/frontmatter-templates.md` | AI-authoring guidance (Task 10) |

---

## Task 1: Scaffold from the starter into the repo

**Files:**
- Create: all starter files at repo root (the repo currently holds only `docs/`, `.gitignore`, and git history)

- [ ] **Step 1: Copy starter source into the repo (excluding its git history and lockfile-incompatible cruft)**

```bash
cd /home/rolox/websites/coincoach.ca
# Clone a clean copy if /tmp/cc-starter is not present:
[ -d /tmp/cc-starter ] || git clone --depth 1 https://github.com/timlrx/tailwind-nextjs-starter-blog.git /tmp/cc-starter
# Copy everything except the starter's .git and node_modules into our repo
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.contentlayer' /tmp/cc-starter/ ./
```

- [ ] **Step 2: Merge .gitignore (keep our entries, add any starter-specific ones)**

Ensure `.gitignore` contains at least these lines (the starter's `.gitignore` may overwrite ours after rsync — re-create it):

```
node_modules/
.next/
out/
.env*
!.env.example
.contentlayer/
.DS_Store
*.tsbuildinfo
public/search.json
public/feed.xml
public/tags/
```

- [ ] **Step 3: Install dependencies**

Run: `yarn install`
Expected: completes without errors; `node_modules/` populated.

- [ ] **Step 4: Verify the baseline build succeeds**

Run: `yarn build`
Expected: Contentlayer generates documents, Next build completes, `scripts/postbuild.mjs` runs. Build exits 0. (The site still shows starter demo content at this point — that's expected; we replace it in Task 4.)

- [ ] **Step 5: Commit the scaffold**

```bash
git add -A
git commit -m "Scaffold site from tailwind-nextjs-starter-blog"
```

---

## Task 2: Add Vitest test tooling

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add devDependency + `test` script)

- [ ] **Step 1: Add Vitest as a dev dependency**

Run: `yarn add -D vitest@^3`
Expected: `vitest` appears under `devDependencies` in `package.json`.

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add a `test` script to package.json**

In `package.json`, add to the `"scripts"` object:

```json
"test": "vitest run"
```

- [ ] **Step 4: Add a temporary smoke test to confirm the runner works**

Create `lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Remove the smoke test and commit**

```bash
rm lib/smoke.test.ts
git add -A
git commit -m "Add Vitest test tooling"
```

---

## Task 3: Content `type` field + per-type structured data (TDD)

**Files:**
- Create: `lib/structuredData.ts`
- Create: `lib/structuredData.test.ts`
- Modify: `contentlayer.config.ts` (add fields; use the builder)

- [ ] **Step 1: Write failing tests for the structured-data builder**

Create `lib/structuredData.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildStructuredData } from './structuredData'

const base = {
  title: 'Test Post',
  date: '2026-06-01',
  lastmod: '2026-06-02',
  summary: 'A summary',
  images: ['/static/images/a.png'],
  path: 'blog/test-post',
}
const siteUrl = 'https://coincoach.ca'
const banner = 'https://coincoach.ca/static/images/twitter-card.png'

describe('buildStructuredData', () => {
  it('emits NewsArticle for type "news"', () => {
    const sd = buildStructuredData({ ...base, type: 'news' }, siteUrl, banner)
    expect(sd['@type']).toBe('NewsArticle')
    expect(sd.headline).toBe('Test Post')
    expect(sd.url).toBe('https://coincoach.ca/blog/test-post')
    expect(sd.datePublished).toBe('2026-06-01')
    expect(sd.dateModified).toBe('2026-06-02')
  })

  it('emits Article for type "guide"', () => {
    const sd = buildStructuredData({ ...base, type: 'guide' }, siteUrl, banner)
    expect(sd['@type']).toBe('Article')
  })

  it('emits Article for type "breakdown"', () => {
    const sd = buildStructuredData({ ...base, type: 'breakdown' }, siteUrl, banner)
    expect(sd['@type']).toBe('Article')
  })

  it('emits Review for type "review" with itemReviewed', () => {
    const sd = buildStructuredData(
      { ...base, type: 'review', reviewedItem: 'Ledger Nano X' },
      siteUrl,
      banner
    )
    expect(sd['@type']).toBe('Review')
    expect(sd.itemReviewed).toEqual({ '@type': 'Thing', name: 'Ledger Nano X' })
  })

  it('includes reviewRating only when a rating is present', () => {
    const withRating = buildStructuredData(
      { ...base, type: 'review', reviewedItem: 'X', rating: 4 },
      siteUrl,
      banner
    )
    expect(withRating.reviewRating).toEqual({
      '@type': 'Rating',
      ratingValue: 4,
      bestRating: 5,
    })
    const without = buildStructuredData({ ...base, type: 'review', reviewedItem: 'X' }, siteUrl, banner)
    expect(without.reviewRating).toBeUndefined()
  })

  it('falls back to the social banner when no images', () => {
    const sd = buildStructuredData({ ...base, images: undefined, type: 'news' }, siteUrl, banner)
    expect(sd.image).toBe(banner)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL — cannot find module `./structuredData`.

- [ ] **Step 3: Implement the builder**

Create `lib/structuredData.ts`:

```ts
export type PostType = 'news' | 'guide' | 'breakdown' | 'review'

export interface StructuredDataInput {
  type: PostType
  title: string
  date: string
  lastmod?: string
  summary?: string
  images?: string[] | string
  path: string
  reviewedItem?: string
  rating?: number
}

const TYPE_TO_SCHEMA: Record<PostType, string> = {
  news: 'NewsArticle',
  guide: 'Article',
  breakdown: 'Article',
  review: 'Review',
}

export function buildStructuredData(
  doc: StructuredDataInput,
  siteUrl: string,
  socialBanner: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const image = doc.images
    ? Array.isArray(doc.images)
      ? doc.images[0]
      : doc.images
    : socialBanner

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': TYPE_TO_SCHEMA[doc.type],
    headline: doc.title,
    datePublished: doc.date,
    dateModified: doc.lastmod || doc.date,
    description: doc.summary,
    image,
    url: `${siteUrl}/${doc.path}`,
  }

  if (doc.type === 'review') {
    sd.itemReviewed = { '@type': 'Thing', name: doc.reviewedItem || doc.title }
    if (typeof doc.rating === 'number') {
      sd.reviewRating = { '@type': 'Rating', ratingValue: doc.rating, bestRating: 5 }
    }
  }

  return sd
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS — all `buildStructuredData` tests pass.

- [ ] **Step 5: Wire the builder + new fields into contentlayer.config.ts**

In `contentlayer.config.ts`:

a) Add an import near the other local imports (after line 26, `import { allCoreContent, sortPosts } ...`):

```ts
import { buildStructuredData } from './lib/structuredData'
```

b) In the `Blog` document's `fields` object (currently lines 100–112), add these three fields after `canonicalUrl`:

```ts
    type: { type: 'enum', options: ['news', 'guide', 'breakdown', 'review'], required: true },
    reviewedItem: { type: 'string' },
    rating: { type: 'number' },
```

c) Replace the `structuredData` computed field (currently lines 115–127) with:

```ts
    structuredData: {
      type: 'json',
      resolve: (doc) =>
        buildStructuredData(
          {
            type: doc.type,
            title: doc.title,
            date: doc.date,
            lastmod: doc.lastmod,
            summary: doc.summary,
            images: doc.images,
            path: doc._raw.flattenedPath,
            reviewedItem: doc.reviewedItem,
            rating: doc.rating,
          },
          siteMetadata.siteUrl,
          siteMetadata.socialBanner
        ),
    },
```

- [ ] **Step 6: Commit (build verification happens in Task 4 once seed content has the required `type`)**

```bash
git add lib/structuredData.ts lib/structuredData.test.ts contentlayer.config.ts
git commit -m "Add content type field and per-type structured data"
```

> Note: `type` is now **required**, so the starter's demo posts (which lack it) will fail the build until Task 4 replaces them. Do not run `yarn build` between Step 6 and Task 4.

---

## Task 4: Replace demo content with CoinCoach seed articles

**Files:**
- Delete: all starter demo posts under `data/blog/`
- Create: `data/blog/welcome-to-coincoach.mdx` (news), `data/blog/what-is-staking.mdx` (guide), `data/blog/ethereum-breakdown.mdx` (breakdown), `data/blog/ledger-nano-x-review.mdx` (review), `data/blog/draft-example.mdx` (draft)
- Modify: `data/authors/default.mdx` (CoinCoach author)

- [ ] **Step 1: Remove starter demo posts**

```bash
rm -f data/blog/*.mdx
rm -rf data/blog/nested-route
```

- [ ] **Step 2: Update the default author**

Replace the contents of `data/authors/default.mdx` with:

```mdx
---
name: CoinCoach
avatar: /static/images/avatar.png
occupation: Crypto Educator
company: CoinCoach
email: support@rimdc.com
---

CoinCoach publishes clear, trustworthy cryptocurrency and blockchain news, guides, token breakdowns, and reviews.
```

- [ ] **Step 3: Create the News seed article**

Create `data/blog/welcome-to-coincoach.mdx`:

```mdx
---
title: 'Welcome to CoinCoach'
date: '2026-06-05'
type: news
tags: ['announcements']
summary: 'CoinCoach launches as your guide to cryptocurrency news, guides, token breakdowns, and reviews.'
authors: ['default']
---

CoinCoach is live. We cover the crypto market with clear news, practical guides,
in-depth token breakdowns, and honest reviews of the tools you actually use.
```

- [ ] **Step 4: Create the Guide seed article**

Create `data/blog/what-is-staking.mdx`:

```mdx
---
title: 'What Is Staking? A Beginner''s Guide'
date: '2026-06-05'
type: guide
tags: ['staking', 'proof-of-stake', 'basics']
summary: 'Staking lets you earn rewards by helping secure a proof-of-stake blockchain. Here is how it works.'
authors: ['default']
---

Staking is the process of locking up cryptocurrency to help secure a
proof-of-stake network in exchange for rewards. This guide explains the basics.
```

- [ ] **Step 5: Create the Token Breakdown seed article**

Create `data/blog/ethereum-breakdown.mdx`:

```mdx
---
title: 'Ethereum: A Token Breakdown'
date: '2026-06-05'
type: breakdown
tags: ['ethereum', 'smart-contracts']
summary: 'A breakdown of Ethereum: what it does, how it works, and what drives its value.'
authors: ['default']
---

Ethereum is a programmable blockchain that powers smart contracts and
decentralized applications. This breakdown covers its design and use cases.
```

- [ ] **Step 6: Create the Review seed article (with reviewedItem + rating)**

Create `data/blog/ledger-nano-x-review.mdx`:

```mdx
---
title: 'Ledger Nano X Review'
date: '2026-06-05'
type: review
reviewedItem: 'Ledger Nano X'
rating: 4
tags: ['wallets', 'hardware-wallet', 'security']
summary: 'Our hands-on review of the Ledger Nano X hardware wallet.'
authors: ['default']
---

The Ledger Nano X is a popular hardware wallet for storing crypto offline.
Here is our hands-on assessment of its security, usability, and value.
```

- [ ] **Step 7: Create a draft example (must be excluded from build output)**

Create `data/blog/draft-example.mdx`:

```mdx
---
title: 'Draft Example (should not publish)'
date: '2026-06-05'
type: guide
draft: true
tags: ['internal']
summary: 'This draft must never appear in the sitemap, feeds, search index, or listings.'
authors: ['default']
---

If you can see this on the live site, draft handling is broken.
```

- [ ] **Step 8: Run the full build and verify it succeeds with the new schema**

Run: `yarn build`
Expected: PASS — Contentlayer generates 5 Blog documents, Next build completes.

- [ ] **Step 9: Verify the draft is excluded from the search index**

Run: `grep -c "draft-example" public/search.json || echo "not found (correct)"`
Expected: `not found (correct)` (the draft must not be in the search index).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Replace demo content with CoinCoach seed articles"
```

---

## Task 5: Section helpers + section landing pages (TDD)

**Files:**
- Create: `lib/sections.ts`
- Create: `lib/sections.test.ts`
- Create: `app/_sectionPage.tsx` (shared listing component)
- Create: `app/news/page.tsx`, `app/guides/page.tsx`, `app/breakdowns/page.tsx`, `app/reviews/page.tsx`
- Modify: `data/headerNavLinks.ts`

- [ ] **Step 1: Write failing tests for the section helpers**

Create `lib/sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SECTIONS, getSection, filterByType } from './sections'

const posts = [
  { slug: 'a', type: 'news', title: 'A' },
  { slug: 'b', type: 'guide', title: 'B' },
  { slug: 'c', type: 'news', title: 'C' },
  { slug: 'd', type: 'review', title: 'D' },
]

describe('SECTIONS registry', () => {
  it('defines the four sections with routes and titles', () => {
    expect(SECTIONS.map((s) => s.type)).toEqual(['news', 'guide', 'breakdown', 'review'])
    expect(getSection('news')?.route).toBe('/news')
    expect(getSection('guide')?.route).toBe('/guides')
    expect(getSection('breakdown')?.route).toBe('/breakdowns')
    expect(getSection('review')?.route).toBe('/reviews')
  })
})

describe('filterByType', () => {
  it('returns only posts of the given type', () => {
    expect(filterByType(posts, 'news').map((p) => p.slug)).toEqual(['a', 'c'])
    expect(filterByType(posts, 'review').map((p) => p.slug)).toEqual(['d'])
    expect(filterByType(posts, 'breakdown')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL — cannot find module `./sections`.

- [ ] **Step 3: Implement the section registry + helpers**

Create `lib/sections.ts`:

```ts
import type { PostType } from './structuredData'

export interface Section {
  type: PostType
  route: string
  title: string
  description: string
}

export const SECTIONS: Section[] = [
  { type: 'news', route: '/news', title: 'News', description: 'The latest cryptocurrency and blockchain news.' },
  { type: 'guide', route: '/guides', title: 'Guides', description: 'Practical guides and explainers for crypto.' },
  { type: 'breakdown', route: '/breakdowns', title: 'Token Breakdowns', description: 'In-depth breakdowns of crypto tokens and projects.' },
  { type: 'review', route: '/reviews', title: 'Reviews', description: 'Honest reviews of exchanges, wallets, and tools.' },
]

export function getSection(type: PostType): Section | undefined {
  return SECTIONS.find((s) => s.type === type)
}

export function filterByType<T extends { type?: string }>(posts: T[], type: PostType): T[] {
  return posts.filter((p) => p.type === type)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS — all section tests pass.

- [ ] **Step 5: Create the shared section-listing component**

Create `app/_sectionPage.tsx`:

```tsx
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { filterByType, getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

const POSTS_PER_PAGE = 5

export function sectionMetadata(type: PostType): Metadata {
  const section = getSection(type)!
  return genPageMetadata({ title: section.title, description: section.description })
}

export default function SectionPage({ type }: { type: PostType }) {
  const section = getSection(type)!
  const posts = filterByType(allCoreContent(sortPosts(allBlogs)), type)
  const pagination = { currentPage: 1, totalPages: Math.ceil(posts.length / POSTS_PER_PAGE) }
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE)

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title={section.title}
    />
  )
}
```

- [ ] **Step 6: Create the four section pages**

Create `app/news/page.tsx`:

```tsx
import SectionPage, { sectionMetadata } from '../_sectionPage'

export const metadata = sectionMetadata('news')
export default function Page() {
  return <SectionPage type="news" />
}
```

Create `app/guides/page.tsx`:

```tsx
import SectionPage, { sectionMetadata } from '../_sectionPage'

export const metadata = sectionMetadata('guide')
export default function Page() {
  return <SectionPage type="guide" />
}
```

Create `app/breakdowns/page.tsx`:

```tsx
import SectionPage, { sectionMetadata } from '../_sectionPage'

export const metadata = sectionMetadata('breakdown')
export default function Page() {
  return <SectionPage type="breakdown" />
}
```

Create `app/reviews/page.tsx`:

```tsx
import SectionPage, { sectionMetadata } from '../_sectionPage'

export const metadata = sectionMetadata('review')
export default function Page() {
  return <SectionPage type="review" />
}
```

- [ ] **Step 7: Update the header navigation**

Replace the contents of `data/headerNavLinks.ts` with:

```ts
const headerNavLinks = [
  { href: '/', title: 'Home' },
  { href: '/news', title: 'News' },
  { href: '/guides', title: 'Guides' },
  { href: '/breakdowns', title: 'Breakdowns' },
  { href: '/reviews', title: 'Reviews' },
  { href: '/tags', title: 'Tags' },
  { href: '/about', title: 'About' },
]

export default headerNavLinks
```

- [ ] **Step 8: Build and verify the section pages render the right posts**

Run: `yarn build`
Expected: PASS. Build output lists routes `/news`, `/guides`, `/breakdowns`, `/reviews` as generated pages.

- [ ] **Step 9: Verify section filtering at runtime**

```bash
yarn serve & sleep 6
curl -s localhost:3000/reviews/ | grep -c "Ledger Nano X Review"   # expect >= 1
curl -s localhost:3000/news/ | grep -c "Welcome to CoinCoach"      # expect >= 1
curl -s localhost:3000/news/ | grep -c "What Is Staking"           # expect 0 (guide, not news)
kill %1
```
Expected: review page shows the review, news page shows the news post but not the guide.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add section helpers and section landing pages"
```

---

## Task 6: Per-section RSS feeds + canonical SEO checks

**Files:**
- Modify: `scripts/rss.mjs`

- [ ] **Step 1: Add per-section feed generation to the RSS script**

In `scripts/rss.mjs`, inside `async function generateRSS(config, allBlogs, page = 'feed.xml')`, after the existing per-tag loop (after the block that ends around line 56, before the function's closing `}`), add:

```js
  // Per-section feeds (news, guide, breakdown, review)
  const sections = ['news', 'guide', 'breakdown', 'review']
  const routeForType = { news: 'news', guide: 'guides', breakdown: 'breakdowns', review: 'reviews' }
  if (publishPosts.length > 0) {
    for (const type of sections) {
      const sectionPosts = sortPosts(publishPosts.filter((post) => post.type === type))
      if (sectionPosts.length === 0) continue
      const route = routeForType[type]
      const rss = generateRss(config, sectionPosts, `${route}/${page}`)
      const rssPath = path.join(outputFolder, route)
      mkdirSync(rssPath, { recursive: true })
      writeFileSync(path.join(rssPath, page), rss)
    }
  }
```

- [ ] **Step 2: Rebuild and verify per-section feeds are generated**

Run: `yarn build`
Then:
```bash
ls public/news/feed.xml public/reviews/feed.xml
grep -c "Welcome to CoinCoach" public/news/feed.xml      # expect >= 1
grep -c "draft-example" public/news/feed.xml || echo "draft excluded (correct)"
```
Expected: both feed files exist; news feed contains the news post; the draft is absent.

- [ ] **Step 3: Verify the sitemap excludes drafts**

```bash
grep -c "draft-example" $(find .next -name 'sitemap*.xml' 2>/dev/null) app/sitemap.ts 2>/dev/null || echo "not in sitemap source"
```
Expected: the draft slug does not appear in generated sitemap output. (The starter's `app/sitemap.ts` already filters drafts; this is a verification step.)

- [ ] **Step 4: Commit**

```bash
git add scripts/rss.mjs
git commit -m "Generate per-section RSS feeds"
```

---

## Task 7: Newsletter + search configuration

**Files:**
- Modify: `data/siteMetadata.js` (newsletter provider)
- Create: `.env.example`
- Verify: Kbar search (already enabled in the starter)

- [ ] **Step 1: Confirm/choose the newsletter provider**

The starter defaults to `provider: 'buttondown'` (line ~55 of `data/siteMetadata.js`). Keep `buttondown` for v1 (self-host-friendly alternative is `listmonk` via a custom API route, deferred). No change needed unless a different provider is chosen at setup.

- [ ] **Step 2: Document required env vars**

Create `.env.example`:

```bash
# Newsletter (Buttondown). Create at https://buttondown.email/
BUTTONDOWN_API_KEY=

# Public site URL (used for canonical URLs, sitemap, RSS)
# Set in production to https://coincoach.ca
```

- [ ] **Step 3: Verify the newsletter form renders on the home page**

The starter's `app/Main.tsx` already conditionally renders `<NewsletterForm />` when `siteMetadata.newsletter?.provider` is set. Build and check:

Run: `yarn build && yarn serve & sleep 6`
```bash
curl -s localhost:3000/ | grep -ic "subscribe\|newsletter"   # expect >= 1
kill %1
```
Expected: the newsletter form markup is present on the home page.

- [ ] **Step 4: Verify Kbar search index is generated**

```bash
test -f public/search.json && echo "search index present"
```
Expected: `search index present` (Contentlayer's `createSearchIndex` writes it; search is enabled via `siteMetadata.search.provider: 'kbar'`).

- [ ] **Step 5: Commit**

```bash
git add data/siteMetadata.js .env.example
git commit -m "Configure newsletter env and document search"
```

---

## Task 8: CoinCoach branding & site metadata

**Files:**
- Modify: `data/siteMetadata.js`
- Optional: `public/static/images/` (logo/avatar placeholders), `app/about` content
- Modify or remove: `app/projects`, `data/projectsData.ts` (repurpose later — leave intact for now unless it breaks build)

- [ ] **Step 1: Set CoinCoach site metadata**

In `data/siteMetadata.js`, update these fields:

```js
  title: 'CoinCoach',
  author: 'CoinCoach',
  headerTitle: 'CoinCoach',
  description: 'Cryptocurrency and blockchain news, guides, token breakdowns, and reviews.',
  language: 'en-us',
  theme: 'system',
  siteUrl: 'https://coincoach.ca',
  siteRepo: 'https://github.com/CryptoCanuck/coincoach.ca',
  email: 'support@rimdc.com',
```

Remove or blank social handles that don't apply yet (e.g. set `x`, `facebook`, `youtube`, `linkedin`, `threads`, `instagram`, `medium`, `bluesky`, `mastodon` to `''` or delete the lines) so footer icons don't link to placeholder profiles.

- [ ] **Step 2: Remove the "Projects" demo from nav (already done in Task 5) and verify the Projects page does not break the build**

The `app/projects` route and `data/projectsData.ts` remain but are no longer in the nav. Leave them; they don't affect SEO. (Optional cleanup: delete `app/projects/` and `data/projectsData.ts` if a clean build is preferred — verify `yarn build` still passes after deletion.)

- [ ] **Step 3: Build and verify branding**

Run: `yarn build && yarn serve & sleep 6`
```bash
curl -s localhost:3000/ | grep -c "CoinCoach"     # expect >= 1
kill %1
```
Expected: home page shows CoinCoach branding.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Apply CoinCoach branding and site metadata"
```

---

## Task 9: Standalone Docker build + Portainer stack

**Files:**
- Modify: `next.config.js` (standalone output)
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`

- [ ] **Step 1: Enable standalone output**

In `next.config.js`, change line 57 from:

```js
const output = process.env.EXPORT ? 'export' : undefined
```

to:

```js
const output = process.env.EXPORT ? 'export' : 'standalone'
```

- [ ] **Step 2: Create `.dockerignore`**

Create `.dockerignore`:

```
node_modules
.next
.contentlayer
.git
docs
*.md
.env*
out
```

- [ ] **Step 3: Create the Dockerfile (multi-stage, standalone runtime)**

Create `Dockerfile`:

```dockerfile
# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

# ---- builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && yarn build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Create the Portainer compose stack**

Create `docker-compose.yml`:

```yaml
services:
  coincoach:
    build:
      context: .
      dockerfile: Dockerfile
    image: coincoach:latest
    container_name: coincoach
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      # - BUTTONDOWN_API_KEY=${BUTTONDOWN_API_KEY}
    # Place behind a reverse proxy (Caddy/nginx) terminating TLS for coincoach.ca
```

- [ ] **Step 5: Build the Docker image and verify it runs**

```bash
docker build -t coincoach:test .
docker run -d --name coincoach-test -p 3001:3000 coincoach:test
sleep 8
curl -s localhost:3001/ | grep -c "CoinCoach"   # expect >= 1
docker rm -f coincoach-test
```
Expected: container serves the site; grep finds CoinCoach. (If Docker is unavailable in the execution environment, mark this step blocked and note it for the user to run on the VPS.)

- [ ] **Step 6: Commit**

```bash
git add next.config.js Dockerfile .dockerignore docker-compose.yml
git commit -m "Add standalone Docker build and Portainer compose stack"
```

---

## Task 10: AI-authoring docs + final verification

**Files:**
- Create: `docs/content-style-guide.md`, `docs/frontmatter-templates.md`
- Modify: `README.md` (deploy + authoring notes)

- [ ] **Step 1: Create the frontmatter templates doc**

Create `docs/frontmatter-templates.md`:

```markdown
# Frontmatter Templates

All articles live in `data/blog/<slug>.mdx`. `type` is required and must be one of:
`news`, `guide`, `breakdown`, `review`. New AI drafts MUST set `draft: true`.

## News
\`\`\`yaml
---
title: ''
date: 'YYYY-MM-DD'
type: news
tags: []
summary: ''
authors: ['default']
draft: true
---
\`\`\`

## Guide
\`\`\`yaml
---
title: ''
date: 'YYYY-MM-DD'
type: guide
tags: []
summary: ''
authors: ['default']
draft: true
---
\`\`\`

## Token Breakdown
\`\`\`yaml
---
title: ''
date: 'YYYY-MM-DD'
type: breakdown
tags: []
summary: ''
authors: ['default']
draft: true
---
\`\`\`

## Review
\`\`\`yaml
---
title: ''
date: 'YYYY-MM-DD'
type: review
reviewedItem: ''   # name of the product/service being reviewed
rating: 4          # 1-5, optional; enables star rich snippets
tags: []
summary: ''
authors: ['default']
draft: true
---
\`\`\`
```

- [ ] **Step 2: Create the content style guide**

Create `docs/content-style-guide.md`:

```markdown
# CoinCoach Content Style Guide

Audience: crypto-curious readers from beginner to intermediate. Voice: clear,
trustworthy, plain-English, no hype, no financial advice.

## Rules
- One H1 is the title (from frontmatter). Body starts at `##`.
- `summary` is 1-2 sentences and doubles as the meta description (keep < 160 chars).
- Use 3-7 relevant lowercase, hyphenated tags. Reuse existing tags where possible.
- Lead with the answer (inverted pyramid) for SEO and skimmability.
- Define jargon on first use. Link to related guides where helpful.
- News: include what happened, when, and why it matters. Use `type: news`.
- Guides: step-by-step, evergreen. Use `type: guide`.
- Breakdowns: what the token does, how it works, value drivers, risks. Use `type: breakdown`.
- Reviews: hands-on, set `reviewedItem` and an honest `rating` (1-5).
- Never publish without human review: new drafts ship with `draft: true`.

## AI authoring workflow
1. Claude Code writes a complete `.mdx` draft (`draft: true`) into `data/blog/`.
2. Human reviews and edits.
3. Set `draft: false` to publish.
```

- [ ] **Step 3: Update the README with CoinCoach deploy + authoring notes**

Replace the top of `README.md` (the starter's title/intro) with a CoinCoach overview. Add a "Deployment" section describing the Portainer stack and a "Content authoring" section pointing to `docs/content-style-guide.md` and `docs/frontmatter-templates.md`. Keep the starter's attribution/license notice intact (it is MIT).

```markdown
# CoinCoach

Cryptocurrency and blockchain news, guides, token breakdowns, and reviews.
Built on Next.js (App Router) + Contentlayer2 + Tailwind.

## Develop
- `yarn install`
- `yarn dev` — local dev server
- `yarn test` — unit tests (Vitest)
- `yarn build && yarn serve` — production build + serve

## Content authoring
Articles are MDX files in `data/blog/`. See `docs/content-style-guide.md` and
`docs/frontmatter-templates.md`. New drafts use `draft: true` and are excluded
from the build, sitemap, feeds, and search until published.

## Deployment
Self-hosted via Portainer. The app builds to a standalone Next.js server
(`output: 'standalone'`) packaged by `Dockerfile` and deployed as the
`docker-compose.yml` stack, behind a reverse proxy (Caddy/nginx) terminating
TLS for coincoach.ca.

---

_Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) (MIT)._
```

- [ ] **Step 4: Full verification pass**

```bash
yarn test          # all unit tests pass
yarn build         # clean production build
```
Expected: tests pass; build succeeds; `public/news/feed.xml`, `public/search.json`, sitemap present; draft excluded everywhere.

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "Add content authoring docs and deployment notes"
git push origin master
```

---

## Self-Review Notes (author checklist — verify during execution)

- **Spec coverage:** stack (T1), test tooling (T2), content model + `type` + structured data (T3), seed content + draft exclusion (T4), four sections + landing pages + nav (T5), per-section RSS + sitemap/draft SEO (T6), newsletter + search (T7), branding/metadata (T8), standalone Docker + Portainer (T9), AI-authoring docs + frontmatter template (T10). Future-proofing fields (`reviewedItem`, `rating`) added; live-data fields can extend the same schema later.
- **Article URL decision:** articles keep the canonical `/blog/<slug>` URL; `/news`, `/guides`, `/breakdowns`, `/reviews` are filtered archive/hub pages. This preserves all starter machinery and avoids routing surgery. If bare `/news/<slug>` article URLs are wanted later, that is a separate change requiring redirects.
- **Type consistency:** `PostType` ('news' | 'guide' | 'breakdown' | 'review') is defined once in `lib/structuredData.ts` and reused by `lib/sections.ts` and the section pages. The contentlayer enum options match exactly. `buildStructuredData(doc, siteUrl, socialBanner)` signature is consistent between the config call site (T3 Step 5) and tests (T3 Step 1).
- **Draft safety:** verified in T4 (search index), T6 (RSS + sitemap).
```
