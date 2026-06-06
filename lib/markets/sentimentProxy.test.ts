import { describe, it, expect } from 'vitest'
import {
  sentimentScore,
  sentimentZone,
  volatilityLabel,
  valueDaysAgo,
  coinSentimentList,
} from './sentimentProxy'

describe('sentimentScore', () => {
  it('maps 0% change to neutral 50', () => {
    expect(sentimentScore(0)).toBe(50)
  })
  it('maps +12.5% to 100 and -12.5% to 0 (clamped)', () => {
    expect(sentimentScore(12.5)).toBe(100)
    expect(sentimentScore(-12.5)).toBe(0)
    expect(sentimentScore(40)).toBe(100)
    expect(sentimentScore(-40)).toBe(0)
  })
  it('rounds and handles non-finite input as neutral', () => {
    expect(sentimentScore(2.1)).toBe(58)
    // @ts-expect-error bad input
    expect(sentimentScore(undefined)).toBe(50)
  })
})

describe('sentimentZone', () => {
  it('returns the design label/colour per threshold', () => {
    expect(sentimentZone(80).label).toBe('Extreme Greed')
    expect(sentimentZone(60).label).toBe('Greed')
    expect(sentimentZone(40).label).toBe('Neutral')
    expect(sentimentZone(25).label).toBe('Fear')
    expect(sentimentZone(10).label).toBe('Extreme Fear')
    expect(sentimentZone(80).color).toBe('#7BC23A')
    expect(sentimentZone(10).color).toBe('#EB5E45')
  })
})

describe('volatilityLabel', () => {
  it('classifies by standard deviation of recent values', () => {
    expect(volatilityLabel([50, 50, 50, 50])).toBe('Low')
    expect(volatilityLabel([40, 50, 60, 50])).toBe('Medium')
    expect(volatilityLabel([10, 90, 20, 80])).toBe('High')
    expect(volatilityLabel([])).toBe('—')
  })
})

describe('valueDaysAgo', () => {
  const hist = [
    { value: 10, timestamp: 1 },
    { value: 20, timestamp: 2 },
    { value: 30, timestamp: 3 },
  ] // ascending; last = today
  it('reads back from the most recent point', () => {
    expect(valueDaysAgo(hist, 0)).toBe(30)
    expect(valueDaysAgo(hist, 1)).toBe(20)
    expect(valueDaysAgo(hist, 2)).toBe(10)
  })
  it('returns null when out of range or empty', () => {
    expect(valueDaysAgo(hist, 5)).toBeNull()
    expect(valueDaysAgo([], 0)).toBeNull()
  })
})

describe('coinSentimentList', () => {
  it('maps coins to scored rows, preserving order', () => {
    const coins = [
      { symbol: 'BTC', name: 'Bitcoin', price: 1, change24h: 5, image: '' },
      { symbol: 'ETH', name: 'Ethereum', price: 1, change24h: -2.5, image: '' },
    ]
    expect(coinSentimentList(coins, 5)).toEqual([
      { symbol: 'BTC', name: 'Bitcoin', score: 70 },
      { symbol: 'ETH', name: 'Ethereum', score: 40 },
    ])
  })
  it('respects the limit', () => {
    const coins = Array.from({ length: 12 }, (_, i) => ({
      symbol: `C${i}`,
      name: `Coin ${i}`,
      price: 1,
      change24h: 0,
      image: '',
    }))
    expect(coinSentimentList(coins, 8)).toHaveLength(8)
  })
})
