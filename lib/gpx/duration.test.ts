import { describe, expect, it } from 'vitest'
import { movingMinutes } from './duration'

/** GPS units log every few seconds, so test data has to be spaced that way too. */
const at = (seconds: number) => new Date(Date.UTC(2026, 7, 31, 0, 0, seconds)).toISOString()

const MINUTE = 60

describe('movingMinutes', () => {
  it('sums the gaps between consecutive points', () => {
    expect(movingMinutes([at(0), at(60), at(120), at(180)])).toBe(3)
  })

  it('excludes a pause longer than the threshold', () => {
    // Two minutes of walking either side of a half-hour lunch stop. Counting the
    // stop would tell someone the route takes 34 minutes when it takes four.
    const stamps = [at(0), at(60), at(120), at(120 + 30 * MINUTE), at(120 + 31 * MINUTE)]
    expect(movingMinutes(stamps, { pauseThresholdMinutes: 10 })).toBe(3)
  })

  it('keeps a gap exactly at the threshold', () => {
    // The threshold is the longest gap still counted as movement, so the
    // boundary has to be decided rather than left to a stray comparison.
    expect(movingMinutes([at(0), at(10 * MINUTE)], { pauseThresholdMinutes: 10 })).toBe(10)
  })

  it('returns null when there are not enough timestamps', () => {
    // Not every GPX carries timestamps. Returning zero would be indistinguishable
    // from an instant route, while the spec wants the submitter's own estimate
    // used instead — a choice the caller can only make if this admits it does
    // not know.
    expect(movingMinutes([])).toBeNull()
    expect(movingMinutes([at(0)])).toBeNull()
  })

  it('ignores timestamps that run backwards', () => {
    // Some devices emit points out of order after losing signal. A negative gap
    // would subtract from the total and understate the time.
    expect(movingMinutes([at(0), at(120), at(60), at(180)])).toBe(3)
  })
})
