'use client'

import { useEffect, useState } from 'react'

const KEY = 'cc:watchlist'

function readList(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export default function WatchlistButton({ coinId }: { coinId: string }) {
  const [on, setOn] = useState(false)

  useEffect(() => {
    setOn(readList().includes(coinId))
  }, [coinId])

  const toggle = () => {
    const list = readList()
    const next = list.includes(coinId) ? list.filter((x) => x !== coinId) : [...list, coinId]
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // ignore storage failures (private mode, quota)
    }
    setOn(next.includes(coinId))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`border-line flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors ${
        on ? 'text-accent' : 'text-ink hover:text-gray-50'
      }`}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
      {on ? 'Watching' : 'Watchlist'}
    </button>
  )
}
