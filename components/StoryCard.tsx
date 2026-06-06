import Link from './Link'
import CoverImage from './CoverImage'
import CategoryChip from './CategoryChip'
import ArticleMeta from './ArticleMeta'
import type { CardPost } from './PostCard'

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

export default function StoryCard({
  post,
}: {
  post: CardPost & { readingTime?: { minutes: number } }
}) {
  return (
    <article className="bg-surface border-line hover:border-accent overflow-hidden rounded-[10px] border transition-all hover:-translate-y-0.5">
      <Link href={`/blog/${post.slug}`}>
        <CoverImage
          src={firstImage(post.images)}
          type={post.postType}
          className="h-[150px] w-full"
        />
        <div className="p-4 pt-3.5 pb-4">
          <CategoryChip type={post.postType} />
          <h3 className="mt-2.5 line-clamp-2 text-[15px] leading-snug font-extrabold text-gray-100">
            {post.title}
          </h3>
          <ArticleMeta date={post.date} readingTime={post.readingTime?.minutes} />
        </div>
      </Link>
    </article>
  )
}
