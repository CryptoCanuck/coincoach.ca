import { describe, it, expect } from 'vitest'
import { formatUsd, formatPercent, changeDirection } from './format'

describe('formatUsd', () => {
  it('formats large prices with thousands separators and no decimals', () => {
    expect(formatUsd(68420)).toBe('$68,420')
  })
  it('formats sub-dollar prices with up to 4 decimals', () => {
    expect(formatUsd(0.6234)).toBe('$0.6234')
  })
  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0.00')
  })
})

describe('formatPercent', () => {
  it('adds a + sign and 2 decimals for gains', () => {
    expect(formatPercent(2.1)).toBe('+2.10%')
  })
  it('keeps the - sign for losses', () => {
    expect(formatPercent(-0.8)).toBe('-0.80%')
  })
  it('treats null/undefined as 0', () => {
    expect(formatPercent(null)).toBe('+0.00%')
  })
})

describe('changeDirection', () => {
  it('returns up/down/flat', () => {
    expect(changeDirection(1.2)).toBe('up')
    expect(changeDirection(-0.1)).toBe('down')
    expect(changeDirection(0)).toBe('flat')
    expect(changeDirection(null)).toBe('flat')
  })
})
