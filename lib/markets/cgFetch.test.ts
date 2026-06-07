import { describe, it, expect, afterEach } from 'vitest'
import { cgHeaders, cgUrl } from './cgFetch'

const ORIGINAL = { ...process.env }
afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe('cgHeaders', () => {
  it('returns no auth header when no key is set', () => {
    delete process.env.COINGECKO_API_KEY
    expect(cgHeaders()).toEqual({})
  })
  it('sends the demo header by default when a key is set', () => {
    process.env.COINGECKO_API_KEY = 'CG-test'
    delete process.env.COINGECKO_API_PLAN
    expect(cgHeaders()).toEqual({ 'x-cg-demo-api-key': 'CG-test' })
  })
  it('sends the pro header when the plan is pro', () => {
    process.env.COINGECKO_API_KEY = 'CG-test'
    process.env.COINGECKO_API_PLAN = 'pro'
    expect(cgHeaders()).toEqual({ 'x-cg-pro-api-key': 'CG-test' })
  })
  it('treats the plan case-insensitively (PRO)', () => {
    process.env.COINGECKO_API_KEY = 'CG-test'
    process.env.COINGECKO_API_PLAN = 'PRO'
    expect(cgHeaders()).toEqual({ 'x-cg-pro-api-key': 'CG-test' })
  })
})

describe('cgUrl', () => {
  const url = 'https://api.coingecko.com/api/v3/global'
  it('leaves the public/demo host untouched', () => {
    delete process.env.COINGECKO_API_PLAN
    expect(cgUrl(url)).toBe(url)
  })
  it('rewrites the host to pro-api on the pro plan', () => {
    process.env.COINGECKO_API_PLAN = 'pro'
    expect(cgUrl(url)).toBe('https://pro-api.coingecko.com/api/v3/global')
  })
})
