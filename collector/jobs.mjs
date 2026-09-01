/**
 * Collector jobs. Each takes the shared pg pool, fetches one upstream feed,
 * and writes typed rows (see db/migrations/0001_init.sql). Multi-row writes go
 * through jsonb_to_recordset so each job is a handful of statements.
 */
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { config } from './config.mjs'
import { cgGet, fngGet, sleep } from './cg.mjs'

/** "$306,418,360" → 306418360 (trending reports money as display strings). */
function money(s) {
  if (s == null) return null
  const n = Number(String(s).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : null
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Scan blog frontmatter for `coins: ['slug', ...]` and mark them tracked. */
export async function articleCoins(pool) {
  const files = (await readdir(config.blogDir)).filter((f) => f.endsWith('.mdx'))
  const slugs = new Set()
  for (const file of files) {
    const raw = await readFile(path.join(config.blogDir, file), 'utf8')
    const m = raw.match(/^coins:\s*\[(.*)\]\s*$/m)
    if (!m) continue
    for (const part of m[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
      slugs.add(part[1] ?? part[2])
    }
  }
  if (!slugs.size) return 'no article coins found'
  // Placeholder symbol/name; the markets and detail jobs overwrite them.
  await pool.query(
    `INSERT INTO coins (id, symbol, name, tracked)
     SELECT s, s, s, 1 FROM unnest($1::text[]) AS s
     ON CONFLICT (id) DO UPDATE SET tracked = GREATEST(coins.tracked, 1)`,
    [[...slugs]]
  )
  return `${slugs.size} article coins tracked`
}

/** Top-250 markets snapshot → coins stubs, coin_markets_latest, coin_ticks. */
export async function markets(pool) {
  const data = await cgGet(pool, '/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: String(config.topCoinsPerPage),
    page: '1',
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d,30d,1y',
  })
  const ts = new Date().toISOString()
  const rows = JSON.stringify(
    data.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      rank: c.market_cap_rank,
      price: num(c.current_price),
      mcap: num(c.market_cap),
      fdv: num(c.fully_diluted_valuation),
      vol: num(c.total_volume),
      high: num(c.high_24h),
      low: num(c.low_24h),
      chg: num(c.price_change_24h),
      p1h: num(c.price_change_percentage_1h_in_currency),
      p24h: num(c.price_change_percentage_24h_in_currency),
      p7d: num(c.price_change_percentage_7d_in_currency),
      p30d: num(c.price_change_percentage_30d_in_currency),
      p1y: num(c.price_change_percentage_1y_in_currency),
      mc24: num(c.market_cap_change_24h),
      mcp24: num(c.market_cap_change_percentage_24h),
      circ: num(c.circulating_supply),
      total: num(c.total_supply),
      max: num(c.max_supply),
      ath: num(c.ath),
      athp: num(c.ath_change_percentage),
      athd: c.ath_date,
      atl: num(c.atl),
      atlp: num(c.atl_change_percentage),
      atld: c.atl_date,
      spark: c.sparkline_in_7d?.price ?? null,
      upd: c.last_updated,
    }))
  )
  await pool.query(
    `INSERT INTO coins (id, symbol, name, image_url, market_cap_rank)
     SELECT r.id, r.symbol, r.name, r.image, r.rank
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, symbol text, name text, image text, rank int)
     ON CONFLICT (id) DO UPDATE SET symbol = EXCLUDED.symbol, name = EXCLUDED.name,
       image_url = EXCLUDED.image_url, market_cap_rank = EXCLUDED.market_cap_rank,
       updated_at = now()`,
    [rows]
  )
  await pool.query(
    `INSERT INTO coin_markets_latest (
       coin_id, price_usd, market_cap, market_cap_rank, fully_diluted_valuation,
       total_volume, high_24h, low_24h, price_change_24h,
       pct_change_1h, pct_change_24h, pct_change_7d, pct_change_30d, pct_change_1y,
       market_cap_change_24h, market_cap_change_pct_24h,
       circulating_supply, total_supply, max_supply,
       ath, ath_change_pct, ath_date, atl, atl_change_pct, atl_date,
       sparkline_7d, last_updated, fetched_at)
     SELECT r.id, r.price, r.mcap, r.rank, r.fdv, r.vol, r.high, r.low, r.chg,
       r.p1h, r.p24h, r.p7d, r.p30d, r.p1y, r.mc24, r.mcp24,
       r.circ, r.total, r.max,
       r.ath, r.athp, r.athd, r.atl, r.atlp, r.atld,
       r.spark, r.upd, now()
     FROM jsonb_to_recordset($1::jsonb) AS r(
       id text, price numeric, mcap numeric, rank int, fdv numeric, vol numeric,
       high numeric, low numeric, chg numeric,
       p1h numeric, p24h numeric, p7d numeric, p30d numeric, p1y numeric,
       mc24 numeric, mcp24 numeric, circ numeric, total numeric, max numeric,
       ath numeric, athp numeric, athd timestamptz,
       atl numeric, atlp numeric, atld timestamptz,
       spark jsonb, upd timestamptz)
     ON CONFLICT (coin_id) DO UPDATE SET
       price_usd = EXCLUDED.price_usd, market_cap = EXCLUDED.market_cap,
       market_cap_rank = EXCLUDED.market_cap_rank,
       fully_diluted_valuation = EXCLUDED.fully_diluted_valuation,
       total_volume = EXCLUDED.total_volume, high_24h = EXCLUDED.high_24h,
       low_24h = EXCLUDED.low_24h, price_change_24h = EXCLUDED.price_change_24h,
       pct_change_1h = EXCLUDED.pct_change_1h, pct_change_24h = EXCLUDED.pct_change_24h,
       pct_change_7d = EXCLUDED.pct_change_7d, pct_change_30d = EXCLUDED.pct_change_30d,
       pct_change_1y = EXCLUDED.pct_change_1y,
       market_cap_change_24h = EXCLUDED.market_cap_change_24h,
       market_cap_change_pct_24h = EXCLUDED.market_cap_change_pct_24h,
       circulating_supply = EXCLUDED.circulating_supply,
       total_supply = EXCLUDED.total_supply, max_supply = EXCLUDED.max_supply,
       ath = EXCLUDED.ath, ath_change_pct = EXCLUDED.ath_change_pct,
       ath_date = EXCLUDED.ath_date, atl = EXCLUDED.atl,
       atl_change_pct = EXCLUDED.atl_change_pct, atl_date = EXCLUDED.atl_date,
       sparkline_7d = EXCLUDED.sparkline_7d, last_updated = EXCLUDED.last_updated,
       fetched_at = now()`,
    [rows]
  )
  await pool.query(
    `INSERT INTO coin_ticks (coin_id, ts, price_usd, market_cap, volume_24h, market_cap_rank)
     SELECT r.id, $2::timestamptz, r.price, r.mcap, r.vol, r.rank
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, price numeric, mcap numeric, vol numeric, rank int)
     ON CONFLICT DO NOTHING`,
    [rows, ts]
  )
  return `${data.length} coins`
}

