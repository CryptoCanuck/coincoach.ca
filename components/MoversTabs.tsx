'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import type { Coin } from '@/lib/markets/coingecko'
import { changeDirection, formatPercent } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

type Tab = 'gainers' | 'losers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
]

export default function MoversTabs({ gainers, losers }: { gainers: Coin[]; losers: Coin[] }) {
  const [tab, setTab] = useState<Tab>('gainers')
  const list = tab === 'gainers' ? gainers : losers
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})

  // Roving arrow-key navigation per the WAI-ARIA tabs pattern: arrows (and
  // Home/End) move both the selection and focus to the target tab.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab)
    let next: Tab | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = TABS[(i + 1) % TABS.length].id
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = TABS[(i - 1 + TABS.length) % TABS.length].id
    else if (e.key === 'Home') next = TABS[0].id
    else if (e.key === 'End') next = TABS[TABS.length - 1].id
    if (next) {
      e.preventDefault()
      setTab(next)
      tabRefs.current[next]?.focus()
    }
  }

  const tabClass = (active: boolean) =>
    active
      ? 'border-accent border-b-2 pb-2.5 text-sm font-extrabold text-gray-50'
      : 'text-ink-3 hover:text-ink-2 pb-2.5 text-sm font-bold'

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div
        role="tablist"
        aria-label="Market movers"
        className="border-line flex gap-4 border-b px-4 pt-3"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`movers-tab-${t.id}`}
            ref={(el) => {
              tabRefs.current[t.id] = el
            }}
            aria-selected={tab === t.id}
            aria-controls="movers-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onKeyDown}
            className={tabClass(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="movers-panel" role="tabpanel" aria-labelledby={`movers-tab-${tab}`}>
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
    </div>
  )
}
