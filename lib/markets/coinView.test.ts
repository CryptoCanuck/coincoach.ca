import { describe, it, expect } from 'vitest'
import {
  mapDevStats,
  mapCommunityStats,
  mapTicker,
  mapTreasury,
  mapMarketStats,
  mapLinks,
  type RawTickerRow,
  type RawTreasuryHolding,
  type RawTreasuryTotals,
  type RawMarketStats,
} from './coinView'

// Representative dev_data jsonb (bitcoin shape from the test DB).
const devData = {
  forks: 36426,
  stars: 73168,
  subscribers: 3967,
  total_issues: 7743,
  closed_issues: 7380,
  commit_count_4_weeks: 108,
  pull_requests_merged: 11215,
  pull_request_contributors: 846,
  code_additions_deletions_4_weeks: { additions: 1570, deletions: -1948 },
  last_4_weeks_commit_activity_series: [],
}

describe('mapDevStats', () => {
  it('maps the dev_data jsonb to DevStats', () => {
    expect(mapDevStats(devData)).toEqual({
      stars: 73168,
      forks: 36426,
      subscribers: 3967,
      totalIssues: 7743,
      closedIssues: 7380,
      commits4w: 108,
      prsMerged: 11215,
      contributors: 846,
      additions4w: 1570,
      deletions4w: -1948,
    })
  })
  it('returns null when the blob is missing or not an object', () => {
    expect(mapDevStats(null)).toBeNull()
    expect(mapDevStats(undefined)).toBeNull()
    expect(mapDevStats('nope')).toBeNull()
  })
  it('coerces missing fields and a missing additions/deletions sub-object to null', () => {
    const d = mapDevStats({ stars: 5 })!
    expect(d.stars).toBe(5)
    expect(d.forks).toBeNull()
    expect(d.additions4w).toBeNull()
    expect(d.deletions4w).toBeNull()
  })
  it('coerces numeric strings (DB numerics arrive as strings)', () => {
    expect(mapDevStats({ stars: '42' })!.stars).toBe(42)
  })
})

describe('mapCommunityStats', () => {
  it('maps community_data and preserves zero vs null', () => {
    const c = mapCommunityStats({
      facebook_likes: null,
      reddit_subscribers: 0,
      reddit_average_posts_48h: 0,
      reddit_accounts_active_48h: 0,
      reddit_average_comments_48h: 0,
      telegram_channel_user_count: null,
    })!
    expect(c).toEqual({
      redditSubscribers: 0,
      redditAvgPosts48h: 0,
      redditAvgComments48h: 0,
      redditActiveAccounts48h: 0,
      telegramUsers: null,
      facebookLikes: null,
    })
    // 0 (live-but-empty) must stay distinct from null (deprecated/absent).
    expect(c.redditSubscribers).toBe(0)
    expect(c.telegramUsers).toBeNull()
  })
  it('returns null when the blob is missing/not an object', () => {
    expect(mapCommunityStats(null)).toBeNull()
    expect(mapCommunityStats(42)).toBeNull()
  })
  it('maps a populated community blob', () => {
    const c = mapCommunityStats({
      reddit_subscribers: 1_200_000,
      telegram_channel_user_count: 50_000,
      facebook_likes: 9000,
    })!
    expect(c.redditSubscribers).toBe(1_200_000)
    expect(c.telegramUsers).toBe(50_000)
    expect(c.facebookLikes).toBe(9000)
  })
})

