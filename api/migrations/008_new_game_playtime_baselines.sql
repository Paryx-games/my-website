INSERT INTO playtime.baselines (game_id, pc, mobile, console, universe_id) VALUES
  ('fortnite', 43889, NULL, 6896, NULL),
  ('among-us', 2661, NULL, NULL, NULL),
  ('minecraft-dungeons', 0, NULL, 2989, NULL),
  ('forza-horizon-5', 0, NULL, 768, NULL),
  ('rocket-league', 693, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;
