# CoinCoach — Direction B Redesign Roadmap

**Source of truth:** the Claude Design handoff "Direction B" (dark sentiment/category
dashboard). Mocks: `index.html`, `Homepage.html`, `Market Sentiment.html`,
`Coin Detail.html`, `Article.html` + `wf.css` / `wf-parts.jsx` (extracted to a temp
dir during handoff; not committed). This doc tracks what's shipped and uses the
design as the guide for where the **functionality** should land.

Numbers in the mocks (prices, sentiment scores, article counts) are representative
sample data — wire real data; match structure and styling.

---

## Status legend

- ✅ shipped — visual + real data
- 🟡 shipped as static/placeholder — needs a data feed or interactivity
- ⛔ not built yet

---

## Phase 0 — Homepage design shell ✅ (shipped)

The global re-skin and homepage layout are in. See the chrome + homepage components
under `components/` and `app/Main.tsx`.

| Piece                                               | State                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| Amber/near-black palette + Figtree, 1440px shell    | ✅ `css/tailwind.css`, `LayoutWrapper`, `SectionContainer`        |
| Ticker (MARKET label + coin logos)                  | ✅ live CoinGecko, auto-scroll marquee (`Ticker.tsx`, `CoinLogo`) |
| Header (logo, nav, search field, Ask-the-Coach CTA) | ✅ chrome; CTA is 🟡 (no handler)                                 |
| Sticky CatBar                                       | ✅ routes to sections/tags                                        |
| Footer (columns + legal)                            | ✅                                                                |
| Market Pulse: Gauge + 4 StatCards                   | ✅ live global stats + Fear & Greed (`MarketPulse`)               |
| Explore by Category (8 tiles)                       | ✅ real sections + top tags w/ live counts                        |
| Top Stories + CoinTable                             | ✅ real posts + live coins                                        |
| Movers (gainers/losers)                             | ✅ live top-100 movers with Gainers/Losers toggle                 |
| CoachStrip                                          | 🟡 presentational, no backend                                     |
| Latest News + Load more                             | ✅ real posts (Load more → `/news`)                               |

---

## Phase 1 — Market data layer (unblocks most placeholders)

Everything below is one `lib/markets/` expansion. Keep the current pattern:
server-side fetch, `next: { revalidate }` ISR cache, `try/catch` → safe empty
fallback, so CSP and graceful degradation hold.

| Feed                                                                  | Source                                                  | Powers                                          | Notes                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global market stats — total cap, 24h vol, BTC dominance, active coins | CoinGecko `/global`                                     | ✅ Market Pulse StatCards                       | DONE — `lib/markets/global.ts` (`getGlobalStats`)                                                                                                                                                          |
| Fear & Greed index (current + history)                                | alternative.me `/fng/?limit=N`                          | ✅ homepage `Gauge` + `/sentiment` hero & chart | DONE — `lib/markets/sentiment.ts` (`getFearGreed`, `getFearGreedHistory`)                                                                                                                                  |
| Per-coin & per-category sentiment                                     | ✅ documented momentum proxy                            | ✅ `/sentiment` by-coin / by-category           | DONE — `sentimentScore` = `clamp(round(50+4·Δ%),0,100)` in `lib/markets/sentimentProxy.ts`; coins use 24h price Δ, categories use `/coins/categories` market-cap Δ. Labelled as a proxy, not a social feed |
| Movers (true market gainers/losers)                                   | CoinGecko markets bigger `per_page`, sort by 24h change | ✅ Movers panel                                 | DONE — `splitMovers`/`getMovers` in `lib/markets/coingecko.ts` (top-100 proxy)                                                                                                                             |
| Per-coin detail (stats, supply, ATH/ATL, links)                       | CoinGecko `/coins/{id}`                                 | ✅ Coin Detail                                  | DONE — `lib/markets/coins.ts` (`getCoin`/`mapCoinDetail`)                                                                                                                                                  |
| OHLC / price series per timeframe                                     | CoinGecko `/coins/{id}/ohlc?days=`                      | ✅ Coin Detail candlestick chart                | DONE — `getOhlc`/`getAllOhlc`/`mapOhlc` in `coins.ts` (24H/7D/1M/1Y). Sentiment history uses F&G history instead                                                                                           |
| Coin logos (real)                                                     | CoinGecko `image` or a licensed icon CDN                | swap `CoinLogo` SVGs                            | needs `next.config.js` `remotePatterns` + CSP `img-src`                                                                                                                                                    |