describe('mapTicker', () => {
  const base: RawTickerRow = {
    exchange_id: 'okex',
    exchange_name: 'OKX (per-ticker)',
    ex_name: 'OKX',
    ex_image: 'https://img/okx.png',
    ex_trust: 10,
    base: 'btc',
    target: 'usdt',
    last_usd: 61374,
    volume_usd: 2341768154,
    spread_pct: 0.010163,
    trade_url: 'https://www.okx.com/trade-spot/btc-usdt',
  }

  it('maps a joined ticker row to TickerRow, preferring the exchanges.name', () => {
    expect(mapTicker(base)).toEqual({
      exchangeId: 'okex',
      exchangeName: 'OKX',
      exchangeImage: 'https://img/okx.png',
      pair: 'BTC/USDT',
      base: 'BTC',
      target: 'USDT',
      priceUsd: 61374,
      volumeUsd: 2341768154,
      spreadPct: 0.010163,
      trustScore: 10,
      tradeUrl: 'https://www.okx.com/trade-spot/btc-usdt',
    })
  })
  it('falls back to the per-ticker name, then the exchange id, when exchanges.name is absent', () => {
    expect(mapTicker({ ...base, ex_name: null }).exchangeName).toBe('OKX (per-ticker)')
    expect(mapTicker({ ...base, ex_name: null, exchange_name: null }).exchangeName).toBe('okex')
  })
  it('coerces DB numeric strings and null trust to typed numbers/null', () => {
    const t = mapTicker({
      ...base,
      ex_trust: null,
      last_usd: '61374',
      volume_usd: null,
      spread_pct: null,
    })
    expect(t.trustScore).toBeNull()
    expect(t.priceUsd).toBe(61374)
    expect(t.volumeUsd).toBeNull()
    expect(t.spreadPct).toBeNull()
  })
  it('drops a non-http(s) trade url', () => {
    expect(mapTicker({ ...base, trade_url: 'javascript:alert(1)' }).tradeUrl).toBeNull()
    expect(mapTicker({ ...base, trade_url: null }).tradeUrl).toBeNull()
  })
})

describe('mapTreasury', () => {
  const totals: RawTreasuryTotals = {
    total_holdings: 1277540.33,
    total_value_usd: 83925366997.95,
    market_cap_dominance: 6.08,
  }
  const holdings: RawTreasuryHolding[] = [
    {
      company_symbol: 'MSTR.US',
      name: 'Strategy',
      country: 'US',
      total_holdings: 845256,
      total_entry_value_usd: 63968974080,
      total_current_value_usd: 55527342867.19,
      pct_of_supply: 4.025,
    },
  ]

  it('maps totals + holding rows to TreasuryView', () => {
    expect(mapTreasury(totals, holdings)).toEqual({
      totalHoldings: 1277540.33,
      totalValueUsd: 83925366997.95,
      marketCapDominance: 6.08,
      holdings: [
        {
          companySymbol: 'MSTR.US',
          name: 'Strategy',
          country: 'US',
          holdings: 845256,
          entryValueUsd: 63968974080,
          currentValueUsd: 55527342867.19,
          pctOfSupply: 4.025,
        },
      ],
    })
  })
  it('tolerates null totals and an empty holdings list', () => {
    expect(mapTreasury(null, [])).toEqual({
      totalHoldings: null,
      totalValueUsd: null,
      marketCapDominance: null,
      holdings: [],
    })
  })
  it('coerces DB numeric strings and a null country', () => {
    const v = mapTreasury(
      { total_holdings: '100', total_value_usd: null, market_cap_dominance: '2.5' },
      [
        {
          company_symbol: 'X',
          name: 'X Co',
          country: null,
          total_holdings: '10',
          total_entry_value_usd: null,
          total_current_value_usd: '500',
          pct_of_supply: null,
        },
      ]
    )
    expect(v.totalHoldings).toBe(100)
    expect(v.totalValueUsd).toBeNull()
    expect(v.marketCapDominance).toBe(2.5)
    expect(v.holdings[0]).toEqual({
      companySymbol: 'X',
      name: 'X Co',
      country: null,
      holdings: 10,
      entryValueUsd: null,
      currentValueUsd: 500,
      pctOfSupply: null,
    })
  })
})

