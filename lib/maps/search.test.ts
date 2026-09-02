import { describe, expect, it } from 'vitest'
import { readSearchResults } from './search'

function feature(name: string, type: string, coordinates: [number, number]) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: { type, address: { formattedAddress: name } },
  }
}

describe('readSearchResults', () => {
  it('keeps a result the submission validator would accept', () => {
    const results = readSearchResults({
      features: [feature('Datunshan, 台灣', 'Mountain', [121.5231, 25.1754])],
    })
    expect(results).toEqual([
      { name: 'Datunshan, 台灣', kind: 'Mountain', lng: 121.5231, lat: 25.1754 },
    ])
  })

  it('drops a result outside the coverage the rest of the site enforces', () => {
    // Measured against the live service on 2026-09-02: the top hit for 大屯山 is
    // a point of interest of the same name in Heilongjiang, and the bbox
    // parameter only biases the ranking — it does not exclude anything. Offering
    // it would put a pin 2,300km away on a form whose own validator then refuses
    // the submission.
    const results = readSearchResults({
      features: [
        feature('大屯山, 中國', 'PointOfInterest', [129.7224, 45.8462]),
        feature('Datunshan, 台灣', 'Mountain', [121.5231, 25.1754]),
      ],
    })
    expect(results.map((r) => r.name)).toEqual(['Datunshan, 台灣'])
  })

  it('returns nothing rather than something wrong when every hit is elsewhere', () => {
    // 龍洞灣 does this: both hits are villages in mainland China.
    const results = readSearchResults({
      features: [feature('龍洞灣村, 中國', 'AdminDivision3', [107.708, 30.007])],
    })
    expect(results).toEqual([])
  })

  it('survives a response that is missing the parts it reads', () => {
    expect(readSearchResults({})).toEqual([])
    expect(readSearchResults({ features: [{ type: 'Feature' }] })).toEqual([])
  })

  it('caps what it offers, so one query cannot fill the page', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      feature(`Peak ${i}`, 'Mountain', [121.5 + i * 0.001, 25.1]),
    )
    expect(readSearchResults({ features: many })).toHaveLength(5)
  })
})
