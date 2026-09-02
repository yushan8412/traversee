# Traversee

> A community-driven outdoor destination hub for Northern Taiwan.

Find somewhere to go outdoors across Taiwan — trails, rides, campsites, surf breaks, dive sites, waterfalls, and more. Traversee starts with places sourced from OpenStreetMap and grows through what the community shares.

## Status

🚧 Work in progress — architecture settled, implementation not yet started.

Full rationale, data model, and testing strategy:
[`docs/specs/2026-08-28-tech-stack-design.md`](docs/specs/2026-08-28-tech-stack-design.md).

## Planned features (v1)

- Bilingual site (Traditional Chinese and English) from day one
- A library of outdoor places, filterable by activity and difficulty
- Interactive map view — routes as lines, spots as pins, all on one map
- Detail pages with GPX tracks and elevation profiles for routes, and activity-specific
  details for spots (facilities at a campsite, break type at a surf spot, and so on)
- Google sign-in (no self-managed passwords)
- Community submissions, published only after moderator approval

The data model supports arbitrarily many activity types; how many launch in v1 is
bounded by how fast one person can curate content, not by the architecture.

Live conditions (tides, surf reports, weather, campsite availability), booking,
comments, ratings, saved collections, and coverage beyond Taipei / New Taipei /
Keelung are explicitly out of scope for v1.

## Tech stack

Chosen to run permanently within Azure's always-free grants — steady-state cost
is under $0.10/month once the introductory credit expires.

- **Framework**: Next.js (App Router) + TypeScript
- **Hosting**: Azure Static Web Apps, Free plan
- **Database**: Azure Cosmos DB for NoSQL, free tier
- **File storage**: Azure Blob Storage (GPX tracks and photos)
- **Auth**: Auth.js + Google OAuth
- **Maps**: MapLibre GL JS on Azure Maps Gen2 tiles
- **Styling / i18n**: Tailwind CSS / next-intl
- **IaC / CI**: Bicep / GitHub Actions
- **Testing**: Vitest (unit) + Playwright (E2E)

Route data comes from OpenStreetMap (© OpenStreetMap contributors, ODbL) plus
user contributions.

## Author

Yulia — [@yushan8412](https://github.com/yushan8412)

## License

[MIT](./LICENSE)
