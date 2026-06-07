import { slug } from 'github-slugger'

export interface Topic {
  slug: string
  label: string
  description: string
  // Tag slugs that map into this topic. A post belongs to the topic when any of
  // its (slugified) tags appears here.
  tags: string[]
  color: string
}

export const TOPICS: Topic[] = [
  {
    slug: 'bitcoin',
    label: 'Bitcoin',
    description: 'Bitcoin price action, ETFs, halving cycles and on-chain analysis.',
    tags: ['bitcoin', 'btc'],
    color: '#F2A024',
  },
  {
    slug: 'ethereum',
    label: 'Ethereum',
    description: 'Ethereum, smart contracts and the broader EVM ecosystem.',
    tags: ['ethereum', 'eth', 'smart-contracts'],
    color: '#3FA7DA',
  },
  {
    slug: 'defi',
    label: 'DeFi',
    description: 'Decentralized finance: DEXs, lending, yield and liquidity.',
    tags: ['defi', 'dex', 'yield', 'lending', 'liquidity'],
    color: '#7BC23A',
  },
  {
    slug: 'nfts',
    label: 'NFTs',
    description: 'NFTs, digital collectibles and on-chain art.',
    tags: ['nft', 'nfts', 'collectibles'],
    color: '#8B5CF6',
  },
  {
    slug: 'regulation',
    label: 'Regulation',
    description: 'Crypto law, policy, the SEC and global compliance.',
    tags: ['regulation', 'sec', 'policy', 'legal', 'compliance'],
    color: '#EB5E45',
  },
  {
    slug: 'etfs',
    label: 'ETFs',
    description: 'Spot crypto ETFs, fund flows and institutional access.',
    tags: ['etf', 'etfs', 'spot-etf'],
    color: '#F2A024',
  },
  {
    slug: 'stablecoins',
    label: 'Stablecoins',
    description: 'USDT, USDC and the mechanics of dollar-pegged crypto.',
    tags: ['stablecoin', 'stablecoins', 'usdt', 'usdc'],
    color: '#7BC23A',
  },
  {
    slug: 'layer-2',
    label: 'Layer 2',
    description: 'Rollups, scaling and Ethereum Layer 2 networks.',
    tags: ['layer-2', 'l2', 'rollups', 'scaling'],
    color: '#3FA7DA',
  },
  {
    slug: 'staking',
    label: 'Staking',
    description: 'Proof-of-stake, validators and earning yield by staking.',
    tags: ['staking', 'proof-of-stake', 'pos', 'validators'],
    color: '#7BC23A',
  },
  {
    slug: 'security',
    label: 'Wallets & Security',
    description: 'Wallets, self-custody, hardware and staying safe in crypto.',
    tags: ['wallets', 'hardware-wallet', 'security', 'custody', 'self-custody'],
    color: '#EB5E45',
  },
  {
    slug: 'mining',
    label: 'Mining',
    description: 'Bitcoin mining, hashrate and proof-of-work economics.',
    tags: ['mining', 'miners', 'hashrate'],
    color: '#F2A024',
  },
  {
    slug: 'basics',
    label: 'Crypto Basics',
    description: 'Beginner explainers and the fundamentals of crypto.',
    tags: ['basics', 'beginners', 'explainer', 'fundamentals'],
    color: '#3FA7DA',
  },
]

export function getTopic(s: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === s)
}

// Posts whose (slugified) tags intersect the topic's tag set. Input order is
// preserved (callers pass a date-sorted list).
export function postsForTopic<T extends { tags?: string[] }>(posts: T[], topic: Topic): T[] {
  if (!Array.isArray(posts)) return []
  const set = new Set(topic.tags)
  return posts.filter((p) => (p.tags ?? []).some((t) => set.has(slug(t))))
}
