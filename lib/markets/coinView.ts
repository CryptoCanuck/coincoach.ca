// View-models for the redesigned coin page (Track 2 of the coin-page-redesign
// spec) plus the PURE mappers that turn stored DB rows / jsonb blobs into them.
// The SQL that loads these lives in dbReads.ts; the transforms here are pure and
// unit-tested (lib/markets/coinView.test.ts) — no DB or network in this module.

import type { ResourceLink } from './coins'

// ── Sub-types ──────────────────────────────────────────────────────────────

/** % price change across the windows the collector stores on coin_markets_latest. */
export interface PriceChanges {
  h1: number | null
  h24: number | null
  d7: number | null
  d30: number | null
  y1: number | null
}

/** All-time-high / all-time-low: value, the date it happened, and % from it. */
export interface PriceExtreme {
  value: number | null
  date: string | null // ISO date (YYYY-MM-DD) or null when absent
  changePct: number | null
}

/** GitHub / developer activity from coins.dev_data. Every field nullable. */
export interface DevStats {
  stars: number | null
  forks: number | null
  subscribers: number | null
  totalIssues: number | null
  closedIssues: number | null
  commits4w: number | null
  prsMerged: number | null
  contributors: number | null
  additions4w: number | null
  deletions4w: number | null
}

/** Social/community stats from coins.community_data. Mostly deprecated upstream,
 *  so every field is nullable and a present-but-zero value is kept distinct from
 *  absent (CoinGecko sends 0 for live-but-empty, null for deprecated). */
export interface CommunityStats {
  redditSubscribers: number | null
  redditAvgPosts48h: number | null
  redditAvgComments48h: number | null
  redditActiveAccounts48h: number | null
  telegramUsers: number | null
  facebookLikes: number | null
}

/** One exchange market row for the "Where to buy" table (coin_tickers + exchanges). */
export interface TickerRow {
  exchangeId: string
  exchangeName: string
  exchangeImage: string | null
  pair: string // e.g. "BTC/USDT"
  base: string
  target: string
  priceUsd: number | null
  volumeUsd: number | null
  spreadPct: number | null
  trustScore: number | null // exchange numeric trust (0-10), null if unknown
  tradeUrl: string | null
}

/** A public-company treasury holding row. */
export interface TreasuryHolding {
  companySymbol: string
  name: string
  country: string | null
  holdings: number | null
  entryValueUsd: number | null
  currentValueUsd: number | null
  pctOfSupply: number | null
}

/** Treasury totals + ranked holdings (BTC/ETH only). */
export interface TreasuryView {
  totalHoldings: number | null
  totalValueUsd: number | null
  marketCapDominance: number | null
  holdings: TreasuryHolding[]
}

/** A same-category coin for the "Similar coins" row. */
export interface SimilarCoin {
  id: string
  symbol: string
  name: string
  image: string | null
  rank: number | null
  price: number | null
  change24h: number | null
}

// ── CoinFull ─────────────────────────────────────────────────────────────────

/** Everything the redesigned /charts/[coin] page renders, assembled from
 *  coins + coin_markets_latest + category names. */
export interface CoinFull {
  // Identity
  id: string
  symbol: string
  name: string
  image: string | null
  rank: number | null
  categories: string[]

  // Price + change windows
  price: number | null
  changes: PriceChanges

  // Market cap / valuation
  marketCap: number | null
  marketCapChange24hAbs: number | null
  marketCapChange24hPct: number | null
  fdv: number | null

  // Volume + intraday range
  volume: number | null
  high24h: number | null
  low24h: number | null

  // Supply
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null

  // Extremes
  ath: PriceExtreme
  atl: PriceExtreme

  // Profile
  description: string
  links: ResourceLink[]
  genesisDate: string | null
  hashingAlgorithm: string | null
  blockTimeMinutes: number | null
  assetPlatform: string | null

  // Sentiment / watchlist
  sentimentVotesUpPct: number | null
  sentimentVotesDownPct: number | null
  watchlistUsers: number | null

  // Activity (nullable as a whole when never profiled)
  dev: DevStats | null
  community: CommunityStats | null
}

// ── Pure mappers ──────────────────────────────────────────────────────────────

