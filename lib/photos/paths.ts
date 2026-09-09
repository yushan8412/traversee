/**
 * Grouped under the place's identifier so approval moves one entry's files and
 * nothing of anyone else's, and so a deletion has an obvious scope.
 *
 * The key is a string rather than a position. A submission numbers its photos
 * 0, 1, 2 and that is fine, because the place is new and no path can already
 * exist. Editing is different: delete the second of three photographs, add
 * another, and a positional name hands the new file the path the deleted one
 * had — where a cache, a CDN or an open tab may still be holding the old bytes.
 * The edit path passes a fresh identifier instead.
 */
export function photoPaths(
  placeId: string,
  key: string | number,
): { path: string; thumbPath: string } {
  return {
    path: `photos/${placeId}/${key}.webp`,
    thumbPath: `photos/${placeId}/${key}-thumb.webp`,
  }
}
