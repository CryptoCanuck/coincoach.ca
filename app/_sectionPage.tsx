import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { filterByType, getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

export function sectionMetadata(type: PostType): Metadata {
  const section = getSection(type)!
  return {
    ...genPageMetadata({ title: section.title, description: section.description }),
    alternates: { canonical: section.route },
  }
}

// Section pages render all posts of a postType on a single archive page.
// No pagination control is shown (totalPages: 1) because per-section
// `/page/[n]` routes do not exist — revisit with real pagination routes
// if a section grows large.
export default function SectionPage({ type }: { type: PostType }) {
  const section = getSection(type)!
  const posts = filterByType(allCoreContent(sortPosts(allBlogs)), type)

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={posts}
      pagination={{ currentPage: 1, totalPages: 1 }}
      title={section.title}
    />
  )
}
