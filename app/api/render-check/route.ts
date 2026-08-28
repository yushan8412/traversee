// M0's acceptance probe.
//
// The question this milestone exists to answer is whether Static Web Apps
// really runs this app server-side, or quietly degrades it to a static export.
// A static export cannot produce a value that changes between two requests, so
// `renderedAt` and `requestId` differing across consecutive calls is the proof.
//
// `nodeVersion` and `region` are here because Microsoft's docs disagree with
// reality about which Node version the hybrid runtime uses; this reports what
// actually ran rather than what the docs claim.

export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json(
    {
      renderedAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      nodeVersion: process.version,
      region: process.env.REGION_NAME ?? null,
      website: process.env.WEBSITE_SITE_NAME ?? null,
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
