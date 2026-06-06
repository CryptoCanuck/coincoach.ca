import Link from './Link'
import CoverImage from './CoverImage'
import CategoryChip from './CategoryChip'
import ArticleMeta from './ArticleMeta'
import type { CardPost } from './PostCard'

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function NewsRow({
  post,
}: {
  post: CardPost & { readingTime?: { minutes: number } }
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="border-line-2 group flex gap-4 border-b py-4 last:border-b-0"
    >
      <CoverImage
        src={firstImage(post.images)}
        type={post.postType}
        className="h-[100px] w-[150px] shrink-0 rounded-lg"
      />
      <div className="flex-1 pt-0.5">
        <CategoryChip type={post.postType} />
        <h3 className="mt-2 line-clamp-2 text-[14px] leading-snug font-extrabold text-gray-100 group-hover:text-white">
          {post.title}
        </h3>
        <ArticleMeta date={post.date} readingTime={post.readingTime?.minutes} />
      </div>
    </Link>
  )
}
