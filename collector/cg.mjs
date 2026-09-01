/**
 * Standalone CoinGecko client for the collector (the Next.js app uses
 * lib/markets/cgFetch.ts; this runs outside Next so it cannot share that
 * module's fetch-cache options). Every call is recorded in fetch_log, which
 * doubles as the budget meter and as the cadence source of truth in
 * collector_state.
 */
import { config } from './config.mjs'

const DEMO_BASE = 'https://api.coingecko.com/api/v3'
const PRO_BASE = 'https://pro-api.coingecko.com/api/v3'

function isPro() {
  return process.env.COINGECKO_API_PLAN?.toLowerCase() === 'pro'
}

function headers() {
  const key = process.env.COINGECKO_API_KEY
  if (!key) return {}
  return isPro() ? { 'x-cg-pro-api-key': key } : { 'x-cg-demo-api-key': key }
}

export class BudgetExceededError extends Error {
  constructor(used, max) {
    super(`CoinGecko budget reached: ${used}/${max} calls in the last 24h`)
    this.name = 'BudgetExceededError'
  }
}

async function assertBudget(pool) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS used FROM fetch_log
     WHERE fetched_at > now() - interval '24 hours' AND endpoint <> 'fng'`
  )
  if (rows[0].used >= config.maxCallsPerDay) {
    throw new BudgetExceededError(rows[0].used, config.maxCallsPerDay)
  }
}

async function logFetch(pool, endpoint, params, httpStatus, ok, durationMs) {
  await pool.query(
    `INSERT INTO fetch_log (endpoint, params, http_status, ok, duration_ms)
     VALUES ($1, $2, $3, $4, $5)`,
    [endpoint, params, httpStatus, ok, durationMs]
  )
}

/** GET a CoinGecko path. Returns parsed JSON or throws. */
export async function cgGet(pool, path, params = {}) {
  await assertBudget(pool)
  const qs = new URLSearchParams(params).toString()
  const url = `${isPro() ? PRO_BASE : DEMO_BASE}${path}${qs ? `?${qs}` : ''}`
  const started = Date.now()
  let res
  try {
    res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(20_000) })
  } catch (err) {
    await logFetch(pool, path, qs, null, false, Date.now() - started)
    throw new Error(`GET ${path} failed: ${err.message}`)
  }
  await logFetch(pool, path, qs, res.status, res.ok, Date.now() - started)
  if (!res.ok) throw new Error(`GET ${path} returned HTTP ${res.status}`)
  return res.json()
}

/** GET alternative.me Fear & Greed (keyless; logged but not budgeted). */
export async function fngGet(pool, limit) {
  const url = `https://api.alternative.me/fng/?limit=${limit}&format=json`
  const started = Date.now()
  let res
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  } catch (err) {
    await logFetch(pool, 'fng', `limit=${limit}`, null, false, Date.now() - started)
    throw new Error(`GET fng failed: ${err.message}`)
  }
  await logFetch(pool, 'fng', `limit=${limit}`, res.status, res.ok, Date.now() - started)
  if (!res.ok) throw new Error(`GET fng returned HTTP ${res.status}`)
  return res.json()
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
