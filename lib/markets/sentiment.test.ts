import { describe, it, expect } from 'vitest'
import { mapFearGreed, mapFearGreedHistory } from './sentiment'

describe('mapFearGreed', () => {
  it('maps the latest data point to a FearGreed value', () => {
    const sample = {
      data: [
        { value: '64', value_classification: 'Greed', timestamp: '1551157200' },
        { value: '40', value_classification: 'Fear', timestamp: '1551070800' },
      ],
    }
    expect(mapFearGreed(sample)).toEqual({ value: 64, label: 'Greed' })
  })
  it('returns null when there is no data', () => {
    // @ts-expect-error testing bad input
    expect(mapFearGreed(null)).toBeNull()
    expect(mapFearGreed({ data: [] })).toBeNull()
  })
  it('clamps the value to 0–100 and defaults a missing label', () => {
    expect(mapFearGreed({ data: [{ value: '150', value_classification: '' }] })).toEqual({
      value: 100,
      label: 'Neutral',
    })
  })
})

describe('mapFearGreedHistory', () => {
  it('maps and reverses to chronological ascending order', () => {
    const payload = {
      data: [
        { value: '64', value_classification: 'Greed', timestamp: '200' },
        { value: '40', value_classification: 'Fear', timestamp: '100' },
      ],
    }
    expect(mapFearGreedHistory(payload)).toEqual([
      { value: 40, timestamp: 100 },
      { value: 64, timestamp: 200 },
    ])
  })
  it('clamps values and drops non-numeric points', () => {
    const payload = {
      data: [
        { value: '150', value_classification: '', timestamp: '300' },
        { value: 'x', value_classification: '', timestamp: '250' },
      ],
    }
    expect(mapFearGreedHistory(payload)).toEqual([{ value: 100, timestamp: 300 }])
  })
  it('returns [] for malformed payloads', () => {
    // @ts-expect-error testing bad input
    expect(mapFearGreedHistory(null)).toEqual([])
    expect(mapFearGreedHistory({})).toEqual([])
  })
})
