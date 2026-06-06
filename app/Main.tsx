import Link from '@/components/Link'
import StoryCard from '@/components/StoryCard'
import NewsRow from '@/components/NewsRow'
import CatTile from '@/components/CatTile'
import Gauge from '@/components/Gauge'
import StatCard from '@/components/StatCard'
import CoinTable from '@/components/CoinTable'
import Movers from '@/components/Movers'
import CoachStrip from '@/components/CoachStrip'
import SectionHeading from '@/components/SectionHeading'
import { SECTIONS, filterByType } from '@/lib/sections'
import tagData from 'app/tag-data.json'

// Colours for the category explorer tiles (from the logo palette).
const TILE_COLORS = ['#F2A024', '#3FA7DA', '#7BC23A', '#C964C9', '#EB5E45', '#8A93A0']

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Home({ posts }: { posts: any[] }) {
  const topStories = posts.slice(0, 4)
  const latest = posts.slice(4, 10)
  const latestLeft = latest.slice(0, 3)
  const latestRight = latest.slice(3, 6)

  // Category explorer: real sections + most-used tags, with real counts.
  const sectionTiles = SECTIONS.map((s, i) => ({
    name: s.title,
    count: filterByType(posts, s.type).length,
    color: TILE_COLORS[i % TILE_COLORS.length],
    href: s.route,
  }))
  const tagTiles = Object.entries(tagData as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([slug, count], i) => ({
      name: titleCase(slug),
      count,
      color: TILE_COLORS[(i + 2) % TILE_COLORS.length],
      href: `/tags/${slug}`,
    }))
  const categories = [...sectionTiles, ...tagTiles].slice(0, 8)

  return (
    <div className="space-y-8 py-6">
      {/* MARKET PULSE */}
      <section>
        <div className="bg-surface border-line grid overflow-hidden rounded-[10px] border md:grid-cols-[260px_1fr]">
          <div className="bg-fill-2 border-line border-b px-5 py-4 md:border-r md:border-b-0">
            <div className="mb-1 text-[15px] font-extrabold text-gray-50">Market Sentiment</div>
            <Gauge value={64} label="Greed" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Market Cap" value="$2.41T" sub="+1.8% (24h)" up />
            <StatCard label="24h Volume" value="$96.2B" sub="+5.1%" up />
            <StatCard label="BTC Dominance" value="54.3%" sub="-0.4%" up={false} />
            <StatCard label="Active Coins" value="11,842" sub="+0.2%" up />
          </div>
        </div>
      </section>

      {/* CATEGORY EXPLORER */}
      <section>
        <SectionHeading title="Explore by Category" moreLabel="All topics" moreHref="/tags" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <CatTile key={c.name} name={c.name} count={c.count} color={c.color} href={c.href} />
          ))}
        </div>
      </section>

      {/* TOP STORIES + PRICE RAIL */}
      <section className="grid gap-7 lg:grid-cols-[1fr_400px]">
        <div>
          <SectionHeading
            title="Top Stories"
            barColor="var(--color-blue)"
            moreLabel="More"
            moreHref="/news"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {topStories.map((post) => (
              <StoryCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <CoinTable />
          <Movers />
        </div>
      </section>

      {/* COACH */}
      <section>
        <CoachStrip />
      </section>

      {/* LATEST NEWS */}
      {latest.length > 0 && (
        <section>
          <SectionHeading
            title="Latest News"
            barColor="var(--color-green)"
            moreLabel="All news"
            moreHref="/news"
          />
          <div className="grid gap-x-10 md:grid-cols-2">
            <div>
              {latestLeft.map((post) => (
                <NewsRow key={post.slug} post={post} />
              ))}
            </div>
            <div>
              {latestRight.map((post) => (
                <NewsRow key={post.slug} post={post} />
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/news"
              className="border-line text-ink hover:border-ink-3 flex h-[42px] items-center rounded-full border px-6 text-sm font-bold transition-colors"
            >
              Load more stories
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
