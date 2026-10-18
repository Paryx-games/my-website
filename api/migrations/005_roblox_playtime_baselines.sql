-- Seed the current local playtime baselines for the newly added Roblox games.
INSERT INTO playtime.baselines (game_id, pc, mobile, console, universe_id) VALUES
('jujutsu-shenanigans', 2823, NULL, NULL, 3508322461),
('doors', 2064, NULL, NULL, 2440500124),
('the-strongest-battlegrounds', 4753, NULL, NULL, 3808081382),
('notoriety', 870, NULL, NULL, 16680835),
('blox-fruits', 10349, NULL, NULL, 994732206),
('scp-roleplay', 3798, NULL, NULL, 1742264997),
('car-crushers-2', 804, NULL, 2199, 274816972),
('cook-burgers', 2211, NULL, NULL, 1073273083),
('unseen-liminality', 862, NULL, NULL, 9885372266),
('apeirophobia', 1662, NULL, NULL, 3761186887),
('islands', 5043, NULL, NULL, 1659645941),
('bee-swarm-simulator', 3877, NULL, 11791, 601130232)
ON CONFLICT DO NOTHING;
