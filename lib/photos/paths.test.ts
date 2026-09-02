import { describe, expect, it } from 'vitest'
import { photoPaths } from './paths'
import { checkUploads, MAX_PHOTOS, MAX_PHOTO_BYTES } from './limits'

describe('photoPaths', () => {
  it('groups a place\'s photos under its own identifier', () => {
    // Grouping by place means approval moves a whole directory's worth of files
    // for one entry, and nothing of anyone else's.
    expect(photoPaths('abc-123', 0)).toEqual({
      path: 'photos/abc-123/0.webp',
      thumbPath: 'photos/abc-123/0-thumb.webp',
    })
  })

  it('numbers photos so order is stable', () => {
    expect(photoPaths('abc-123', 2).path).toBe('photos/abc-123/2.webp')
  })
})

describe('checkUploads', () => {
  const file = (size: number, type = 'image/jpeg') => ({ size, type }) as File

  it('accepts a reasonable set', () => {
    expect(checkUploads([file(500_000), file(2_000_000)])).toBeNull()
  })

  it('accepts no photos at all', () => {
    // Photos are optional. A place with a good description and no picture is
    // still worth publishing.
    expect(checkUploads([])).toBeNull()
  })

  it('refuses more than the limit', () => {
    expect(checkUploads(Array.from({ length: MAX_PHOTOS + 1 }, () => file(1000)))).toBe(
      'too-many-photos',
    )
  })

  it('refuses a file past the size limit', () => {
    // Bounded so one submission cannot occupy the request or the free storage
    // grant on its own.
    expect(checkUploads([file(MAX_PHOTO_BYTES + 1)])).toBe('photo-too-large')
  })

  it('refuses anything that is not an image by declared type', () => {
    // A first, cheap filter. The real check is that sharp can decode it, which
    // happens when the bytes are processed — a declared type is only a claim.
    expect(checkUploads([file(1000, 'application/pdf')])).toBe('photo-not-an-image')
  })
})