/** /global + /global/decentralized_finance_defi → global_latest, global_ticks. */
export async function global(pool) {
  const g = (await cgGet(pool, '/global')).data
  const d = (await cgGet(pool, '/global/decentralized_finance_defi')).data
  const args = [
    g.active_cryptocurrencies ?? null,
    g.markets ?? null,
    num(g.total_market_cap?.usd),
    num(g.total_volume?.usd),
    num(g.market_cap_change_percentage_24h_usd),
    JSON.stringify(g.market_cap_percentage ?? {}),
    money(d.defi_market_cap),
    money(d.trading_volume_24h),
    money(d.defi_dominance),
    money(d.defi_to_eth_ratio),
    d.top_coin_name ?? null,
    num(d.top_coin_defi_dominance),
    g.updated_at ? new Date(g.updated_at * 1000).toISOString() : null,
  ]
  await pool.query(
    `INSERT INTO global_latest (id, active_cryptocurrencies, markets,
       total_market_cap_usd, total_volume_usd, market_cap_change_pct_24h, dominance,
       defi_market_cap, defi_volume_24h, defi_dominance, defi_to_eth_ratio,
       defi_top_coin_name, defi_top_coin_dominance, updated_at, fetched_at)
     VALUES (true, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
     ON CONFLICT (id) DO UPDATE SET
       active_cryptocurrencies = EXCLUDED.active_cryptocurrencies,
       markets = EXCLUDED.markets,
       total_market_cap_usd = EXCLUDED.total_market_cap_usd,
       total_volume_usd = EXCLUDED.total_volume_usd,
       market_cap_change_pct_24h = EXCLUDED.market_cap_change_pct_24h,
       dominance = EXCLUDED.dominance,
       defi_market_cap = EXCLUDED.defi_market_cap,
       defi_volume_24h = EXCLUDED.defi_volume_24h,
       defi_dominance = EXCLUDED.defi_dominance,
       defi_to_eth_ratio = EXCLUDED.defi_to_eth_ratio,
       defi_top_coin_name = EXCLUDED.defi_top_coin_name,
       defi_top_coin_dominance = EXCLUDED.defi_top_coin_dominance,
       updated_at = EXCLUDED.updated_at, fetched_at = now()`,
    args
  )
  await pool.query(
    `INSERT INTO global_ticks (ts, total_market_cap_usd, total_volume_usd,
       btc_dominance, eth_dominance, defi_market_cap, defi_volume_24h)
     VALUES (now(), $1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [
      num(g.total_market_cap?.usd),
      num(g.total_volume?.usd),
      num(g.market_cap_percentage?.btc),
      num(g.market_cap_percentage?.eth),
      money(d.defi_market_cap),
      money(d.trading_volume_24h),
    ]
  )
  return 'ok'
}

/** /search/trending → trending_entries snapshot. */
export async function trending(pool) {
  const data = await cgGet(pool, '/search/trending')
  const rows = JSON.stringify(
    (data.coins ?? []).map((c, i) => ({
      position: i + 1,
      coin_id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol,
      thumb: c.item.thumb,
      rank: c.item.market_cap_rank ?? null,
      price: num(c.item.data?.price),
      mcap: money(c.item.data?.market_cap),
      vol: money(c.item.data?.total_volume),
      pct24: num(c.item.data?.price_change_percentage_24h?.usd),
    }))
  )
  await pool.query(
    `INSERT INTO trending_entries (captured_at, position, coin_id, name, symbol,
       thumb, market_cap_rank, price_usd, market_cap_usd, volume_24h_usd, pct_change_24h_usd)
     SELECT now(), r.position, r.coin_id, r.name, r.symbol, r.thumb, r.rank,
       r.price, r.mcap, r.vol, r.pct24
     FROM jsonb_to_recordset($1::jsonb) AS r(position smallint, coin_id text,
       name text, symbol text, thumb text, rank int, price numeric, mcap numeric,
       vol numeric, pct24 numeric)`,
    [rows]
  )
  return `${(data.coins ?? []).length} entries`
}

/** /coins/categories → categories upsert + category_ticks. */
export async function categories(pool) {
  const data = await cgGet(pool, '/coins/categories', { order: 'market_cap_desc' })
  const rows = JSON.stringify(
    data.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.content || null,
      mcap: num(c.market_cap),
      mcap_chg: num(c.market_cap_change_24h),
      vol: num(c.volume_24h),
      top3: { ids: c.top_3_coins_id ?? [], images: c.top_3_coins ?? [] },
      upd: c.updated_at,
    }))
  )
  await pool.query(
    `INSERT INTO categories (id, name, description, market_cap,
       market_cap_change_24h_pct, volume_24h, top_3_coins, updated_at)
     SELECT r.id, r.name, r.description, r.mcap, r.mcap_chg, r.vol, r.top3, now()
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, name text, description text,
       mcap numeric, mcap_chg numeric, vol numeric, top3 jsonb)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
       description = COALESCE(EXCLUDED.description, categories.description),
       market_cap = EXCLUDED.market_cap,
       market_cap_change_24h_pct = EXCLUDED.market_cap_change_24h_pct,
       volume_24h = EXCLUDED.volume_24h, top_3_coins = EXCLUDED.top_3_coins,
       updated_at = now()`,
    [rows]
  )
  await pool.query(
    `INSERT INTO category_ticks (category_id, ts, market_cap, volume_24h, market_cap_change_24h_pct)
     SELECT r.id, now(), r.mcap, r.vol, r.mcap_chg
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, mcap numeric, vol numeric, mcap_chg numeric)
     WHERE r.mcap IS NOT NULL
     ON CONFLICT DO NOTHING`,
    [rows]
  )
  return `${data.length} categories`
}

/** alternative.me Fear & Greed; full history on first run, then top-up. */
export async function fearGreed(pool) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM fear_greed')
  const limit = rows[0].n === 0 ? 0 : 3
  const data = await fngGet(pool, limit)
  const entries = (data.data ?? []).map((e) => ({
    day: new Date(Number(e.timestamp) * 1000).toISOString().slice(0, 10),
    value: Number(e.value),
    classification: e.value_classification,
  }))
  await pool.query(
    `INSERT INTO fear_greed (day, value, classification)
     SELECT r.day, r.value, r.classification
     FROM jsonb_to_recordset($1::jsonb) AS r(day date, value smallint, classification text)
     ON CONFLICT (day) DO UPDATE SET value = EXCLUDED.value,
       classification = EXCLUDED.classification`,
    [JSON.stringify(entries)]
  )
  return `${entries.length} days`
}

/** /coins/{id}/tickers for tracked coins → coin_tickers (replace per coin). */
export async function tickers(pool) {
  const { rows: coins } = await pool.query(
    'SELECT id FROM coins WHERE tracked >= 1 ORDER BY market_cap_rank NULLS LAST'
  )
  let done = 0
  for (const { id } of coins) {
    const data = await cgGet(pool, `/coins/${id}/tickers`, {
      order: 'trust_score_desc',
      depth: 'true',
    })
    const list = (data.tickers ?? []).slice(0, config.tickersPerCoin).map((t) => ({
      exchange_id: t.market?.identifier ?? 'unknown',
      exchange_name: t.market?.name ?? null,
      base: t.base,
      target: t.target,
      last_usd: num(t.converted_last?.usd),
      volume_usd: num(t.converted_volume?.usd),
      spread_pct: num(t.bid_ask_spread_percentage),
      depth_up: num(t.cost_to_move_up_usd),
      depth_down: num(t.cost_to_move_down_usd),
      trust: t.trust_score ?? null,
      url: t.trade_url ?? null,
      anomaly: t.is_anomaly ?? null,
      stale: t.is_stale ?? null,
      traded: t.last_traded_at ?? null,
    }))
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM coin_tickers WHERE coin_id = $1', [id])
      await client.query(
        `INSERT INTO coin_tickers (coin_id, exchange_id, exchange_name, base, target,
           last_usd, volume_usd, spread_pct, depth_up_usd, depth_down_usd,
           trust_score, trade_url, is_anomaly, is_stale, last_traded_at)
         SELECT $2, r.exchange_id, r.exchange_name, r.base, r.target, r.last_usd,
           r.volume_usd, r.spread_pct, r.depth_up, r.depth_down, r.trust, r.url,
           r.anomaly, r.stale, r.traded
         FROM jsonb_to_recordset($1::jsonb) AS r(exchange_id text, exchange_name text,
           base text, target text, last_usd numeric, volume_usd numeric,
           spread_pct numeric, depth_up numeric, depth_down numeric, trust text,
           url text, anomaly boolean, stale boolean, traded timestamptz)
         ON CONFLICT (coin_id, exchange_id, base, target) DO NOTHING`,
        [JSON.stringify(list), id]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    done++
    await sleep(config.pacingMs)
  }
  return `${done} coins`
}

/** /coins/{id} profile refresh for the stalest tracked/top coins. */
export async function detail(pool) {
  const { rows: due } = await pool.query(
    `SELECT id FROM coins WHERE tracked >= 1 OR market_cap_rank <= 100
     ORDER BY detail_refreshed_at NULLS FIRST LIMIT $1`,
    [config.detailCoinsPerRun]
  )
  for (const { id } of due) {
    const c = await cgGet(pool, `/coins/${id}`, {
      localization: 'false',
      tickers: 'false',
      market_data: 'false',
      community_data: 'true',
      developer_data: 'true',
    })
    await pool.query(
      `UPDATE coins SET
         symbol = COALESCE($2, symbol), name = COALESCE($3, name),
         image_url = COALESCE($4, image_url),
         asset_platform_id = $5, genesis_date = $6, hashing_algorithm = $7,
         block_time_minutes = $8, country_origin = $9, description_en = $10,
         homepage = $11, links = $12, sentiment_votes_up_pct = $13,
         sentiment_votes_down_pct = $14, watchlist_users = $15,
         dev_data = $16, community_data = $17, raw = $18,
         detail_refreshed_at = now(), updated_at = now()
       WHERE id = $1`,
      [
        id,
        c.symbol ?? null,
        c.name ?? null,
        c.image?.large ?? null,
        c.asset_platform_id ?? null,
        c.genesis_date || null,
        c.hashing_algorithm ?? null,
        num(c.block_time_in_minutes),
        c.country_origin || null,
        c.description?.en || null,
        c.links?.homepage?.[0] || null,
        JSON.stringify(c.links ?? {}),
        num(c.sentiment_votes_up_percentage),
        num(c.sentiment_votes_down_percentage),
        num(c.watchlist_portfolio_users),
        JSON.stringify(c.developer_data ?? {}),
        JSON.stringify(c.community_data ?? {}),
        JSON.stringify(c),
      ]
    )
    // Rebuild this coin's category links each refresh — delete unconditionally
    // so a coin that has lost all its categories is cleared too.
    await pool.query('DELETE FROM coin_categories WHERE coin_id = $1', [id])
    if (Array.isArray(c.categories) && c.categories.length) {
      // Coin detail lists category display names; map them via categories.name.
      await pool.query(
        `INSERT INTO coin_categories (coin_id, category_id)
         SELECT $1, id FROM categories WHERE name = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [id, c.categories]
      )
    }
    await sleep(config.pacingMs)
  }
  return `${due.length} coins`
}

