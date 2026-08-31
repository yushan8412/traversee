import type { Position } from './geo'

const EARTH_RADIUS_M = 6_371_000
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Perpendicular distance from a point to the segment ab, in metres.
 *
 * Longitude degrees shrink towards the poles, so treating latitude and longitude
 * as a flat grid would understate east–west deviation — at 25°N by about 10%.
 * Projecting to metres first keeps the tolerance meaningful as a real distance
 * rather than as an angle that means different things in different directions.
 */
function perpendicularDistanceM(point: Position, a: Position, b: Position): number {
  const scale = Math.cos(toRadians(a[1]))
  const toXY = ([lng, lat]: Position) => [
    toRadians(lng) * scale * EARTH_RADIUS_M,
    toRadians(lat) * EARTH_RADIUS_M,
  ]

  const [px, py] = toXY(point)
  const [ax, ay] = toXY(a)
  const [bx, by] = toXY(b)

  const dx = bx! - ax!
  const dy = by! - ay!

  // A degenerate segment — the two ends coincide — has no line to measure
  // against, so fall back to the distance from the point itself.
  if (dx === 0 && dy === 0) return Math.hypot(px! - ax!, py! - ay!)

  const area = Math.abs(dy * px! - dx * py! + bx! * ay! - by! * ax!)
  return area / Math.hypot(dx, dy)
}

/**
 * Ramer–Douglas–Peucker. Reduces a recorded track to the shape it actually
 * describes, so a route stored for the list and overview map carries tens of
 * points rather than the thousands a GPS logged.
 *
 * `toleranceM` is how far the simplified line may sit from any dropped point.
 */
export function simplify(track: Position[], toleranceM: number): Position[] {
  if (track.length <= 2) return [...track]

  const first = track[0]!
  const last = track[track.length - 1]!

  let furthest = 0
  let furthestIndex = 0
  for (let i = 1; i < track.length - 1; i++) {
    const distance = perpendicularDistanceM(track[i]!, first, last)
    if (distance > furthest) {
      furthest = distance
      furthestIndex = i
    }
  }

  if (furthest <= toleranceM) return [first, last]

  // The furthest point is kept and both halves are simplified around it, which
  // is what preserves corners a fixed-interval sample would smooth away.
  const left = simplify(track.slice(0, furthestIndex + 1), toleranceM)
  const right = simplify(track.slice(furthestIndex), toleranceM)
  return [...left.slice(0, -1), ...right]
}
