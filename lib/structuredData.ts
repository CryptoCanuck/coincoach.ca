export type PostType = 'news' | 'guide' | 'breakdown' | 'review'

export interface StructuredDataInput {
  type: PostType
  title: string
  date: string
  lastmod?: string
  summary?: string
  images?: string[] | string
  path: string
  reviewedItem?: string
  rating?: number
}

const TYPE_TO_SCHEMA: Record<PostType, string> = {
  news: 'NewsArticle',
  guide: 'Article',
  breakdown: 'Article',
  review: 'Review',
}

export function buildStructuredData(
  doc: StructuredDataInput,
  siteUrl: string,
  socialBanner: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const image = doc.images
    ? Array.isArray(doc.images)
      ? doc.images[0]
      : doc.images
    : socialBanner

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': TYPE_TO_SCHEMA[doc.type],
    headline: doc.title,
    datePublished: doc.date,
    dateModified: doc.lastmod || doc.date,
    description: doc.summary,
    image,
    url: `${siteUrl}/${doc.path}`,
  }

  if (doc.type === 'review') {
    sd.itemReviewed = { '@type': 'Thing', name: doc.reviewedItem || doc.title }
    if (typeof doc.rating === 'number') {
      sd.reviewRating = { '@type': 'Rating', ratingValue: doc.rating, bestRating: 5 }
    }
  }

  return sd
}
