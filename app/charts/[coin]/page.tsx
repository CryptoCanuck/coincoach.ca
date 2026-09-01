import type { Metadata } from 'next'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Link from '@/components/Link'
import Breadcrumb from '@/components/Breadcrumb'
import CoinHeader from '@/components/CoinHeader'
import PriceChart from '@/components/PriceChart'
import KeyMetricsBar from '@/components/KeyMetricsBar'
import PricePerformance from '@/components/PricePerformance'
import PriceStats from '@/components/PriceStats'
import CoinMarkets from '@/components/CoinMarkets'
import SpecsTable from '@/components/SpecsTable'
import DevActivity from '@/components/DevActivity'
import SentimentBand from '@/components/SentimentBand'
import TreasuryTable from '@/components/TreasuryTable'
import SectionHeading from '@/components/SectionHeading'
import Converter from '@/components/Converter'
import SimilarCoins from '@/components/SimilarCoins'
import CoinContent from '@/components/CoinContent'
import FreshnessNote from '@/components/FreshnessNote'
import { relatedPostsForCoin } from '@/lib/coinContent'
import { getCoin, getCoinDetail, getOhlc, TIMEFRAMES, type Timeframe } from '@/lib/markets/coins'
import { dbCoinTickers, dbTreasury, dbSimilarByCategory } from '@/lib/markets/dbReads'
import { genPageMetadata } from 'app/seo'

// The chart opens on this frame; PriceChart lazy-loads the others on click via
// /api/ohlc/[coin]. Server-fetching only this one keeps the page's initial DB
// work to one OHLC read (the default frame) instead of all six.
const DEFAULT_FRAME: Timeframe = '1M'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ coin: string }>
}): Promise<Metadata> {
  const { coin: id } = await params
  const coin = await getCoin(id)
  if (!coin) return genPageMetadata({ title: 'Coin not found' })
  return genPageMetadata({
    title: `${coin.name} (${coin.symbol}) Price & Chart`,
    description: `Live ${coin.name} price, candlestick chart, key stats and ${coin.symbol} news.`,
    alternates: { canonical: `/charts/${coin.id}` },
  })
}

export default async function CoinDetailPage({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  // DB-only (spec 1a): assemble CoinFull from Postgres. 'gathering' = a coin not
  // yet in the DB (a brand-new listing the next collector sweep will pick up) —
  // show a soft state; 'ok' renders the full page.
  const result = await getCoinDetail(id)
  if (result.status === 'gathering') {
    return (
      <div className="py-2">
        <div className="pt-5">
          <Breadcrumb items={[{ label: 'Charts', href: '/charts' }, { label: id }]} />
        </div>
        <div className="bg-surface border-line mt-6 rounded-[10px] border p-8 text-center">
          <h1 className="text-xl font-extrabold text-gray-50">
            We&apos;re gathering live data for {id}
          </h1>
          <p className="text-ink-2 mx-auto mt-2 max-w-md text-sm">
            This coin was just added to our tracking universe. Pricing, charts and stats will appear
            here shortly — check back in a few minutes.
          </p>
          <Link href="/charts" className="text-blue mt-5 inline-block text-sm font-semibold">
            ← Back to Markets
          </Link>
        </div>
      </div>
    )
  }

  const coin = result.coin

  // Fetch the dependent reads in parallel with the chart's default frame. Each
  // read self-handles emptiness (tickers → [], treasury → null, similar → []),
  // and the corresponding component self-hides, so the page renders them
  // unconditionally below.
  const [defaultCandles, tickers, treasury, similar] = await Promise.all([
    getOhlc(id, DEFAULT_FRAME),
    dbCoinTickers(id, 50),
    dbTreasury(id),
    dbSimilarByCategory(id, 8),
  ])

  const posts = allCoreContent(sortPosts(allBlogs))
  const relatedPosts = relatedPostsForCoin(posts, coin, 6)

  const hasAbout = coin.description || coin.links.length > 0

  return (
    <div className="py-2">
      <div className="pt-5">
        <Breadcrumb
          items={[{ label: 'Charts', href: '/charts' }, { label: `${coin.name} (${coin.symbol})` }]}
        />
      </div>

      {/* 1. Identity header */}
      <CoinHeader coin={coin} />

      <div className="mt-6 flex flex-col gap-8">
        {/* 2. Key metrics bar */}
        <KeyMetricsBar coin={coin} />

        {/* 3. Price chart (full-width) + freshness */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-end">
            <FreshnessNote />
          </div>
          <PriceChart
            coinId={coin.id}
            data={{ [DEFAULT_FRAME]: defaultCandles }}
            frames={TIMEFRAMES}
            initialFrame={DEFAULT_FRAME}
          />
        </div>

        {/* 4. Price performance + Price stats (2-col on desktop) */}
        <div className="grid gap-8 lg:grid-cols-2">
          <PricePerformance changes={coin.changes} />
          <PriceStats ath={coin.ath} atl={coin.atl} genesisDate={coin.genesisDate} />
        </div>

        {/* About (standalone, full-width) */}
        {hasAbout && (
          <div>
            <SectionHeading title={`About ${coin.name}`} barColor="var(--color-blue)" />
            {coin.description && (
              <p className="text-ink-2 text-[14px] leading-relaxed">{coin.description}</p>
            )}
            {coin.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {coin.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="border-line bg-fill-2 text-ink rounded-lg border px-3 py-1.5 text-[13px] font-semibold hover:text-gray-50"
                  >
                    {l.label} ↗
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sentiment (full-width) */}
        <SentimentBand
          symbol={coin.symbol}
          change24h={coin.changes.h24}
          sentimentVotesUpPct={coin.sentimentVotesUpPct}
          sentimentVotesDownPct={coin.sentimentVotesDownPct}
          watchlistUsers={coin.watchlistUsers}
        />

        {/* Specs + Developer activity + Converter (3-col, 1/3 each) */}
        <div className="grid items-start gap-8 lg:grid-cols-3">
          <SpecsTable coin={coin} />
          <DevActivity dev={coin.dev} community={coin.community} />
          <div>
            <SectionHeading title="Converter" />
            <Converter symbol={coin.symbol} price={coin.price ?? 0} />
          </div>
        </div>

        {/* Similar coins (self-hides when no same-category peers) */}
        <SimilarCoins coins={similar} />

        {/* Related news & guides */}
        <CoinContent posts={relatedPosts} coinName={coin.name} symbol={coin.symbol} />

        {/* Long reference tables — side-by-side + scrollable, at the bottom of the
            page. Collapses to a single full-width column when there's no treasury
            data (every coin except BTC/ETH). */}
        {(tickers.length > 0 || (treasury && treasury.holdings.length > 0)) && (
          <div
            className={`grid items-start gap-8 ${
              treasury && treasury.holdings.length > 0 ? 'lg:grid-cols-2' : ''
            }`}
          >
            <CoinMarkets coinName={coin.name} tickers={tickers} />
            <TreasuryTable treasury={treasury} symbol={coin.symbol} />
          </div>
        )}
      </div>
    </div>
  )
}
