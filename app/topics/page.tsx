import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Link from '@/components/Link'
import Breadcrumb from '@/components/Breadcrumb'
import CatTile from '@/components/CatTile'
import { TOPICS, postsForTopic } from '@/lib/topics'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Topics',
  description:
    'Browse crypto news and guides by topic — Bitcoin, Ethereum, DeFi, regulation and more.',
  alternates: { canonical: '/topics' },
})

export default function TopicsPage() {
  const posts = allCoreContent(sortPosts(allBlogs))
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Topics' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Topics</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Browse our coverage by theme. Looking for something more specific? See all{' '}
        <Link href="/tags" className="text-blue font-semibold">
          tags
        </Link>
        .
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {TOPICS.map((topic) => (
          <CatTile
            key={topic.slug}
            name={topic.label}
            count={postsForTopic(posts, topic).length}
            color={topic.color}
            href={`/topics/${topic.slug}`}
          />
        ))}
      </div>
    </div>
  )
}
