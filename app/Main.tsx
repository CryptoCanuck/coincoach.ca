import Link from '@/components/Link'
import PostCard from '@/components/PostCard'
import CategoryChip from '@/components/CategoryChip'
import CoverImage from '@/components/CoverImage'
import ArticleMeta from '@/components/ArticleMeta'
import TrendingList from '@/components/TrendingList'
import TopCoins from '@/components/TopCoins'
import { SECTIONS, filterByType } from '@/lib/sections'

function firstImage(images?: string[] | string): string | undefined {
  if (!images) return undefined
  return Array.isArray(images) ? images[0] : images
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Home({ posts }: { posts: any[] }) {
  const lead = posts.find((p) => p.postType === 'news') ?? posts[0]
  const trending = posts.filter((p) => p.slug !== lead?.slug).slice(0, 4)

  return (
    <div className="py-6">
      {/* Hero split */}
      {lead && (
        <section className="grid gap-5 md:grid-cols-[1.7fr_1fr]">
          <article className="bg-surface border-line overflow-hidden rounded-xl border">
            <Link href={`/blog/${lead.slug}`}>
              <CoverImage
                src={firstImage(lead.images)}
                type={lead.postType}
                className="h-56 w-full"
              />
              <div className="p-4">
                <CategoryChip type={lead.postType} />
                <h1 className="mt-2.5 text-2xl leading-tight font-extrabold tracking-tight text-gray-50">
                  {lead.title}
                </h1>
                <ArticleMeta date={lead.date} readingTime={lead.readingTime?.minutes} />
              </div>
            </Link>
          </article>
          <aside className="flex flex-col gap-4">
            <TrendingList posts={trending} />
            <TopCoins />
          </aside>
        </section>
      )}

      {/* Topic bands */}
      {SECTIONS.map((section) => {
        const sectionPosts = filterByType(posts, section.type)
          .filter((p) => p.slug !== lead?.slug)
          .slice(0, 4)
        if (sectionPosts.length === 0) return null
        return (
          <section key={section.type} className="border-line mt-6 border-t pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-100">{section.title}</h2>
              <Link href={section.route} className="text-accent text-xs font-semibold">
                View all ›
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {sectionPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
