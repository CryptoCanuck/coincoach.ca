import { NextResponse } from 'next/server'
import { getOhlc, TIMEFRAMES, type Timeframe } from '@/lib/markets/coins'

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
  const candles = await getOhlc(coin, frame as Timeframe)
  return NextResponse.json(candles, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
  })
}
