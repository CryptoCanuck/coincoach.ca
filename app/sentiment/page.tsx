import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import Breadcrumb from '@/components/Breadcrumb'
import Gauge from '@/components/Gauge'
import StatCard from '@/components/StatCard'
import SectionHeading from '@/components/SectionHeading'
import SentRow from '@/components/SentRow'
import SentimentHistoryChart from '@/components/SentimentHistoryChart'
import CoachStrip from '@/components/CoachStrip'
import Link from '@/components/Link'
import { getFearGreed, getFearGreedHistory } from '@/lib/markets/sentiment'
import { getGlobalStats } from '@/lib/markets/global'
import { getTopCoins } from '@/lib/markets/coingecko'
import { getCategorySentiment } from '@/lib/markets/categories'
import {
  coinSentimentList,
  sentimentZone,
  volatilityLabel,
  valueDaysAgo,
} from '@/lib/markets/sentimentProxy'
import { filterByType } from '@/lib/sections'

export const metadata = genPageMetadata({
  title: 'Crypto Market Sentiment',
  description:
    'The Fear & Greed index plus a momentum read across the top coins and categories — so you can gauge the market mood before you act.',
  alternates: { canonical: '/sentiment' },
})

const dash = '—'

export default async function SentimentPage() {
  const [fng, history, stats, coins, cats] = await Promise.all([
    getFearGreed(),
    getFearGreedHistory(365),
    getGlobalStats(),
    getTopCoins(),
    getCategorySentiment(8),
  ])

  const coinRows = coinSentimentList(coins, 8)
  const yesterday = valueDaysAgo(history, 1)
  const lastWeek = valueDaysAgo(history, 7)
  const volatility = volatilityLabel(history.slice(-30).map((p) => p.value))
  const fmtStat = (v: number | null) => (v === null ? dash : `${v} · ${sentimentZone(v).label}`)

  const guides = filterByType(allCoreContent(sortPosts(allBlogs)), 'guide').slice(0, 3)

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Market Sentiment' }]} />

      {/* TITLE */}
      <div className="mt-5">
        <span className="text-accent text-[11px] font-extrabold tracking-[0.14em] uppercase">
          Live Market Mood
        </span>
        <h1 className="mt-2 text-[34px] font-black tracking-tight text-gray-50">
          Crypto Market Sentiment
        </h1>
        <p className="text-ink-2 mt-1.5 max-w-[640px] text-sm font-medium">
          The Fear &amp; Greed index, updated hourly — with a momentum read across the top coins and
          categories so you can read the room before you act.
        </p>
      </div>

      {/* HERO: gauge + history */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="bg-surface border-line flex flex-col items-center justify-center rounded-[10px] border p-6">
          <div className="mb-1.5 self-start text-[15px] font-extrabold text-gray-50">Today</div>
          <Gauge value={fng?.value ?? 50} label={fng?.label ?? 'Neutral'} size="xl" />
          <div className="text-ink-3 mt-4 flex gap-4 text-xs font-bold">
            <span className="text-down">0 Fear</span>
            <span>·</span>
            <span className="text-amber">50 Neutral</span>
            <span>·</span>
            <span className="text-up">100 Greed</span>
          </div>
        </div>
        <SentimentHistoryChart data={history} />
      </div>

      {/* OVERVIEW STRIP */}
      <div className="bg-surface border-line mt-5 grid grid-cols-2 overflow-hidden rounded-[10px] border md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Sentiment" value={fng ? fmtStat(fng.value) : dash} />
        <StatCard label="Yesterday" value={fmtStat(yesterday)} />
        <StatCard label="Last Week" value={fmtStat(lastWeek)} />
        <StatCard label="Volatility" value={volatility} />
        <StatCard
          label="BTC Dominance"
          value={stats ? `${stats.btcDominance.toFixed(1)}%` : dash}
        />
      </div>

      {/* PROXY DISCLOSURE */}
      <p className="text-ink-3 mt-4 text-[12px]">
        Per-coin and per-category readings are a momentum proxy derived from 24h price/market-cap
        change — not a social-sentiment feed.
      </p>

      {/* BY COIN + BY CATEGORY */}
      <div className="mt-3 grid gap-7 lg:grid-cols-2">
        <div>
          <SectionHeading title="Sentiment by Coin" />
          <div className="bg-surface border-line rounded-[10px] border px-[18px] py-1">
            {coinRows.length === 0 ? (
              <p className="text-ink-2 py-4 text-sm">Market data unavailable.</p>
            ) : (
              coinRows.map((c) => (
                <SentRow key={c.symbol} symbol={c.symbol} name={c.name} score={c.score} />
              ))
            )}
          </div>
        </div>

        <div>
          <SectionHeading title="Sentiment by Category" barColor="var(--color-blue)" />
          {cats.length === 0 ? (
            <div className="bg-surface border-line rounded-[10px] border p-4">
              <p className="text-ink-2 text-sm">Category data unavailable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {cats.map((cat) => {
                const { color } = sentimentZone(cat.score)
                return (
                  <div key={cat.name} className="bg-surface border-line rounded-[10px] border p-4">
                    <div className="mb-3 flex items-center">
                      <span className="truncate text-sm font-extrabold text-gray-100">
                        {cat.name}
                      </span>
                      <span className="ml-auto text-lg font-black" style={{ color }}>
                        {cat.score}
                      </span>
                    </div>
                    <div className="bg-fill h-[7px] overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${cat.score}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* WHAT THIS MEANS */}
      {guides.length > 0 && (
        <div className="mt-8">
          <SectionHeading title="What does this mean?" barColor="var(--color-green)" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <Link
                key={g.slug}
                href={`/blog/${g.slug}`}
                className="bg-surface border-line hover:border-ink-3 block rounded-[10px] border p-5 transition-colors"
              >
                <span className="bg-guide rounded-full px-2.5 py-1 text-[11px] font-bold text-[#06210f]">
                  Guide
                </span>
                <div className="mt-3 text-base font-extrabold tracking-tight text-gray-50">
                  {g.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* COACH */}
      <div className="mt-8">
        <CoachStrip />
      </div>
    </div>
  )
}
