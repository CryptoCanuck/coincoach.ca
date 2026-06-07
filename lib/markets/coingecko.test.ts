import { describe, it, expect } from 'vitest'
import {
  mapCoins,
  splitMovers,
  marketsByIdsUrl,
  pickCoin,
  marketTableUrl,
  mapMarketCoins,
  downsampleSparkline,
} from './coingecko'

const sample = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 68420,
    price_change_percentage_24h: 2.13,
    image: 'https://assets.coingecko.com/btc.png',
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 3512,
    price_change_percentage_24h: -1.02,
    image: 'https://assets.coingecko.com/eth.png',
  },
]

describe('mapCoins', () => {
  it('maps the CoinGecko payload to Coin objects with upper-case symbols', () => {
    const coins = mapCoins(sample)
    expect(coins).toEqual([
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 68420,
        change24h: 2.13,
        image: 'https://assets.coingecko.com/btc.png',
      },
      {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        price: 3512,
        change24h: -1.02,
        image: 'https://assets.coingecko.com/eth.png',
      },
    ])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error testing bad input
    expect(mapCoins(null)).toEqual([])
    // @ts-expect-error testing bad input
    expect(mapCoins({})).toEqual([])
  })
  it('coerces missing change to 0', () => {
    const coins = mapCoins([{ id: 'x', symbol: 'x', name: 'X', current_price: 1, image: '' }])
    expect(coins[0].change24h).toBe(0)
  })
  it('coerces a missing/null price to 0', () => {
    const coins = mapCoins([{ id: 'x', symbol: 'x', name: 'X', current_price: null, image: '' }])
    expect(coins[0].price).toBe(0)
  })
  it('drops entries with a missing or empty id', () => {
    const coins = mapCoins([
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 1, image: '' },
      { id: '', symbol: 'noid', name: 'NoId', current_price: 1, image: '' },
      { symbol: 'missing', name: 'Missing', current_price: 1, image: '' },
    ])
    expect(coins.map((c) => c.id)).toEqual(['bitcoin'])
  })
  it('maps the CoinGecko id through', () => {
    const out = mapCoins([
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: 1,
        price_change_percentage_24h: 2,
        image: 'x',
      },
    ])
    expect(out[0].id).toBe('bitcoin')
  })
})

describe('splitMovers', () => {
  const coins = [
    { id: 'a', symbol: 'A', name: 'A', price: 1, change24h: 5, image: '' },
    { id: 'b', symbol: 'B', name: 'B', price: 1, change24h: -8, image: '' },
    { id: 'c', symbol: 'C', name: 'C', price: 1, change24h: 2, image: '' },
    { id: 'd', symbol: 'D', name: 'D', price: 1, change24h: -3, image: '' },
  ]
  it('returns the top-n gainers (desc) and losers (most negative first)', () => {
    const { gainers, losers } = splitMovers(coins, 2)
    expect(gainers.map((c) => c.symbol)).toEqual(['A', 'C'])
    expect(losers.map((c) => c.symbol)).toEqual(['B', 'D'])
  })
  it('does not mutate the input array', () => {
    const before = coins.map((c) => c.symbol)
    splitMovers(coins, 2)
    expect(coins.map((c) => c.symbol)).toEqual(before)
  })
  it('does not overlap gainers and losers when there are fewer than 2n coins', () => {
    const five = [
      { id: 'a', symbol: 'A', name: 'A', price: 1, change24h: 10, image: '' },
      { id: 'b', symbol: 'B', name: 'B', price: 1, change24h: 5, image: '' },
      { id: 'c', symbol: 'C', name: 'C', price: 1, change24h: 0, image: '' },
      { id: 'd', symbol: 'D', name: 'D', price: 1, change24h: -5, image: '' },
      { id: 'e', symbol: 'E', name: 'E', price: 1, change24h: -10, image: '' },
    ]
    const { gainers, losers } = splitMovers(five, 4)
    expect(gainers.map((c) => c.symbol)).toEqual(['A', 'B', 'C', 'D'])
    expect(losers.map((c) => c.symbol)).toEqual(['E'])
    const overlap = gainers.filter((g) => losers.some((l) => l.symbol === g.symbol))
    expect(overlap).toEqual([])
  })
})

describe('marketsByIdsUrl', () => {
  it('encodes each id but keeps literal comma separators', () => {
    expect(marketsByIdsUrl(['bitcoin', 'ethereum'])).toBe(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&price_change_percentage=24h'
    )
  })
  it('url-encodes unsafe characters within an id', () => {
    expect(marketsByIdsUrl(['a b'])).toContain('&ids=a%20b&')
  })
})

describe('pickCoin', () => {
  const coins = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 1, change24h: 1, image: '' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2, change24h: 2, image: '' },
  ]
  it('returns the coin matching the id', () => {
    expect(pickCoin(coins, 'ethereum')).toEqual(coins[1])
  })
  it('returns null when no coin matches', () => {
    expect(pickCoin(coins, 'dogecoin')).toBeNull()
  })
})

describe('marketTableUrl', () => {
  it('requests markets with 24h+7d change and sparkline', () => {
    expect(marketTableUrl(100)).toBe(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h,7d&sparkline=true'
    )
  })
})

describe('downsampleSparkline', () => {
  it('returns finite points unchanged when at or below the target', () => {
    expect(downsampleSparkline([1, 2, 3], 24)).toEqual([1, 2, 3])
  })
  it('drops non-finite points', () => {
    expect(downsampleSparkline([1, NaN, 3], 24)).toEqual([1, 3])
  })
  it('downsamples to the target count when longer', () => {
    const input = Array.from({ length: 100 }, (_, i) => i)
    expect(downsampleSparkline(input, 10)).toHaveLength(10)
  })
})

describe('mapMarketCoins', () => {
  const row = {
    id: 'bitcoin',
    market_cap_rank: 1,
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://x/btc.png',
    current_price: 67000,
    price_change_percentage_24h: 2.5,
    price_change_percentage_7d_in_currency: -3.1,
    market_cap: 1_300_000_000_000,
    total_volume: 40_000_000_000,
    sparkline_in_7d: { price: [1, 2, 3] },
  }
  it('maps a market row to a MarketCoin', () => {
    expect(mapMarketCoins([row])).toEqual([
      {
        id: 'bitcoin',
        rank: 1,
        symbol: 'BTC',
        name: 'Bitcoin',
        image: 'https://x/btc.png',
        price: 67000,
        change24h: 2.5,
        change7d: -3.1,
        marketCap: 1_300_000_000_000,
        volume: 40_000_000_000,
        sparkline: [1, 2, 3],
      },
    ])
  })
  it('drops rows with no id and coerces non-finite numbers to 0', () => {
    const out = mapMarketCoins([
      { symbol: 'x', name: 'X' },
      { id: 'y', symbol: 'y', name: 'Y', current_price: null, market_cap_rank: null },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('y')
    expect(out[0].price).toBe(0)
    expect(out[0].rank).toBeNull()
    expect(out[0].sparkline).toEqual([])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error bad input
    expect(mapMarketCoins(null)).toEqual([])
  })
})
