import type { Place } from './types'

/**
 * Every blob this place owns, in the order they should be moved.
 *
 * Approval copies these from the private container to the public one, and
 * taking something down moves them back — a file that stays publicly readable
 * after its entry is unpublished makes unpublishing meaningless.
 *
 * Deduplicated because the same path can be referenced twice, and moving a blob
 * that has already been moved fails in a way that looks like a real error.
 */
export function filesOf(place: Place): string[] {
  const paths = [
    place.route?.gpxPath,
    place.approach?.gpxPath,
    ...place.photos.flatMap((photo) => [photo.path, photo.thumbPath]),
  ]

  return [...new Set(paths.filter((path): path is string => Boolean(path)))]
}
