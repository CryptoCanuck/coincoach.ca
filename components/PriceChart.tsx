'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Timeframe } from '@/lib/markets/coins'

export default function PriceChart({
  data,
  frames,
}: {
  data: Record<string, Candle[]>
  frames: Timeframe[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [frame, setFrame] = useState<Timeframe>(frames.includes('1M') ? '1M' : (frames[0] ?? '1M'))

  const hasData = frames.some((f) => (data[f]?.length ?? 0) > 0)

  useEffect(() => {
    if (!containerRef.current || !hasData) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#97a3b2', fontFamily: 'inherit' },
      grid: { vertLines: { color: '#1b232f' }, horzLines: { color: '#1b232f' } },
      rightPriceScale: { borderColor: '#232c38' },
      timeScale: { borderColor: '#232c38', timeVisible: true },
      crosshair: { mode: 0 },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#7BC23A',
      downColor: '#EB5E45',
      borderVisible: false,
      wickUpColor: '#7BC23A',
      wickDownColor: '#EB5E45',
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [hasData])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    series.setData((data[frame] ?? []).map((c) => ({ ...c, time: c.time as UTCTimestamp })))
    chartRef.current?.timeScale().fitContent()
  }, [frame, data])

  const chipBase = 'rounded-md px-2.5 py-1 text-[12px] font-bold'
  return (
    <div className="bg-surface border-line rounded-[10px] border p-4">
      <div className="mb-3 flex items-center">
        <div className="flex items-baseline gap-3">
          <span className="text-base font-extrabold text-gray-50">Price</span>
          <span className="text-ink-3 text-[12.5px] font-semibold">USD · Candlestick</span>
        </div>
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Chart timeframe">
          {frames.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={frame === f}
              onClick={() => setFrame(f)}
              className={
                frame === f
                  ? `${chipBase} bg-fill text-gray-50`
                  : `${chipBase} text-ink-3 hover:text-ink-2`
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div ref={containerRef} className="h-[300px] w-full" />
      ) : (
        <p className="text-ink-3 py-24 text-center text-sm">Chart data unavailable.</p>
      )}
    </div>
  )
}
