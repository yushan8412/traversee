import { processPhoto } from './process'
import { needsHeicDecoding } from './heic'
import { heicToJpeg } from './decode-heic'
import { photoPaths } from './paths'
import { uploadToPending } from '../storage/blob'
import type { Photo } from '../places/types'

/**
 * Processes uploads and writes them to the private container.
 *
 * Both the full image and its thumbnail are re-encoded, which is what strips
 * the metadata: a phone writes the coordinates of where a photo was taken into
 * the file, and publishing those beside a submitter's name discloses where a
 * person was.
 *
 * Everything lands in `pending` regardless of who submitted it. Approval is what
 * makes a file publicly readable, so an image is never reachable before somebody
 * has looked at it.
 */
export async function storePhotos(placeId: string, files: File[]): Promise<Photo[]> {
  const stored: Photo[] = []

  for (const [index, file] of files.entries()) {
    const source = Buffer.from(await file.arrayBuffer())

    // iPhone photos arrive HEVC-encoded, which sharp's build cannot decode, so
    // they are converted first. Detected from the file's own bytes rather than
    // its declared type or its name — this project's first real HEIC arrived
    // called .jpeg with its contents untouched.
    const decodable = needsHeicDecoding(source) ? await heicToJpeg(source) : source

    // Throws for anything that is not a decodable image, which rejects the
    // submission rather than storing a file nothing can render.
    const { full, thumb, width, height } = await processPhoto(decodable)
    const { path, thumbPath } = photoPaths(placeId, index)

    await uploadToPending(path, full, 'image/webp')
    await uploadToPending(thumbPath, thumb, 'image/webp')

    stored.push({ path, thumbPath, width, height })
  }

  return stored
}

/** Where an approved photo can be read from. */
export function publicPhotoUrl(path: string): string {
  const base = process.env.BLOB_PUBLIC_BASE_URL
  if (!base) throw new Error('BLOB_PUBLIC_BASE_URL is not set.')
  return `${base.replace(/\/+$/, '')}/${path}`
}