// coins.links jsonb (CoinGecko shape) → the same labelled ResourceLink[] the
// existing CoinDetail mapper produces, so the page renders identical link chips.
export interface RawLinks {
  homepage?: (string | null)[]
  whitepaper?: string | null
  blockchain_site?: (string | null)[]
  repos_url?: { github?: (string | null)[] }
  subreddit_url?: string | null
}

export function mapLinks(raw: unknown): ResourceLink[] {
  const l = (raw && typeof raw === 'object' ? raw : {}) as RawLinks
  const defs: ResourceLink[] = [
    { label: 'Website', href: safeHttpUrl(l.homepage?.[0]) ?? '' },
    { label: 'Whitepaper', href: safeHttpUrl(l.whitepaper) ?? '' },
    { label: 'Explorer', href: safeHttpUrl(l.blockchain_site?.[0]) ?? '' },
    { label: 'GitHub', href: safeHttpUrl(l.repos_url?.github?.[0]) ?? '' },
    { label: 'Reddit', href: safeHttpUrl(l.subreddit_url) ?? '' },
  ]
  return defs.filter((x) => x.href)
}

// Coerce an unknown jsonb scalar to a finite number, else null. (DB numerics may
// arrive as strings via pg; jsonb numbers arrive as numbers — handle both.)
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** coins.dev_data jsonb → DevStats. null when the blob is missing/not an object,
 *  so the page can hide the Developer Activity section entirely. */
export function mapDevStats(raw: unknown): DevStats | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  const cad = (d.code_additions_deletions_4_weeks ?? {}) as Record<string, unknown>
  return {
    stars: numOrNull(d.stars),
    forks: numOrNull(d.forks),
    subscribers: numOrNull(d.subscribers),
    totalIssues: numOrNull(d.total_issues),
    closedIssues: numOrNull(d.closed_issues),
    commits4w: numOrNull(d.commit_count_4_weeks),
    prsMerged: numOrNull(d.pull_requests_merged),
    contributors: numOrNull(d.pull_request_contributors),
    additions4w: numOrNull(cad.additions),
    deletions4w: numOrNull(cad.deletions),
  }
}

/** coins.community_data jsonb → CommunityStats. null when the blob is
 *  missing/not an object. Individual fields stay null when absent (preserving
 *  the null-vs-zero distinction the page uses to hide deprecated rows). */
export function mapCommunityStats(raw: unknown): CommunityStats | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  return {
    redditSubscribers: numOrNull(c.reddit_subscribers),
    redditAvgPosts48h: numOrNull(c.reddit_average_posts_48h),
    redditAvgComments48h: numOrNull(c.reddit_average_comments_48h),
    redditActiveAccounts48h: numOrNull(c.reddit_accounts_active_48h),
    telegramUsers: numOrNull(c.telegram_channel_user_count),
    facebookLikes: numOrNull(c.facebook_likes),
  }
}

/** Raw coin_tickers row (joined to exchanges) → TickerRow. */
export interface RawTickerRow {
  exchange_id: string
  exchange_name: string | null
  ex_name: string | null // exchanges.name (preferred display name)
  ex_image: string | null // exchanges.image_url
  ex_trust: number | string | null // exchanges.trust_score (numeric)
  base: string
  target: string
  last_usd: number | string | null
  volume_usd: number | string | null
  spread_pct: number | string | null
  trade_url: string | null
}

export function mapTicker(r: RawTickerRow): TickerRow {
  const base = (r.base ?? '').toUpperCase()
  const target = (r.target ?? '').toUpperCase()
  return {
    exchangeId: r.exchange_id,
    // Prefer the canonical exchanges.name; fall back to the per-ticker name.
    exchangeName: strOrNull(r.ex_name) ?? strOrNull(r.exchange_name) ?? r.exchange_id,
    exchangeImage: strOrNull(r.ex_image),
    pair: `${base}/${target}`,
    base,
    target,
    priceUsd: numOrNull(r.last_usd),
    volumeUsd: numOrNull(r.volume_usd),
    spreadPct: numOrNull(r.spread_pct),
    trustScore: numOrNull(r.ex_trust),
    tradeUrl: safeHttpUrl(r.trade_url),
  }
}

// Only surface http(s) trade links (mirrors coins.ts safeHttpUrl) — these render
// as external anchors, so a stray scheme must not reach the UI.
function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  try {
    const protocol = new URL(trimmed).protocol
    return protocol === 'http:' || protocol === 'https:' ? trimmed : null
  } catch {
    return null
  }
}

