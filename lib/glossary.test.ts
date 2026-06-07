import { describe, it, expect } from 'vitest'
import {
  publishedGlossary,
  sortGlossary,
  groupByLetter,
  getGlossaryTerm,
  relatedEntries,
  categoryMeta,
  GLOSSARY_CATEGORIES,
} from './glossary'

type T = { slug: string; term: string; category: string; related?: string[]; draft?: boolean }

const sample: T[] = [
  { slug: 'staking', term: 'Staking', category: 'defi', related: ['proof-of-stake'] },
  { slug: 'bitcoin', term: 'Bitcoin', category: 'fundamentals' },
  { slug: 'proof-of-stake', term: 'Proof of Stake', category: 'fundamentals' },
  { slug: 'a-test', term: 'a test', category: 'fundamentals' },
  { slug: 'hidden', term: 'Hidden', category: 'defi', draft: true },
]

describe('publishedGlossary', () => {
  it('drops draft entries', () => {
    expect(publishedGlossary(sample).map((t) => t.slug)).not.toContain('hidden')
    expect(publishedGlossary(sample)).toHaveLength(4)
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(publishedGlossary(undefined)).toEqual([])
  })
})

describe('sortGlossary', () => {
  it('sorts case-insensitively by term', () => {
    expect(sortGlossary(sample).map((t) => t.slug)).toEqual([
      'a-test',
      'bitcoin',
      'hidden',
      'proof-of-stake',
      'staking',
    ])
  })
  it('does not mutate the input', () => {
    const copy = [...sample]
    sortGlossary(sample)
    expect(sample).toEqual(copy)
  })
})

describe('groupByLetter', () => {
  it('groups by uppercased first letter in alphabetical order', () => {
    const groups = groupByLetter(publishedGlossary(sample))
    expect(groups.map((g) => g.letter)).toEqual(['A', 'B', 'P', 'S'])
    expect(groups[0].entries.map((e) => e.slug)).toEqual(['a-test'])
  })
  it('buckets non-alphabetic leading characters under #', () => {
    const groups = groupByLetter([{ slug: '0x', term: '0x Protocol', category: 'defi' }])
    expect(groups[0].letter).toBe('#')
  })
})

describe('getGlossaryTerm', () => {
  it('finds by slug', () => {
    expect(getGlossaryTerm(sample, 'staking')?.term).toBe('Staking')
  })
  it('returns undefined when missing', () => {
    expect(getGlossaryTerm(sample, 'nope')).toBeUndefined()
  })
})

describe('relatedEntries', () => {
  it('resolves related slugs to entries, preserving order and dropping misses', () => {
    const staking = getGlossaryTerm(sample, 'staking')!
    const related = relatedEntries(sample, staking)
    expect(related.map((e) => e.slug)).toEqual(['proof-of-stake'])
  })
  it('returns empty when related is missing', () => {
    expect(relatedEntries(sample, getGlossaryTerm(sample, 'bitcoin')!)).toEqual([])
  })
})

describe('categories', () => {
  it('every category key has metadata', () => {
    for (const c of GLOSSARY_CATEGORIES) {
      expect(categoryMeta(c.key).label).toBe(c.label)
    }
  })
  it('falls back gracefully for an unknown key', () => {
    expect(categoryMeta('unknown').label).toBe('Unknown')
  })
})
