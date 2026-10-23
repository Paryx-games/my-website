CREATE TABLE playtime.roblox_games (
  collector_id text NOT NULL REFERENCES playtime.collectors(collector_id) ON DELETE CASCADE,
  universe_id text NOT NULL CHECK (universe_id ~ '^[1-9][0-9]{0,15}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  place_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(place_ids) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collector_id, universe_id)
);
