# paryx.uk

The main website for Paryx. It is home to projects, development, and whatever else ends up being built.

The site shares the blog’s minimal dark theme, Sora headings, and responsive navigation, with projects, live activity, local clocks, and contact information.

Visit [`paryx.uk`](https://paryx.uk)

Public game ratings live in `public/assets/games/ratings.json`. Set each game's `personal` value to a number from 1–5 in half-star steps, or `null` for **Not rated**, then commit and deploy to publish them.

Set a game's `quote` in the same file to your own text, for example `"quote": "One more factory, then I'll stop."`. It appears above the large popup image in gray with speech marks and a speech bubble. Leave `quote` as `""` to hide it. Scroll the mouse wheel over the thumbnail strip below the image to browse horizontally.

IMDb scores in that file are snapshots checked on 4 October 2026, with a link to each game's IMDb listing for the latest score. The two Backrooms games have no verified IMDb game listing, so their scores are unavailable. IMDb ratings use a separate 10-point scale.

Click a game card to see a separate ratings panel inside its showcase, with your stars, IMDb's audience score, and Metacritic's critic score out of 100. Metacritic entries include the platform and source slug; a `null` score means the listing has no Metascore yet, while a `null` entry means no listing was verified. These are also snapshots checked on 4 October 2026. Ratings appear only inside the showcase.
