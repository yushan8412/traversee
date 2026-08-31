import sharp, { type Exif } from 'sharp'
import { processPhoto } from '../../../lib/photos/process'

// The photo pipeline's acceptance probe, in the same spirit as
// /api/render-check.
//
// sharp is a native module: it ships prebuilt binaries per platform and
// architecture, and Static Web Apps re-runs npm install at deploy time on a
// Linux host that is not the one this was developed on. Whether it loads there
// cannot be established from a laptop, and finding out after the upload form is
// built would mean redesigning the flow rather than fixing a line.
//
// This exercises the real function on a generated image, so a deploy that
// cannot process photos says so instead of waiting for a submitter to discover
// it.

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: { r: 90, g: 130, b: 90 } },
    })
      // sharp's published types describe only IFD0–IFD3, while the runtime
      // accepts the GPS directory too. GPS is the tag worth testing against,
      // since it is the one that leaks where a person was, so the cast is
      // narrowed to this call rather than the types being worked around.
      .withExif({ GPS: { GPSLatitude: '25/1 9/1 0/1', GPSLatitudeRef: 'N' } } as Exif)
      .jpeg()
      .toBuffer()

    const sourceHadExif = Boolean((await sharp(source).metadata()).exif)
    const { full, thumb, width, height } = await processPhoto(source)
    const outputMeta = await sharp(full).metadata()

    return Response.json(
      {
        ok: true,
        sharp: sharp.versions,
        platform: `${process.platform}-${process.arch}`,
        nodeVersion: process.version,
        region: process.env.REGION_NAME ?? null,
        // The assertion that matters: the generated source carried GPS tags and
        // the output does not.
        sourceHadExif,
        outputHasExif: Boolean(outputMeta.exif),
        format: outputMeta.format,
        width,
        height,
        fullBytes: full.byteLength,
        thumbBytes: thumb.byteLength,
      },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    // A native module that will not load throws on first use, so the message is
    // the diagnosis and is worth returning rather than hiding.
    return Response.json(
      {
        ok: false,
        platform: `${process.platform}-${process.arch}`,
        nodeVersion: process.version,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    )
  }
}
