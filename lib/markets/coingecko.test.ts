import { describe, it, expect } from 'vitest'
import { mapCoins } from './coingecko'

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
      { symbol: 'BTC', name: 'Bitcoin', price: 68420, change24h: 2.13, image: 'https://assets.coingecko.com/btc.png' },
      { symbol: 'ETH', name: 'Ethereum', price: 3512, change24h: -1.02, image: 'https://assets.coingecko.com/eth.png' },
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
})
