import type { PostType } from './structuredData'

export interface Section {
  type: PostType
  route: string
  title: string
  label: string
  description: string
  chipClass: string
}

export const SECTIONS: Section[] = [
  { type: 'news', route: '/news', title: 'News', label: 'News', description: 'The latest cryptocurrency and blockchain news.', chipClass: 'bg-news text-white' },
  { type: 'guide', route: '/guides', title: 'Guides', label: 'Guide', description: 'Practical guides and explainers for crypto.', chipClass: 'bg-guide text-[#06210f]' },
  { type: 'breakdown', route: '/breakdowns', title: 'Token Breakdowns', label: 'Breakdown', description: 'In-depth breakdowns of crypto tokens and projects.', chipClass: 'bg-breakdown text-white' },
  { type: 'review', route: '/reviews', title: 'Reviews', label: 'Review', description: 'Honest reviews of exchanges, wallets, and tools.', chipClass: 'bg-review text-[#231405]' },
]

export function getSection(type: PostType): Section | undefined {
  return SECTIONS.find((s) => s.type === type)
}

export function filterByType<T extends { postType?: string }>(posts: T[], type: PostType): T[] {
  return posts.filter((p) => p.postType === type)
}
