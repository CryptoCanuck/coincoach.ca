# Coin page redesign + DB-only market data — design

**Date:** 2026-06-15
**Branch:** `market-data-db`
**Status:** design approved (pending written-spec review)

## Overview

Two coupled tracks:

1. **Data layer** — finish the Postgres market-data layer so the site is served
   entirely from the database. The background collector becomes the *only* thing
   that calls CoinGecko; user page views never touch the API. Seed full history
   so charts and stats render from the DB from day one.
2. **Coin page redesign** — rebuild `/charts/[coin]` as a full-width,
   CryptoSlate-modeled page that surfaces *all* the data we collect, instead of
   the thin slice it shows today.

The page redesign is what motivates the data work: the richer sections need
fields we already store but don't yet expose.

### Goals

- A coin page that presents the full depth of collected data: price + chart,
  full price stats, supply, ATH/ATL with dates, exchange markets, dev activity,
  specs, sentiment, treasury, similar coins, related content.
- Page views are DB-only — no CoinGecko call on the request path.
- Charts serve from DB (seeded history + accumulating observations), not the API.
- Collector is robust on the free tier and after the planned plan upgrade.

### Decisions (locked with owner)

- **Data-driven only.** No written/editorial explainers (What is X / FAQ /
  timeline / predictions). That is a separate future project (ties into the
  deferred AI Coach).
- **Include all four optional sections:** Developer Activity, Sentiment votes +
  watchlist, Treasury (BTC/ETH only), Specs table.
- **Full-width layout** — no right rail. Modules stack full-width, with internal
  multi-column grids where useful.

---

## Track 1 — Data layer

### 1a. DB-only reads (the core principle)

Today every reader in `lib/markets/*` does: `fresh DB → else CoinGecko API →
else stale DB`. The middle step runs on the user's request path whenever the DB
is stale, which couples API usage to traffic.

**Change:** views read **DB only**.

- Each reader returns DB data whether fresh or stale (freshness still drives the
  on-page "Updated HH:MM UTC" note, but never triggers a fetch).
- The collector is the sole CoinGecko caller, on background cadences.
- Affected readers: `coingecko.ts` (`getTopCoins`, `getMovers`,
  `getMarketsByIds`, `getMarketTable`), `global.ts` (`getGlobalStats`),
  `sentiment.ts` (`getFearGreed*`), `coins.ts` (`getCoinDetail`, `getOhlc*`),
  `categories.ts`.
- `alternative.me` Fear & Greed stays as-is conceptually (keyless), but is also
  served from the `fear_greed` table the collector fills; no per-view fetch.

**Unseen coins (the one edge case).** A coin absent from the DB (long-tail, never
collected) can't be served DB-only. Proposed handling: **enqueue + soft state** —
insert/flag the coin as `tracked` so the collector profiles it on its next tick,
and render a lightweight "we're gathering data for {coin}" state meanwhile. No
API call on the view. Top-250 + article coins are all seeded, so this only
affects rarely-visited long-tail coins, and only until the next collector cycle.
*(Alternative considered: a single one-time API cold-fill for unseen coins. Open
for review — see Open Questions.)*

### 1b. New and extended reads

Extend `lib/markets/dbReads.ts` and the coin types to expose stored data:

- **`CoinFull`** (new type; supersedes the thin `CoinDetail` for the page) built
  from `coins` + `coin_markets_latest` + category names:
  rank, price, price-change windows (1h/24h/7d/30d/1y), market cap +
  24h change (abs + %), FDV, total volume, 24h high/low, circulating/total/max
  supply, ATH (value + date + change %), ATL (value + date + change %),
  description, links, categories, genesis date, hashing algorithm, block time,
  asset platform, sentiment vote %s, watchlist users, `dev_data`,
  `community_data`. All columns already exist (schema `0001_init.sql`).
- **`dbCoinTickers(id, limit)`** — top exchange markets from `coin_tickers`
  joined to `exchanges` (name/image/trust), ordered by USD volume. Drops
  anomalous/stale rows.
- **`dbTreasury(id)`** — `treasury_totals` + ranked `treasury_holdings`
  (BTC/ETH only).
- **`dbSimilarByCategory(id, limit)`** — coins sharing a primary category, by
  market-cap rank, from `coin_categories` + `coin_markets_latest` (replaces the
  current "top coins" stand-in for Similar Coins).

Pure mappers (jsonb → typed view models for dev/community/tickers/treasury/price
stats) live alongside and are unit-tested; the SQL is thin and not unit-tested
(no DB in CI), matching the existing pattern.

### 1c. Collector hardening (from the E2E verification)

1. **Cold-start burst** (`collector/index.mjs`): all jobs fire in one tick with
   no inter-job pacing → 429s on the free tier. Add pacing/stagger between jobs.
2. **Don't advance `last_run` on failure** (`index.mjs:~74`): a 429'd `markets`
   currently won't retry for a full cadence. Advance `last_run` only on success
   (or apply a short retry backoff distinct from the normal cadence).
3. **Quota awareness** (`collector/cg.mjs`): the budget guard counts local
   calls/day, but CoinGecko enforces a **monthly** cap it can't see. Track a
   rolling 30-day call count from `fetch_log` and/or back off when the API
   returns `error_code 10006`, so the collector can't silently exhaust the plan.

### 1d. Full historical backfill (after the plan upgrade)

`scripts/backfill-market-history.mjs` already seeds 365d daily ticks + 4h/4d
candle frames per tracked coin. Post-upgrade:

- Ensure the `tracked` set covers all coins we want depth for (top-N + every
  article coin).
- Run the backfill across the full set (provider-sourced rows marked
  `source='provider'`).
