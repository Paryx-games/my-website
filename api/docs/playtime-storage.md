# Playtime storage

The API stores cumulative counters per collector, source, and game. Steam uses lifetime minutes, Modrinth supplies Minecraft lifetime minutes, and the Roblox tracker supplies minutes accumulated since tracking began. Uploads remain authenticated, sequence ordered, monotonic, and safe to retry.

## Frozen baseline

`www/public/assets/games/game.json` remains the unchanged fallback. Migration `004_roblox_playtime_baselines.sql` seeds `playtime.baselines` from its numeric PC, mobile, and console values. `api/data/playtime-baseline.json` records that snapshot for verification. Do not refresh this snapshot when adding a catalogue game.

Roblox PC totals are baseline minutes plus tracked minutes. Steam and Minecraft PC totals use the greater of the baseline and the launcher lifetime total. Minecraft's existing 30,000-minute launcher estimate is included on the server. Mobile and console baselines are returned without modification. The Roblox platform total sums the tracked experiences and their known baselines; it is not a complete historical account total.

GET responses use version 2 because PC minutes already include the baseline. The browser accepts versions 1 and 2, applying the old Minecraft adjustment only to version 1. Deploy the website and API together. Older website builds retain their frozen fallback when they encounter version 2.

## Adding Roblox games

The tracker records every universe without a game allowlist or title lookup. Upload `source: "roblox"`, the numeric universe ID as a string in `gameId`, and cumulative whole `minutes`. Unlisted universes remain stored and are returned under `roblox-<universeId>`.

Add the game's metadata, including `roblox.universeId`, to the website's existing `roblox-games.js` catalogue. The browser resolves its stored universe counter automatically. No collector edit, backend mapping, database migration, or counter reset is needed. A newly listed game without a historical baseline starts from the time already captured by the tracker. The six baseline games retain their original website IDs in API responses.

Steam continues to use the existing server-side AppId mapping. Source-specific extraction and baseline composition are independent of Roblox catalogue entries.

## Tracker behavior

The production runner is `roblox-playtime-tracker.ps1`. Shared modules under `collectors/` contain the log parser and durable counters; the live test uses that same parser. The runner checkpoints every two seconds and starts a separate uploader every five minutes so network failures do not block tracking. The normal one-shot collector also reads these counters.

The tracker follows one Roblox player at a time. Connected time includes AFK time. Multiple simultaneous players are not counted while their identities are ambiguous. Disconnects close sessions, teleports change place while retaining universe totals, and duplicate log events are ignored. Process crashes use the last checkpoint rather than counting an offline interval. Sleep and restart gaps are excluded. Time during tracker downtime cannot be recovered accurately.

State and upload credentials remain local. Only universe IDs and cumulative minutes are uploaded, never raw logs, server addresses, account IDs, or join credentials. Incomplete log lines are re-read after restart rather than saved as raw text. Test reports are separate from production counters and are not imported automatically.

## Verification

Apply the migration before releasing API version 2, then deploy the API and website. On Windows, `install-roblox-playtime-tracker.ps1 -StartNow` registers and starts the hidden tracker at login for the current account. The installer leaves an unrelated task with the same name unchanged. For a local tracking-only check, run `roblox-playtime-tracker.ps1 -NoUpload` instead. The installer is not run by builds or migrations.

Run the API and website tests, the collector tests, `test/roblox-playtime.test.ps1`, and `test/roblox-state.test.ps1`. Database integration tests use an isolated migrated Neon branch through `TEST_DATABASE_URL`. They verify transactional uploads, replay handling, source aggregation, and baseline-inclusive reads. The live test remains available for checking future Roblox client log changes.
