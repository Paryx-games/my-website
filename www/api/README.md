# Website APIs

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
