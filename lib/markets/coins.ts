export interface ResourceLink {
  label: string
  href: string
}

export interface CoinDetail {
  id: string
  symbol: string
  name: string
  rank: number | null
  price: number
  change24h: number
  marketCap: number
  volume: number
  circulatingSupply: number
  maxSupply: number | null
  ath: number
  atl: number
  categories: string[]
  description: string
  links: ResourceLink[]
}

interface CoinGeckoCoin {
  id?: string
  symbol?: string
  name?: string
  market_cap_rank?: number | null
  categories?: (string | null)[]
  description?: { en?: string }
  links?: {
    homepage?: string[]
    whitepaper?: string
    blockchain_site?: string[]
    repos_url?: { github?: string[] }
    subreddit_url?: string
  }
  market_data?: {
    current_price?: { usd?: number }
    price_change_percentage_24h?: number
    market_cap?: { usd?: number }
    total_volume?: { usd?: number }
    circulating_supply?: number
    max_supply?: number | null
    ath?: { usd?: number }
    atl?: { usd?: number }
  }
}

const num = (v: unknown): number => (Number.isFinite(v) ? (v as number) : 0)

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mapCoinDetail(payload: CoinGeckoCoin): CoinDetail | null {
  if (!payload || typeof payload !== 'object' || !payload.id) return null
  const m = payload.market_data ?? {}
  const l = payload.links ?? {}

  const linkDefs: ResourceLink[] = [
    { label: 'Website', href: l.homepage?.[0] ?? '' },
    { label: 'Whitepaper', href: l.whitepaper ?? '' },
    { label: 'Explorer', href: l.blockchain_site?.[0] ?? '' },
    { label: 'GitHub', href: l.repos_url?.github?.[0] ?? '' },
    { label: 'Reddit', href: l.subreddit_url ?? '' },
  ]

  return {
    id: payload.id,
    symbol: (payload.symbol ?? '').toUpperCase(),
    name: payload.name ?? '',
    rank: Number.isFinite(payload.market_cap_rank) ? (payload.market_cap_rank as number) : null,
    price: num(m.current_price?.usd),
    change24h: num(m.price_change_percentage_24h),
    marketCap: num(m.market_cap?.usd),
    volume: num(m.total_volume?.usd),
    circulatingSupply: num(m.circulating_supply),
    maxSupply: Number.isFinite(m.max_supply) ? (m.max_supply as number) : null,
    ath: num(m.ath?.usd),
    atl: num(m.atl?.usd),
    categories: (payload.categories ?? []).filter((c): c is string => typeof c === 'string' && !!c),
    description: stripHtml(payload.description?.en ?? ''),
    links: linkDefs.filter((x) => x.href),
  }
}

// Server-side, ISR-cached (5 min). null on failure.
export async function getCoin(id: string): Promise<CoinDetail | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      id
    )}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    const res = await fetch(url, { next: { revalidate: 300 }, signal: controller.signal })
    if (!res.ok) return null
    return mapCoinDetail(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