---

## Phase 2 — Interactive homepage polish

| Item                                         | Where                                  | Work                                                    |
| -------------------------------------------- | -------------------------------------- | ------------------------------------------------------- |
| Movers Gainers/Losers toggle                 | `components/Movers.tsx`                | ✅ done — server fetch + `MoversTabs` client toggle     |
| Ticker marquee (auto-scroll, pause on hover) | `components/Ticker.tsx`                | ✅ done — pure-CSS marquee, hover-pause, reduced-motion |
| Timeframe chips (history/charts)             | `SentimentHistoryChart` / `PriceChart` | ✅ done — client chip switch on both charts (3a/3b)     |
| Watchlist toggle                             | `WatchlistButton`                      | ✅ done — localStorage star on the coin header (3b)     |
| Converter (coin↔USD)                         | Coin Detail rail                       | ✅ done — `Converter` client component (3b)             |

---

## Phase 3 — New pages

### 3a. Market Sentiment — `/sentiment` (signature page) ✅ (shipped)

> **SHIPPED** — `app/sentiment/page.tsx` with a live whole-market Fear & Greed hero
> (`Gauge` `xl` + `SentimentHistoryChart` 7D/30D/90D/1Y), overview strip
> (Sentiment/Yesterday/Last Week/Volatility/BTC Dominance), Sentiment-by-Coin
> (`SentRow`) and Sentiment-by-Category cards powered by the documented momentum
> proxy, "What does this mean?" guide cards, and `CoachStrip`. **Sentiment** added to
> the header + mobile nav. Per-coin/category readings carry a visible "momentum proxy —
> not a social-sentiment feed" disclosure. Built subagent-driven from
> `docs/superpowers/plans/2026-06-06-coincoach-phase-3a-market-sentiment.md`.

The page the client specifically liked. Layout (`Market Sentiment.html`):

- Breadcrumb → title block (eyebrow "Live Market Mood", H1, lede).
- **Hero:** big `Gauge` (260×140) with 0/50/100 legend + **30-Day History** line/area
  chart with 7D/30D/90D/1Y chips.
- **Overview stat strip:** Sentiment / Yesterday / Last Week / Volatility / BTC Dominance.
- **Sentiment by Coin:** rows (logo, name, horizontal bar coloured by zone, score, zone
  label Extreme Fear→Extreme Greed) — new `SentRow` + `sbar`.
- **Sentiment by Category:** 2-col cards (name, score, bar).
- **"What does this mean?"** 3 explainer/guide cards (link to guides) → CoachStrip → Footer.
- Data: Phase 1 F&G current+history + per-coin/per-category (proxy). Add `Sentiment` nav item.

### 3b. Coin Detail — `/charts/[coin]` ✅ (shipped)

> **SHIPPED** — `/charts` index + `/charts/[coin]` (keyed on CoinGecko `id`). Coin
> header (logo, name as `h1`, rank, price + 24h change, `WatchlistButton`, static
> "Ask about X"), **lightweight-charts v5 candlestick** (`PriceChart`, 24H/7D/1M/1Y
> chips — `1H`/`ALL` dropped for free-tier OHLC granularity/payload), `KeyStats`
> (incl. a derived 30d volatility), About + resource links, right rail (per-coin
> momentum gauge via `sentimentScore`, `Converter`, `SimilarCoins`, coin-tagged news).
> Feeds: `lib/markets/coins.ts` (`getCoin`, `getAllOhlc`, `priceVolatilityPct`) +
> `id` added to `Coin`. All fetches server-side (chart candle sets pre-fetched and
> passed to the client; no client fetching). **Charts** added to header + mobile nav.
> Plan: `docs/superpowers/plans/2026-06-06-coincoach-phase-3b-coin-detail.md`.

Layout (`Coin Detail.html`):

- Breadcrumb → **coin header** (large logo, name+ticker+Rank tag, classification; right:
  big price 38/900 + abs & % change; actions "+ Watchlist", "Ask about BTC").
- Body grid `1fr | 360px`:
  - Left: **Price chart** panel (area/candlestick + timeframe chips 1H/24H/7D/1M/1Y/ALL);
    **Key Stats** statgrid (Market Cap, Volume, Supply, Max Supply, ATH, ATL, Rank,
    Volatility); **About** prose + resource chips (Website, Whitepaper, Explorer, GitHub,
    Reddit).
  - Right rail: per-coin **Sentiment** gauge, **Converter**, **Similar Coins** `CoinTable`,
    **Latest [coin] News** list (filter posts by coin tag).
