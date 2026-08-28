import { headers } from 'next/headers'

// Calling headers() opts this page into dynamic rendering on its own; the
// explicit flag states the intent so nobody "optimises" it away later without
// realising it invalidates M0's proof.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const requestHeaders = await headers()

  return (
    <main>
      <h1>Traversee</h1>
      <p className="tagline">北北基戶外活動地點庫 · Outdoor places in northern Taiwan</p>

      <h2>Render check</h2>
      <div className="probe">
        <dl>
          <dt>Rendered at</dt>
          <dd>{new Date().toISOString()}</dd>

          <dt>Node</dt>
          <dd>{process.version}</dd>

          <dt>Region</dt>
          <dd>{process.env.REGION_NAME ?? 'local'}</dd>

          <dt>Host header</dt>
          <dd>{requestHeaders.get('host') ?? 'unknown'}</dd>
        </dl>
        <p className="note">
          These values are computed per request. If this page were being served as a static
          export, the timestamp would be frozen at build time and identical on every reload —
          so a changing timestamp is what proves server-side rendering is actually running.
          The same values are available as JSON at <a href="/api/render-check">/api/render-check</a>.
        </p>
      </div>

      <footer>
        Milestone 0 — validating the deployment path before anything is built on it. Architecture:{' '}
        <a href="https://github.com/yushan8412/traversee/blob/main/docs/specs/2026-08-28-tech-stack-design.md">
          technical spec
        </a>
        .
      </footer>
    </main>
  )
}
