import { NextResponse } from 'next/server'
import { getOhlcResult, TIMEFRAMES, type Timeframe } from '@/lib/markets/coins'

// Same-origin endpoint the PriceChart calls to lazy-load a timeframe the server
// didn't prefetch. Keeps the coin page's initial server render down to one OHLC
// call (the default frame) instead of all four. CSP `connect-src 'self'` allows
// this because it's our own origin; the upstream CoinGecko call is keyed +
// ISR-cached inside getOhlc, so repeated requests don't burn the rate limit.
export async function GET(req: Request, { params }: { params: Promise<{ coin: string }> }) {
  const { coin } = await params
  const frame = new URL(req.url).searchParams.get('frame')
  if (!frame || !TIMEFRAMES.includes(frame as Timeframe)) {
    return NextResponse.json({ error: 'invalid frame' }, { status: 400 })
  }
  const result = await getOhlcResult(coin, frame as Timeframe)
  if (!result.ok) {
    // Transient CoinGecko outage — surface it (uncached) so the client shows a
    // retry state rather than caching an empty chart as a success.
    return NextResponse.json({ error: 'upstream unavailable' }, { status: 502 })
  }
  return NextResponse.json(result.candles, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
  })
}
