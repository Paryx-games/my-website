INSERT INTO playtime.baselines (game_id, pc, mobile, console, universe_id) VALUES
  ('slap-battles', 4927, NULL, NULL, 2380077519),
  ('rise-of-nations', 703, NULL, NULL, 918677693),
  ('tower-defense-simulator', 3864, NULL, NULL, 1176784616)
ON CONFLICT DO NOTHING;
