'use client'

import { useState } from 'react'
import type { Coin } from '@/lib/markets/coingecko'
import { changeDirection, formatPercent } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

type Tab = 'gainers' | 'losers'

export default function MoversTabs({ gainers, losers }: { gainers: Coin[]; losers: Coin[] }) {
  const [tab, setTab] = useState<Tab>('gainers')
  const list = tab === 'gainers' ? gainers : losers

  const tabClass = (active: boolean) =>
    active
      ? 'border-accent border-b-2 pb-2.5 text-sm font-extrabold text-gray-50'
      : 'text-ink-3 hover:text-ink-2 pb-2.5 text-sm font-bold'

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line flex gap-4 border-b px-4 pt-3">
        <button
          type="button"
          onClick={() => setTab('gainers')}
          aria-pressed={tab === 'gainers'}
          className={tabClass(tab === 'gainers')}
        >
          Gainers
        </button>
        <button
          type="button"
          onClick={() => setTab('losers')}
          aria-pressed={tab === 'losers'}
          className={tabClass(tab === 'losers')}
        >
          Losers
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1.5">
          {list.map((c) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <div key={`${c.symbol}-${c.name}`} className="flex items-center gap-2.5 px-4 py-2">
                <CoinLogo sym={c.symbol} size={20} />
                <span className="text-[13.5px] font-bold text-gray-100">{c.symbol}</span>
                <span className={`ml-auto text-[13.5px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
