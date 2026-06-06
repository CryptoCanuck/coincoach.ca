import { describe, it, expect } from 'vitest'
import { mapCoinDetail } from './coins'
import { mapOhlc, priceVolatilityPct } from './coins'

const sample = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  market_cap_rank: 1,
  categories: ['Cryptocurrency', 'Layer 1 (L1)'],
  description: { en: 'Bitcoin is a <a href="x">decentralized</a> currency.' },
  links: {
    homepage: ['https://bitcoin.org', ''],
    whitepaper: 'https://bitcoin.org/bitcoin.pdf',
    blockchain_site: ['https://mempool.space', ''],
    repos_url: { github: ['https://github.com/bitcoin/bitcoin'] },
    subreddit_url: 'https://reddit.com/r/bitcoin',
  },
  market_data: {
    current_price: { usd: 67412.08 },
    price_change_percentage_24h: 2.4,
    market_cap: { usd: 1_330_000_000_000 },
    total_volume: { usd: 38_400_000_000 },
    circulating_supply: 19_680_000,
    max_supply: 21_000_000,
    ath: { usd: 73750 },
    atl: { usd: 67.81 },
  },
}

describe('mapCoinDetail', () => {
  it('maps the CoinGecko coin payload to CoinDetail', () => {
    const d = mapCoinDetail(sample)!
    expect(d.id).toBe('bitcoin')
    expect(d.symbol).toBe('BTC')
    expect(d.name).toBe('Bitcoin')
    expect(d.rank).toBe(1)
    expect(d.price).toBe(67412.08)
    expect(d.change24h).toBe(2.4)
    expect(d.marketCap).toBe(1_330_000_000_000)
    expect(d.volume).toBe(38_400_000_000)
    expect(d.circulatingSupply).toBe(19_680_000)
    expect(d.maxSupply).toBe(21_000_000)
    expect(d.ath).toBe(73750)
    expect(d.atl).toBe(67.81)
    expect(d.categories).toEqual(['Cryptocurrency', 'Layer 1 (L1)'])
  })
  it('strips HTML from the description', () => {
    expect(mapCoinDetail(sample)!.description).toBe('Bitcoin is a decentralized currency.')
  })
  it('collects only non-empty resource links', () => {
    expect(mapCoinDetail(sample)!.links).toEqual([
      { label: 'Website', href: 'https://bitcoin.org' },
      { label: 'Whitepaper', href: 'https://bitcoin.org/bitcoin.pdf' },
      { label: 'Explorer', href: 'https://mempool.space' },
      { label: 'GitHub', href: 'https://github.com/bitcoin/bitcoin' },
      { label: 'Reddit', href: 'https://reddit.com/r/bitcoin' },
    ])
  })
  it('returns null and coerces missing fields safely', () => {
    // @ts-expect-error bad input
    expect(mapCoinDetail(null)).toBeNull()
    const bare = mapCoinDetail({ id: 'x', symbol: 'x', name: 'X' })!
    expect(bare.price).toBe(0)
    expect(bare.maxSupply).toBeNull()
    expect(bare.links).toEqual([])
    expect(bare.categories).toEqual([])
  })
})

describe('mapOhlc', () => {
  it('maps [ms,o,h,l,c] tuples to second-based candles', () => {
    expect(
      mapOhlc([
        [1_600_000_000_000, 10, 12, 9, 11],
        [1_600_086_400_000, 11, 13, 10, 12],
      ])
    ).toEqual([
      { time: 1_600_000_000, open: 10, high: 12, low: 9, close: 11 },
      { time: 1_600_086_400, open: 11, high: 13, low: 10, close: 12 },
    ])
  })
  it('drops malformed tuples and returns [] for non-arrays', () => {
    expect(mapOhlc([[1_600_000_000_000, 10, 12, 9]])).toEqual([])
    // @ts-expect-error bad input
    expect(mapOhlc(null)).toEqual([])
  })
})

describe('priceVolatilityPct', () => {
  it('returns the stddev of close-to-close returns as a percent', () => {
    // flat closes → 0 volatility
    const flat = [
      { time: 1, open: 0, high: 0, low: 0, close: 100 },
      { time: 2, open: 0, high: 0, low: 0, close: 100 },
      { time: 3, open: 0, high: 0, low: 0, close: 100 },
    ]
    expect(priceVolatilityPct(flat)).toBe(0)
  })
  it('returns null with fewer than 2 candles', () => {
    expect(priceVolatilityPct([])).toBeNull()
    expect(priceVolatilityPct([{ time: 1, open: 0, high: 0, low: 0, close: 5 }])).toBeNull()
  })
})
