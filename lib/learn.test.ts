import { describe, it, expect } from 'vitest'
import {
  publishedLessons,
  sortLessons,
  lessonsByTier,
  getLesson,
  relatedLessons,
  tierMeta,
  DIFFICULTY_TIERS,
} from './learn'

type L = {
  slug: string
  title: string
  difficulty: string
  order?: number
  related?: string[]
  draft?: boolean
}

const sample: L[] = [
  { slug: 'b2', title: 'Blockchain Basics', difficulty: 'beginner', order: 2 },
  { slug: 'b1', title: 'What Is Crypto', difficulty: 'beginner', order: 1, related: ['b2', 'x'] },
  { slug: 'adv', title: 'Consensus', difficulty: 'advanced', order: 1 },
  { slug: 'mid', title: 'DeFi', difficulty: 'intermediate', order: 1 },
  { slug: 'hidden', title: 'Hidden', difficulty: 'beginner', order: 3, draft: true },
  { slug: 'noord', title: 'Zeta', difficulty: 'beginner' },
]

describe('publishedLessons', () => {
  it('drops draft entries', () => {
    expect(publishedLessons(sample).map((l) => l.slug)).not.toContain('hidden')
    expect(publishedLessons(sample)).toHaveLength(5)
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(publishedLessons(undefined)).toEqual([])
  })
})

describe('sortLessons', () => {
  it('sorts by order ascending, missing order last, ties by title', () => {
    expect(sortLessons(sample.filter((l) => l.difficulty === 'beginner')).map((l) => l.slug)).toEqual([
      'b1',
      'b2',
      'hidden',
      'noord',
    ])
  })
  it('does not mutate the input', () => {
    const copy = [...sample]
    sortLessons(sample)
    expect(sample).toEqual(copy)
  })
})

describe('lessonsByTier', () => {
  it('groups in beginner→advanced order, only non-empty tiers, sorted within', () => {
    const groups = lessonsByTier(publishedLessons(sample))
    expect(groups.map((g) => g.tier.key)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(groups[0].lessons.map((l) => l.slug)).toEqual(['b1', 'b2', 'noord'])
  })
  it('omits tiers with no lessons', () => {
    const groups = lessonsByTier([{ slug: 'a', title: 'A', difficulty: 'advanced', order: 1 }])
    expect(groups.map((g) => g.tier.key)).toEqual(['advanced'])
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(lessonsByTier(undefined)).toEqual([])
  })
})

describe('getLesson', () => {
  it('finds by slug', () => {
    expect(getLesson(sample, 'mid')?.title).toBe('DeFi')
  })
  it('returns undefined when missing', () => {
    expect(getLesson(sample, 'nope')).toBeUndefined()
  })
})

describe('relatedLessons', () => {
  it('resolves related slugs, preserving order and dropping misses', () => {
    const b1 = getLesson(sample, 'b1')!
    expect(relatedLessons(sample, b1).map((l) => l.slug)).toEqual(['b2'])
  })
  it('returns empty when related is missing', () => {
    expect(relatedLessons(sample, getLesson(sample, 'mid')!)).toEqual([])
  })
})

describe('tiers', () => {
  it('every tier key has metadata', () => {
    for (const t of DIFFICULTY_TIERS) {
      expect(tierMeta(t.key).label).toBe(t.label)
    }
  })
  it('falls back gracefully for an unknown key', () => {
    expect(tierMeta('unknown').label).toBe('Unknown')
  })
})
