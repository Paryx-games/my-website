# api.paryx.uk

The API service for [`paryx.uk`](https://paryx.uk).

Visit [`api.paryx.uk`](https://api.paryx.uk)

Provides API endpoints and backend functionality used by `paryx.uk` and other Paryx projects.

## Endpoints

### Language statistics

`GET https://api.paryx.uk/github/languages?repo=owner/repository` returns the language byte counts and percentages for any public GitHub repository as JSON.

`GET /github/languages/bar?repo=owner/repository` returns an SVG language bar using GitHub Linguist colours for supported languages.
Languages without a mapped GitHub colour use a neutral gray.

`GET https://api.paryx.uk/github/languages/bar?repo=owner/repository` returns an SVG bar for any public GitHub repository. Narrow gaps separate the language segments. Add `details=true` to show language names and percentages below the bar.

```html
<img
  src="https://api.paryx.uk/github/languages/bar?repo=owner/repository&amp;details=true"
  alt="Language breakdown for owner/repository"
/>
```

### Refreshing a repository after a push

## Optional: refreshing a repository after a push

Anyone can use the read endpoints above. Automatic refresh is an optional integration for the API operator and maintainers of repositories they want to refresh. Successful language responses are cached per repository for up to one hour. The API operator must configure these environment variables in the Vercel project:

- `GITHUB_WEBHOOK_SECRET`: a secret shared with the GitHub webhook.
- `VERCEL_TOKEN`: a Vercel access token that can invalidate this project's cache.
- `VERCEL_PROJECT_ID`: this Vercel project's ID.
- `VERCEL_TEAM_ID`: the Vercel team ID that owns the project.

Then a maintainer with access to a GitHub repository can add a webhook to refresh it after pushes. The API operator must provide that repository's maintainer with the webhook secret through a private channel:

1. Open **Settings → Webhooks → Add webhook** in the repository.
2. Set the payload URL to `https://api.paryx.uk/github/languages/revalidate`.
3. Choose `application/json` and use the same secret as `GITHUB_WEBHOOK_SECRET`.
4. Select **Let me select individual events** and enable **Pushes**.

The webhook verifies GitHub's signature and invalidates only that repository's cache tag. Pushes to non-default branches are ignored because GitHub's language statistics describe the default branch. The next request rebuilds the cached response from GitHub. The Vercel token stays with the API operator and must not be shared.
