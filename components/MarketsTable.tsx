'use client'

import { useState } from 'react'
import type { MarketCoin } from '@/lib/markets/coingecko'
import { formatUsd, formatCompactUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import Link from './Link'
import Sparkline from './Sparkline'

type Tab = 'top' | 'gainers' | 'losers' | 'volume'

const TABS: { id: Tab; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'gainers', label: 'Gainers' },
  { id: 'losers', label: 'Losers' },
  { id: 'volume', label: 'Volume' },
]

function sortFor(tab: Tab, coins: MarketCoin[]): MarketCoin[] {
  const arr = [...coins]
  switch (tab) {
    case 'gainers':
      return arr.sort((a, b) => b.change24h - a.change24h)
    case 'losers':
      return arr.sort((a, b) => a.change24h - b.change24h)
    case 'volume':
      return arr.sort((a, b) => b.volume - a.volume)
    default:
      return arr.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
  }
}

function changeClass(value: number): string {
  const dir = changeDirection(value)
  return dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
}

export default function MarketsTable({ coins }: { coins: MarketCoin[] }) {
  const [tab, setTab] = useState<Tab>('top')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    : coins
  const rows = sortFor(tab, filtered)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="group" aria-label="Sort coins by">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex h-[34px] items-center rounded-full border px-4 text-[13px] font-bold transition-colors ${
                tab === t.id
                  ? 'border-accent bg-accent text-[#2a1c05]'
                  : 'border-line bg-surface text-ink-2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto w-full sm:w-auto">
          <span className="sr-only">Search coins</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coins…"
            className="border-line bg-surface text-ink h-[34px] w-full rounded-lg border px-3 text-sm font-medium sm:w-56"
          />
        </label>
      </div>

      <div className="bg-surface border-line overflow-hidden rounded-[10px] border">
        <div className="border-line text-ink-3 flex items-center gap-3 border-b px-4 py-2.5 text-[11px] font-bold tracking-wide uppercase">
          <span className="w-6">#</span>
          <span className="flex-1">Coin</span>
          <span className="w-[92px] text-right">Price</span>
          <span className="w-[64px] text-right">24h</span>
          <span className="hidden w-[64px] text-right lg:inline">7d</span>
          <span className="hidden w-[96px] text-right lg:inline">Mkt Cap</span>
          <span className="hidden w-[96px] text-right lg:inline">Volume</span>
          <span className="hidden w-[80px] text-right lg:inline">7d Chart</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-ink-2 px-4 py-6 text-sm">
            {coins.length === 0 ? 'Market data unavailable.' : 'No coins match your search.'}
          </p>
        ) : (
          rows.map((c, i) => (
            <Link
              key={c.id}
              href={`/charts/${c.id}`}
              className={`hover:bg-fill-2 flex items-center gap-3 px-4 py-3 ${
                i < rows.length - 1 ? 'border-line-2 border-b' : ''
              }`}
            >
              <span className="text-ink-3 w-6 text-xs font-bold">{c.rank ?? '–'}</span>
              <CoinLogo sym={c.symbol} size={24} />
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-bold text-gray-100">{c.name}</span>
                <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
              </div>
              <span className="w-[92px] text-right text-sm font-bold text-gray-100">
                {formatUsd(c.price)}
              </span>
              <span
                className={`w-[64px] text-right text-[13px] font-bold ${changeClass(c.change24h)}`}
              >
                {formatPercent(c.change24h)}
              </span>
              <span
                className={`hidden w-[64px] text-right text-[13px] font-bold lg:inline ${changeClass(c.change7d)}`}
              >
                {formatPercent(c.change7d)}
              </span>
              <span className="hidden w-[96px] text-right text-[13px] font-semibold text-gray-100 lg:inline">
                {formatCompactUsd(c.marketCap)}
              </span>
              <span className="hidden w-[96px] text-right text-[13px] font-semibold text-gray-100 lg:inline">
                {formatCompactUsd(c.volume)}
              </span>
              <span className="hidden w-[80px] justify-end lg:flex">
                <Sparkline data={c.sparkline} />
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
