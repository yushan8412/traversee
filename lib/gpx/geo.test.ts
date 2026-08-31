import { describe, expect, it } from 'vitest'
import { distanceKm, elevationGainM, isWithinCoverage, trackLengthKm } from './geo'
import type { Position } from './geo'

describe('distanceKm', () => {
  it('measures a hundredth of a degree of latitude as about 1.11 km', () => {
    // A degree of latitude is ~111.19 km anywhere on the globe, so this is the
    // one distance that can be checked against a constant rather than against
    // whatever the implementation happens to produce.
    expect(distanceKm([121.5, 25.0], [121.5, 25.01])).toBeCloseTo(1.112, 2)
  })
})

describe('trackLengthKm', () => {
  it('sums the legs of a track', () => {
    const track: Position[] = [
      [121.5, 25.0],
      [121.5, 25.01],
      [121.5, 25.02],
    ]
    expect(trackLengthKm(track)).toBeCloseTo(2.224, 2)
  })

  it('is zero for a track that cannot form a leg', () => {
    expect(trackLengthKm([[121.5, 25.0]])).toBe(0)
    expect(trackLengthKm([])).toBe(0)
  })
})

describe('elevationGainM', () => {
  it('counts only the climbing, not the descent', () => {
    // Someone judging whether they can manage a route cares about how much they
    // have to go up. Netting the descent against it would report a loop that
    // climbs 800 m as flat.
    expect(elevationGainM([100, 300, 250, 400])).toBe(350)
  })

  it('ignores points with no recorded elevation', () => {
    // Consumer GPS units drop elevation intermittently. Treating a missing
    // reading as zero would invent a descent to sea level and a climb back.
    expect(elevationGainM([100, null, 300])).toBe(200)
  })
})

describe('isWithinCoverage', () => {
  it('accepts places inside northern Taiwan', () => {
    expect(isWithinCoverage([121.5518, 25.1662])).toBe(true) // Yangmingshan
    expect(isWithinCoverage([121.9441, 25.0206])).toBe(true) // Fulong
    expect(isWithinCoverage([121.7961, 25.1449])).toBe(true) // Keelung
  })

  it('rejects places outside it', () => {
    // Submissions carry coordinates from a file the site did not produce, so
    // "somewhere in Taiwan" is not good enough — a track from Kenting would
    // otherwise publish onto a site that claims to cover the north.
    expect(isWithinCoverage([120.8, 21.95])).toBe(false) // Kenting
    expect(isWithinCoverage([139.7, 35.7])).toBe(false) // Tokyo
  })

  it('rejects coordinates given the wrong way round', () => {
    // [lat, lng] instead of [lng, lat] is the single most common geospatial
    // mistake, and both numbers here are individually plausible.
    expect(isWithinCoverage([25.0339, 121.5645])).toBe(false)
  })
})
