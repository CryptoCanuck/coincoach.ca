-- Market-data schema. See docs/market-data.md for the architecture and
-- collector cadences that feed these tables.
--
-- Conventions: coin ids are CoinGecko slugs ('bitcoin'); money/price columns
-- are unconstrained NUMERIC (SHIB-scale precision through BTC-scale caps);
-- times are timestamptz. The runner (db/migrate.mjs) wraps each file in a
-- transaction.

-- Distinguishes rows we observed live from rows seeded out of provider
-- history endpoints, so provider-licensed data can be managed (or deleted)
-- independently of our own recorded observations.
CREATE TYPE row_source AS ENUM ('observed', 'provider');

-- ===== Reference =====

CREATE TABLE coins (
  id text PRIMARY KEY,
  symbol text NOT NULL,
  name text NOT NULL,
  image_url text,
  market_cap_rank integer,
  asset_platform_id text,
  genesis_date date,
  hashing_algorithm text,
  block_time_minutes numeric,
  country_origin text,
  description_en text,
  homepage text,
  links jsonb,
  sentiment_votes_up_pct numeric,
  sentiment_votes_down_pct numeric,
  watchlist_users bigint,
  dev_data jsonb,
  community_data jsonb,
  -- Collection tier: 0 long-tail (cached on demand), 1 article coin, 2 top-250.
  tracked smallint NOT NULL DEFAULT 0,
  detail_refreshed_at timestamptz,
  -- Full /coins/{id} document (minus market_data) so no field is left behind.
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  -- Latest sector stats; history accumulates in category_ticks.
  market_cap numeric,
  market_cap_change_24h_pct numeric,
  volume_24h numeric,
  top_3_coins jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coin_categories (
  coin_id text NOT NULL REFERENCES coins (id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (coin_id, category_id)
);

CREATE TABLE exchanges (
  id text PRIMARY KEY,
  name text NOT NULL,
  image_url text,
  country text,
  year_established integer,
  url text,
  trust_score numeric,
  trust_score_rank integer,
  trade_volume_24h_btc numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Latest state (upserted every poll) =====

CREATE TABLE coin_markets_latest (
  coin_id text PRIMARY KEY REFERENCES coins (id) ON DELETE CASCADE,
  price_usd numeric,
  market_cap numeric,
  market_cap_rank integer,
  fully_diluted_valuation numeric,
  total_volume numeric,
  high_24h numeric,
  low_24h numeric,
  price_change_24h numeric,
  pct_change_1h numeric,
  pct_change_24h numeric,
  pct_change_7d numeric,
  pct_change_30d numeric,
  pct_change_1y numeric,
  market_cap_change_24h numeric,
  market_cap_change_pct_24h numeric,
  circulating_supply numeric,
  total_supply numeric,
  max_supply numeric,
  ath numeric,
  ath_change_pct numeric,
  ath_date timestamptz,
  atl numeric,
  atl_change_pct numeric,
  atl_date timestamptz,
  -- Hourly 7d series as returned by /coins/markets?sparkline=true.
  sparkline_7d jsonb,
  last_updated timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coin_markets_latest_rank_idx ON coin_markets_latest (market_cap_rank);

CREATE TABLE global_latest (
  -- Singleton row.
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  active_cryptocurrencies integer,
  markets integer,
  total_market_cap_usd numeric,
  total_volume_usd numeric,
  market_cap_change_pct_24h numeric,
  -- Full per-symbol market-cap percentage map from /global.
  dominance jsonb,
  defi_market_cap numeric,
  defi_volume_24h numeric,
  defi_dominance numeric,
  defi_to_eth_ratio numeric,
  defi_top_coin_name text,
  defi_top_coin_dominance numeric,
  updated_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Time series (append-only) =====

CREATE TABLE coin_ticks (
  coin_id text NOT NULL,
  ts timestamptz NOT NULL,
  price_usd numeric,
  market_cap numeric,
  volume_24h numeric,
  market_cap_rank integer,
  source row_source NOT NULL DEFAULT 'observed',
  PRIMARY KEY (coin_id, ts)
) PARTITION BY RANGE (ts);

-- Creates the monthly partition covering month_start if it does not exist.
-- Called below for the current and next month; collector housekeeping keeps
-- future months provisioned and backfill provisions past months.
CREATE FUNCTION ensure_coin_ticks_partition(month_start date) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF coin_ticks FOR VALUES FROM (%L) TO (%L)',
    'coin_ticks_' || to_char(month_start, 'YYYY_MM'),
    month_start,
    (month_start + interval '1 month')::date
  );
END
$$ LANGUAGE plpgsql;

SELECT ensure_coin_ticks_partition(date_trunc('month', now())::date);
SELECT ensure_coin_ticks_partition((date_trunc('month', now()) + interval '1 month')::date);

CREATE TABLE coin_candles (
  coin_id text NOT NULL,
  -- '30m' | '1h' | '4h' | '1d' (derived); provider /ohlc frames map to
  -- 30m/4h/4d depending on range.
  candle_interval text NOT NULL,
  bucket_ts timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  -- Provider OHLC has no volume; derived candles carry avg 24h volume.
  volume numeric,
  source row_source NOT NULL DEFAULT 'observed',
  PRIMARY KEY (coin_id, candle_interval, bucket_ts)
);

CREATE TABLE global_ticks (
  ts timestamptz PRIMARY KEY,
  total_market_cap_usd numeric,
  total_volume_usd numeric,
  btc_dominance numeric,
  eth_dominance numeric,
  defi_market_cap numeric,
  defi_volume_24h numeric
);

CREATE TABLE category_ticks (
  category_id text NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  market_cap numeric,
  volume_24h numeric,
  market_cap_change_24h_pct numeric,
  PRIMARY KEY (category_id, ts)
);

CREATE TABLE fear_greed (
  day date PRIMARY KEY,
  value smallint NOT NULL,
  classification text NOT NULL
);

CREATE TABLE trending_entries (
  captured_at timestamptz NOT NULL,
  position smallint NOT NULL,
  coin_id text NOT NULL,
  name text,
  symbol text,
  thumb text,
  market_cap_rank integer,
  price_usd numeric,
  market_cap_usd numeric,
  volume_24h_usd numeric,
  pct_change_24h_usd numeric,
  PRIMARY KEY (captured_at, position)
);

-- ===== Per-coin auxiliary =====

CREATE TABLE coin_tickers (
  coin_id text NOT NULL REFERENCES coins (id) ON DELETE CASCADE,
  exchange_id text NOT NULL,
  exchange_name text,
  base text NOT NULL,
  target text NOT NULL,
  last_usd numeric,
  volume_usd numeric,
  spread_pct numeric,
  depth_up_usd numeric,
  depth_down_usd numeric,
  -- CoinGecko reports ticker trust as a colour ('green'/'yellow'/'red').
  trust_score text,
  trade_url text,
  is_anomaly boolean,
  is_stale boolean,
  last_traded_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coin_id, exchange_id, base, target)
);

CREATE TABLE treasury_totals (
  coin_id text PRIMARY KEY,
  total_holdings numeric,
  total_value_usd numeric,
  market_cap_dominance numeric,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE treasury_holdings (
  coin_id text NOT NULL,
  company_symbol text NOT NULL,
  name text NOT NULL,
  country text,
  total_holdings numeric,
  total_entry_value_usd numeric,
  total_current_value_usd numeric,
  pct_of_supply numeric,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coin_id, company_symbol)
);

-- ===== Ops =====

-- One row per collector job; lets cadences survive container restarts so a
-- restart loop cannot burn the daily API budget re-running daily jobs.
CREATE TABLE collector_state (
  job text PRIMARY KEY,
  last_run timestamptz,
  last_ok timestamptz,
  last_error text
);

CREATE TABLE fetch_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint text NOT NULL,
  params text,
  http_status integer,
  ok boolean NOT NULL,
  duration_ms integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fetch_log_fetched_at_idx ON fetch_log (fetched_at);
