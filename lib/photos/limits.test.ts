import { describe, expect, it } from 'vitest'
import zh from '../../messages/zh.json'
import en from '../../messages/en.json'
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from './limits'

/**
 * A limit written into a sentence is a copy of the limit, and copies drift.
 *
 * On 2026-09-02 a submission was refused for a photo of about fifteen megabytes
 * and the refusal read "單張照片上限 15 MB" — the enforced limit was five. The
 * message had been written when the limit was fifteen and was never revisited,
 * so it told the submitter the file was fine at exactly the moment it was
 * rejecting it.
 *
 * These assert that the numbers arrive as placeholders the renderer fills from
 * the constants, which is the only version that cannot go out of date.
 */
describe('limit messages', () => {
  const messages = [
    ['zh', zh.submit.errors],
    ['en', en.submit.errors],
  ] as const

  it('takes the photo size limit from the constant', () => {
    for (const [locale, errors] of messages) {
      expect(errors['photo-too-large'], locale).toContain('{limit}')
      expect(errors['photo-too-large'], `${locale} states a size of its own`).not.toMatch(/\d/)
    }
  })

  it('takes the photo count limit from the constant', () => {
    for (const [locale, errors] of messages) {
      expect(errors['too-many-photos'], locale).toContain('{max}')
      expect(errors['too-many-photos'], `${locale} states a count of its own`).not.toMatch(/\d/)
    }
    // The hint beside the file picker says the same thing before anything goes
    // wrong, so it can drift the same way.
    expect(zh.submit.photosHint).toContain('{max}')
    expect(en.submit.photosHint).toContain('{max}')
  })

  it('states the photo limit in whole megabytes, so the message reads cleanly', () => {
    expect(MAX_PHOTO_BYTES % (1024 * 1024)).toBe(0)
  })

  it('keeps a full submission inside the server action body limit', () => {
    // next.config.ts sets serverActions.bodySizeLimit to 32mb. A submission that
    // the per-file check accepts must still fit, or the request is refused by
    // the framework before any of this code sees it and the submitter is told
    // nothing at all.
    expect(MAX_PHOTOS * MAX_PHOTO_BYTES).toBeLessThanOrEqual(32 * 1024 * 1024)
  })
})
