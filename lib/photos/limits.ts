/**
 * What a submission may carry, and what gets published.
 *
 * These sit in their own module with no dependencies because both sides need
 * them: the server enforces them, and the browser needs to know what it is
 * aiming at before it uploads anything. Importing them from a module that pulls
 * in sharp would drag an image library into the client bundle.
 */

/** Enough to show a place without turning a submission into an album. */
export const MAX_PHOTOS = 6

/**
 * Bounded so one submission cannot occupy the request or the storage grant
 * alone. Six of these fit inside the server action's 32 MB body limit, and the
 * whole body sits in the function's memory while it is processed.
 *
 * The browser shrinks photos to `MAX_EDGE` before uploading, so this is a
 * backstop for the cases where it cannot — not the size a phone photo has to be.
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/** Long edge of the published image. Enough for a detail page, far below camera size. */
export const MAX_EDGE = 1600
export const THUMB_EDGE = 400

/**
 * What the limit messages interpolate.
 *
 * The messages carry placeholders rather than numbers because a number written
 * into a sentence is a copy, and the copy went stale: a submission was once
 * refused for being over five megabytes by a message that said the limit was
 * fifteen.
 */
export const LIMIT_MESSAGE_VALUES = {
  max: MAX_PHOTOS,
  limit: MAX_PHOTO_BYTES / (1024 * 1024),
}

export type UploadProblem = 'too-many-photos' | 'photo-too-large' | 'photo-not-an-image'

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
