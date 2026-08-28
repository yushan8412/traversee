# Traversee — Design Document

> Living design document. Updated as decisions are made.
> Last updated: 2026-08-28

## Product overview

**Traversee** is a community-driven cycling & hiking route hub for Northern Taiwan (Taipei, New Taipei, Keelung).

- **What**: A route knowledge base combining data seeded from OpenStreetMap with routes shared by registered users.
- **Who**: Cyclists and hikers exploring Taipei metro area, plus international visitors wanting curated route information.
- **Why**: Personal passion project (author enjoys both activities) that doubles as a portfolio piece.

## Scope

### In scope for v1

- Geographic coverage: **Taipei City, New Taipei City, Keelung City** only.
- Two activity types: **cycling** and **hiking**.
- Two content sources:
  - Seeded from OpenStreetMap (safe/legal, comprehensive).
  - Contributed by registered users (GPX upload + text description).

### Explicitly out of scope for v1

Deferred so v1 stays shippable in a few weeks:

- Coverage beyond 北北基.
- Advanced filtering / search.
- Comments, ratings, likes.
- Save / favorite / "my routes" lists.
- Mobile app (v1 is responsive web only).

### Why this scope

- **"Global" or "all of Taiwan" was too large** for a solo-PM + AI-assistant pair to ship in the short term.
- **北北基 has strong OSM coverage** and lets the author dogfood the product.
- **Scraping other route platforms** (Strava, komoot, 健行筆記) violates their TOS. OpenStreetMap is the only safe base source.

## MVP features (v1)

Confirmed 2026-08-28:

| # | Feature | Notes |
|---|---|---|
| 1 | Route list page | All routes as cards: photo, name, activity type, difficulty, distance. |
| 2 | Interactive map view | All routes rendered on one map; click a route to see details. |
| 3 | Route detail page | GPX track on map, elevation profile, description, photos, source attribution. |
| 4 | User registration / login | Google sign-in only. No self-managed passwords. |
| 5 | User-submitted routes | Signed-in users upload a GPX file + bilingual description. |
| 6 | Moderation console | Submissions stay unpublished until an admin approves them. |

The site is bilingual (Traditional Chinese and English) from v1, with `/zh` and `/en` routing.

## Constraints

- **Hosting**: Microsoft Azure. Must be free-tier friendly for long-term operation (target: $0–5/month after the $200 credit expires).
- **Azure $200 credit** expires after 30 days regardless of usage — the architecture is designed around Azure's permanent free tier, and the credit is only used to explore paid services during the trial period.
- **Legal**: OpenStreetMap data (ODbL, must attribute). No scraping of platforms whose TOS forbid it.
- **Portfolio-friendly**: Repo, commit history, README, and docs are visible to future recruiters. Prefer clean git flow, meaningful commits, thoughtful docs.

## Git flow

**GitHub Flow** (simplified). Confirmed 2026-08-28.

- `main` is always deployable.
- Every change goes through a branch → PR → merge.
- Branch naming: `feature/*`, `fix/*`, `chore/*`, `docs/*`.
- `main` has branch protection: no direct push, no force push, no deletion.
- PRs do not require a second reviewer (solo project); conversation resolution required before merge.
- Author is repo admin and can bypass protection in an emergency.

## Collaboration model

Author's role is Product Manager: chooses features, reviews UI, tests, approves.
AI assistant's role is Engineer: writes code, opens PRs, explains architecture.

Visual design workflow: author supplies screenshots / URLs / verbal descriptions of preferred layouts; assistant translates them into UI code; iterate until visual match.

## Architecture

Resolved 2026-08-28. Full rationale, data model, data flows, error handling, and testing
strategy: [`docs/specs/2026-08-28-tech-stack-design.md`](specs/2026-08-28-tech-stack-design.md).

| Layer | Choice |
|---|---|
| Web framework | Next.js (App Router) + TypeScript |
| Hosting | Azure Static Web Apps, Free plan |
| Database | Azure Cosmos DB for NoSQL, free tier |
| File storage | Azure Blob Storage |
| Authentication | Auth.js + Google OAuth, running inside Next.js |
| Map tiles / rendering | Azure Maps Gen2 / MapLibre GL JS |
| Styling / i18n | Tailwind CSS / next-intl |
| IaC / CI/CD | Bicep / GitHub Actions |
| Testing | Vitest (unit) + Playwright (E2E) |

Steady-state cost after the $200 credit expires: under $0.10/month.

The decisive constraint was that Azure Database for PostgreSQL is free for 12 months only,
not permanently — it would cost $15–25/month thereafter, several times the budget ceiling.
Cosmos DB's free tier is permanent and supports GeoJSON geospatial queries, so it wins on
cost without conceding capability.

## Deferred decisions

Not blocking implementation; to be settled before launch:

- **Custom domain** — whether to buy one. The Free plan supports two, with free auto-renewing SSL.
- **Visual design direction** — brand tone, palette, typography, layout.
- **Difficulty scale wording** — Appendix A of the architecture spec is a draft awaiting calibration.

## Repo & environments

- **Repo**: https://github.com/yushan8412/traversee (public, MIT license).
- **Local path**: `~/Documents/Yulia's projects/traversee/`.
- **Default branch**: `main`.
- **Production URL**: TBD (once Azure deploy is set up).
