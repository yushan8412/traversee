# Hero imagery provenance

## The video

`hero.mp4` is a 14.4-second cut assembled on 2026-09-09, all clips free licence.
Shots alternate activity and landscape, and the cut runs day to night: set out,
move through the day, end at camp. **The arc costs the alternation one break**
(shots 4 and 5 are both landscape) because a campfire has to close and six slots
cannot give both. That was the trade taken on 2026-09-09; the climbing shot,
Pexels 4490476, was dropped to make room and is kept in reserve. The alternation
still matters — it is what stops the cut reading as either a stock-landscape reel
or a sports advert — so a swapped shot usually forces a reorder rather than a
straight substitution.

| # | Source | What it shows | Where |
|---|---|---|---|
| 1 | Pexels 37700401 | Solo hiker walking away up a red-earth forest trail | **not Taiwan** |
| 2 | Pexels 33859177 | Green headland, rock shelf, offshore islets | Taiwan |
| 3 | Pexels 5790076 | Two road cyclists riding toward camera | **not Taiwan** |
| 4 | Pexels 34260711 | High alpine ridge, layered ranges, cloud at eye level | Taiwan |
| 5 | Pexels 19526088 | Waves breaking over a coastal rock shelf | Taiwan |
| 6 | Pexels 31747523 | Campfire in a forest clearing, night | **not Taiwan** |

Shots are joined with 0.6-second crossfades, and the first 0.6 seconds is
blended back over the tail so the `loop` attribute has no visible seam.

**Landscape is Taiwan; activity is not.** Confirmed by Yulia on 2026-09-09:
foreign footage is acceptable for the sport shots, but the landscape has to be
Taiwan. Searches for Taiwanese cycling and climbing footage returned city
traffic and nothing usable, which is why the rule exists rather than being a
compromise nobody chose.

**Shot 3 is the one that announces itself.** Its vegetation is temperate autumn
— birch turning yellow, pine — which is not what Taiwan looks like at any
altitude a road cyclist rides. It is punched in 1.4× to cut the treeline and the
blown-out sky, and graded (`eq=contrast=1.12:saturation=1.25:gamma=0.94`) to sit
with the saturated Taiwanese aerials; the grade is deliberately mild, because
pushing saturation further made the autumn colour louder, not quieter. Shot 1
takes the same grade and is punched in 1.25×, to cut a blown sky and bring the
hiker up in frame. Shot 6 takes neither.

Shots 2, 4 and 5 take no grade — they sit together as shot.

**Shot 4 went through three subjects, and the reason is worth keeping.**

Yulia asked for Taroko on 2026-09-09, widened it to any Taiwanese gorge,
waterfall or river-tracing scene, then rejected the waterfall as 無聊 — lacking
壯闊感, grandeur. The lesson from that last note is the useful one: **grandeur is
a property of the shot, not the subject.** Shifen Waterfall is a fine subject and
the clip was locked off at mid-distance, so it read placid. What replaced it is a
drone pulling back along a high ridge — a big grey rock face, dwarf-bamboo
grassland on the crest, ranges receding in layers, cumulus at eye level. The
revealing camera move is what supplies the scale.

Rejected along the way, so they are not re-proposed: Pixabay 93383 (Eternal
Spring Shrine, Taroko — verified, but it reads as a temple landmark and needed
correcting for a magenta cast) and Pixabay 38558 (Shifen, the wide view). Both
are genuinely Taiwan and both are kept in reserve.

**Pixabay tags Taiwanese footage where Pexels does not** — worth remembering the
next time a specific Taiwanese location is needed. Pexels returns nothing
verifiable for `taroko`, `taroko gorge` or `qingshui cliff`: generic river gorges
and, in one case, Machu Picchu. Eight plausible candidates were downloaded and
their frames examined; none showed Taroko's banded grey-white marble. Naming one
of them Taroko would have been a guess printed as a fact.

Place names in this file are **Pexels' or Pixabay's own, repeated and not
independently verified**, except where a clip is marked verified above — so **do
not caption the hero with a location.** Shot 4's terrain is consistent with
Taiwan's high mountains but no peak is claimed for it. If a shot is swapped,
re-check this table.

