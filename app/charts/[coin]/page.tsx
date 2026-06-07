import { notFound } from 'next/navigation'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Link from '@/components/Link'
import Breadcrumb from '@/components/Breadcrumb'
import CoinHeader from '@/components/CoinHeader'
import PriceChart from '@/components/PriceChart'
import KeyStats from '@/components/KeyStats'
import SectionHeading from '@/components/SectionHeading'
import Converter from '@/components/Converter'
import SimilarCoins from '@/components/SimilarCoins'
import CoinContent from '@/components/CoinContent'
import { relatedPostsForCoin } from '@/lib/coinContent'
import Gauge from '@/components/Gauge'
import {
  getCoin,
  getCoinDetail,
  getAllOhlc,
  priceVolatilityPct,
  TIMEFRAMES,
} from '@/lib/markets/coins'
import { getTopCoins } from '@/lib/markets/coingecko'
import MarketDataUnavailable from '@/components/MarketDataUnavailable'
import FreshnessNote from '@/components/FreshnessNote'
import { sentimentScore } from '@/lib/markets/sentimentProxy'
import { genPageMetadata } from 'app/seo'

export async function generateMetadata({ params }: { params: Promise<{ coin: string }> }) {
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
  // Confirm the coin exists before firing the dependent (4 OHLC + markets) calls,
  // so a bad/unknown id 404s without the extra CoinGecko load.
  const result = await getCoinDetail(id)
  if (result.status === 'not-found') notFound()
  if (result.status === 'unavailable') {
    // Transient CoinGecko outage (429/timeout) — distinct from a genuinely unknown
    // coin (which 404s). The route is dynamic, so this soft panel isn't page-cached:
    // once the (non-200) upstream recovers, the next request renders full data.
    return (
      <div className="py-2">
        <div className="pt-5">
          <Breadcrumb items={[{ label: 'Charts', href: '/charts' }, { label: id }]} />
        </div>
        <MarketDataUnavailable label={id} />
      </div>
    )
  }
  const coin = result.coin
  const [ohlc, top] = await Promise.all([getAllOhlc(id), getTopCoins()])

  const volatility = priceVolatilityPct(ohlc['1M'] ?? [])
  const similar = top.filter((c) => c.id && c.id !== coin.id).slice(0, 5)

  const posts = allCoreContent(sortPosts(allBlogs))
  const relatedPosts = relatedPostsForCoin(posts, coin, 6)

  return (
    <div className="py-2">
      <div className="pt-5">
        <Breadcrumb
          items={[{ label: 'Charts', href: '/charts' }, { label: `${coin.name} (${coin.symbol})` }]}
        />
      </div>
      <CoinHeader coin={coin} />

      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-end">
              <FreshnessNote />
            </div>
            <PriceChart data={ohlc} frames={TIMEFRAMES} />
          </div>

          <div>
            <SectionHeading title="Key Stats" />
            <KeyStats coin={coin} volatilityPct={volatility} />
          </div>

          {(coin.description || coin.links.length > 0) && (
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

          <CoinContent posts={relatedPosts} coinName={coin.name} symbol={coin.symbol} />
        </div>

        {/* RIGHT RAIL */}
        <div className="flex flex-col gap-5">
          <div className="bg-surface border-line flex flex-col items-center rounded-[10px] border p-4">
            <div className="mb-1 self-start text-[15px] font-extrabold text-gray-50">
              {coin.symbol} Sentiment
            </div>
            <Gauge value={sentimentScore(coin.change24h)} label="Momentum" size="sm" />
            <div className="text-ink-3 mt-1 text-[11px]">24h momentum proxy</div>
          </div>

          <Converter symbol={coin.symbol} price={coin.price} />

          <SimilarCoins coins={similar} />
        </div>
      </div>
    </div>
  )
}
