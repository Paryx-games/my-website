# Website APIs

## GitHub projects

`GET /api/github-projects` returns `{ version, time, pinned, games, labs, errors }`.
Each public repository includes its description, owner, primary language, fork
parent, language byte counts, stars, forks, and open/closed issue and PR counts.
Closed PRs include merged PRs. Private repositories and private parent names are
excluded from the public response.

Set `GITHUB_TOKEN` on the **www** Vercel project for production and preview. Use
a token with read access to public repository metadata and issues. It is used
only by the server and is never returned to the browser. Local development and
preview accept the same variable in `www/.env.local`.

The browser shares one request across every project card and caches its result
for 15 minutes. The server also coalesces concurrent requests and caches successful
responses for 15 minutes, with CDN stale-while-revalidate caching. An ordinary
profile needs one GitHub GraphQL request. Repository or language lists exceeding
GitHub's 100-item connection limit are paginated on the server.

Only GET is accepted. Missing configuration returns 503; GitHub failures return
502 without exposing credentials or provider error details. Errors are not cached.