- Consider seeding 90d hourly for top coins so the 7D/1M frames have density
  before observed ticks accumulate.

This is the step that needs the upgraded API budget; tracks 1a–1c and Track 2
are built and tested against the existing test DB first.

---

## Track 2 — Coin page UI (full-width)

`/charts/[coin]` rebuilt within `SectionContainer` (max-w-[1440px]). Modules
stack full-width top→bottom; grids used inside modules. ✅ = data confirmed
populated for bitcoin/eth in the test DB.

1. ✅ **Identity header** — logo, name, ticker, **rank badge**, **category
   chip(s)**, big live price + 24h change. *(enrich existing `CoinHeader`)*
2. ✅ **Key metrics bar** — Market cap · FDV · 24h volume · circulating supply
   (% of max) · 24h high/low. Full-width stat strip.
3. ✅ **Price chart** — candlesticks + timeframe toggles + freshness note,
   full-width. DB-fed via `getOhlc`/`/api/ohlc`. *(keep `PriceChart`)*
4. ✅ **Price performance + Price stats** — two-column grid: left = % change
   1H/24H/7D/30D/1Y (color-coded); right = ATH (value + date + % below), ATL
   (value + date + % above), launch/genesis date.
5. ✅ **Markets / "Where to buy"** — table: exchange (logo) · pair · price · 24h
   volume · spread · trust · trade link. *(new; 50 tickers for BTC in test DB)*
6. ✅ **About + Specs** — two-column: About (description + links) | Specs
   (hashing algorithm · block time · genesis · platform · categories).
7. ✅ **Developer Activity** — GitHub stars/forks/commits(4w)/PRs merged/
   contributors from `dev_data`. Community stats (reddit/telegram) shown **only
   when non-null** — CoinGecko has deprecated most, so they're usually absent.
8. ✅ **Sentiment** — momentum gauge (existing proxy) + up/down vote %s +
   watchlist user count, as a band.
9. ✅ **Converter** — fiat/crypto converter module. *(keep `Converter`)*
10. ✅ **Treasury holdings** — public-company table, **BTC/ETH only**
    (`treasury_totals` + `treasury_holdings`). *(new)*
11. ✅ **Similar coins** — horizontal card row, same-category. *(improve
    `SimilarCoins`)*
12. ✅ **Related news & guides** — full-width grid. *(keep `CoinContent`)*

New components (server, presentational): `KeyMetricsBar`, `PricePerformance`,
`PriceStats`, `MarketsTable` (coin tickers — distinct from the existing markets
hub `MarketsTable`; will be named to avoid collision, e.g. `CoinMarkets`),
`SpecsTable`, `DevActivity`, `SentimentBand`, `TreasuryTable`. Existing
`CoinHeader`, `PriceChart`, `Converter`, `SimilarCoins`, `CoinContent` are
reused/enriched.

---

## Data flow

```
CoinGecko ──(collector, background cadences)──> Postgres
alternative.me ─┘                                  │
                                                   ▼
                              lib/markets/* (DB-only reads)
                                                   │
                                                   ▼
                       /charts/[coin] server component (no API on request path)
                                                   │
                                  ┌────────────────┴───────────────┐
                                  ▼                                 ▼
                       full-width sections                /api/ohlc/[coin] (lazy frames, DB)
```

## Error handling / graceful degradation

- **Missing per-section data → hide the section.** No tickers → no Markets
  table. `dev_data` null → no Developer Activity. Not BTC/ETH → no Treasury.
  Null community fields → omit those rows.
- **Stale DB** still renders (with the freshness note); it never escalates to an
  API call.
- **Coin absent from DB** → enqueue + soft "gathering data" state (see 1a).
- **DB unreachable** → existing fail-soft (reads return null, page shows the
  `MarketDataUnavailable` panel) — but with the collector as the only writer this
  is an infra outage, not a rate-limit.

## Testing

- Unit-test all new pure mappers (price stats, tickers, treasury, dev/community
  jsonb → view models) — Vitest, matching `lib/markets/*.test.ts`.
- Keep the existing 127 tests green.
- Manual live verification on the dev server (DB-backed) for bitcoin/eth/
  chainlink as sections land.
- After the plan upgrade: a real collector poll + full backfill, then confirm
  charts/stats serve from DB with zero request-path API calls (fetch_log delta
  on page loads stays 0, as in the E2E verification).

## Out of scope (explicit)

- Written/editorial content (explainers, FAQ, timeline, price predictions).
- AI Coach / LLM features.
- Production deploy of the docker-compose DB+collector stack — happens after the
  backfill, as a separate step (manual Portainer redeploy per project norms).

## Build order

1. **Track 1a–1b** — DB-only reads + new/extended read functions + mappers (+ tests).
2. **Track 2** — UI sections, iterated live on the dev server.
3. **Track 1c** — collector hardening.
4. **Track 1d + deploy** — full backfill + stack deploy, after the API upgrade.

Steps 1–3 are built/tested against the existing test DB now; step 4 follows the
upgrade.

## Open questions / risks

- **Unseen-coin handling:** enqueue + soft-state (strict no-API, recommended) vs.
  a one-time API cold-fill on first view. Confirm during review.
- **Timeframes:** keep current 24H/7D/1M/1Y, or add 3M/MAX? (More frames need
  more candle coverage from the backfill.) Default: keep current for now.
- **Community data sparsity:** dev stats are solid; reddit/telegram/twitter are
  largely deprecated by CoinGecko → section 7 leans "Developer Activity."
- **Backfill budget:** the full seed depends on the upgraded plan; the Demo
  monthly quota is currently exhausted.
