# api.paryx.uk

The API service for [paryx.uk](https://paryx.uk) and other Paryx projects.

Visit [api.paryx.uk](https://api.paryx.uk).

The service provides backend functionality and language statistics for public GitHub repositories. Language breakdowns are available as structured data and visual bars, with colours based on GitHub Linguist and optional language names and percentages.

Repository statistics are cached to keep responses fast and can be refreshed when a repository changes.

The playtime API connects a Windows collector, Neon PostgreSQL, and the website:

- `POST /playtime` authenticates a collector using a bearer token and accepts cumulative whole-minute totals from Steam and Modrinth.
- Steam app IDs are accepted as numeric `appId` values or numeric strings in `gameId`. The backend maps supported IDs to the website catalogue and ignores unmapped games individually.
- `GET /playtime` returns public game/platform totals and an update timestamp, with a short CDN cache and browser CORS support.

Upload sequences and payload fingerprints make retries safe. Each batch is applied atomically; stale sequences and repeated uploads do not add playtime twice. Source totals cannot decrease, and omitted games retain their previous values. The website merges API PC totals with its file-based fallback, preserving manually maintained console and mobile values.

Database schema changes are versioned SQL migrations. Earlier applied migrations are preserved, while subsequent migrations bring the active schema forward. Credentials, local collector configuration, and personal setup notes are excluded from Git.

`GET /roblox/stats` provides public stats for Pressure and town, including player counts, visits, favourites, votes, badges, and creator details. Responses contain `{ version: 1, fetchedAt, games }`. The fetch timestamp records when Roblox last supplied the stats and stays unchanged when a cached response is served.

Stats are cached for one hour and refreshed on demand. While a refresh is underway, other visitors receive the previous snapshot. If Roblox is unavailable, the last successful stats remain available; the website uses its bundled snapshot when the API has no cached stats. Browser access is supported through public CORS. The endpoint accepts GET and OPTIONS requests.
