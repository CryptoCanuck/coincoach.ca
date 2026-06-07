# Tags + Blog Archive Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the leftover starter light-theme on the `/tags` index and the shared blog/tag listing layout with the Direction-B dark design, converging the article listing on the existing `PostCard` grid while keeping the all-tags sidebar and pagination.

**Architecture:** Two presentational files. (1) `app/tags/page.tsx` becomes a Direction-B page (Breadcrumb + heading + intro + a chip cloud of tags with counts). (2) `layouts/ListLayoutWithTags.tsx` — shared by `/blog`, `/blog/page/[page]`, `/tags/[tag]`, `/tags/[tag]/page/[page]` — is restyled to Direction-B with a hybrid layout: a restyled all-tags sidebar + a `PostCard` grid (replacing the starter single-column list) + restyled pagination.

**Tech Stack:** Next 15 App Router (the layout is a `'use client'` component because it reads `usePathname`), Tailwind v4 with the Direction-B `@theme` tokens.

**Design tokens to use (already defined in `css/tailwind.css`):** `bg-surface` `#141a24`, `border-line` `#232c38`, `text-gray-50`, `text-ink-2` `#97a3b2`, `text-ink-3`, `text-accent`/`hover:border-accent` `#f2a024`, `text-blue` `#3fa7da`. NEVER use starter light classes here (`text-gray-900`, `divide-gray-200`, `bg-gray-50`, `text-primary-500` text-on-light, `md:mt-24`).

**Conventions:**
- Use `@/components/Link` (not bare `next/link`).
- Reuse `@/components/PostCard` for article cards (it renders cover image + `CategoryChip` + title and links to `/blog/${post.slug}`). It accepts `CoreContent<Blog>` — the topics page already passes exactly that, so it type-checks.
- `corepack yarn build` (Yarn Berry; `yarn` not on PATH) runs ESLint + prettier + prettier-plugin-tailwindcss; let it reformat class order.
- Commits authored solely by the user — NO AI co-author trailer.
- If `app/tag-data.json` changes during a build, `git checkout -- app/tag-data.json` before committing (generated artifact, unrelated).
- Stop dev servers by port: `lsof -ti tcp:3099 | xargs -r kill -9`. Do NOT use `pkill -f next`.

**Out of scope (do not touch):** `components/Tag.tsx` (its `text-primary-500` is the remapped amber `#d9871a` — already on-brand, and it's shared by article pages via `PostLayout`), `layouts/ListLayout.tsx` (dead code, no route imports it), `app/tags/[tag]/page.tsx` data/logic (only its rendering goes through the restyled layout).

**File structure:**
- Modify: `app/tags/page.tsx` — Direction-B tags index.
- Modify: `layouts/ListLayoutWithTags.tsx` — hybrid Direction-B listing (sidebar + PostCard grid + pagination).

---

## Task 1: Restyle the `/tags` index page

**Files:**
- Modify (full rewrite): `app/tags/page.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the ENTIRE contents of `app/tags/page.tsx` with:

```tsx
import Link from '@/components/Link'
import { slug } from 'github-slugger'
import tagData from 'app/tag-data.json'
import Breadcrumb from '@/components/Breadcrumb'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Tags',
  description: 'Browse every tag across CoinCoach news, guides, breakdowns and reviews.',
  alternates: { canonical: '/tags' },
})

