import { describe, it, expect } from 'vitest'
import { SECTIONS, getSection, filterByType } from './sections'

const posts = [
  { slug: 'a', postType: 'news', title: 'A' },
  { slug: 'b', postType: 'guide', title: 'B' },
  { slug: 'c', postType: 'news', title: 'C' },
  { slug: 'd', postType: 'review', title: 'D' },
]

describe('SECTIONS registry', () => {
  it('defines the four sections with routes and titles', () => {
    expect(SECTIONS.map((s) => s.type)).toEqual(['news', 'guide', 'breakdown', 'review'])
    expect(getSection('news')?.route).toBe('/news')
    expect(getSection('guide')?.route).toBe('/guides')
    expect(getSection('breakdown')?.route).toBe('/breakdowns')
    expect(getSection('review')?.route).toBe('/reviews')
  })
})

describe('filterByType', () => {
  it('returns only posts of the given type', () => {
    expect(filterByType(posts, 'news').map((p) => p.slug)).toEqual(['a', 'c'])
    expect(filterByType(posts, 'review').map((p) => p.slug)).toEqual(['d'])
    expect(filterByType(posts, 'breakdown')).toEqual([])
  })
})
