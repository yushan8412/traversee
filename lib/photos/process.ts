import sharp from 'sharp'

export interface ProcessedPhoto {
  full: Buffer
  thumb: Buffer
  width: number
  height: number
}

/** Long edge of the published image. Enough for a detail page, far below camera size. */
const MAX_EDGE = 1600
const THUMB_EDGE = 400

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

  const full = await sharp(input)
    // withoutEnlargement keeps a small original at its own size; upscaling would
    // grow the file without adding anything visible.
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  const thumb = await sharp(input)
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer()

  const fullMeta = await sharp(full).metadata()

  return { full, thumb, width: fullMeta.width, height: fullMeta.height }
}
