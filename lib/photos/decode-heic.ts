import sharp from 'sharp'

/**
 * Decodes an HEVC-encoded HEIF image into something sharp can read.
 *
 * sharp's prebuilt binaries carry libheif but no HEVC decoder, so an iPhone
 * photo opens as a container and fails on the image inside. This fills that one
 * gap with a WebAssembly decoder.
 *
 * Imported lazily, and only after the bytes have been identified as HEIC. The
 * decoder is around 6 MB, and loading it on every upload would slow down the
 * ordinary JPEG path and every cold start for a format most files are not.
 */
export async function heicToJpeg(source: Buffer): Promise<Buffer> {
  const { default: decode } = await import('heic-decode')

  // Raw RGBA out of the decoder; sharp needs to be told the shape because
  // there is no header on raw pixels to read it from.
  const { width, height, data } = await decode({ buffer: source })

  return sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .jpeg({ quality: 92 })
    .toBuffer()
}
