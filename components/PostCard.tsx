import Link from '@/components/Link'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import siteMetadata from '@/data/siteMetadata'
import type { PostType } from '@/lib/structuredData'
import { formatDate } from 'pliny/utils/formatDate'

export interface CardPost {
  slug: string
  title: string
  postType: PostType
  images?: string[] | string
  date: string
}

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function PostCard({
  post,
  featured = false,
}: {
  post: CardPost
  featured?: boolean
}) {
  return (
    <article
      className={`bg-surface border-line group overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 hover:border-gray-500 ${
        featured ? 'sm:col-span-2 lg:row-span-2' : ''
      }`}
    >
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
        <CoverImage
          src={firstImage(post.images)}
          type={post.postType}
          className={`w-full transition-transform duration-300 group-hover:scale-[1.02] ${
            featured ? 'h-56 sm:h-72' : 'h-40'
          }`}
        />
        <div className={`flex flex-1 flex-col ${featured ? 'p-5 sm:p-6' : 'p-4'}`}>
          <div className="flex items-center justify-between gap-3">
            <CategoryChip type={post.postType} />
            <time className="text-ink-3 text-xs font-semibold" dateTime={post.date}>
              {formatDate(post.date, siteMetadata.locale)}
            </time>
          </div>
          <h2
            className={`mt-3 leading-snug font-bold text-gray-100 ${
              featured ? 'text-2xl tracking-tight sm:text-3xl' : 'text-base'
            }`}
          >
            {post.title}
          </h2>
          {featured && (
            <span className="text-accent mt-auto pt-6 text-sm font-extrabold">
              Read the latest story →
            </span>
          )}
        </div>
      </Link>
    </article>
  )
}
