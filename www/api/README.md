# Website APIs

## GitHub contributions

`GET /api/github-contributions` (or `?period=recent`) returns `{ version, username, total, weeks, years, fetchedAt }`. `weeks` and `total` describe the most recent 365 days; `years` is the list of available calendar years. Historical data is loaded only when requested: `?period=year&year=YYYY` returns `{ version, username, year, total, weeks, period, fetchedAt }`, and `?period=all` returns `{ years, total, period, fetchedAt }`, where each year entry contains `{ year, version, username, total, weeks }`. Each week contains days with `{ date, weekday, count, level }`. The endpoint uses `GITHUB_TOKEN_PARYX_GAMES` (falling back to `GITHUB_TOKEN`) and caches each period for 15 minutes; a stale snapshot may be returned during upstream failures.

## GitHub projects

`GET /api/github-projects` returns `{ version, time, pinned, games, labs, errors }`.
Each public repository includes its description, owner, primary language, fork
parent, language byte counts, stars, forks, and open/closed issue and PR counts.
Closed PRs include merged PRs. Private repositories and private parent names are
excluded from the public response.

Successful responses are cached for 15 minutes. Cached data may be served while
a refresh is underway. Results include complete repository and language lists,
including profiles with more than 100 repositories.

Configure `GITHUB_TOKEN_PARYX_GAMES` and `GITHUB_TOKEN_PARYX_LABS` as server
environment variables in Vercel. Each token is used only for its matching
GitHub owner. Tokens need read access to repository metadata, issues, and pull
requests. The existing `GITHUB_TOKEN` remains a fallback for either owner.
When one owner token is missing or cannot access its repositories, data for the
other owner can still load and the response identifies the unavailable source.

Only GET is accepted. Missing all tokens returns 503. An owner-specific failure
returns a partial response with that source in `errors`; these responses are not
cached. Unexpected endpoint failures return 502 without exposing credentials or
provider error details.
