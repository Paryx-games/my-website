# paryx.uk

The main website for Paryx. It is home to projects, development, and whatever else ends up being built.

The site shares the blog’s minimal dark theme, Sora headings, and responsive navigation, with projects, live activity, local clocks, and contact information.

Visit [`paryx.uk`](https://paryx.uk)

Public game ratings live in `public/assets/games/ratings.json`. Set each game's `personal` value to a number from 1–5 in half-star steps, or `null` for **Not rated**, then commit and deploy to publish them.

If the optional local ratings editor is installed, run `pnpm dev` in `www` and open `/game-ratings` to edit and save through the browser. The editor files are ignored by Git and only run on localhost during development; builds and other checkouts do not require them.

IMDb scores in that file are snapshots checked on 4 October 2026, with a link to each game's IMDb listing for the latest score. The two Backrooms games have no verified IMDb game listing, so their scores are unavailable. IMDb ratings use a separate 10-point scale.

Click a game card to see a separate ratings panel inside its showcase, with your stars, IMDb's audience score, and Metacritic's critic score out of 100. Metacritic entries include the platform and source slug; a `null` score means the listing has no Metascore yet, while a `null` entry means no listing was verified. These are also snapshots checked on 4 October 2026. Ratings appear only inside the showcase.
