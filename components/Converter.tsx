'use client'

import { useState } from 'react'

export default function Converter({ symbol, price }: { symbol: string; price: number }) {
  const [coinAmt, setCoinAmt] = useState('1')
  const [usdAmt, setUsdAmt] = useState(price ? price.toFixed(2) : '0')

  const onCoin = (v: string) => {
    setCoinAmt(v)
    const n = parseFloat(v)
    setUsdAmt(Number.isFinite(n) && n >= 0 ? (n * price).toFixed(2) : '')
  }
  const onUsd = (v: string) => {
    setUsdAmt(v)
    const n = parseFloat(v)
    setCoinAmt(Number.isFinite(n) && n >= 0 && price ? (n / price).toFixed(8) : '')
  }

  const rowClass = 'bg-fill-2 border-line flex h-11 items-center gap-2.5 rounded-lg border px-3'
  const inputClass =
    'ml-auto w-full bg-transparent text-right text-sm font-bold text-gray-50 outline-none'

  return (
    <div className="bg-surface border-line rounded-[10px] border p-4">
      <div className="mb-3 text-[15px] font-extrabold text-gray-50">Converter</div>
      <label className={`${rowClass} mb-2.5`}>
        <span className="text-ink-2 w-12 text-[13.5px] font-bold">{symbol}</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={coinAmt}
          onChange={(e) => onCoin(e.target.value)}
          aria-label={`Amount in ${symbol}`}
          className={inputClass}
        />
      </label>
      <label className={rowClass}>
        <span className="text-ink-2 w-12 text-[13.5px] font-bold">USD</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={usdAmt}
          onChange={(e) => onUsd(e.target.value)}
          aria-label="Amount in USD"
          className={inputClass}
        />
      </label>
    </div>
  )
}
