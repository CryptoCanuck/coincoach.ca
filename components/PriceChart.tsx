'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Candle, Timeframe } from '@/lib/markets/coins'

export default function PriceChart({
  coinId,
  data,
  frames,
  initialFrame,
}: {
  coinId: string
  // Seeded with only the default frame's candles; other frames are fetched on demand.
  data: Record<string, Candle[]>
  frames: Timeframe[]
  initialFrame: Timeframe
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const [byFrame, setByFrame] = useState<Record<string, Candle[]>>(data)
  const [frame, setFrame] = useState<Timeframe>(initialFrame)
  const [loadingFrame, setLoadingFrame] = useState<Timeframe | null>(null)
  const [erroredFrame, setErroredFrame] = useState<Timeframe | null>(null)
  const inflightRef = useRef<Set<Timeframe>>(new Set())

  const current = useMemo(() => byFrame[frame] ?? [], [byFrame, frame])
  const hasCurrent = current.length > 0
  const isLoading = loadingFrame === frame && !hasCurrent
  const isErrored = erroredFrame === frame && !hasCurrent

  const selectFrame = useCallback(
    (f: Timeframe) => {
      setFrame(f)
      // Already have it (default frame or a previously fetched one), or a request
      // for it is already in flight → just switch, don't refetch.
      if (byFrame[f] || inflightRef.current.has(f)) return
      inflightRef.current.add(f)
      setLoadingFrame(f)
      setErroredFrame(null)
      // Trailing slash: the site uses trailingSlash, so this avoids a 308 hop.
      fetch(`/api/ohlc/${encodeURIComponent(coinId)}/?frame=${f}`)
        .then((res) => {
          if (!res.ok) throw new Error('bad status')
          return res.json()
        })
        .then((candles: Candle[]) => {
          setByFrame((m) => ({ ...m, [f]: candles }))
        })
        .catch(() => setErroredFrame(f))
        .finally(() => {
          inflightRef.current.delete(f)
          setLoadingFrame((cur) => (cur === f ? null : cur))
        })
    },
    [coinId, byFrame]
  )

  // Create the chart once.
  useEffect(() => {
    if (!containerRef.current) return
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
  }, [])

  // Push the current frame's candles to the chart whenever they change.
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    series.setData(current.map((c) => ({ ...c, time: c.time as UTCTimestamp })))
    chartRef.current?.timeScale().fitContent()
  }, [current])

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
              onClick={() => selectFrame(f)}
              className={
                frame === f
                  ? `${chipBase} bg-fill text-gray-50`
                  : `${chipBase} text-ink-3 hover:text-ink-2`
              }
            >
              {f}
              {loadingFrame === f ? <span className="text-ink-3 ml-1 animate-pulse">·</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[300px] w-full">
        <div ref={containerRef} className="h-full w-full" />
        {!hasCurrent && (
          <p className="text-ink-3 absolute inset-0 flex items-center justify-center text-center text-sm">
            {isLoading
              ? 'Loading chart…'
              : isErrored
                ? 'Could not load this range.'
                : 'Chart data unavailable.'}
          </p>
        )}
      </div>
    </div>
  )
}
