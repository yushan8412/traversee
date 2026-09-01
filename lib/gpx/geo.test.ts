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
  it('accepts places the length of the island', () => {
    expect(isWithinCoverage([121.5518, 25.1662])).toBe(true) // Yangmingshan, north
    expect(isWithinCoverage([120.9573, 23.4699])).toBe(true) // Yushan, centre
    expect(isWithinCoverage([120.8, 21.95])).toBe(true) // Kenting, south
    expect(isWithinCoverage([121.4936, 22.6614])).toBe(true) // Green Island
    expect(isWithinCoverage([119.5665, 23.5711])).toBe(true) // Penghu
  })

  it('rejects places outside it', () => {
    expect(isWithinCoverage([139.7, 35.7])).toBe(false) // Tokyo
    expect(isWithinCoverage([121.0, 19.5])).toBe(false) // Batanes, south of the box
  })

  it('rejects Kinmen and Matsu, which the box cannot reach', () => {
    // Not an oversight. A rectangle stretched to either archipelago also covers
    // the Fujian coast, so they are refused with a message that says so rather
    // than admitted alongside somewhere in mainland China.
    expect(isWithinCoverage([118.3186, 24.4364])).toBe(false) // Kinmen
    expect(isWithinCoverage([119.9494, 26.1608])).toBe(false) // Nangan, Matsu
  })

  it('rejects the mainland coast the box comes closest to', () => {
    expect(isWithinCoverage([119.3061, 26.0745])).toBe(false) // Fuzhou
    expect(isWithinCoverage([118.0894, 24.4798])).toBe(false) // Xiamen
  })

  it('rejects coordinates given the wrong way round', () => {
    // [lat, lng] instead of [lng, lat] is the single most common geospatial
    // mistake, and both numbers here are individually plausible.
    expect(isWithinCoverage([25.0339, 121.5645])).toBe(false)
  })
})
