import { processPhoto } from './process'
import { needsHeicDecoding } from './heic'
import { heicToJpeg } from './decode-heic'
import { photoPaths } from './paths'
import { PENDING, upload } from '../storage/blob'
import type { Photo } from '../places/types'

/**
 * Processes uploads and writes them to the private container.
 *
 * Both the full image and its thumbnail are re-encoded, which is what strips
 * the metadata: a phone writes the coordinates of where a photo was taken into
 * the file, and publishing those beside a submitter's name discloses where a
 * person was.
 *
 * A submission's photographs land in `pending` regardless of who sent them:
 * approval is what makes a file publicly readable, so an image is never
 * reachable before somebody has looked at it. A photograph added to an entry
 * that is *already published* goes straight to `public`, because `filesOf` and
 * the promote/demote pair assume a file sits in the container its entry's
 * status implies.
 */
export async function storePhotos(
  placeId: string,
  files: File[],
  { container = PENDING, key }: { container?: string; key?: (index: number) => string } = {},
): Promise<Photo[]> {
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
    const { path, thumbPath } = photoPaths(placeId, key ? key(index) : index)

    await upload(container, path, full, 'image/webp')
    await upload(container, thumbPath, thumb, 'image/webp')

    stored.push({ path, thumbPath, width, height })
  }

  return stored
}