- Needs `/charts` index (coin table linking to detail). Add **Charts** nav item.

### 3c. Reusable bits these need

`statgrid`/`StatCell`, `Gauge` (already built, accepts size), `Breadcrumb`,
`TimeframeChips`, `Converter`, `SentRow`/`sbar`, `ResourceChip`.

---

## Phase 4 — Article page enhancement (`layouts/PostLayout.tsx`) ✅ SHIPPED

**Shipped:** two-column Article layout — breadcrumb (section › tag › title), category chip,
big H1, standfirst, rich byline (avatar/role/date/read-time + X/LinkedIn share), hero +
caption, enhanced prose (h4 subheads, amber `PullQuote`, captioned `Figure`, inline live-price
`CoinCard` MDX components), tag chips, `AuthorBio` box (renders the author's MDX bio), Related
Stories grid, and a right sidebar (`ArticleSidebar` = Market Sentiment gauge + "Coins in this
story" + "Ask the Coach" placeholder + Trending). New `coins: ['bitcoin','ethereum']`
frontmatter (CoinGecko ids) drives the sidebar list + which ids inline cards can show. All
market data fetched **server-side** in `app/blog/[...slug]/page.tsx` (`getMarketsByIds` +
`getFearGreed`, parallel) and passed as props; the inline card reads it via a `CoinDataProvider`
client context wrapping the MDX — no client fetch, CSP intact. Plan:
`docs/superpowers/plans/2026-06-06-coincoach-phase-4-article-enhancement.md`.

Original target (`Article.html`) for reference:

- Breadcrumb (News › Category › title), category tag, big H1, standfirst, **byline row**
  (avatar, author + role + date + read time, share buttons), hero image + caption.
- Prose: `h4` subheads, amber **pull-quote**, **inline coin data card** (live price for a
  coin referenced in the piece), figures — restyle MDX components + `css/prism.css`.
- Tag chips, **author bio box**, **Related Stories** 3-card grid (same `postType`).
- **Right sidebar:** Market Sentiment gauge, **"Coins in this story"** `CoinTable`,
  **"Ask the Coach"** box, **Trending** numbered list.
- Frontmatter to add: `coins: [btc, eth]` (drives inline card + "coins in this story");
  author data already exists in `data/authors/`. Trending = recent/featured for now.

---

## Phase 5 — AI Coach (headline differentiator) ⛔

The "Ask the Coach" CTA (header), the homepage `CoachStrip`, and the article sidebar
box all feed one assistant.

- **Backend:** Claude API (default to the latest model, e.g. `claude-opus-4-8` / a Sonnet
  tier for cost) via a server route. Ground answers in live prices, sentiment, and our
  MDX guides (retrieval over `data/blog`). Stream responses.
- **UX:** modal or dedicated `/coach` view; suggested-prompt chips submit; conversation
  state; "Not financial advice" disclaimer.
- **Wire-up points:** header CTA → open coach; `CoachStrip` input + chips → submit;
  article "Type your question…" box → submit with the article as context.
- See the `claude-api` skill before building.

---

## Cross-cutting

- **Responsive:** at <~1100px collapse right rails below the main column; stack multi-col
  grids; header nav → drawer (`MobileNav` exists, restyle to the dark theme).
- **Nav:** **Sentiment** (3a) and **Charts** (3b) are both in the header + mobile nav.
- **Category taxonomy:** the design's topic tiles (Bitcoin, Layer 2, NFTs…) imply a real
  topic taxonomy beyond the current tags — decide tags vs. a `topics` registry if we want
  dedicated category landing pages.
- **Coin icons:** licensed set + CSP/remotePattern updates when we move off inline SVG.

---

## Suggested order

1. **Phase 1 data layer** (global stats + F&G) → instantly de-placeholders the homepage.
2. **Market Sentiment page** (3a) — the signature page, mostly powered by Phase 1.
3. **Coin Detail + Charts** (3b) — needs the per-coin + OHLC feeds.
4. **Article enhancement** (Phase 4).
5. **AI Coach** (Phase 5) — the differentiator; can start in parallel any time.
6. Interactivity (Phase 2) and responsive polish folded in alongside.
