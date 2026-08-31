import { describe, expect, it } from 'vitest'
import sharp, { type Exif } from 'sharp'
import { processPhoto } from './process'

/** A JPEG carrying the GPS tags a phone camera writes at the trailhead. */
async function photoWithLocation(width = 2400, height = 1600): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 90, g: 130, b: 90 } },
  })
    // sharp's types cover IFD0–IFD3 but not the GPS directory, which the runtime
    // does accept. GPS is precisely what this test is about, so the cast stays.
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'X1' },
      GPS: { GPSLatitude: '25/1 9/1 0/1', GPSLatitudeRef: 'N', GPSLongitude: '121/1 33/1 0/1' },
    } as Exif)
    .jpeg()
    .toBuffer()
}

describe('processPhoto', () => {
  it('re-encodes to WebP', async () => {
    const { full } = await processPhoto(await photoWithLocation())
    expect((await sharp(full).metadata()).format).toBe('webp')
  })

  it('strips EXIF, so the location a camera embedded does not get published', async () => {
    // Outdoor photos routinely carry the coordinates of where they were taken.
    // Publishing those alongside a submitter's name discloses where a person
    // was, which is not something they consented to by uploading a picture.
    const source = await photoWithLocation()
    expect((await sharp(source).metadata()).exif).toBeDefined()

    const { full, thumb } = await processPhoto(source)
    expect((await sharp(full).metadata()).exif).toBeUndefined()
    expect((await sharp(thumb).metadata()).exif).toBeUndefined()
  })

  it('bounds the long edge so an upload cannot be published at full camera size', async () => {
    const { full } = await processPhoto(await photoWithLocation(6000, 4000))
    const meta = await sharp(full).metadata()
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(1600)
  })

  it('does not enlarge an image that is already small', async () => {
    // Upscaling would inflate the file for no visible gain.
    const { full } = await processPhoto(await photoWithLocation(800, 600))
    const meta = await sharp(full).metadata()
    expect(meta.width).toBe(800)
  })

  it('produces a thumbnail much smaller than the full image', async () => {
    const { full, thumb } = await processPhoto(await photoWithLocation())
    expect(thumb.byteLength).toBeLessThan(full.byteLength)
    expect((await sharp(thumb).metadata()).width).toBeLessThanOrEqual(400)
  })

  it('reports the dimensions the caller has to store', async () => {
    // The document records width and height so the page can reserve space and
    // avoid the layout jumping as images arrive.
    const result = await processPhoto(await photoWithLocation(2400, 1600))
    expect(result.width).toBe(1600)
    expect(result.height).toBeGreaterThan(1000)
  })

  it('rejects input that is not an image', async () => {
    await expect(processPhoto(Buffer.from('this is not an image'))).rejects.toThrow()
  })
})
