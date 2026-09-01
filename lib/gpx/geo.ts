/** [longitude, latitude] — GeoJSON order, which is the reverse of how people say it. */
export type Position = [number, number]

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

export function distanceKm(from: Position, to: Position): number {
  const [lng1, lat1] = from
  const [lng2, lat2] = to

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/**
 * Taiwan: the main island, Penghu, and Green and Orchid Islands. The same box
 * both maps are bounded to.
 *
 * Kinmen and Lienchiang fall outside it, and that is deliberate rather than an
 * oversight. Kinmen sits at 118.3E and Matsu at 26.1N; a rectangle stretched to
 * reach either one also swallows Fuzhou and the Fujian coast, so a box cannot
 * express "Taiwan" and include them. Covering them needs a second check, not a
 * looser first one — a bound that accepts mainland China is worse than one that
 * turns two archipelagos away with an error a person can read.
 */
const COVERAGE = { minLng: 119.3, maxLng: 122.1, minLat: 21.75, maxLat: 25.4 }

/**
 * Submissions carry coordinates from a file this site did not produce, so the
 * region has to be checked rather than assumed. It also catches [lat, lng]
 * given the wrong way round, which is the most common geospatial mistake there
 * is and which no amount of care in our own code prevents in someone else's.
 */
export function isWithinCoverage([lng, lat]: Position): boolean {
  return (
    lng >= COVERAGE.minLng &&
    lng <= COVERAGE.maxLng &&
    lat >= COVERAGE.minLat &&
    lat <= COVERAGE.maxLat
  )
}

export function trackLengthKm(track: Position[]): number {
  let total = 0
  for (let i = 1; i < track.length; i++) {
    total += distanceKm(track[i - 1]!, track[i]!)
  }
  return total
}

/**
 * Cumulative ascent only. Netting the descent against it would report a loop
 * that climbs 800 m as flat, and climbing is what someone judging a route
 * against their own fitness actually needs to know.
 *
 * Missing readings are skipped rather than treated as zero: consumer GPS units
 * drop elevation intermittently, and a zero would invent a plunge to sea level
 * followed by the whole climb again.
 */
export function elevationGainM(elevations: (number | null | undefined)[]): number {
  let gain = 0
  let previous: number | null = null

  for (const elevation of elevations) {
    if (elevation == null) continue
    if (previous != null && elevation > previous) gain += elevation - previous
    previous = elevation
  }

  return gain
}
