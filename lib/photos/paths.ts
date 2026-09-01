/** Enough to show a place without turning a submission into an album. */
export const MAX_PHOTOS = 6

/**
 * Bounded so one submission cannot occupy the request or the storage grant
 * alone. Six of these fit inside the server action's 32 MB body limit, and the
 * whole body sits in the function's memory while it is processed.
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export type UploadProblem = 'too-many-photos' | 'photo-too-large' | 'photo-not-an-image'

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

/**
 * A first, cheap filter on what the browser claimed. The real check is whether
 * sharp can decode the bytes, which happens during processing — a declared
 * content type is only an assertion by the sender.
 */
export function checkUploads(files: File[]): UploadProblem | null {
  if (files.length > MAX_PHOTOS) return 'too-many-photos'

  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) return 'photo-too-large'
    if (!file.type.startsWith('image/')) return 'photo-not-an-image'
  }

  return null
}
