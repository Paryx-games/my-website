ALTER TABLE playtime.baselines
  ADD COLUMN IF NOT EXISTS pc_last_played_at timestamptz,
  ADD COLUMN IF NOT EXISTS mobile_last_played_at timestamptz,
  ADD COLUMN IF NOT EXISTS console_last_played_at timestamptz;

UPDATE playtime.baselines
SET pc_last_played_at = '2025-05-05T12:00:00Z'::timestamptz,
    console_last_played_at = '2024-09-22T12:00:00Z'::timestamptz
WHERE game_id = 'fortnite';

UPDATE playtime.baselines
SET pc_last_played_at = '2025-08-02T12:00:00Z'::timestamptz
WHERE game_id = 'among-us';

UPDATE playtime.baselines
SET console_last_played_at = '2024-12-06T12:00:00Z'::timestamptz
WHERE game_id = 'forza-horizon-5';

UPDATE playtime.baselines
SET console_last_played_at = '2024-07-14T12:00:00Z'::timestamptz
WHERE game_id = 'minecraft-dungeons';
