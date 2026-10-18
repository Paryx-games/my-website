# paryx.uk

Source for [paryx.uk](https://paryx.uk) and its related sites.

This repository contains my personal website, blog, development environments, and supporting services. It's where I build and experiment with new ideas, document projects, and write about things I've learned along the way.

| Site | Purpose | Directory | Platform | Visibility
| --- | --- | --- | --- | ---
| [paryx.uk](https://paryx.uk) | Main website, projects, and links | `www/` | Vercel | Open source ✅
| [blog.paryx.uk](https://blog.paryx.uk) | Articles, experiments, and development stories | `blog/` | Vercel | Open source ✅
| [dev.paryx.uk](https://dev.paryx.uk) | Development preview for upcoming changes | `dev/` | Vercel | Open source ✅
| [test.paryx.uk](https://test.paryx.uk) | Prototypes and experimental features | `test/` | Vercel | Open source ✅
| [api.paryx.uk](https://api.paryx.uk) | APIs and services used by Paryx projects | `api/` | Vercel, Neon | Open source ✅
| [media.paryx.uk](https://media.paryx.uk) | Static media and assets stored in Cloudflare R2 | N/A | Cloudflare R2 | N/A
| [rm.paryx.uk](https://rm.paryx.uk) | Website for [Roblox Manager](https://github.com/Paryx-games/roblox-manager) | External | Vercel | Open source ✅
| [codeinterpreter.paryx.uk](https://codeinterpreter.paryx.uk) | Code interpreter using Vite frontend and a private backend. | N/A | Vercel & Backend | Closed source ❌

## Languages

This is what languages this project uses! This uses one of the APIs under the `api/` tree

![Languages used across the paryx.uk sites](https://api.paryx.uk/github/languages/bar?repo=Paryx-games/my-website&details=true)

## Why Some Websites Are Private

Some websites, for example my [Code Interpreter](https://codeinterpreter.paryx.uk), have a closed-source backend (I may release the frontend soon, but it's highly unpolished right now) due to significant security risks. It runs on a VPS that I manage myself, which means I need to keep security standards high.

Security is a massive priority for code interpretation, since if code escapes the sandbox, it could access my VPS. I've removed as much private data as possible, but anything could happen. That's why I've decided to keep the backend closed source for now.

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
