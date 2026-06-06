import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import PostCard from '@/components/PostCard'
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

export default function SectionPage({ type }: { type: PostType }) {
  const section = getSection(type)!
  const posts = filterByType(allCoreContent(sortPosts(allBlogs)), type)

  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-gray-50">{section.title}</h1>
      <p className="mt-2 text-gray-400">{section.description}</p>
      {posts.length === 0 ? (
        <p className="mt-8 text-gray-400">No posts yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
