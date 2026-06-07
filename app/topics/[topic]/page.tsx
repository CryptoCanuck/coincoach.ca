import { notFound } from 'next/navigation'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import PostCard from '@/components/PostCard'
import Link from '@/components/Link'
import { TOPICS, getTopic, postsForTopic } from '@/lib/topics'
import { genPageMetadata } from 'app/seo'

export const generateStaticParams = async () => TOPICS.map((t) => ({ topic: t.slug }))

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: s } = await params
  const topic = getTopic(s)
  if (!topic) return genPageMetadata({ title: 'Topic not found' })
  return genPageMetadata({
    title: topic.label,
    description: topic.description,
    alternates: { canonical: `/topics/${topic.slug}` },
  })
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: s } = await params
  const topic = getTopic(s)
  if (!topic) notFound()
  const posts = postsForTopic(allCoreContent(sortPosts(allBlogs)), topic)

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Topics', href: '/topics' }, { label: topic.label }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">{topic.label}</h1>
      <p className="text-ink-2 mt-1.5 max-w-2xl text-sm font-medium">{topic.description}</p>
      {posts.length === 0 ? (
        <p className="text-ink-2 mt-8 text-sm">
          No {topic.label} articles yet —{' '}
          <Link href="/news" className="text-blue font-semibold">
            browse all news ›
          </Link>
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