describe('mapMarketStats', () => {
  const row: RawMarketStats = {
    price: 61417,
    pct_1h: 0.504,
    pct_24h: -3.21,
    pct_7d: -7.46,
    pct_30d: -24.0,
    pct_1y: -43.93,
    market_cap: 1230550104959,
    mcap_change_24h: -38485355982.69,
    mcap_change_pct_24h: -3.03265,
    fdv: 1230550104959,
    volume: 37105762205,
    high_24h: 63454,
    low_24h: 60892,
    circulating_supply: 20039087,
    total_supply: 20039087,
    max_supply: 21000000,
    ath: 126080,
    ath_change_pct: -51.29,
    ath_date: '2025-10-06T18:57:42.558+00:00',
    atl: 67.81,
    atl_change_pct: 90466.18,
    atl_date: '2013-07-06T00:00:00+00:00',
  }

  it('maps the market row to the price/supply/extreme slice with ISO dates', () => {
    const s = mapMarketStats(row)
    expect(s.price).toBe(61417)
    expect(s.changes).toEqual({ h1: 0.504, h24: -3.21, d7: -7.46, d30: -24.0, y1: -43.93 })
    expect(s.marketCap).toBe(1230550104959)
    expect(s.marketCapChange24hAbs).toBe(-38485355982.69)
    expect(s.marketCapChange24hPct).toBe(-3.03265)
    expect(s.fdv).toBe(1230550104959)
    expect(s.volume).toBe(37105762205)
    expect(s.high24h).toBe(63454)
    expect(s.low24h).toBe(60892)
    expect(s.circulatingSupply).toBe(20039087)
    expect(s.totalSupply).toBe(20039087)
    expect(s.maxSupply).toBe(21000000)
    expect(s.ath).toEqual({ value: 126080, date: '2025-10-06', changePct: -51.29 })
    expect(s.atl).toEqual({ value: 67.81, date: '2013-07-06', changePct: 90466.18 })
  })
  it('coerces DB numeric strings', () => {
    const s = mapMarketStats({ ...row, price: '61417', max_supply: '21000000' })
    expect(s.price).toBe(61417)
    expect(s.maxSupply).toBe(21000000)
  })
  it('returns all-null fields (and null extreme dates) for a null/empty row', () => {
    const s = mapMarketStats(null)
    expect(s.price).toBeNull()
    expect(s.changes).toEqual({ h1: null, h24: null, d7: null, d30: null, y1: null })
    expect(s.marketCap).toBeNull()
    expect(s.maxSupply).toBeNull()
    expect(s.ath).toEqual({ value: null, date: null, changePct: null })
    expect(s.atl).toEqual({ value: null, date: null, changePct: null })
  })
  it('treats a missing/invalid extreme date as null but keeps the value', () => {
    const s = mapMarketStats({ ...row, ath_date: null, atl_date: 'not-a-date' })
    expect(s.ath.value).toBe(126080)
    expect(s.ath.date).toBeNull()
    expect(s.atl.date).toBeNull()
  })
  it('accepts a Date object for the extreme date', () => {
    const s = mapMarketStats({ ...row, ath_date: new Date('2025-10-06T18:57:42.558Z') })
    expect(s.ath.date).toBe('2025-10-06')
  })
})

describe('mapLinks', () => {
  it('maps the links jsonb to labelled http(s) ResourceLinks, dropping empties', () => {
    expect(
      mapLinks({
        chat_url: [],
        homepage: ['http://www.bitcoin.org'],
        repos_url: { github: ['https://github.com/bitcoin/bitcoin'], bitbucket: [] },
        whitepaper: 'https://bitcoin.org/bitcoin.pdf',
        subreddit_url: 'https://www.reddit.com/r/Bitcoin/',
        blockchain_site: ['https://mempool.space/', ''],
      })
    ).toEqual([
      { label: 'Website', href: 'http://www.bitcoin.org' },
      { label: 'Whitepaper', href: 'https://bitcoin.org/bitcoin.pdf' },
      { label: 'Explorer', href: 'https://mempool.space/' },
      { label: 'GitHub', href: 'https://github.com/bitcoin/bitcoin' },
      { label: 'Reddit', href: 'https://www.reddit.com/r/Bitcoin/' },
    ])
  })
  it('rejects non-http(s) schemes and tolerates a missing/empty blob', () => {
    expect(
      mapLinks({
        homepage: ['javascript:alert(1)'],
        whitepaper: 'https://example.com/wp.pdf',
      })
    ).toEqual([{ label: 'Whitepaper', href: 'https://example.com/wp.pdf' }])
    expect(mapLinks(null)).toEqual([])
    expect(mapLinks({})).toEqual([])
  })
})
