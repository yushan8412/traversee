import { isWithinCoverage } from '../gpx/geo'

export interface SearchResult {
  name: string
  kind: string
  lng: number
  lat: number
}

/** More than a phone screen wants to scroll past under a map. */
const MOST_RESULTS = 5

/**
 * Turns Azure Maps' geocoding response into somewhere the form can be sent.
 *
 * The filtering is the substance. Azure's `bbox` biases the ranking and
 * excludes nothing: measured on 2026-09-02, the first hit for 大屯山 — a place
 * already in this database — was a point of interest of the same name in
 * Heilongjiang, 2,300km away. Offering it would drop the pin there and then the
 * submission would be refused by our own coverage check.
 *
 * So the same predicate that decides whether a submission is accepted decides
 * what search is allowed to offer. Search cannot propose a place the form would
 * then reject.
 *
 * The cost is that a real place outside the box, or one Azure does not hold, is
 * simply not found — 龍洞灣 returns two villages in mainland China and nothing
 * else. Which is why the map still takes a tap: search is a shortcut, not the
 * way in.
 */
export function readSearchResults(payload: unknown): SearchResult[] {
  const features = (payload as { features?: unknown })?.features
  if (!Array.isArray(features)) return []

  const results: SearchResult[] = []

  for (const feature of features) {
    const coordinates = feature?.geometry?.coordinates
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue

    const [lng, lat] = coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    if (!isWithinCoverage([lng, lat])) continue

    const name = feature?.properties?.address?.formattedAddress
    if (typeof name !== 'string' || name === '') continue

    results.push({ name, kind: String(feature?.properties?.type ?? ''), lng, lat })
    if (results.length === MOST_RESULTS) break
  }

  return results
}

/**
 * `countryRegion` cannot be sent alongside `query` — the service answers 400
 * Conflicting Parameters — so the country is not expressible as a filter here
 * and the coverage check above is what does the work.
 */
export function searchUrl(query: string): URL {
  const url = new URL('https://atlas.microsoft.com/geocode')
  url.searchParams.set('api-version', '2026-01-01')
  url.searchParams.set('query', query)
  // Asks for more than it shows, because the results that get discarded are
  // frequently the highest ranked ones.
  url.searchParams.set('top', '10')
  url.searchParams.set('bbox', '119.3,21.75,122.1,25.4')
  return url
}
