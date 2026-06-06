import { getMovers } from '@/lib/markets/coingecko'
import MoversTabs from './MoversTabs'

// Top-100-by-market-cap movers. Fetch is server-side; the Gainers/Losers
// toggle is a thin client child so no market data is fetched in the browser.
export default async function Movers() {
  const { gainers, losers } = await getMovers()
  return <MoversTabs gainers={gainers} losers={losers} />
}
