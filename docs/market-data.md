# Market data: Postgres-backed collector

Market data (prices, charts, global stats, sentiment) is collected from the
CoinGecko API into Postgres by a dedicated collector service. The site reads
from Postgres first, falling back to the API only for data the collector does
not have yet. This decouples API usage from site traffic: the API bill is a
fixed function of collector cadence, regardless of visitors.

```text
CoinGecko API ──(fixed-budget collector)──> Postgres ──> Next.js server components
alternative.me ─┘                              └──> accumulates history for charts
```

## Why

- The CoinGecko Demo plan allows ~10,000 calls/month (~333/day). Serving
  visitors straight from the API rate-limits under load and soft-fails panels.
- History compounds: snapshots we record (global market cap, dominance,
  per-category market caps, fine-grained ticks) are series the free API does
  not offer at all. The DB becomes more valuable every day it runs.
- Upgrading plans (Basic 100k/mo, Analyst 500k/mo + deep history) is a config
  change to collector cadences, not an architecture change.

## Services (docker-compose)

| Service               | Image                         | Role                                                                                |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `coincoach`           | Dockerfile `runner` target    | Next.js site; reads DB via `DATABASE_URL`, falls back to API when unset/unreachable |
| `coincoach-collector` | Dockerfile `collector` target | Applies migrations, then runs polling jobs on fixed cadences                        |
| `coincoach-db`        | `postgres:17-alpine`          | Named volume `coincoach-pgdata` — survives stack redeploys                          |

The database is not published on a host port; it is reachable only on the
compose network. `DATABASE_URL` is optional everywhere: without it the site
behaves exactly as before (direct API calls), which keeps `next build` (no DB
inside the image build) and local dev working with zero setup.

## Schema (db/migrations)

Money columns are unconstrained `NUMERIC` (SHIB needs 11 decimal places, BTC
market cap 13 integer digits); times are `timestamptz`. Coin ids are CoinGecko
slugs (`bitcoin`), matching `coins:` frontmatter and `<CoinCard id>` usage.

**Reference (upserted, slowly changing)**

- `coins` — identity + profile from `/coins/{id}`: symbol, name, image,
  description, links, genesis date, sentiment votes, dev/community stats, and
  a `raw` JSONB sidecar of the full detail document so nothing is dropped.
  `tracked` marks collection tier (0 = long-tail, 1 = article coin, 2 = top-250).
- `categories`, `coin_categories` — sector taxonomy.
- `exchanges` — venue reference (trust score, country, volume) for tickers.

**Latest state (one row per entity, upserted each poll)**

- `coin_markets_latest` — the full `/coins/markets` row, typed: price, market
  cap, rank, FDV, volume, 24h high/low, change percentages (1h/24h/7d/30d/1y),
  supplies, ATH/ATL with dates, 7-day sparkline (JSONB).
- `global_latest` — singleton: totals, per-symbol dominance map, DeFi block.

**Time series (append-only; the asset being built)**

- `coin_ticks` — price/market-cap/volume/rank per coin per poll. Partitioned
  by month (`PARTITION BY RANGE (ts)`); the collector creates upcoming
  partitions during housekeeping. `source` distinguishes `observed` rows
  (recorded live) from `provider` rows (seeded from history endpoints), so
  provider-licensed data can be managed independently of our own observations.
- `coin_candles` — OHLC per (coin, interval, bucket); `source` as above.
  Derived from our own ticks by a roll-up job; optionally seeded from
  `/coins/{id}/ohlc` and `market_chart` for instant chart depth.
- `global_ticks` — total market cap, volume, BTC/ETH dominance, DeFi stats.
- `category_ticks` — per-sector market cap and volume over time.
- `fear_greed` — daily index; alternative.me serves its full history (2018+)
  in one keyless call, so this is backfilled on first run.
- `trending_entries` — ranked trending snapshots (`/search/trending`).

**Per-coin auxiliary + ops**

- `coin_tickers` — exchange markets per coin (pair, price, volume, spread,
  ±2% depth, trust score, trade URL); replaced wholesale per refresh.
- `treasury_holdings` / `treasury_totals` — public-company BTC/ETH treasuries.
- `fetch_log` — one row per upstream call (endpoint, status, duration) for
  budget observability; pruned after 30 days.
- `schema_migrations` — applied migration filenames.

## Collector budget

Cadences live in `collector/config.mjs` and target the Demo plan's ~333
calls/day with headroom. Calls/day at default cadence:

| Job                           | Cadence | Calls/day |
| ----------------------------- | ------- | --------- |
| Markets top-250 snapshot      | 10 min  | 144       |
| Global + DeFi stats           | 30 min  | 96        |
| Trending                      | 1 h     | 24        |
| Tickers (tracked coins)       | daily   | ~35       |
| Coin detail (weekly rotation) | daily   | ~5        |
| Categories                    | 6 h     | 4         |
| Treasury (BTC + ETH)          | daily   | 2         |
| Exchanges                     | daily   | 1         |
| Fear & Greed (keyless)        | 1 h     | 0         |
| **Total**                     |         | **~311**  |

Candle roll-ups, partition housekeeping, and `fetch_log` pruning are DB-only
jobs (zero API calls). On a paid plan, tighten `markets` toward 60s and raise
tracked-coin counts; nothing else changes.

## Attribution

CoinGecko's terms require visible attribution ("Powered by CoinGecko") where
their data is displayed; the charts and markets UI carries it.
