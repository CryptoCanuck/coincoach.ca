import { describe, it, expect } from 'vitest'
import { relatedPostsForCoin } from './coinContent'

const coin = { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }

const posts = [
  { slug: 'a', title: 'A', coins: ['bitcoin'], tags: ['markets'] },
  { slug: 'b', title: 'B', coins: [], tags: ['Bitcoin', 'etf'] },
  { slug: 'c', title: 'C', coins: [], tags: ['btc'] },
  { slug: 'd', title: 'D', coins: ['ethereum'], tags: ['defi'] },
  { slug: 'e', title: 'E' },
]

describe('relatedPostsForCoin', () => {
  it('matches by coins frontmatter id (case-insensitive)', () => {
    const out = relatedPostsForCoin([{ slug: 'x', coins: ['BITCOIN'], tags: [] }], coin)
    expect(out.map((p) => p.slug)).toEqual(['x'])
  })
  it('matches by a tag equal to the coin name or symbol (case-insensitive)', () => {
    const out = relatedPostsForCoin(posts, coin)
    expect(out.map((p) => p.slug)).toEqual(['a', 'b', 'c'])
  })
  it('excludes posts that match a different coin', () => {
    const out = relatedPostsForCoin(posts, coin)
    expect(out.map((p) => p.slug)).not.toContain('d')
    expect(out.map((p) => p.slug)).not.toContain('e')
  })
  it('preserves input order and respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ slug: `p${i}`, coins: ['bitcoin'] }))
    expect(relatedPostsForCoin(many, coin, 4).map((p) => p.slug)).toEqual(['p0', 'p1', 'p2', 'p3'])
  })
  it('returns [] for a non-array posts argument', () => {
    // @ts-expect-error bad input
    expect(relatedPostsForCoin(null, coin)).toEqual([])
  })
})
