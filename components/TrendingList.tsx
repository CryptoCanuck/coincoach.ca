import Link from '@/components/Link'

export interface TrendingItem {
  slug: string
  title: string
}

export default function TrendingList({ posts }: { posts: TrendingItem[] }) {
  return (
    <div>
      <h3 className="text-accent mb-0.5 text-xs font-semibold tracking-wider uppercase">
        Trending
      </h3>
      {posts.map((post, i) => (
        <div key={post.slug} className="border-line flex gap-2.5 border-b py-2.5 last:border-b-0">
          <span className="text-accent min-w-[18px] text-[15px] font-extrabold">{i + 1}</span>
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-accent text-[13.5px] leading-snug font-semibold text-gray-100"
          >
            {post.title}
          </Link>
        </div>
      ))}
    </div>
  )
}
