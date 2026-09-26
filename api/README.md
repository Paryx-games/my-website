# api.paryx.uk

The API service for [`paryx.uk`](https://paryx.uk).

Visit [`api.paryx.uk`](https://api.paryx.uk)

Provides API endpoints and backend functionality used by `paryx.uk` and other Paryx projects.

## GitHub languages

`GET /github/languages?repo=owner/repository` returns the repository's language byte counts and percentages as JSON.

`GET /github/languages/bar?repo=owner/repository` returns an SVG language bar using GitHub Linguist colours for supported languages.
Languages without a mapped GitHub colour use a neutral gray.

Embed the bar with:

```html
<img
  src="https://api.paryx.uk/github/languages/bar?repo=Paryx-games/roblox-manager"
  alt="GitHub language breakdown for Paryx-games/roblox-manager"
/>
```

### Refreshing a repository after a push

Language responses are cached per repository for up to one hour. To refresh one repository's JSON and SVG after its default branch changes, configure these environment variables in the Vercel project:

- `GITHUB_WEBHOOK_SECRET`: a secret shared with the GitHub webhook.
- `VERCEL_TOKEN`: a Vercel access token that can invalidate this project's cache.
- `VERCEL_PROJECT_ID`: this Vercel project's ID.
- `VERCEL_TEAM_ID`: the Vercel team ID that owns the project.

Then add a webhook to each GitHub repository you want to keep fresh:

1. Open **Settings → Webhooks → Add webhook** in the repository.
2. Set the payload URL to `https://api.paryx.uk/github/languages/revalidate`.
3. Choose `application/json` and use the same secret as `GITHUB_WEBHOOK_SECRET`.
4. Select **Let me select individual events** and enable **Pushes**.

The webhook verifies GitHub's signature and invalidates only that repository's cache tag. Pushes to non-default branches are ignored because GitHub's language statistics describe the default branch. The next request rebuilds the cached response from GitHub.
