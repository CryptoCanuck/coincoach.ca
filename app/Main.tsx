import Link from '@/components/Link'
import StoryCard from '@/components/StoryCard'
import NewsRow from '@/components/NewsRow'
import CatTile from '@/components/CatTile'
import MarketPulse from '@/components/MarketPulse'
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
        <MarketPulse />
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
