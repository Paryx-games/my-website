CREATE SCHEMA IF NOT EXISTS playtime;

CREATE TABLE IF NOT EXISTS playtime.collectors (
  collector_id text PRIMARY KEY,
  last_sequence bigint NOT NULL CHECK (last_sequence > 0),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playtime.totals (
  collector_id text NOT NULL REFERENCES playtime.collectors(collector_id),
  source text NOT NULL CHECK (source IN ('steam', 'modrinth', 'lunar')),
  game_id text NOT NULL,
  minutes bigint NOT NULL CHECK (minutes BETWEEN 0 AND 100000000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collector_id, source, game_id)
);
