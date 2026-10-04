DELETE FROM playtime.totals WHERE source NOT IN ('steam', 'modrinth');
ALTER TABLE playtime.totals DROP CONSTRAINT IF EXISTS totals_source_check;
ALTER TABLE playtime.totals ADD CONSTRAINT totals_source_check CHECK (source IN ('steam', 'modrinth'));