/** /companies/public_treasury for BTC + ETH. */
export async function treasury(pool) {
  for (const id of ['bitcoin', 'ethereum']) {
    const data = await cgGet(pool, `/companies/public_treasury/${id}`)
    await pool.query(
      `INSERT INTO treasury_totals (coin_id, total_holdings, total_value_usd, market_cap_dominance, fetched_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (coin_id) DO UPDATE SET total_holdings = EXCLUDED.total_holdings,
         total_value_usd = EXCLUDED.total_value_usd,
         market_cap_dominance = EXCLUDED.market_cap_dominance, fetched_at = now()`,
      [id, num(data.total_holdings), num(data.total_value_usd), num(data.market_cap_dominance)]
    )
    const rows = JSON.stringify(
      (data.companies ?? []).map((co) => ({
        symbol: co.symbol || co.name,
        name: co.name,
        country: co.country ?? null,
        holdings: num(co.total_holdings),
        entry: num(co.total_entry_value_usd),
        current: num(co.total_current_value_usd),
        pct: num(co.percentage_of_total_supply),
      }))
    )
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM treasury_holdings WHERE coin_id = $1', [id])
      await client.query(
        `INSERT INTO treasury_holdings (coin_id, company_symbol, name, country,
           total_holdings, total_entry_value_usd, total_current_value_usd, pct_of_supply)
         SELECT $2, r.symbol, r.name, r.country, r.holdings, r.entry, r.current, r.pct
         FROM jsonb_to_recordset($1::jsonb) AS r(symbol text, name text, country text,
           holdings numeric, entry numeric, current numeric, pct numeric)
         ON CONFLICT (coin_id, company_symbol) DO NOTHING`,
        [rows, id]
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    await sleep(config.pacingMs)
  }
  return 'btc + eth'
}

/** /exchanges reference data. */
export async function exchanges(pool) {
  const data = await cgGet(pool, '/exchanges', { per_page: '250' })
  await pool.query(
    `INSERT INTO exchanges (id, name, image_url, country, year_established, url,
       trust_score, trust_score_rank, trade_volume_24h_btc, updated_at)
     SELECT r.id, r.name, r.image, r.country, r.year, r.url, r.trust, r.trust_rank, r.vol, now()
     FROM jsonb_to_recordset($1::jsonb) AS r(id text, name text, image text,
       country text, year int, url text, trust numeric, trust_rank int, vol numeric)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url,
       country = EXCLUDED.country, year_established = EXCLUDED.year_established,
       url = EXCLUDED.url, trust_score = EXCLUDED.trust_score,
       trust_score_rank = EXCLUDED.trust_score_rank,
       trade_volume_24h_btc = EXCLUDED.trade_volume_24h_btc, updated_at = now()`,
    [
      JSON.stringify(
        data.map((e) => ({
          id: e.id,
          name: e.name,
          image: e.image ?? null,
          country: e.country ?? null,
          year: e.year_established ?? null,
          url: e.url ?? null,
          trust: num(e.trust_score),
          trust_rank: e.trust_score_rank ?? null,
          vol: num(e.trade_volume_24h_btc),
        }))
      ),
    ]
  )
  return `${data.length} exchanges`
}

/** DB-only: roll up observed ticks into 1h and 1d candles. */
export async function candles(pool) {
  const rollup = async (interval, trunc, lookback) =>
    pool.query(
      `INSERT INTO coin_candles (coin_id, candle_interval, bucket_ts, open, high, low, close, volume, source)
       SELECT coin_id, $1, date_trunc($2, ts),
         (array_agg(price_usd ORDER BY ts ASC))[1],
         max(price_usd), min(price_usd),
         (array_agg(price_usd ORDER BY ts DESC))[1],
         avg(volume_24h), 'observed'
       FROM coin_ticks
       WHERE ts >= now() - $3::interval AND source = 'observed' AND price_usd IS NOT NULL
       GROUP BY coin_id, date_trunc($2, ts)
       ON CONFLICT (coin_id, candle_interval, bucket_ts) DO UPDATE SET
         open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
         close = EXCLUDED.close, volume = EXCLUDED.volume
       WHERE coin_candles.source = 'observed'`,
      [interval, trunc, lookback]
    )
  const h = await rollup('1h', 'hour', '26 hours')
  const d = await rollup('1d', 'day', '3 days')
  return `${h.rowCount} hourly, ${d.rowCount} daily`
}

/** DB-only: provision upcoming tick partitions; prune fetch_log. */
export async function housekeeping(pool) {
  await pool.query(
    `SELECT ensure_coin_ticks_partition((date_trunc('month', now()) + (n || ' month')::interval)::date)
     FROM generate_series(0, 2) AS n`
  )
  const pruned = await pool.query(
    `DELETE FROM fetch_log WHERE fetched_at < now() - interval '30 days'`
  )
  return `pruned ${pruned.rowCount} log rows`
}
