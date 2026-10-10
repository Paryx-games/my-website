# paryx.uk

Source for [paryx.uk](https://paryx.uk) and its related sites.

This repository contains my personal website, blog, development environments, and supporting services. It's where I build and experiment with new ideas, document projects, and write about things I've learned along the way.

| Site | Purpose | Directory | Platform |
| --- | --- | --- | --- |
| [paryx.uk](https://paryx.uk) | Main website, projects, and links | `www/` | Vercel |
| [blog.paryx.uk](https://blog.paryx.uk) | Articles, experiments, and development stories | `blog/` | Vercel |
| [dev.paryx.uk](https://dev.paryx.uk) | Development preview for upcoming changes | `dev/` | Vercel |
| [test.paryx.uk](https://test.paryx.uk) | Prototypes and experimental features | `test/` | Vercel |
| [api.paryx.uk](https://api.paryx.uk) | APIs and services used by Paryx projects | `api/` | Vercel, Neon |
| [media.paryx.uk](https://media.paryx.uk) | Static media and assets stored in Cloudflare R2 | N/A | Cloudflare R2 |
| [rm.paryx.uk](https://rm.paryx.uk) | Website for [Roblox Manager](https://github.com/Paryx-games/roblox-manager) | External | Vercel |

## Languages

This is what languages this project uses! This uses one of the APIs under the `api/` tree

![Languages used across the paryx.uk sites](https://api.paryx.uk/github/languages/bar?repo=Paryx-games/my-website&details=true)

## API

I'm making some of my APIs publicly available in case they're useful for other projects.

> [!NOTE]
> These APIs may be rate limited to prevent abuse. They run on free-tier infrastructure, so please use them reasonably.

If you find these APIs useful, consider supporting their continued development and hosting on Ko-fi.

<a href="https://ko-fi.com/paryx">
  <img src="https://storage.ko-fi.com/cdn/brandasset/v2/support_me_on_kofi_dark.png" alt="Support me on Ko-fi" height="44">
</a>

---

### GitHub Languages

> Only GitHub repositories are supported. GitLab, Bitbucket, and self-hosted Git servers are not supported.

Colors are calculated using [GitHub's Linguist](https://github.com/github-linguist/linguist) and any files without valid colors return in the color `#8b949e`, a muted gray.

`GET` [`/github/languages?repo=Paryx-games/roblox-manager`](https://api.paryx.uk/github/languages?repo=Paryx-games/roblox-manager) - Returns the language percentages of a GitHub repository.

**Parameters:**

- `repo` (required) - GitHub repository in `owner/repo` format.

### GitHub Language Bar

`GET` [`/github/languages/bar?repo=git/git&details=true`](https://api.paryx.uk/github/languages/bar?repo=git/git&details=true) - Returns a language bar for a GitHub repository.

**Parameters:**

- `repo` (required) - GitHub repository in `owner/repo` format.
- `details` (optional) - Set to `true` to include language names and percentages.
