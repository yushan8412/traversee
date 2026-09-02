export type TileSource = 'azure' | 'osm'

/**
 * Which basemap the tiles come from, decided on the server per request.
 *
 * Azure Maps bills base tiles at one transaction per fifteen requests against a
 * grant of 5,000 a month. Measured on 2026-09-02: one visit to a map page with
 * nine gestures costs 164 tile requests, so the grant is worth roughly 455 such
 * visits — and 78,726 requests went in a single day of design review with no
 * visitors at all, simply from reloading the page.
 *
 * So the source is a setting rather than a constant: preview environments and
 * local work can draw from OpenStreetMap and cost nothing, while production
 * keeps the licensed tiles. OSM's tile usage policy is why production is not
 * the default for it, and why this has to be set deliberately.
 *
 * Read at request time, not inlined at build time. `NEXT_PUBLIC_` would have
 * been simpler to write and would have meant a rebuild to change it; this can be
 * flipped in Static Web Apps application settings.
 */
export function resolveTileSource(): TileSource {
  const configured = process.env.MAPS_TILE_SOURCE
  if (configured === 'azure' || configured === 'osm') return configured
  return process.env.NODE_ENV === 'production' ? 'azure' : 'osm'
}