export default function Page() {
  const tagCounts = tagData as Record<string, number>
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Tags' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Tags</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Every tag across our coverage. Prefer a curated view? Browse{' '}
        <Link href="/topics" className="text-blue font-semibold">
          topics
        </Link>
        .
      </p>

      {sortedTags.length === 0 ? (
        <p className="text-ink-2 mt-8 text-sm">No tags found.</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {sortedTags.map((t) => (
            <Link
              key={t}
              href={`/tags/${slug(t)}`}
              aria-label={`View posts tagged ${t.split('-').join(' ')} (${tagCounts[t]} posts)`}
              className="bg-surface border-line text-ink-2 hover:border-accent flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors hover:text-gray-50"
            >
              {t.split('-').join(' ')}
              <span className="text-ink-3 text-[11px] font-bold">{tagCounts[t]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

Notes: tag keys in `tag-data.json` are already slugified; `slug(t)` is idempotent. Display de-hyphenates + `capitalize`. The count is a muted secondary span.

- [ ] **Step 2: Build**

Run: `corepack yarn build`
Expected: success; `/tags` static route; no type/lint errors.

- [ ] **Step 3: Dev smoke test**

```bash
corepack yarn dev -p 3099 >/tmp/restyle-dev.log 2>&1 &
sleep 9
echo "status:"; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3099/tags/
echo "has Direction-B chip classes:"; curl -s http://localhost:3099/tags/ | grep -oE 'bg-surface|border-line|text-ink-2' | sort -u
echo "no starter light classes (should be empty):"; curl -s http://localhost:3099/tags/ | grep -oE 'text-gray-900|divide-gray-200|md:mt-24' | sort -u
echo "breadcrumb + heading:"; curl -s http://localhost:3099/tags/ | grep -oE 'Tags|topics' | sort -u
lsof -ti tcp:3099 | xargs -r kill -9
```
Expected: status 200; Direction-B classes present; the "no starter light classes" line prints NOTHING (empty); Tags/topics present.

- [ ] **Step 4: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add app/tags/page.tsx
git commit -m "Restyle tags index to Direction-B chip cloud"
```

---

## Task 2: Restyle the shared blog/tag listing layout (hybrid)

**Files:**
- Modify (full rewrite): `layouts/ListLayoutWithTags.tsx`

This layout is used by `/blog`, `/blog/page/[page]`, `/tags/[tag]`, `/tags/[tag]/page/[page]`. The rewrite keeps the component's props and pagination behaviour identical (same `basePath` logic, same `/page/N` links) but swaps the starter light theme for Direction-B and replaces the single-column post list with a `PostCard` grid.

- [ ] **Step 1: Replace the file contents**

Replace the ENTIRE contents of `layouts/ListLayoutWithTags.tsx` with:

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { slug } from 'github-slugger'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import PostCard from '@/components/PostCard'
import tagData from 'app/tag-data.json'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages
  const pill = 'rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition-colors'

  return (
    <nav className="mt-8 flex items-center justify-between">
      {prevPage ? (
        <Link
          href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
          rel="prev"
          className={`${pill} border-line bg-surface text-ink-2 hover:border-accent hover:text-gray-50`}
        >
          ‹ Previous
        </Link>
      ) : (
        <span className={`${pill} border-line text-ink-3 cursor-not-allowed opacity-50`}>
          ‹ Previous
        </span>
      )}
      <span className="text-ink-3 text-[13px] font-semibold">
        {currentPage} of {totalPages}
      </span>
      {nextPage ? (
        <Link
          href={`/${basePath}/page/${currentPage + 1}`}
          rel="next"
          className={`${pill} border-line bg-surface text-ink-2 hover:border-accent hover:text-gray-50`}
        >
          Next ›
        </Link>
      ) : (
        <span className={`${pill} border-line text-ink-3 cursor-not-allowed opacity-50`}>
          Next ›
        </span>
      )}
    </nav>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const tagCounts = tagData as Record<string, number>
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts
  const activeTag = decodeURI(pathname.split('/tags/')[1]?.split('/')[0] ?? '')

  return (
    <div className="py-7">
      <h1 className="text-[34px] font-black tracking-tight text-gray-50 capitalize">{title}</h1>

      <div className="mt-6 flex flex-col gap-7 lg:flex-row lg:gap-8">
        {/* All-tags sidebar (desktop only) */}
        <aside className="hidden lg:block lg:w-[250px] lg:shrink-0">
          <div className="bg-surface border-line sticky top-[140px] max-h-[calc(100vh-160px)] overflow-auto rounded-[10px] border p-4">
            {pathname.startsWith('/blog') ? (
              <span className="text-accent text-[13px] font-extrabold uppercase">All Posts</span>
            ) : (
              <Link
                href="/blog"
                className="text-ink-2 text-[13px] font-extrabold uppercase hover:text-gray-50"
              >
                All Posts
              </Link>
            )}
            <ul className="mt-3 flex flex-col gap-1.5">
              {sortedTags.map((t) => {
                const isActive = activeTag === slug(t)
                const label = `${t.split('-').join(' ')} (${tagCounts[t]})`
                return (
                  <li key={t}>
                    {isActive ? (
                      <span className="text-accent text-[12.5px] font-bold uppercase">{label}</span>
                    ) : (
                      <Link
                        href={`/tags/${slug(t)}`}
                        aria-label={`View posts tagged ${t.split('-').join(' ')} (${tagCounts[t]} posts)`}
                        className="text-ink-3 hover:text-ink text-[12.5px] font-semibold uppercase transition-colors"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Posts grid */}
        <div className="min-w-0 flex-1">
          {displayPosts.length === 0 ? (
            <p className="text-ink-2 text-sm">No posts found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}
        </div>
      </div>
    </div>
  )
}
```

Key changes vs the old file: dropped `formatDate`, `siteMetadata`, and the `Tag` import (no longer rendered — `PostCard` shows a `CategoryChip` instead); replaced the light single-column `<ul>` list with the `PostCard` grid; restyled the sidebar + pagination to Direction-B; the title `<h1>` is now always visible (the old one had `sm:hidden`). Pagination `basePath`/link logic is unchanged.

- [ ] **Step 2: Build**

Run: `corepack yarn build`
Expected: success; `/blog`, `/blog/page/[page]`, `/tags/[tag]`, `/tags/[tag]/page/[page]` all build; no type errors (notably no unused-import errors — confirm `Tag`, `formatDate`, `siteMetadata` are no longer imported) and no lint errors.

- [ ] **Step 3: Dev smoke test (blog + a tag page)**

```bash
corepack yarn dev -p 3099 >/tmp/restyle-dev.log 2>&1 &
sleep 9
echo "/blog status:"; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3099/blog/
echo "/blog has PostCard + Direction-B:"; curl -s http://localhost:3099/blog/ | grep -oE 'bg-surface|border-line|All Posts' | sort -u
echo "/blog no starter light classes (should be empty):"; curl -s http://localhost:3099/blog/ | grep -oE 'text-gray-900|bg-gray-50|dark:bg-gray-900' | sort -u
# pick a real tag slug from tag-data.json for the tag-page check
TAGSLUG=$(node -e "const d=require('./app/tag-data.json');console.log(Object.keys(d).sort((a,b)=>d[b]-d[a])[0]||'')")
echo "tag slug under test: $TAGSLUG"
echo "/tags/\$TAGSLUG status:"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3099/tags/${TAGSLUG}/"
echo "/tags/\$TAGSLUG sidebar active + cards:"; curl -s "http://localhost:3099/tags/${TAGSLUG}/" | grep -oE 'All Posts|bg-surface' | sort -u
lsof -ti tcp:3099 | xargs -r kill -9
```
Expected: `/blog` → 200, shows `bg-surface`/`border-line`/`All Posts`, the "no starter light classes" line is EMPTY; the tag page → 200 and shows the Direction-B classes. (If `node` isn't available for the `TAGSLUG` step, substitute any known tag slug such as `bitcoin`.)

- [ ] **Step 4: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add layouts/ListLayoutWithTags.tsx
git commit -m "Restyle blog and tag listing to Direction-B cards with tag sidebar"
```

---

## Final verification (after both tasks)

- [ ] **Full build:** `corepack yarn build` — clean; all of `/tags`, `/tags/[tag]`, `/tags/[tag]/page/[page]`, `/blog`, `/blog/page/[page]` build with no errors.
- [ ] **Test suite:** `corepack yarn vitest run` — unchanged, still green (this is presentational; no test logic changes).
- [ ] **Revert generated artifact if changed:** `git checkout -- app/tag-data.json 2>/dev/null || true`
- [ ] Dispatch the final holistic review over the branch, then proceed to the PR / CodeRabbit loop.

---

## Self-Review notes

**Spec coverage:**
- `/tags` index light → Direction-B → Task 1. ✅
- Shared blog/tag listing light → Direction-B, hybrid cards + sidebar + pagination → Task 2. ✅
- Keep tag sidebar + pagination (the chosen "Hybrid" option) → Task 2 retains both. ✅
- Converge article listing on `PostCard` grid → Task 2. ✅
- `/blog` archive (also light-themed via the shared layout) fixed as a consequence → Task 2. ✅

**Type consistency:** `PostCard` accepts `CoreContent<Blog>` (confirmed: `app/topics/[topic]/page.tsx` passes the same type to `<PostCard post={post} />`). `displayPosts` is `CoreContent<Blog>[]`; `post.slug` exists (Blog computed field) and is used for `key`. Pagination prop shape (`{ totalPages, currentPage }`) and `basePath` link logic are unchanged from the original, so `/page/N` routes keep working.

**Placeholder scan:** No TBD/TODO; both tasks contain the full file contents. No "handle edge cases" hand-waving — empty-state (`No posts found.` / `No tags found.`) is explicit.

**Out-of-scope guard:** `components/Tag.tsx`, `layouts/ListLayout.tsx`, and the `/tags/[tag]` route logic are explicitly NOT modified, preventing scope creep into article pages.
