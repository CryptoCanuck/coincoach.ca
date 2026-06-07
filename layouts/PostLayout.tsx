import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog, Authors } from 'contentlayer/generated'
import { allBlogs } from 'contentlayer/generated'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { slug as slugify } from 'github-slugger'
import Tag from '@/components/Tag'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import StoryCard from '@/components/StoryCard'
import SectionHeading from '@/components/SectionHeading'
import Breadcrumb from '@/components/Breadcrumb'
import ArticleByline from '@/components/ArticleByline'
import AuthorBio from '@/components/AuthorBio'
import ArticleSidebar from '@/components/ArticleSidebar'
import { CoinDataProvider } from '@/components/CoinDataProvider'
import { filterByType, getSection } from '@/lib/sections'
import type { Coin } from '@/lib/markets/coingecko'
import type { FearGreed } from '@/lib/markets/sentiment'
import siteMetadata from '@/data/siteMetadata'

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails?: CoreContent<Authors>[]
  authorBio?: ReactNode
  coins?: Coin[]
  fearGreed?: FearGreed | null
  children: ReactNode
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostLayout({
  content,
  authorDetails,
  authorBio,
  coins = [],
  fearGreed = null,
  children,
}: LayoutProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { slug, date, title, summary, tags, readingTime, images, postType } = content as any
  const shareUrl = `${siteMetadata.siteUrl}/blog/${slug}`
  const section = getSection(postType)
  const sortedPosts = allCoreContent(sortPosts(allBlogs))

  const related = filterByType(sortedPosts, postType)
    .filter((p) => p.slug !== slug)
    .slice(0, 3)
  const trending = sortedPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 5)
    .map((p) => ({ slug: p.slug, title: p.title }))

  const author = authorDetails?.[0]
  const primaryTag = tags?.[0] as string | undefined

  const crumbs = [
    ...(section ? [{ label: section.title, href: section.route }] : []),
    ...(primaryTag ? [{ label: primaryTag, href: `/tags/${slugify(primaryTag)}` }] : []),
    { label: title },
  ]

  return (
    <article className="py-[18px]">
      <Breadcrumb items={crumbs} />

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* MAIN COLUMN */}
        <div className="min-w-0">
          <CategoryChip type={postType} />
          <h1 className="mt-3.5 max-w-[760px] text-[34px] leading-[1.1] font-black tracking-tight text-gray-50 sm:text-[40px]">
            {title}
          </h1>
          {summary ? (
            <p className="text-ink-2 mt-3.5 max-w-[720px] text-[15px] leading-relaxed font-medium">
              {summary}
            </p>
          ) : null}

          <ArticleByline
            authorName={author?.name ?? 'CoinCoach'}
            authorAvatar={author?.avatar}
            occupation={author?.occupation}
            date={date}
            readingTime={readingTime?.minutes}
            shareUrl={shareUrl}
            title={title}
          />

          <CoverImage
            src={firstImage(images)}
            type={postType}
            className="h-[300px] w-full rounded-[10px] sm:h-[380px]"
          />

          <CoinDataProvider coins={coins}>
            <div className="prose prose-invert mt-7 max-w-none">{children}</div>
          </CoinDataProvider>

          {tags && tags.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {tags.map((t: string) => (
                <Tag key={t} text={t} />
              ))}
            </div>
          )}

          {author && (
            <AuthorBio name={author.name} avatar={author.avatar} occupation={author.occupation}>
              {authorBio}
            </AuthorBio>
          )}

          {related.length > 0 && (
            <div className="mt-9">
              <SectionHeading title="Related Stories" />
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
                {related.map((post) => (
                  <StoryCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <ArticleSidebar fearGreed={fearGreed} coins={coins} trending={trending} />
      </div>
    </article>
  )
}
