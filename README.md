# paryx.uk

This repository contains the sites deployed under `paryx.uk`.

| Directory | Domain | Vercel project |
| --- | --- | --- |
| `www/` | `paryx.uk` | existing personal root website |
| `docs/` | `docs.paryx.uk` | separate Vercel project |

_(docs is a temporary subdomain that will be removed shortly after merging)_

Each site directory is intended to be configured as the **Root Directory** of its own Vercel project. That keeps each subdomain independently deployable while sharing one GitHub repository.

For example, a future `status/` directory can be connected to another Vercel project and assigned `status.paryx.uk`.
