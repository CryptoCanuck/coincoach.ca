import type { PostType } from './structuredData'

export interface Section {
  type: PostType
  route: string
  title: string
  description: string
}

export const SECTIONS: Section[] = [
  { type: 'news', route: '/news', title: 'News', description: 'The latest cryptocurrency and blockchain news.' },
  { type: 'guide', route: '/guides', title: 'Guides', description: 'Practical guides and explainers for crypto.' },
  { type: 'breakdown', route: '/breakdowns', title: 'Token Breakdowns', description: 'In-depth breakdowns of crypto tokens and projects.' },
  { type: 'review', route: '/reviews', title: 'Reviews', description: 'Honest reviews of exchanges, wallets, and tools.' },
]

export function getSection(type: PostType): Section | undefined {
  return SECTIONS.find((s) => s.type === type)
}

export function filterByType<T extends { postType?: string }>(posts: T[], type: PostType): T[] {
  return posts.filter((p) => p.postType === type)
}
