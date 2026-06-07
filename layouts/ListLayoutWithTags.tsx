'use client'

import { usePathname } from 'next/navigation'
import { slug } from 'github-slugger'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import PostCard from '@/components/PostCard'
import tagData from 'app/tag-data.json'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages
  const pill = 'rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition-colors'

  return (
    <nav className="mt-8 flex items-center justify-between">
      {prevPage ? (
        <Link
          href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
          rel="prev"
          className={`${pill} border-line bg-surface text-ink-2 hover:border-accent hover:text-gray-50`}
        >
          ‹ Previous
        </Link>
      ) : (
        <span className={`${pill} border-line text-ink-3 cursor-not-allowed opacity-50`}>
          ‹ Previous
        </span>
      )}
      <span className="text-ink-3 text-[13px] font-semibold">
        {currentPage} of {totalPages}
      </span>
      {nextPage ? (
        <Link
          href={`/${basePath}/page/${currentPage + 1}`}
          rel="next"
          className={`${pill} border-line bg-surface text-ink-2 hover:border-accent hover:text-gray-50`}
        >
          Next ›
        </Link>
      ) : (
        <span className={`${pill} border-line text-ink-3 cursor-not-allowed opacity-50`}>
          Next ›
        </span>
      )}
    </nav>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const tagCounts = tagData as Record<string, number>
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts
  const activeTag = decodeURI(pathname.split('/tags/')[1] ?? '')

  return (
    <div className="py-7">
      <h1 className="text-[34px] font-black tracking-tight text-gray-50 capitalize">{title}</h1>

      <div className="mt-6 flex flex-col gap-7 lg:flex-row lg:gap-8">
        {/* All-tags sidebar (desktop only) */}
        <aside className="hidden lg:block lg:w-[250px] lg:shrink-0">
          <div className="bg-surface border-line sticky top-[140px] max-h-[calc(100vh-160px)] overflow-auto rounded-[10px] border p-4">
            {pathname.startsWith('/blog') ? (
              <span className="text-accent text-[13px] font-extrabold uppercase">All Posts</span>
            ) : (
              <Link
                href="/blog"
                className="text-ink-2 text-[13px] font-extrabold uppercase hover:text-gray-50"
              >
                All Posts
              </Link>
            )}
            <ul className="mt-3 flex flex-col gap-1.5">
              {sortedTags.map((t) => {
                const isActive = activeTag === slug(t)
                const label = `${t.split('-').join(' ')} (${tagCounts[t]})`
                return (
                  <li key={t}>
                    {isActive ? (
                      <span className="text-accent text-[12.5px] font-bold uppercase">{label}</span>
                    ) : (
                      <Link
                        href={`/tags/${slug(t)}`}
                        aria-label={`View posts tagged ${t.split('-').join(' ')}`}
                        className="text-ink-3 hover:text-ink text-[12.5px] font-semibold uppercase transition-colors"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Posts grid */}
        <div className="min-w-0 flex-1">
          {displayPosts.length === 0 ? (
            <p className="text-ink-2 text-sm">No posts found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}
        </div>
      </div>
    </div>
  )
}
