-- Seed the current Oakridge Nuclear Power Station PC baseline.
INSERT INTO playtime.baselines (game_id, pc, mobile, console, universe_id)
VALUES ('oakridge-nuclear-power-station', 547, NULL, NULL, 5417936082)
ON CONFLICT DO NOTHING;
