-- Align only the current Steam totals' last-played timestamps with the local Steam profile.
UPDATE playtime.totals AS totals
SET updated_at = CASE totals.game_id
  WHEN 'satisfactory' THEN '2026-10-10T12:21:10Z'::timestamptz
  WHEN 'rainbow-six-siege' THEN '2026-11-05T22:40:34Z'::timestamptz
  WHEN 'forza-horizon-4' THEN '2026-06-24T15:41:49Z'::timestamptz
  WHEN 'beamng-drive' THEN '2026-09-07T15:35:20Z'::timestamptz
  WHEN 'geometry-dash' THEN '2026-10-04T10:43:38Z'::timestamptz
  WHEN 'halo-mcc' THEN '2026-08-02T19:36:11Z'::timestamptz
  WHEN 'escape-the-backrooms' THEN '2026-09-18T22:59:24Z'::timestamptz
  WHEN 'backrooms-escape-together' THEN '2026-08-05T14:08:38Z'::timestamptz
  WHEN 'bloons-td-6' THEN '2026-08-02T19:36:11Z'::timestamptz
  WHEN 'cities-skylines' THEN '2026-10-02T22:27:33Z'::timestamptz
  WHEN 'planet-coaster-2' THEN '2026-06-30T19:47:48Z'::timestamptz
  WHEN 'planet-zoo' THEN '2026-06-27T15:32:40Z'::timestamptz
  WHEN 'upload-labs' THEN '2026-08-02T21:09:51Z'::timestamptz
  WHEN 'sektori' THEN '2026-07-05T18:33:28Z'::timestamptz
END
WHERE totals.source = 'steam'
  AND totals.game_id IN (
    'satisfactory', 'rainbow-six-siege', 'forza-horizon-4', 'beamng-drive',
    'geometry-dash', 'halo-mcc', 'escape-the-backrooms',
    'backrooms-escape-together', 'bloons-td-6', 'cities-skylines',
    'planet-coaster-2', 'planet-zoo', 'upload-labs', 'sektori'
  );
