# paryx.uk

Source for [paryx.uk](https://paryx.uk) and its related sites.

This repository contains my personal website, blog, development environments, and supporting services. It's where I build and experiment with new ideas, document projects, and write about things I've learned along the way.

| Site | Purpose | Directory | Platform |
| --- | --- | --- | --- |
| [paryx.uk](https://paryx.uk) | Main website, projects, and links | `www/` | Vercel |
| [blog.paryx.uk](https://blog.paryx.uk) | Articles, experiments, and development stories | `blog/` | Vercel |
| [dev.paryx.uk](https://dev.paryx.uk) | Development preview for upcoming changes | `dev/` | Vercel |
| [test.paryx.uk](https://test.paryx.uk) | Prototypes and experimental features | `test/` | Vercel |
| [api.paryx.uk](https://api.paryx.uk) | APIs and services used by Paryx projects | `api/` | Vercel |
| [media.paryx.uk](https://media.paryx.uk) | Static media and assets stored in Cloudflare R2 | N/A | Cloudflare R2 |
| [rm.paryx.uk](https://rm.paryx.uk) | Website for [Roblox Manager](https://github.com/Paryx-games/roblox-manager) | External | Vercel |

## Playtime

Game playtime flows from a Windows collector through authenticated Vercel API uploads into Neon PostgreSQL. Steam IDs are mapped to the website catalogue, while unmapped games are discarded. The site reads public minute totals without requiring a rebuild and combines them with manual platform values. The collector keeps a persistent upload sequence and pending batch so offline runs can retry safely.

The repository contains the collector, API handlers, SQL migrations, and frontend integration. Runtime credentials and machine-specific setup notes are kept outside the public source.

## Languages

![Languages used across the paryx.uk sites](https://api.paryx.uk/github/languages/bar?repo=Paryx-games/my-website&details=true)