**The dawn shot that used to open the cut is gone.** Pexels 37500634, a backlit
ridge over a cloud sea, was the prettiest single frame here and was dropped on
2026-09-09 for being static: nothing in it moved but the light. A solo hiker
walking away up a trail replaced it, which also puts a person in the first
frame — closer to what the site is for than a landscape is. The dawn clip is
kept in reserve.

**A YouTube drone clip of Taroko was requested and refused** (`kjA4CPVBXNQ`,
channel Rogy360看見台灣). It carries no Creative Commons marking, so it is
all-rights-reserved footage belonging to someone else. Do not re-litigate this
by re-downloading it: the routes to that shot are permission from the creator, a
paid stock licence, or Yulia's own camera. Free-licence Taroko amounts to two
static Pixabay clips, and both were tried and rejected.

**The night shot pays for itself twice.** Shot 6 was expected to cost the
invisible loop — a dissolve from firelight back to a daylit trail should have
been the one visible seam — and it does not, because the loop blend puts the
head over the tail: the fire dissolves into the hiker across the last 0.6
seconds and reads as the next morning. It also survives the page's scrims better
than any other shot. Under the centre pool at its heaviest the surroundings go
to black but the flame punches through, so the headline sits on the highest
contrast in the cut. Check this again if the fire is ever swapped for a darker
night shot without a bright element in it.

**None of these are places in the catalogue, and none are Yulia's own footage.**
Replacing them with her own material is still outstanding work.

## The poster

`hero-poster.jpg` is frame 0 of the cut, so the still and the first video frame
are the same image and there is no jump when playback starts. Regenerate it
whenever the video changes, or the hero will flash.

## `hero.jpg`

Unsplash, free licence, downloaded 2026-09-01 (photo-1464822759023-fed622ff2c3b).
**Nothing references it.** It is a leftover from an earlier hero and is not
Taiwan. Safe to delete.

## Why there is no WebM

There was one, briefly, and the reason it is gone is worth keeping.

On the previous cut — four slow aerial shots — VP9 was **a third smaller** than
H.264 at the same visible quality, which paid for a second file. This cut adds a
tracking shot and breaking white water, which are the two most expensive things
a codec can be handed, and the ranking inverted: at ~3.3 MB H.264 was clean,
while VP9 needed 5.0 MB to get there even at `cpu-used 1`, and AV1 did not beat
it either. A second source that is *larger* is pure cost, so it was dropped.

The page therefore offers a WebM **only when one exists** — `existsSync` on
`public/hero/hero.webm`, or `HERO_VIDEO_WEBM_URL` in production. Drop a smaller
WebM in and it is used automatically; leave it out and only the MP4 is offered
and nothing 404s. Whether the second encode is worth it is a property of the
footage, so the file's presence decides rather than a hardcoded path.

Encoding settings, for reproducing: `libx264 -crf 34 -preset slow -profile:v
high -movflags +faststart`, 1920×1080, no audio, 3.3 MB. **CRF is re-tuned every
time the shot list changes, because the cut's cost is set by its most detailed
shot, not its length.** The four-aerial cut was clean at CRF 27 and 3.3 MB; one
extra second — a tracking shot and breaking water — took the same setting to
6.6 MB; a full-frame waterfall pushed it again, and the alpine ridge that replaced it — smooth rock and sky — brought it back down. Each time the check is the same
— compare against the master where artefacts appear first: smooth sky gradients
(banding), moving water and foliage (blocking and mush), and now the campfire's
dark surround, where a flickering light source over near-black is the worst case
a codec gets here. At CRF 34 none of them goes.

The 12 MB placeholder this replaced was roughly four times the current file.

## Why the video is not in this repository

`public/hero/*.mp4` and `public/hero/*.webm` are gitignored. Git stores every
version of a binary forever, so committing a placeholder would leave it in the
history after it was replaced — and then the replacement would sit beside it.
Anyone cloning this repo would pay for both.

The page reads `HERO_VIDEO_URL` and `HERO_VIDEO_WEBM_URL`, falling back to the
local paths for development. In production, set `HERO_VIDEO_URL` to a Blob
Storage URL in the Static Web Apps application settings. With nothing present
the hero shows `hero-poster.jpg` and nothing breaks.