export interface RawTreasuryTotals {
  total_holdings: number | string | null
  total_value_usd: number | string | null
  market_cap_dominance: number | string | null
}

export interface RawTreasuryHolding {
  company_symbol: string
  name: string
  country: string | null
  total_holdings: number | string | null
  total_entry_value_usd: number | string | null
  total_current_value_usd: number | string | null
  pct_of_supply: number | string | null
}

/** treasury_totals + ranked treasury_holdings → TreasuryView. The holdings array
 *  is mapped in the order the rows arrive (caller sorts by holdings desc). */
export function mapTreasury(
  totals: RawTreasuryTotals | null,
  holdings: RawTreasuryHolding[]
): TreasuryView {
  return {
    totalHoldings: numOrNull(totals?.total_holdings),
    totalValueUsd: numOrNull(totals?.total_value_usd),
    marketCapDominance: numOrNull(totals?.market_cap_dominance),
    holdings: holdings.map((h) => ({
      companySymbol: h.company_symbol,
      name: h.name,
      country: strOrNull(h.country),
      holdings: numOrNull(h.total_holdings),
      entryValueUsd: numOrNull(h.total_entry_value_usd),
      currentValueUsd: numOrNull(h.total_current_value_usd),
      pctOfSupply: numOrNull(h.pct_of_supply),
    })),
  }
}

// Raw coin_markets_latest columns the page's price section needs.
export interface RawMarketStats {
  price: number | string | null
  pct_1h: number | string | null
  pct_24h: number | string | null
  pct_7d: number | string | null
  pct_30d: number | string | null
  pct_1y: number | string | null
  market_cap: number | string | null
  mcap_change_24h: number | string | null
  mcap_change_pct_24h: number | string | null
  fdv: number | string | null
  volume: number | string | null
  high_24h: number | string | null
  low_24h: number | string | null
  circulating_supply: number | string | null
  total_supply: number | string | null
  max_supply: number | string | null
  ath: number | string | null
  ath_change_pct: number | string | null
  ath_date: Date | string | null
  atl: number | string | null
  atl_change_pct: number | string | null
  atl_date: Date | string | null
}

// Normalize a timestamp/date column to an ISO date (YYYY-MM-DD) or null.
function toIsoDate(v: Date | string | null | undefined): string | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

// The price-stats slice of CoinFull (changes/marketCap/fdv/supply/extremes), so
// the transform is testable independently of the identity/profile assembly.
export interface MarketStatsView {
  price: number | null
  changes: PriceChanges
  marketCap: number | null
  marketCapChange24hAbs: number | null
  marketCapChange24hPct: number | null
  fdv: number | null
  volume: number | null
  high24h: number | null
  low24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  maxSupply: number | null
  ath: PriceExtreme
  atl: PriceExtreme
}

/** coin_markets_latest row → the price/supply/extreme slice of CoinFull. */
export function mapMarketStats(r: RawMarketStats | null): MarketStatsView {
  return {
    price: numOrNull(r?.price),
    changes: {
      h1: numOrNull(r?.pct_1h),
      h24: numOrNull(r?.pct_24h),
      d7: numOrNull(r?.pct_7d),
      d30: numOrNull(r?.pct_30d),
      y1: numOrNull(r?.pct_1y),
    },
    marketCap: numOrNull(r?.market_cap),
    marketCapChange24hAbs: numOrNull(r?.mcap_change_24h),
    marketCapChange24hPct: numOrNull(r?.mcap_change_pct_24h),
    fdv: numOrNull(r?.fdv),
    volume: numOrNull(r?.volume),
    high24h: numOrNull(r?.high_24h),
    low24h: numOrNull(r?.low_24h),
    circulatingSupply: numOrNull(r?.circulating_supply),
    totalSupply: numOrNull(r?.total_supply),
    maxSupply: numOrNull(r?.max_supply),
    ath: {
      value: numOrNull(r?.ath),
      date: toIsoDate(r?.ath_date),
      changePct: numOrNull(r?.ath_change_pct),
    },
    atl: {
      value: numOrNull(r?.atl),
      date: toIsoDate(r?.atl_date),
      changePct: numOrNull(r?.atl_change_pct),
    },
  }
}
