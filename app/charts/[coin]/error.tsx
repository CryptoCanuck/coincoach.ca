'use client'

import MarketDataUnavailable from '@/components/MarketDataUnavailable'

// Error boundary for the coin detail route. The page throws on a transient
// CoinGecko outage so ISR keeps serving the last good page; for a cold (never
// cached) page this renders instead, with a retry that re-runs the render.
export default function CoinDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-7">
      <MarketDataUnavailable />
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => reset()}
          className="border-line bg-surface text-ink rounded-lg border px-4 py-2 text-sm font-semibold hover:text-gray-50"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
