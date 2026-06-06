import { describe, it, expect } from 'vitest'
import { mapCategories } from './categories'

const sample = [
  { name: 'Smart Contract Platform', market_cap: 1_700_000_000_000, market_cap_change_24h: -6.25 },
  { name: 'Memecoins', market_cap: 90_000_000_000, market_cap_change_24h: 8 },
  { name: 'Tiny', market_cap: 1_000, market_cap_change_24h: 2 },
  { name: 'Bad', market_cap: null, market_cap_change_24h: 1 },
]

describe('mapCategories', () => {
  it('sorts by market cap desc, scores via the proxy, and limits', () => {
    expect(mapCategories(sample, 2)).toEqual([
      { name: 'Smart Contract Platform', change24h: -6.25, score: 25 },
      { name: 'Memecoins', change24h: 8, score: 82 },
    ])
  })
  it('skips entries without a finite market cap and coerces missing change to 0', () => {
    const out = mapCategories(
      [{ name: 'NoChange', market_cap: 5, market_cap_change_24h: null }],
      10
    )
    expect(out).toEqual([{ name: 'NoChange', change24h: 0, score: 50 }])
  })
  it('returns [] for a non-array payload', () => {
    // @ts-expect-error bad input
    expect(mapCategories(null, 8)).toEqual([])
  })
})
