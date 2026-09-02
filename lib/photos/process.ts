import sharp from 'sharp'
import { MAX_EDGE, THUMB_EDGE } from './limits'

export interface ProcessedPhoto {
  full: Buffer
  thumb: Buffer
  width: number
  height: number
}

/**
 * Re-encodes an upload to WebP and drops everything else it was carrying.
 *
 * The metadata is the point, not a side effect. Phones write GPS coordinates
 * into outdoor photos, and publishing those next to a submitter's name discloses
 * where a person was — which nobody agreed to by uploading a picture. sharp
 * drops metadata by default; this function never opts back in, and the tests
 * assert the absence rather than trusting that default to hold across upgrades.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const pipeline = sharp(input, { failOn: 'error' })

  // Throws for anything that is not a decodable image, which is what turns a
  // bad upload into a rejected submission rather than a corrupt blob.
  const metadata = await pipeline.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read the image dimensions; the upload is not a usable image.')
  }

  // rotate() with no argument applies the EXIF orientation and is a no-op
  // without one. It has to happen before the metadata is dropped: a phone held
  // upright records a landscape frame and a tag saying to turn it, and stripping
  // the tag without acting on it publishes the photo on its side for good.
  const full = await sharp(input)
    .rotate()
    // withoutEnlargement keeps a small original at its own size; upscaling would
    // grow the file without adding anything visible.
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const thumb = await sharp(input)
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer()

  const fullMeta = await sharp(full).metadata()

  return { full, thumb, width: fullMeta.width, height: fullMeta.height }
}
