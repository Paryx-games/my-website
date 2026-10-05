CREATE SCHEMA IF NOT EXISTS roblox;
CREATE TABLE roblox.stats_cache (
  id integer PRIMARY KEY CHECK (id = 1),
  payload jsonb,
  fetched_at timestamptz,
  lease_token text,
  lease_until timestamptz
);
INSERT INTO roblox.stats_cache (id) VALUES (1);
