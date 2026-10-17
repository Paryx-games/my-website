# Website APIs

## GitHub contributions

`GET /api/github-contributions` returns `{ version, username, total, weeks, allTime, years, fetchedAt }`. `weeks` and `total` describe the most recent 365 days. `allTime` is the sum of GitHub's calendar-year totals, and `years` contains `{ year, version, username, total, weeks }` for each year with contributions. Each week contains days with `{ date, weekday, count, level }`. The endpoint uses the server-side GitHub token and caches successful snapshots for 15 minutes; a stale snapshot may be returned during upstream failures.

## GitHub projects

`GET /api/github-projects` returns `{ version, time, pinned, games, labs, errors }`.
Each public repository includes its description, owner, primary language, fork
parent, language byte counts, stars, forks, and open/closed issue and PR counts.
Closed PRs include merged PRs. Private repositories and private parent names are
excluded from the public response.

Successful responses are cached for 15 minutes. Cached data may be served while
a refresh is underway. Results include complete repository and language lists,
including profiles with more than 100 repositories.

Only GET is accepted. Missing configuration returns 503; GitHub failures return
502 without exposing credentials or provider error details. Errors are not cached.
