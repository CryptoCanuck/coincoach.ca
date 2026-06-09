# Initial Content Seed — Design

**Date:** 2026-06-08
**Branch:** `content-batch-2`
**Goal:** Seed the empty News category and expand Breakdowns with original CoinCoach articles. This is an initial content batch to populate the pages and categories.

## Scope

- **~12 articles**, all MDX in `data/blog/`, `draft: false`, author `default`.
  - **8 news** (`postType: news`) — currently zero exist; this fills the News category.
  - **4 breakdowns** (`postType: breakdown`) — coins beyond the existing BTC/ETH/SOL.
- Out of scope this round: guides, reviews, images/hero art (news pieces fall back to the site `socialBanner` for OG).

## Content approach (legal + SEO)

**Original coverage, written from primary sources.** Every article is CoinCoach's own writing — never a copy or light edit of another outlet's piece (that would be copyright infringement and duplicate-content SEO poison).

1. Identify newsworthy stories from the current crypto news cycle.
2. For each story, verify the facts against **primary sources** (project blogs, regulator filings, exchange/company announcements, on-chain data).
3. Write an **original** CoinCoach article in our own words and framing.
4. Each news piece ends with a **"Sources / further reading"** section linking the **primary sources** (official announcements, filings, project posts) — not third-party news aggregators.

### Accuracy guardrails (these publish live)

- **Real, verifiable news only.** Assistant training cutoff is Jan 2026; June 2026 events are unknown to memory. Every news article's facts MUST come from fetched live primary sources — no invented stories, quotes, prices, or dates.
- Publish `date` reflects the real story date (within the current news cycle).
- If a story can't be corroborated by a primary source, it's dropped, not published.

## News articles (8)

- **Selection:** spread across beats so the category looks like a real newsroom, e.g. regulation/policy, ETF or institutional flows, a security incident (hack/exploit), a major protocol launch/upgrade, a notable market move, an adoption/partnership story, plus 1–2 wildcards. Exact stories depend on what's live at run time.
- **Format:** 350–550 words. Lede paragraph (what happened + why it matters), 2–4 short sections or a tight narrative, a "what it means" angle, then Sources.
- **Frontmatter:**
  ```yaml
  title: '<headline>'
  date: '<YYYY-MM-DD of the story>'
  postType: news
  tags: [<2–4 lowercase tags>]
  summary: '<one-sentence dek>'
  authors: ['default']
  coins: [<coingecko ids if the story centers on specific coins>]
  draft: false
  ```
- Where a story centers on a specific asset, embed `<CoinCard id="<coingecko-id>" />` for live context.

## Breakdown articles (4)

Follow the existing breakdown template (`data/blog/bitcoin-breakdown.mdx`): intro → `<CoinCard>` → How it works → supply/tokenomics → what drives value → risks. Live numbers come from `<CoinCard>` (CoinGecko), so nothing goes stale.

| Coin | `<CoinCard id>` / coingecko id | Slug |
|---|---|---|
| Chainlink (LINK) | `chainlink` | `chainlink-breakdown` |
| Avalanche (AVAX) | `avalanche-2` | `avalanche-breakdown` |
| Polygon (POL, ex-MATIC) | `polygon-ecosystem-token` | `polygon-breakdown` |
| Toncoin (TON) | `the-open-network` | `toncoin-breakdown` |

- 500–800 words, evergreen, factual. `postType: breakdown`, `coins: ['<id>']`, `draft: false`, `date` = run date.

## Execution

- **Parallel research agents** (dispatching-parallel-agents): one agent per article, each with web access, instructed to fetch + verify from live primary sources and return a complete MDX file (frontmatter + body) plus the source URLs it used.
- **Review/normalize pass (manual):** after agents return, I verify each cited source resolves, check frontmatter validity (required fields, enum `postType`, valid dates, valid CoinCard ids), normalize voice/length, dedupe topics, and drop any piece with weak sourcing.
- **Validation:** run the contentlayer build / lint so every MDX parses and frontmatter validates before the PR.

## Delivery

- Feature branch `content-batch-2` off `origin/master`.
- Small, logically-scoped commits (e.g. breakdowns grouped, news in 2–3 themed commits) per the project's small-commits preference.
- One PR to `master`, reviewed before merge (the review gate). No AI co-author trailers (project preference).

## Risks & mitigations

- **Stale/incorrect news** → strict primary-source verification; drop uncorroborated items.
- **Voice drift across agents** → manual normalization pass before commit.
- **Invalid CoinCard id** → ids pre-verified against CoinGecko (done).
- **Duplicate/near-duplicate of a source** → original-wording requirement + review check.
