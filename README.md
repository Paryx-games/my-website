# paryx.uk

This repository contains the sites deployed under `paryx.uk`.

| Directory | Domain | Vercel project |
| --- | --- | --- |
| `www/` | `paryx.uk` | existing personal root website |
| `test/` | `test.paryx.uk` | test Vercel project |

_test is a subdomain that will stay up for testing purposes, obviously_

Each site directory is intended to be configured as the **Root Directory** of its own Vercel project. That keeps each subdomain independently deployable while sharing one GitHub repository.

For example, a future `docs/` directory can be connected to another Vercel project and assigned `docs.paryx.uk`.
