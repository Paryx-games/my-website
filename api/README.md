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
