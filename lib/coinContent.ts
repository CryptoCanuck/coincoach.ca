export interface CoinRef {
  id: string
  symbol: string
  name: string
}

// Posts whose `coins:` frontmatter references this coin's CoinGecko id, OR whose
// tags name the coin (by symbol or name). Input order is preserved (callers pass
// a date-sorted list); capped at `limit`. Match is case-insensitive.
export function relatedPostsForCoin<T extends { coins?: string[]; tags?: string[] }>(
  posts: T[],
  coin: CoinRef,
  limit = 6
): T[] {
  if (!Array.isArray(posts)) return []
  const id = coin.id.toLowerCase()
  const sym = coin.symbol.toLowerCase()
  const name = coin.name.toLowerCase()
  return posts
    .filter((p) => {
      const byCoins = (p.coins ?? []).some((c) => c.toLowerCase() === id)
      const byTag = (p.tags ?? []).some((t) => {
        const tag = t.toLowerCase()
        return tag === sym || tag === name
      })
      return byCoins || byTag
    })
    .slice(0, limit)
}
