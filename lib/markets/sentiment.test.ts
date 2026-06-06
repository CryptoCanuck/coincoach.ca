import { describe, it, expect } from 'vitest'
import { mapFearGreed } from './sentiment'

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
