import { describe, expect, it } from 'vitest'
import { needsHeicDecoding } from './heic'

/** An ISO base-media file: 4 bytes of size, 'ftyp', then the brand. */
function container(brand: string): Buffer {
  const header = Buffer.alloc(12)
  header.writeUInt32BE(24, 0)
  header.write('ftyp', 4, 'ascii')
  header.write(brand, 8, 'ascii')
  return Buffer.concat([header, Buffer.alloc(12)])
}

describe('needsHeicDecoding', () => {
  it('recognises the brands an iPhone writes', () => {
    // These are HEVC-encoded, and the build has no HEVC decoder.
    for (const brand of ['heic', 'heix', 'hevc', 'hevx', 'mif1']) {
      expect(needsHeicDecoding(container(brand))).toBe(true)
    }
  })

  it('does not flag AVIF, which the build can decode', () => {
    // Same container family, different codec — AV1, and libaom is present. A
    // check on the container alone would reject a format that works.
    expect(needsHeicDecoding(container('avif'))).toBe(false)
  })

  it('does not flag ordinary photo formats', () => {
    expect(needsHeicDecoding(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe(false) // JPEG
    expect(needsHeicDecoding(Buffer.from('RIFF....WEBPVP8 '))).toBe(false)
  })

  it('does not flag something too short to identify', () => {
    // Truncated input is a broken upload, not specifically a HEIC one, and
    // saying "convert your HEIC" about a corrupt JPEG would send someone down
    // the wrong path.
    expect(needsHeicDecoding(Buffer.alloc(4))).toBe(false)
  })
})
