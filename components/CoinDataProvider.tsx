'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Coin } from '@/lib/markets/coingecko'

// Carries the article's server-fetched coin data to inline <CoinCard> MDX nodes,
// so the card renders live prices without any client-side fetching (CSP-safe).
const CoinDataContext = createContext<Coin[]>([])

export function CoinDataProvider({ coins, children }: { coins: Coin[]; children: ReactNode }) {
  return <CoinDataContext.Provider value={coins}>{children}</CoinDataContext.Provider>
}

export function useCoinData(): Coin[] {
  return useContext(CoinDataContext)
}
