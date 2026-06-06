import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import Tag from '@/components/Tag'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import ArticleMeta from '@/components/ArticleMeta'
import PostCard from '@/components/PostCard'
import { filterByType } from '@/lib/sections'
import siteMetadata from '@/data/siteMetadata'

interface LayoutProps {
  content: CoreContent<Blog>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authorDetails?: any[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostLayout({ content, children }: LayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slug, date, title, tags, readingTime, images, postType } = content as any
  const shareUrl = `${siteMetadata.siteUrl}/blog/${slug}`
  const related = filterByType(allCoreContent(sortPosts(allBlogs)), postType)
    .filter((p) => p.slug !== slug)
    .slice(0, 3)

  return (
    <article className="py-8">
      <div className="mx-auto max-w-3xl">
        <CategoryChip type={postType} />
        <PageTitle>{title}</PageTitle>
        <ArticleMeta date={date} readingTime={readingTime?.minutes} />
        <CoverImage
          src={firstImage(images)}
          type={postType}
          className="mt-5 h-64 w-full rounded-xl"
        />
        <div className="prose prose-invert mt-6 max-w-none">{children}</div>

        {tags && tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {tags.map((t: string) => (
              <Tag key={t} text={t} />
            ))}
          </div>
        )}

        <div className="border-line mt-8 flex gap-4 border-t pt-4 text-sm text-gray-400">
          <span>Share:</span>
          <a
            className="hover:text-accent"
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
          >
            X
          </a>
          <a
            className="hover:text-accent"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          >
            LinkedIn
          </a>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto mt-12 max-w-5xl">
          <h2 className="mb-3 text-lg font-bold text-gray-100">Related</h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {related.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
