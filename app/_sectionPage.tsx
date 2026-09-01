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
    <div className="py-10">
      <div className="border-line flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.14em] uppercase">
            CoinCoach editorial
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-50">{section.title}</h1>
          <p className="mt-2 max-w-2xl text-gray-400">{section.description}</p>
        </div>
        <p className="text-ink-3 shrink-0 text-sm font-semibold">
          {posts.length} {posts.length === 1 ? 'article' : 'articles'}
        </p>
      </div>
      {posts.length === 0 ? (
        <p className="mt-8 text-gray-400">No posts yet.</p>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <PostCard key={post.slug} post={post} featured={index === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
