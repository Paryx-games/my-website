# paryx.uk

Source for [paryx.uk](https://paryx.uk) and its related sites.

This repository contains my personal website, blog, and supporting services. I use it to build projects, document my work, and write about what I learn.

The table lists the subdomains that are currently online. The dropdown contains subdomains and websites that have been archived or closed.

<details>
<summary> Archived or closed websites </summary>

Archived websites may return in the future. Closed websites have been retired and will not return in their current form, although they may be replaced by something new.

| Site | Purpose | Directory | Visibility |
| --- | --- | --- | --- |
| [dev.paryx.uk](https://dev.paryx.uk) | Development preview for upcoming changes | `.archive/dev/` | Archived |
| [test.paryx.uk](https://test.paryx.uk) | Prototypes and experimental features | `.archive/test/` | Archived |
| [codeinterpreter.paryx.uk](https://codeinterpreter.paryx.uk) | Code interpreter using Vite frontend and a private backend. | `🔒` | Closed |

---

</details>

| Site | Purpose | Directory | Platform | Visibility
| --- | --- | --- | --- | ---
| [paryx.uk](https://paryx.uk) | Main website, projects, and links | `www/` | Vercel | Open source ✅
| [blog.paryx.uk](https://blog.paryx.uk) | Articles, experiments, and development stories | `blog/` | Vercel | Open source ✅
| [api.paryx.uk](https://api.paryx.uk) | APIs and services used by Paryx projects | `api/` | Vercel, Neon | Open source ✅

## Languages

This is what languages this project uses! This uses one of the APIs under the `api/` tree

![Languages used across the paryx.uk sites](https://api.paryx.uk/github/languages/bar?target=Paryx-games&details=true)

## API

I'm making some of my APIs publicly available in case they're useful for other projects.

> [!NOTE]
> These APIs may be rate limited to prevent abuse. They run on free-tier infrastructure, so please use them reasonably.

If you find these APIs useful, consider supporting their continued development and hosting on Ko-fi.

See the [GitHub language reference](api/docs/github-language-reference.md) for canonical language names, URL-encoded values, and supported short names for the language bar filters.

<a href="https://ko-fi.com/paryx">
  <img src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_dark.png" alt="Support me on Ko-fi" height="44">
</a>

---

### GitHub Languages

> Only GitHub repositories are supported. GitLab, Bitbucket, and self-hosted Git servers are not supported.

Colors are calculated using [GitHub's Linguist](https://github.com/github-linguist/linguist) and any files without valid colors return in the color `#8b949e`, a muted gray.

`GET` [`/github/languages?target=Paryx-games/roblox-manager`](https://api.paryx.uk/github/languages?target=Paryx-games/roblox-manager) - Automatically detects and returns the language percentages of one GitHub repository.

**Parameters:**

- `target` (required) - GitHub username, organization name, or repository in `owner/repo` format.

Examples:

- [`/github/languages?target=Paryx-games`](https://api.paryx.uk/github/languages?target=Paryx-games) - Aggregates a user's public repositories.
- [`/github/languages?target=Paryx-Labs`](https://api.paryx.uk/github/languages?target=Paryx-Labs) - Aggregates an organization's public repositories.
- [`/github/languages?target=Paryx-games/roblox-manager`](https://api.paryx.uk/github/languages?target=Paryx-games/roblox-manager) - Returns one repository's languages.

The explicit `/github/languages/repo?repo=...` and `/github/languages/user?user=...` routes remain available. The previous `/github/languages?repo=owner/repo` query also remains available as a compatibility alias.

Both structured language endpoints return the same response shape:

```json
{
  "repository": "Paryx-games",
  "totalBytes": 123456,
  "languages": [
    {
      "language": "TypeScript",
      "bytes": 90000,
      "percentage": 72.9
    }
  ]
}
```

The previous `/github/languages?repo=owner/repo` route remains available as a compatibility alias for the repository endpoint.

### GitHub Language Bar

`GET` [`/github/languages/bar?target=git/git&details=true`](https://api.paryx.uk/github/languages/bar?target=git/git&details=true) - Returns a language bar for a repository, user, or organization.

**Parameters:**

- `target` (required) - GitHub username, organization name, or repository in `owner/repo` format.
- `details` (optional) - Set to `true` to include language names and percentages.
- `limit` (optional) - Number of named languages to display, from 1 to 100. Remaining languages are grouped under gray `Other`.
- `include` (optional) - Comma-separated language names to display. All other languages are grouped under gray `Other`.
- `exclude` (optional) - Comma-separated language names to group under gray `Other`; all remaining languages are displayed.

The previous `repo` query parameter remains available as a compatibility alias.

`include` and `exclude` cannot be used together. The API returns an error if both are supplied.
Language names are matched case-insensitively, so `rust`, `Rust`, and `RuSt` are equivalent.
