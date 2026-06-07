import type { Coin } from '@/lib/markets/coingecko'
import type { FearGreed } from '@/lib/markets/sentiment'
import Gauge from './Gauge'
import CoinsInStory from './CoinsInStory'
import ArticleCoachBox from './ArticleCoachBox'
import TrendingList from './TrendingList'

interface SidebarProps {
  fearGreed: FearGreed | null
  coins: Coin[]
  trending: { slug: string; title: string }[]
}

// Right rail for the article page: sentiment gauge, coins-in-story, coach box,
// trending. Each panel degrades gracefully when its data is empty.
export default function ArticleSidebar({ fearGreed, coins, trending }: SidebarProps) {
  return (
    <aside className="flex flex-col gap-[22px]">
      <div className="bg-surface border-line rounded-[10px] border px-4 pt-[18px] pb-5">
        <div className="mb-1.5 text-[15px] font-extrabold text-gray-50">Market Sentiment</div>
        <Gauge value={fearGreed?.value ?? 50} label={fearGreed?.label ?? 'Neutral'} size="sm" />
      </div>
      <CoinsInStory coins={coins} />
      <ArticleCoachBox />
      {trending.length > 0 && (
        <div className="bg-surface border-line rounded-[10px] border p-4">
          <TrendingList posts={trending} />
        </div>
      )}
    </aside>
  )
}
