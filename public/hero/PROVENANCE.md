# Hero imagery provenance

`hero.jpg` — Unsplash, free licence, downloaded 2026-09-01 from
photo-1464822759023-fed622ff2c3b. A placeholder: it is not northern Taiwan.

This is a stand-in until the site's own footage and photography exist. A site
about places in 北北基 illustrated with somebody else's mountains is a
contradiction, and replacing this is outstanding work — not a detail.

`hero.mp4` — Pexels, free licence, downloaded 2026-09-01 from video-files/3571264.
Also a placeholder, and the same caveat applies: it is not northern Taiwan. The
hero is the site's loudest claim about what it covers, so this is the first thing
to replace with the user's own footage.

## Why the video is not in this repository

`public/hero/*.mp4` is gitignored. Git stores every version of a binary forever,
so committing a 12 MB placeholder would leave it in the history after it was
replaced — and then the replacement would sit beside it. Anyone cloning this repo
would pay for both.

The page reads `HERO_VIDEO_URL` and falls back to `/hero/hero.mp4` for local
work. In production, set `HERO_VIDEO_URL` to a Blob Storage URL in the Static
Web Apps application settings. With neither present the hero shows
`hero-poster.jpg` and nothing breaks.
