import { describe, it, expect } from 'vitest'
import { mapGlobal } from './global'

const sample = {
  data: {
    active_cryptocurrencies: 11842,
    total_market_cap: { usd: 2_410_000_000_000, eur: 0 },
    total_volume: { usd: 96_200_000_000, eur: 0 },
    market_cap_percentage: { btc: 54.3, eth: 17.1 },
    market_cap_change_percentage_24h_usd: 1.8,
  },
}

describe('mapGlobal', () => {
  it('maps the CoinGecko global payload to GlobalStats', () => {
    expect(mapGlobal(sample)).toEqual({
      totalMarketCap: 2_410_000_000_000,
      totalVolume: 96_200_000_000,
      btcDominance: 54.3,
      activeCoins: 11842,
      marketCapChange24h: 1.8,
    })
  })
  it('returns null for a malformed payload', () => {
    // @ts-expect-error testing bad input
    expect(mapGlobal(null)).toBeNull()
    expect(mapGlobal({})).toBeNull()
  })
  it('coerces missing numeric fields to 0', () => {
    const result = mapGlobal({
      data: { market_cap_percentage: {}, total_market_cap: {}, total_volume: {} },
    })
    expect(result).toEqual({
      totalMarketCap: 0,
      totalVolume: 0,
      btcDominance: 0,
      activeCoins: 0,
      marketCapChange24h: 0,
    })
  })
})
