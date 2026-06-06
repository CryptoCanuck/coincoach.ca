# CoinCoach Redesign (CryptoSlate-style) — Design Spec

**Date:** 2026-06-06
**Status:** Approved
**Author:** CryptoCanuck

## Overview

Redesign the CoinCoach site from the default starter theme into a polished,
crypto-native news magazine in the spirit of CryptoSlate. The redesign covers the
global theme, layout shell, homepage, section/listing pages, and article pages, and
adds a small **live market-data layer** (a price ticker and a "Top Coins" widget)
backed by CoinGecko.

The visual direction was validated against a high-fidelity mockup during
brainstorming (`.superpowers/brainstorm/`): **Layout C** (price ticker → sticky
header → hero split → colour-coded topic bands) in the **Midnight** palette
(dark-first, navy surfaces + electric-cyan accent), dark-only.

## Goals

- A cohesive, professional dark "news magazine" look across all pages.
- A homepage with a featured hero, a trending rail, a live Top Coins widget, and
  section bands (News, Guides, Token Breakdowns, Reviews).
- A live price ticker + Top Coins widget fed by cached CoinGecko data.
- Section/listing pages as clean card grids; article pages with a cover hero,
  category chip, meta, readable body, related posts, and share.
- Preserve the existing Contentlayer/MDX content pipeline, SEO, feeds, search, and
  the deploy setup unchanged.

## Non-Goals (this redesign)

- Live token-detail/breakdown pages with per-coin market data (future phase).
- A light theme / theme switch (dark-only; switch is removed).
- Trade recommendations or portfolio features (future phase).
- View-count-based "trending" (we approximate trending with recent/featured posts).

## Approach

**Restyle in place.** Keep the starter's architecture (Contentlayer documents,
`app/` routes, `components/`, `layouts/`) and re-skin it: replace the Tailwind theme
tokens with the Midnight palette, rebuild the layout shell and key pages/components,
and add a self-contained `lib/markets` data layer + market components. The
CryptoSlate look is overwhelmingly CSS/layout, so this achieves the goal without an
architectural rewrite. Alternatives considered and rejected: adopting shadcn/ui
(heavier refactor, marginal payoff) and a full bespoke rebuild (highest risk).

## Global Theme

- **Palette (Midnight), defined as CSS tokens in `css/tailwind.css` `@theme`:**
  - `--bg:#0b1220`, `--ticker:#060b16`, `--header:#0f1a2e`, `--surface:#131c31`,
    `--border:#1e293b`
  - text `#e5e7eb`, headings `#f1f5f9`, muted `#94a3b8`
  - accent (primary) cyan `#22d3ee`; up `#34d399`, down `#f43f5e`
  - category colours: News `#3b82f6`, Guide `#10b981`, Breakdown `#a855f7`,
    Review `#f59e0b`
- **Dark-only:** configure `next-themes` ThemeProvider with `forcedTheme="dark"`,
  set `<html class="dark">`, and remove the `ThemeSwitch` from the header. The
  `components/ThemeSwitch.tsx` file may remain unused (no need to delete).
- **Typography:** Inter via `next/font/google` (self-hosted by Next, so no external
  font CSP entry needed) for body and headings; tight heading letter-spacing.
- **Category mapping** lives in the existing `lib/sections.ts` `SECTIONS` registry —
  extend each `Section` with a `color` token + chip class so chips/labels stay
  consistent and DRY across cards, hero, and section pages.

## Layout Shell

- **`components/Ticker.tsx`** (server component): renders a single-row price
  strip across the very top from the cached markets data (symbol, price, 24h % with
  up/down colour). Hidden gracefully if data is unavailable.
- **`components/Header.tsx`** (restyled): CoinCoach wordmark (cyan "Coach"),
  section nav (News/Guides/Breakdowns/Reviews), and the existing Kbar
  `SearchButton`. Sticky. Mobile nav restyled.
- **`components/Footer.tsx`** (restyled): newsletter/RSS/About links, copyright,
  Midnight styling.
- These compose in `components/LayoutWrapper.tsx` (ticker + header + main + footer).

## Homepage (`app/Main.tsx` → magazine layout)

Driven by Contentlayer posts (`allCoreContent(sortPosts(allBlogs))`, drafts already
excluded) plus the markets data layer.

- **Hero split** (`grid 1.7fr / 1fr`):
  - **Lead:** the most recent post (preferred: most recent `news`; fallback latest
    of any type) — cover hero, category chip, headline, meta.
  - **Rail:** `TrendingList` (next ~4 most recent posts) + `TopCoins` widget.
