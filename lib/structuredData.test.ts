import { describe, it, expect } from 'vitest'
import { buildStructuredData } from './structuredData'

const base = {
  title: 'Test Post',
  date: '2026-06-01',
  lastmod: '2026-06-02',
  summary: 'A summary',
  images: ['/static/images/a.png'],
  path: 'blog/test-post',
}
const siteUrl = 'https://coincoach.ca'
const banner = 'https://coincoach.ca/static/images/twitter-card.png'

describe('buildStructuredData', () => {
  it('emits NewsArticle for type "news"', () => {
    const sd = buildStructuredData({ ...base, type: 'news' }, siteUrl, banner)
    expect(sd['@type']).toBe('NewsArticle')
    expect(sd.headline).toBe('Test Post')
    expect(sd.url).toBe('https://coincoach.ca/blog/test-post')
    expect(sd.datePublished).toBe('2026-06-01')
    expect(sd.dateModified).toBe('2026-06-02')
  })

  it('emits Article for type "guide"', () => {
    const sd = buildStructuredData({ ...base, type: 'guide' }, siteUrl, banner)
    expect(sd['@type']).toBe('Article')
  })

  it('emits Article for type "breakdown"', () => {
    const sd = buildStructuredData({ ...base, type: 'breakdown' }, siteUrl, banner)
    expect(sd['@type']).toBe('Article')
  })

  it('emits Review for type "review" with itemReviewed', () => {
    const sd = buildStructuredData(
      { ...base, type: 'review', reviewedItem: 'Ledger Nano X' },
      siteUrl,
      banner
    )
    expect(sd['@type']).toBe('Review')
    expect(sd.itemReviewed).toEqual({ '@type': 'Thing', name: 'Ledger Nano X' })
  })

  it('includes reviewRating only when a rating is present', () => {
    const withRating = buildStructuredData(
      { ...base, type: 'review', reviewedItem: 'X', rating: 4 },
      siteUrl,
      banner
    )
    expect(withRating.reviewRating).toEqual({
      '@type': 'Rating',
      ratingValue: 4,
      bestRating: 5,
    })
    const without = buildStructuredData(
      { ...base, type: 'review', reviewedItem: 'X' },
      siteUrl,
      banner
    )
    expect(without.reviewRating).toBeUndefined()
  })

  it('falls back to the social banner when no images', () => {
    const sd = buildStructuredData({ ...base, images: undefined, type: 'news' }, siteUrl, banner)
    expect(sd.image).toBe(banner)
  })
})
