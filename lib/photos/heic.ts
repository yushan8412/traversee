/**
 * HEIF brands whose image data is HEVC-encoded.
 *
 * sharp reports HEIF input as supported because libheif is in the build, but
 * the HEVC decoder is not — libde265 is absent, for licensing reasons. So the
 * container opens and the image will not decode. These are routed through the
 * WebAssembly decoder first.
 *
 * `avif` is deliberately not here: it is the same container family with AV1
 * inside, and libaom is present, so those files work.
 */
const HEVC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'])

/**
 * Reads the file's own bytes rather than the type the browser declared, because
 * a declared content type is an assertion by the sender and phone uploads get it
 * wrong often enough to matter.
 */
export function needsHeicDecoding(buffer: Buffer): boolean {
  // 4 bytes of box size, then 'ftyp', then the 4-byte brand.
  if (buffer.length < 12) return false
  if (buffer.toString('ascii', 4, 8) !== 'ftyp') return false

  return HEVC_BRANDS.has(buffer.toString('ascii', 8, 12))
}