- **Topic bands:** one band per section (News, Guides, Token Breakdowns, Reviews),
  each a 4-up `Card` grid of that section's latest posts with a "View all ›" link to
  the section route. Bands render only if they have posts.

## Section / Listing Pages (`/news`, `/guides`, `/breakdowns`, `/reviews`)

Replace the current `ListLayoutWithTags` usage in `app/_sectionPage.tsx` with a
**card grid** (`Card` components, same as homepage bands), keeping the existing
section title/description and the canonical section routing. Tags page and `/blog`
list reuse the same card grid for consistency.

## Article Page (`layouts/PostLayout.tsx` restyle)

- Cover-image hero (or category-gradient fallback), category chip, title, meta
  (author · date · reading time).
- Readable prose column (restyle MDX prose for Midnight; update `css/prism.css`
  code theme to a dark scheme that fits).
- Footer: tags, share links, and a **Related posts** strip (same `postType`, latest
  3 excluding current).

## Market-Data Module (`lib/markets`)

- **Source:** CoinGecko public API, no key:
  `GET /api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1`
  → array of `{ symbol, name, current_price, price_change_percentage_24h, image }`.
- **One fetch serves both** the ticker and the Top Coins widget.
- **Caching/resilience:** fetch with Next ISR — `fetch(url, { next: { revalidate: 60 } })`
  — so CoinGecko is hit at most ~once/minute regardless of traffic (well within free
  limits). All fetching is **server-side**, so no client CORS/CSP impact and the
  tightened `connect-src 'self'` CSP stays intact.
- **`lib/markets/coingecko.ts`:** `getTopCoins(): Promise<Coin[]>` — fetch + map +
  `try/catch` returning `[]` on failure.
- **`lib/markets/format.ts`** (pure, unit-tested): `formatUsd(n)`,
  `formatPercent(n)` (sign + 2dp), `changeDirection(n)` → `'up'|'down'|'flat'`.
- **`Coin` type:** `{ symbol, name, price, change24h, image }`.
- **Failure mode:** if `getTopCoins()` returns `[]`, `Ticker` renders nothing and
  `TopCoins` shows a small "Market data unavailable" note — the page never breaks.
- **Coin logos:** v1 uses symbol/name text only (keeps CSP/image config simple).
  Optional later: render `image` via `next/image` after adding
  `assets.coingecko.com` to `next.config.js` `remotePatterns` and CSP `img-src`.

## Components Inventory

| Component | Type | Responsibility |
|-----------|------|----------------|
| `Ticker` | server | Top price strip from markets data |
| `TopCoins` | server | Sidebar Top Coins widget from markets data |
| `TrendingList` | server | Numbered list of recent posts |
| `Card` | server | Post card: cover/fallback, category chip, title, meta |
| `CategoryChip` | server | Colour-coded `postType` chip (from `SECTIONS`) |
| `ArticleMeta` | server | author · date · reading time row |

`Card`, `CategoryChip`, and the section colour map are shared by the homepage,
section pages, and article page to stay DRY.

## Content & Images

- Posts gain an **optional** `coverImage` frontmatter field (already partially
  present as `images`; reuse `images[0]` if set). When absent, cards/hero render a
  **category-coloured gradient placeholder** (as in the mockup) so the design holds
  without imagery.
- Update `docs/frontmatter-templates.md` to mention `coverImage`.
- Seed posts get simple gradient fallbacks (no new image assets required for v1).

## Testing

- **Unit (Vitest):** `lib/markets/format.ts` (USD/percent formatting, direction
  thresholds incl. negative/zero/large) and the CoinGecko response→`Coin` mapping
  (given a sample payload, with a malformed/empty payload yielding `[]`).
- **Build/visual smoke:** `yarn build` clean; homepage, a section page, and an
  article page render; ticker/TopCoins degrade gracefully when markets data is `[]`.

## Risks / Caveats

- **CoinGecko rate limits / outages:** mitigated by 60s ISR caching + graceful empty
  fallback. No key required at this volume.
- **CSP:** unaffected, because market data is fetched server-side. Only changes if we
  later add CoinGecko coin logos (would need an `img-src` + `remotePatterns` entry).
- **"Trending" is recency-based** (no analytics yet); can be upgraded to a `featured`
  flag or real popularity later.
- **Reduced scope guardrail:** this is one cohesive redesign + a minimal market-data
  module — not the full live-data/token-detail phase, which remains future work.

## Repository / Deploy

No changes to the deploy setup: still builds to the standalone Docker image and the
Portainer stack (host port 4600). The redesign is front-end + a server-side data
module only.
