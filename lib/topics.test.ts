import { describe, it, expect } from 'vitest'
import { TOPICS, getTopic, postsForTopic } from './topics'

describe('TOPICS registry', () => {
  it('has unique slugs', () => {
    const slugs = TOPICS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('every topic has at least one mapped tag', () => {
    expect(TOPICS.every((t) => t.tags.length > 0)).toBe(true)
  })
})

describe('getTopic', () => {
  it('returns the topic for a known slug', () => {
    expect(getTopic('ethereum')?.label).toBe('Ethereum')
  })
  it('returns undefined for an unknown slug', () => {
    expect(getTopic('nope')).toBeUndefined()
  })
})

describe('postsForTopic', () => {
  const ethereum = getTopic('ethereum')!
  const posts = [
    { slug: 'a', tags: ['Ethereum', 'markets'] },
    { slug: 'b', tags: ['smart-contracts'] },
    { slug: 'c', tags: ['bitcoin'] },
    { slug: 'd' },
  ]
  it('matches posts whose slugified tags intersect the topic tag set', () => {
    expect(postsForTopic(posts, ethereum).map((p) => p.slug)).toEqual(['a', 'b'])
  })
  it('returns [] for a non-array posts argument', () => {
    // @ts-expect-error bad input
    expect(postsForTopic(null, ethereum)).toEqual([])
  })
})
