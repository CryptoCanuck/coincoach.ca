import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import ListLayout from '@/layouts/ListLayoutWithTags'
import { filterByType, getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

const POSTS_PER_PAGE = 5

export function sectionMetadata(type: PostType): Metadata {
  const section = getSection(type)!
  return {
    ...genPageMetadata({ title: section.title, description: section.description }),
    alternates: { canonical: section.route },
  }
}

export default function SectionPage({ type }: { type: PostType }) {
  const section = getSection(type)!
  const posts = filterByType(allCoreContent(sortPosts(allBlogs)), type)
  const pagination = { currentPage: 1, totalPages: Math.ceil(posts.length / POSTS_PER_PAGE) }
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE)

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title={section.title}
    />
  )
}
