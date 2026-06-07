import Link from '@/components/Link'

// Shown when CoinGecko is temporarily unreachable / rate-limited (as opposed to a
// genuinely unknown coin, which 404s). Keeps the route alive so ISR can recover.
export default function MarketDataUnavailable({ label }: { label?: string }) {
  return (
    <div className="bg-surface border-line mt-6 rounded-[10px] border p-8 text-center">
      <h1 className="text-xl font-extrabold text-gray-50">
        {label
          ? `${label} data is temporarily unavailable`
          : 'Market data is temporarily unavailable'}
      </h1>
      <p className="text-ink-2 mx-auto mt-2 max-w-md text-sm">
        Live pricing is refreshing right now. Please try again in a moment.
      </p>
      <Link href="/charts" className="text-blue mt-5 inline-block text-sm font-semibold">
        ← Back to Markets
      </Link>
    </div>
  )
}
