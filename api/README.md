# api.paryx.uk

The API service for [paryx.uk](https://paryx.uk) and other Paryx projects.

Visit [api.paryx.uk](https://api.paryx.uk).

The service provides backend functionality and language statistics for public GitHub repositories. Language breakdowns are available as structured data and visual bars, with colours based on GitHub Linguist and optional language names and percentages.

Repository statistics are cached to keep responses fast and can be refreshed when a repository changes.

The playtime API provides game totals used by the website:

- `POST /playtime` authenticates a collector using a bearer token and accepts cumulative whole-minute totals from Steam and Modrinth.
- Steam app IDs are accepted as numeric `appId` values or numeric strings in `gameId`. The backend maps supported IDs to the website catalogue and ignores unmapped games individually.
- `GET /playtime` returns public game/platform totals and an update timestamp, with a short CDN cache and browser CORS support. PC totals include `pcIncrease24hMinutes` after the API has a 24-hour historical baseline.

Repeated or older uploads do not add playtime twice. Recorded totals cannot decrease, and games omitted from an upload retain their previous values. Genuine increases are stored in Neon history in the same transaction as the current total and used to calculate the shared 24-hour change. History keeps the latest pre-window baseline and newer changes. The website combines PC totals from the API with independently maintained mobile and console playtime, using a saved fallback when the API is unavailable.

`GET /roblox/stats` provides public stats for Pressure and town, including descriptions, player counts, visits, favourites, votes, badges, and creator details. Responses contain `{ version: 1, fetchedAt, games }`. Each game's `description` contains its current Roblox description. The fetch timestamp records when Roblox last supplied the stats and stays unchanged when a cached response is served.

Stats are cached for one hour and refreshed on demand. While a refresh is underway, other visitors receive the previous snapshot. If Roblox is unavailable, the last successful stats remain available; the website uses its bundled snapshot when the API has no cached stats. Browser access is supported through public CORS. The endpoint accepts GET and OPTIONS requests.
