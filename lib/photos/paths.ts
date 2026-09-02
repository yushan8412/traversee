/**
 * Grouped under the place's identifier so approval moves one entry's files and
 * nothing of anyone else's, and so a deletion has an obvious scope.
 */
export function photoPaths(placeId: string, index: number): { path: string; thumbPath: string } {
  return {
    path: `photos/${placeId}/${index}.webp`,
    thumbPath: `photos/${placeId}/${index}-thumb.webp`,
  }
}
