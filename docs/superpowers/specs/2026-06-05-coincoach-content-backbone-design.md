# CoinCoach Content Backbone — Design Spec

**Date:** 2026-06-05
**Status:** Approved
**Author:** CryptoCanuck

## Overview

CoinCoach (coincoach.ca) is a cryptocurrency and blockchain content website covering
news, guides, token breakdowns, and reviews. The immediate goal is to ship a
production-grade **content backbone** that drives organic SEO traffic. Live data
features (prices, market-driven token breakdowns, trade recommendations) are
explicitly deferred to later phases but the architecture must not preclude them.

The site has a single human author. Article drafting is AI-assisted: Claude Code
writes complete MDX drafts into the repo, which the author reviews and publishes.

## Goals

- A fast, SEO-strong Next.js content site live on a self-hosted VPS.
- Four content sections: News, Guides, Token Breakdowns, Reviews.
- An AI-draft → human-review → publish authoring workflow using in-repo MDX.
- Newsletter capture and on-site search at launch.
- An architecture that cleanly accommodates live crypto data later.

## Non-Goals (v1)

- Live price / market data, trade recommendations (later phase).
- Comments and analytics (trivial later add-ons; intentionally out of v1).
- A headless CMS or web-based admin UI (the author uses in-repo MDX).
- Multi-author roles / permissions.

## Approach

Build on **`timlrx/tailwind-nextjs-starter-blog` + Pliny** (path A from
brainstorming). Rationale: actively maintained, popular, App Router + RSC, MDX via
Contentlayer2, with RSS / sitemap / SEO and structured-data scaffolding already
solved. It matches the AI-writes-MDX-in-repo model exactly and reaches SEO-ready
production fastest. Alternatives considered and rejected: rolling our own from
`create-next-app` + Velite (too much re-implementation), and Strapi headless CMS
(wrong fit for a single AI-in-repo author).

## Architecture & Stack

- **Framework:** Next.js 15, App Router, React Server Components.
- **Styling:** Tailwind CSS (starter theme, customized for CoinCoach branding).
- **Content:** `.mdx` files in the repo, compiled by **Contentlayer2**.
  - Toolchain risk: Contentlayer2 is the maintained community fork. If it stalls,
    migration to Velite is a known, contained path. Accepted for v1.
- **Components:** Pliny for newsletter and Kbar search drop-ins.
- **Data store:** none — content is version-controlled MDX. No database in v1.

## Content Model

Four sections implemented via a `type` frontmatter field plus organized content
subfolders:

| Section          | `type`        | Route          | SEO schema           |
|------------------|---------------|----------------|----------------------|
| News             | `news`        | `/news`        | `NewsArticle`        |
| Guides           | `guide`       | `/guides`      | `Article`            |
| Token Breakdowns | `breakdown`   | `/breakdowns`  | `Article`            |
| Reviews          | `review`      | `/reviews`     | `Review` / `Article` |

- Each section has a landing/index page and its own RSS feed.
- **Tags** are cross-cutting (e.g. `bitcoin`, `defi`, `wallets`, `staking`) and span
  all sections, with per-tag pages and feeds.
- **Frontmatter schema** (Contentlayer2 document definition):
  `title` (string, required), `type` (enum: news|guide|breakdown|review, required),
  `summary` (string, required — used for meta description + cards),
  `tags` (string[]), `authors` (string[]), `publishedAt` (date, required),
  `updatedAt` (date, optional), `draft` (boolean, default false),
  `coverImage` (string, optional), `canonicalUrl` (string, optional).
- The Token Breakdown type is designed so a later phase can merge static analysis
  with live market data (e.g. a `ticker`/`coingeckoId` field reserved for future use).

## AI Authoring Workflow

1. Author asks Claude Code to write an article on a topic.
2. Claude Code researches and writes a complete `.mdx` file with `draft: true` into
   the correct section folder, following the frontmatter template and a content
   style guide kept in the repo (`docs/content-style-guide.md`).
3. Author reviews/edits in their editor.
4. Author sets `draft: false` to publish.

Drafts (`draft: true`) are excluded from the production build, sitemap, RSS feeds,
and listing pages automatically.

## SEO Foundation

- Per-article metadata via the App Router Metadata API (title, description, OG,
  Twitter cards).
- `app/sitemap.ts` and `app/robots.ts` (drafts excluded).
- Per-section and per-tag RSS feeds.
- Canonical URLs (respecting `canonicalUrl` frontmatter when set).
- **schema.org JSON-LD structured data** per the section table above — central to the
  organic-traffic goal.

## v1 Engagement Features

- **Newsletter signup:** Pliny newsletter component. Provider selected at setup
  (self-hostable, e.g. Listmonk, or a service such as Buttondown/Beehiiv).
- **On-site search:** Pliny Kbar command-palette search over all articles. Local, no
  external service.

## Deployment

- **Build:** Next.js `output: 'standalone'`.
- **Container:** Docker image built from the standalone output.
- **Orchestration:** deployed as a **Portainer** stack via `docker-compose`.
- **Serving:** `next start` (Node server) behind a reverse proxy (Caddy or nginx) on
  the VPS, terminating TLS.
- **Images:** Next built-in image optimization (sharp).
- Being a full Node server, ISR and future background jobs / API routes are available.

## Future-Proofing (later phases, not built in v1)

- Live prices, market data, token-breakdown enrichment, and trade recommendations
  added as App Router API routes + server components calling external APIs
  (e.g. CoinGecko, CryptoPanic) with caching. No re-architecture required.
- Reserved frontmatter fields on the breakdown type enable static→live merging.

## Repository

- GitHub: https://github.com/CryptoCanuck/coincoach.ca (public).
- Git identity: `CryptoCanuck <support@rimdc.com>`.
- Commits are authored solely by the user — no AI / co-author attribution.
