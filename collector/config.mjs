/**
 * Collector cadences and limits. Defaults target the CoinGecko Demo plan
 * (~333 calls/day): see the budget table in docs/market-data.md (~311/day).
 * On a paid plan, tighten MARKETS via env without touching code.
 */
const minutes = (name, fallback) => {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  // Hard daily ceiling on CoinGecko calls; jobs are skipped (and retried on a
  // later tick) once the trailing-24h count in fetch_log reaches it.
  maxCallsPerDay: minutes('COLLECTOR_MAX_CALLS_PER_DAY', 320),
  blogDir: process.env.BLOG_DIR ?? 'data/blog',
  topCoinsPerPage: 250,
  tickersPerCoin: 50,
  detailCoinsPerRun: 5,
  // Pause between calls inside multi-call jobs (tickers, detail) to stay far
  // below the Demo plan's per-minute rate limit.
  pacingMs: 2500,
  intervalsMin: {
    articleCoins: 1440, // db-only: scan blog frontmatter for tracked coins
    markets: minutes('COLLECTOR_MARKETS_MINUTES', 10),
    global: 30,
    fearGreed: 60, // keyless (alternative.me); excluded from the budget
    trending: 60,
    categories: 360,
    candles: 60, // db-only: roll up ticks into 1h/1d candles
    housekeeping: 60, // db-only: partitions + fetch_log pruning
    tickers: 1440,
    detail: 1440,
    treasury: 1440,
    exchanges: 1440,
  },
}
