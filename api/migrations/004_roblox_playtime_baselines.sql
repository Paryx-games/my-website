ALTER TABLE playtime.totals DROP CONSTRAINT totals_source_check;
ALTER TABLE playtime.totals ADD CONSTRAINT totals_source_check CHECK (source IN ('steam', 'modrinth', 'roblox'));
ALTER TABLE playtime.total_history DROP CONSTRAINT total_history_source_check;
ALTER TABLE playtime.total_history ADD CONSTRAINT total_history_source_check CHECK (source IN ('steam', 'modrinth', 'roblox'));

CREATE TABLE playtime.baselines (
  game_id text PRIMARY KEY,
  pc bigint NOT NULL CHECK (pc >= 0),
  mobile bigint CHECK (mobile >= 0),
  console bigint CHECK (console >= 0),
  universe_id bigint UNIQUE CHECK (universe_id > 0)
);

-- Frozen from www/public/assets/games/game.json. New Roblox games need no migration.
INSERT INTO playtime.baselines (game_id, pc, mobile, console, universe_id) VALUES
('minecraft', 49671, NULL, 22606, NULL),
('satisfactory', 9298, NULL, NULL, NULL),
('rainbow-six-siege', 8376, NULL, NULL, NULL),
('forza-horizon-6', 0, NULL, 3405, NULL),
('forza-horizon-4', 1224, NULL, NULL, NULL),
('beamng-drive', 1831, NULL, NULL, NULL),
('geometry-dash', 771, 4874, NULL, NULL),
('halo-mcc', 82, NULL, NULL, NULL),
('escape-the-backrooms', 3920, NULL, NULL, NULL),
('backrooms-escape-together', 923, NULL, NULL, NULL),
('bloons-td-6', 340, 2350, NULL, NULL),
('roblox', 0, NULL, NULL, NULL),
('pressure', 14748, NULL, NULL, 4367208330),
('town', 15606, NULL, NULL, 1718755273),
('industrialist', 4408, NULL, NULL, 3448264866),
('build-a-boat-for-treasure', 4122, NULL, 243, 210851291),
('nuclear-blast-testing-facility', 2346, NULL, NULL, 27761886),
('a-core-game', 429, NULL, NULL, 2473499480);
