# paryx.uk

Welcome to the source code of my website, [`paryx.uk`](https://paryx.uk). I deploy it on Vercel and manage all code through here (mostly, the stuff that isn't private). For the websites, I use [vgpu](https://vgpu.sh/) (WGSL shaders) and HTML/CSS/JavaScript.

You can see below the languages using an [API endpoint](https://github.com/Paryx-games/my-website/tree/main/api#language-statistics) from this repository and [GitHub Linguist](https://github.com/github-linguist/linguist) (external)!

<img src="https://api.paryx.uk/github/languages/bar?repo=Paryx-games/my-website&amp;details=true" alt="language breakdown">

---

This repository contains the sites under [`paryx.uk`](https://paryx.uk).

| Directory | Domain | Purpose |
| --- | --- | --- |
| `www/` | [`paryx.uk`](https://paryx.uk) | Main website |
| `dev/` | [`dev.paryx.uk`](https://dev.paryx.uk) | Main website staging |
| `test/` | [`test.paryx.uk`](https://test.paryx.uk) | Testing website |
| `api/` | [`api.paryx.uk`](https://api.paryx.uk) | API Endpoints |

Each site lives in its own directory so the main site and subdomains can stay separate while sharing the same repository.
