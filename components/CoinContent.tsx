import type { CardPost } from './PostCard'
import StoryCard from './StoryCard'
import SectionHeading from './SectionHeading'
import Link from './Link'

type Story = CardPost & { readingTime?: { minutes: number } }

// "News & guides about <coin>" section for the coin detail page. Renders a
// StoryCard grid, or a friendly empty state linking to all news.
export default function CoinContent({
  posts,
  coinName,
  symbol,
}: {
  posts: Story[]
  coinName: string
  symbol: string
}) {
  return (
    <div>
      <SectionHeading title={`${coinName} news & guides`} barColor="var(--color-blue)" />
      {posts.length === 0 ? (
        <p className="text-ink-2 text-sm">
          No {symbol} stories yet —{' '}
          <Link href="/news" className="text-blue font-semibold">
            browse all news ›
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          {posts.map((post) => (
            <StoryCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
