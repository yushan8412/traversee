import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Lengshuikeng Loop')).toBe('lengshuikeng-loop')
  })

  it('drops punctuation rather than encoding it', () => {
    // A slug with %27 in it is unreadable in a shared link and awkward to type.
    expect(slugify("Teapot Mountain's Ridge")).toBe('teapot-mountains-ridge')
    expect(slugify('Old Caoling — Circular Route')).toBe('old-caoling-circular-route')
  })

  it('collapses runs of separators and trims the ends', () => {
    expect(slugify('  Fulong   Beach  ')).toBe('fulong-beach')
    expect(slugify('--Wangyou--Valley--')).toBe('wangyou-valley')
  })

  it('keeps digits', () => {
    expect(slugify('Trail 101')).toBe('trail-101')
  })

  it('returns empty for text with nothing URL-safe in it', () => {
    // Chinese does not transliterate to ASCII usefully, and a machine
    // romanisation would produce a slug no reader recognises. The caller decides
    // what to do instead; this does not invent one.
    expect(slugify('冷水坑環走')).toBe('')
    expect(slugify('！？')).toBe('')
  })

  it('bounds the length so a long name cannot make an unusable URL', () => {
    const slug = slugify('a'.repeat(200))
    expect(slug.length).toBeLessThanOrEqual(80)
  })

  it('does not end on a hyphen after truncation', () => {
    const slug = slugify(`${'word '.repeat(40)}`)
    expect(slug.endsWith('-')).toBe(false)
  })
})
