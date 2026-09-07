import { describe, expect, it } from 'vitest'
import { readSearchResults } from './search'

function feature(
  name: string,
  type: string,
  coordinates: [number, number],
  districts?: string[],
) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: {
      type,
      address: {
        formattedAddress: name,
        // Absent entirely for some results — a national park carries only a
        // country. Shaped as the service actually shapes it: the county is the
        // last entry, and a county is prefixed by its province.
        ...(districts ? { adminDistricts: districts.map((shortName) => ({ shortName })) } : {}),
      },
    },
  }
}

describe('readSearchResults', () => {
  it('keeps a result the submission validator would accept', () => {
    const results = readSearchResults({
      features: [feature('Datunshan, 台灣', 'Mountain', [121.5231, 25.1754])],
    })
    expect(results).toEqual([
      { name: 'Datunshan, 台灣', kind: 'Mountain', lng: 121.5231, lat: 25.1754, city: null },
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

describe('the county that comes back with a result', () => {
  it('reads the county off the end of adminDistricts, not the front', () => {
    // [臺灣省, 宜蘭縣] — reading the front would file every county entry under
    // a province that is not one of ours.
    const results = readSearchResults({
      features: [feature('礁溪, 台灣', 'PopulatedPlace', [121.77, 24.83], ['臺灣省', '宜蘭縣'])],
    })
    expect(results[0]!.city).toBe('yilan')
  })

  it('handles a direct municipality, which repeats itself', () => {
    const results = readSearchResults({
      features: [feature('松高路, 台灣', 'Address', [121.567, 25.036], ['臺北市', '臺北市'])],
    })
    expect(results[0]!.city).toBe('taipei')
  })

  it('knows Penghu by the name the service actually uses', () => {
    const results = readSearchResults({
      features: [feature('馬公, 台灣', 'PopulatedPlace', [119.566, 23.565], ['澎湖群島'])],
    })
    expect(results[0]!.city).toBe('penghu')
  })

  it('offers the result anyway when the response carries no county', () => {
    // A national park is exactly this case, and parks are most of what this
    // site catalogues. The form then asks rather than guessing.
    const results = readSearchResults({
      features: [feature('陽明山國家公園, 台灣', 'Park', [121.56, 25.16])],
    })
    expect(results).toHaveLength(1)
    expect(results[0]!.city).toBeNull()
  })

  it('says nothing rather than something wrong for a district it does not know', () => {
    const results = readSearchResults({
      features: [feature('somewhere, 台灣', 'PopulatedPlace', [121.5, 25.0], ['臺灣省'])],
    })
    expect(results[0]!.city).toBeNull()
  })
})
