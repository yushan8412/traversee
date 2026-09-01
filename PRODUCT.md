# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: people in Taiwan deciding where to go outdoors.** They are choosing between options — a half-day hike, a coastal ride, a campsite for the weekend — and need enough to judge whether a place suits them: how far, how much climbing, how long, what the surface is like, whether they can drive to it.

**Secondary: international visitors** who cannot read the Chinese-language sources where most of this knowledge already lives. Every entry is bilingual by design, and an untranslated entry still appears rather than vanishing from the English site.

**Third: contributors — anyone with an account.** Confirmed by Yulia on 2026-09-01: this is a *shared database that anyone can post to*, for recording and sharing places. It is not a catalogue with a single author. Contributors add places and photographs and can see what became of what they submitted; administrators moderate.

That is the intent, and the build has not caught up. Submission is still gated to administrators in three places — `app/[locale]/submit/page.tsx`, `submit/actions.ts` and `submit/route-actions.ts`. Opening it is a deliberate decision rather than a tidy-up: it would be the first public write path into a permanently-free cloud account, so it waits on answers about abuse, storage cost and who carries the moderation load.

## Product Purpose

A shared record of outdoor places across Taiwan, built by the people who go to them — what a place *is*, not what it is doing right now. Success has two halves: someone finds a place they would not otherwise have found, and someone who went somewhere worth knowing about puts it in.

## Positioning

Two things a neighbouring product could not truthfully copy without rebuilding:

**Structure and activity are independent.** `kind` describes shape — a route is a line you traverse, a spot is a place you go to — and `activities` is an array of what you can do there. A beach can be both a surf break and a campsite. A waterfall is a spot with a walk-in, not a third kind. Most competitors collapse these into one "activity type" field and cannot represent a place that serves two purposes.

**Bilingual as one document, not two sites.** Distance, elevation, geometry and photos are shared; only the prose differs. An entry with Chinese text and no English still shows on the English site, marked as untranslated, rather than disappearing.

**Deliberately not live conditions.** Tides, surf reports, weather and campsite availability are excluded. Dedicated services do them well; duplicating them creates a permanent operational burden and buys nothing.

## Operating Context

Readers arrive mostly on phones, often deciding the night before or the morning of. Contributors work at a desk: uploading a GPX exported from a watch or phone, marking a point on a map, writing bilingual prose, attaching photos.

The loop is submit → review → publish on the same site. Today both ends are Yulia's; the intent is that anyone can submit and only administrators review.

## Capabilities and Constraints

**Built and live:** bilingual browsing with language fallback; map with route tracks; Google sign-in with an administrator role; submission of routes (GPX upload, parsed and simplified) and spots (map pin); photo upload including iPhone HEIC, re-encoded to WebP with metadata stripped; a review console with the publish/reject/unpublish state machine; files moving between private and public storage as status changes.

**Geographic scope:** Taiwan — the main island, Penghu, Green Island and Orchid Island. Widened from Taipei/New Taipei/Keelung on 2026-09-01 at Yulia's instruction. Coordinates outside the box are rejected at submission.

**Kinmen and Lienchiang are outside the box, and this is a decision rather than an omission.** Kinmen sits at 118.3E and Matsu at 26.1N; a single rectangle stretched to either one also covers Fuzhou and the Fujian coast. Admitting mainland China to keep two archipelagos is the worse trade, so they are refused with a message that names them. Covering them properly needs a second bounded check, which is unbuilt.

**Out of scope for v1:** coverage beyond Taiwan; comments, ratings, likes; saved or favourite collections; a mobile app; live conditions; booking and payments.

**Technical constraints that shape design:** the site runs on permanently-free cloud tiers. Cosmos DB is capped at 1,000 RU/s shared, so list queries deliberately omit full route geometry and long text. Azure Maps allows 5,000 billable transactions a month, and one client-side bug once consumed two thirds of that in an afternoon — map interactions have a real budget. Photos are bounded to six per entry at 5 MB each.

**Terminology:** *place* covers both kinds. A *route* is a line; a *spot* is a point. *Approach* is the walk-in to a spot you cannot drive to. Difficulty is keyed by activity because the scales are not comparable.

## Brand Commitments

**The name stays.** *Traversee* comes from *traverse*. Reaching an outdoor place — walking a river up to a waterfall, carrying gear to a campsite, scrambling down to a break — is itself the effort the name describes.

**Honesty about confidence is a product value, not a detail.** Duration says whether it came from recorded tracks or an estimate. Untranslated text is labelled rather than hidden. Difficulty scales for camping, surfing, diving and waterfalls are deliberately undefined until someone with real experience writes them, because difficulty is what a reader uses to judge their own safety.

**Binding references the user supplied** for the visual work: Patagonia (image layout, clear activity options), Komoot and the amed proposal site (hero, video background), AllTrails (route cards showing recommendation and time required), Bellhop (scroll-driven horizontal card motion), mapmagic and Trailforks (map-first exploration).

## Evidence on Hand

**Real:** a working site at `yellow-bay-010e67a00.7.azurestaticapps.net` with seven entries, one route and one spot genuinely authored by the user, including a real GPX (67.75 km, 206 m ascent) and a real photograph.

**Placeholder, and must not be presented as real:** five seeded entries whose prose was written by the assistant against approximate coordinates. Their geometries are five hand-typed points and draw as quadrilaterals rather than trails. Replacing them is outstanding work.

**Absent, and must not be fabricated:** ratings, review counts, user numbers, testimonials, press. Nothing on this site may imply a community that does not yet exist. There is no photography library beyond the single uploaded photo.

**Hero footage:** the user has confirmed free-licensed stock video of outdoor sports and landscape as the starting point, to be replaced with her own footage later.

## Product Principles

1. **Contributing has to feel worth it.** The catalogue only exists if people put things in, so the path from "I went somewhere good" to "it is on the site" is a first-class surface, not an admin back door.
2. **Say how confident the data is.** A measured duration and a guess are shown differently. This is a working detail of a shared record where entries come from many hands — not the site's headline claim. Corrected on 2026-09-01: an earlier version of this document called it the main advantage, which was the assistant's inference and is not how Yulia sees the product.
3. **Absence is displayed, not hidden.** No English yet, no photo, no recorded time — say so. Hiding gaps makes the catalogue look larger than it is and misleads the person deciding.
4. **A reader deciding at 6am on a phone is the design target.** Desktop is the authoring surface; the phone is the reading surface.
5. **Map interaction costs money.** Every design that adds map views has a transaction budget attached. This is a real constraint, not a hypothetical.
6. **Never imply a community that does not exist.** The goal is a community; that makes fabricating one worse, not more forgivable. No invented ratings, counts, contributors or activity — show the real number even when it is one.

## Accessibility & Inclusion

Bilingual content carries a `lang` attribute matching the language the text is actually in, so a screen reader does not announce Chinese prose in an English voice. Photos carry dimensions so layout does not shift as they load.

<!-- Inferred, not confirmed by the user — correct these when wrong:
     - "My page" is read as a contributor's own submissions and their status,
       because saved collections are explicitly out of scope for v1. The
       single-author reading of it was corrected on 2026-09-01.
     - Open submission is confirmed as the intent; its terms are not. Who may
       submit (any signed-in account, or an approved one), what stops abuse, and
       what happens to a contributor's entries if they delete their account are
       all undecided, and each has to be answered before the gate opens. -->
