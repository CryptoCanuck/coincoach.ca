import Link from '@/components/Link'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import type { PostType } from '@/lib/structuredData'

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

export default function PostCard({ post }: { post: CardPost }) {
  return (
    <article className="bg-surface border-line overflow-hidden rounded-lg border transition-colors hover:border-gray-600">
      <Link href={`/blog/${post.slug}`}>
        <CoverImage src={firstImage(post.images)} type={post.postType} className="h-24 w-full" />
        <div className="p-2.5">
          <CategoryChip type={post.postType} />
          <h4 className="mt-1.5 text-[13.5px] leading-snug font-semibold text-gray-100">
            {post.title}
          </h4>
        </div>
      </Link>
    </article>
  )
}
