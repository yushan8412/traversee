# Traversee

> A community-driven cycling & hiking route hub for Northern Taiwan.

Discover, share, and plan bike rides and hikes across Taipei, New Taipei, and Keelung. Traversee starts with routes sourced from OpenStreetMap and grows through routes shared by the community.

## Status

🚧 Work in progress — architecture settled, implementation not yet started.

Full rationale, data model, and testing strategy:
[`docs/specs/2026-08-28-tech-stack-design.md`](docs/specs/2026-08-28-tech-stack-design.md).

## Planned features (v1)

- Bilingual site (Traditional Chinese and English) from day one
- Route library with filtering by activity type, difficulty, and length
- Interactive map view — all routes on one map
- Route detail pages with GPX tracks, elevation profile, notes, and photos
- Google sign-in (no self-managed passwords)
- Community-submitted routes, published only after moderator approval

Comments, ratings, saved collections, and coverage beyond Taipei / New Taipei /
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
