import { describe, it, expect } from 'vitest'
import { mapCoins, splitMovers } from './coingecko'

const sample = [
  {
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 68420,
    price_change_percentage_24h: 2.13,
    image: 'https://assets.coingecko.com/btc.png',
  },
  {
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
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 68420,
        change24h: 2.13,
        image: 'https://assets.coingecko.com/btc.png',
      },
      {
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
    const coins = mapCoins([{ symbol: 'x', name: 'X', current_price: 1, image: '' }])
    expect(coins[0].change24h).toBe(0)
  })
  it('coerces a missing/null price to 0', () => {
    const coins = mapCoins([{ symbol: 'x', name: 'X', current_price: null, image: '' }])
    expect(coins[0].price).toBe(0)
  })
})

describe('splitMovers', () => {
  const coins = [
    { symbol: 'A', name: 'A', price: 1, change24h: 5, image: '' },
    { symbol: 'B', name: 'B', price: 1, change24h: -8, image: '' },
    { symbol: 'C', name: 'C', price: 1, change24h: 2, image: '' },
    { symbol: 'D', name: 'D', price: 1, change24h: -3, image: '' },
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
      { symbol: 'A', name: 'A', price: 1, change24h: 10, image: '' },
      { symbol: 'B', name: 'B', price: 1, change24h: 5, image: '' },
      { symbol: 'C', name: 'C', price: 1, change24h: 0, image: '' },
      { symbol: 'D', name: 'D', price: 1, change24h: -5, image: '' },
      { symbol: 'E', name: 'E', price: 1, change24h: -10, image: '' },
    ]
    const { gainers, losers } = splitMovers(five, 4)
    expect(gainers.map((c) => c.symbol)).toEqual(['A', 'B', 'C', 'D'])
    expect(losers.map((c) => c.symbol)).toEqual(['E'])
    const overlap = gainers.filter((g) => losers.some((l) => l.symbol === g.symbol))
    expect(overlap).toEqual([])
  })
})
