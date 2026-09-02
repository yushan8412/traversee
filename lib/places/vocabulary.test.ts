import { describe, expect, it } from 'vitest'
import zh from '../../messages/zh.json'
import en from '../../messages/en.json'
import { ACTIVITIES, CITIES } from './types'
import { REGION_CITIES } from './regions'

/**
 * The vocabulary has to line up with everything that reads it.
 *
 * These exist because it did not. On 2026-09-02 the submit form offered twenty
 * counties while the server action behind it accepted three, so every
 * submission outside 北北基 failed; and diving had been added to the type and
 * to four display surfaces while all four copies of the submit vocabulary still
 * listed seven activities, so it could not be submitted at all.
 *
 * Both were invisible to the type checker, because a hand-written array of
 * string literals is assignable to the union whether or not it is complete.
 * Deriving the type from one array closed that hole; these close the ones the
 * type system still cannot see — translations and region coverage.
 */
describe('vocabulary', () => {
  it('gives every city a label in both languages', () => {
    for (const city of CITIES) {
      expect(zh.places.city, `zh label for ${city}`).toHaveProperty(city)
      expect(en.places.city, `en label for ${city}`).toHaveProperty(city)
    }
  })

  it('gives every activity a label in both languages', () => {
    for (const activity of ACTIVITIES) {
      expect(zh.places.activity, `zh label for ${activity}`).toHaveProperty(activity)
      expect(en.places.activity, `en label for ${activity}`).toHaveProperty(activity)
    }
  })

  it('gives every activity the prose the home carousel needs', () => {
    for (const activity of ACTIVITIES) {
      expect(zh.home.lead, `zh lead for ${activity}`).toHaveProperty(activity)
      expect(zh.home.blurb, `zh blurb for ${activity}`).toHaveProperty(activity)
      expect(en.home.lead, `en lead for ${activity}`).toHaveProperty(activity)
      expect(en.home.blurb, `en blurb for ${activity}`).toHaveProperty(activity)
    }
  })

  it('places every city in exactly one region', () => {
    const placed = Object.values(REGION_CITIES).flat()
    expect([...placed].sort()).toEqual([...CITIES].sort())
    expect(new Set(placed).size, 'a city appears in two regions').toBe(placed.length)
  })

  it('carries no label for a city or activity that no longer exists', () => {
    expect(Object.keys(zh.places.city).sort()).toEqual([...CITIES].sort())
    expect(Object.keys(zh.places.activity).sort()).toEqual([...ACTIVITIES].sort())
  })
})
