import { describe, expect, it } from 'vitest'
import { validateSubmission } from './validate'
import type { Place } from './types'

const route: Partial<Place> = {
  kind: 'route',
  activities: ['hiking'],
  difficulty: { hiking: 3 },
  attributes: {},
  geometry: {
    type: 'LineString',
    coordinates: [
      [121.55, 25.16],
      [121.56, 25.17],
    ],
  },
  startPoint: { type: 'Point', coordinates: [121.55, 25.16] },
  route: {
    distanceKm: 6.4,
    elevationGainM: 320,
    duration: { minMinutes: 120, maxMinutes: 180, basis: 'gpx' },
    gpxPath: 'gpx/x.gpx',
  },
  approach: null,
}

const spot: Partial<Place> = {
  kind: 'spot',
  activities: ['surfing'],
  difficulty: {},
  attributes: { surfing: { breakType: 'beach' } },
  geometry: { type: 'Point', coordinates: [121.94, 25.02] },
  startPoint: { type: 'Point', coordinates: [121.94, 25.02] },
  route: null,
  approach: null,
}

const errorsFor = (input: Partial<Place>) => validateSubmission(input).map((e) => e.code)

describe('validateSubmission', () => {
  it('accepts a well-formed route and spot', () => {
    expect(validateSubmission(route)).toEqual([])
    expect(validateSubmission(spot)).toEqual([])
  })

  it('requires a route to carry a LineString', () => {
    // A route is a line you traverse. A single point cannot describe one, and a
    // schemaless database will happily store the contradiction.
    expect(errorsFor({ ...route, geometry: { type: 'Point', coordinates: [121.55, 25.16] } })).toContain(
      'route-needs-linestring',
    )
  })

  it('requires a route to carry its metrics', () => {
    expect(errorsFor({ ...route, route: null })).toContain('route-needs-metrics')
  })

  it('requires a spot to be a point with no route metrics', () => {
    expect(errorsFor({ ...spot, geometry: route.geometry })).toContain('spot-needs-point')
    expect(errorsFor({ ...spot, route: route.route })).toContain('spot-cannot-have-route-metrics')
  })

  it('rejects attributes for an activity the place does not claim', () => {
    // The case the spec calls the easiest to get silently wrong: a document
    // carrying camping attributes while not listing camping as an activity.
    expect(
      errorsFor({ ...spot, attributes: { camping: { driveIn: true }, surfing: {} } }),
    ).toContain('attributes-outside-activities')
  })

  it('rejects a difficulty for an activity the place does not claim', () => {
    expect(errorsFor({ ...route, difficulty: { hiking: 3, surfing: 2 } })).toContain(
      'difficulty-outside-activities',
    )
  })

  it('rejects a difficulty outside 1 to 5', () => {
    expect(errorsFor({ ...route, difficulty: { hiking: 0 } })).toContain('difficulty-out-of-range')
    expect(errorsFor({ ...route, difficulty: { hiking: 6 } })).toContain('difficulty-out-of-range')
  })

  it('requires at least one activity', () => {
    expect(errorsFor({ ...route, activities: [] })).toContain('needs-an-activity')
  })

  it('rejects coordinates outside the covered region', () => {
    // The coordinates come from a file this site did not produce, so a track
    // recorded in Okinawa must not publish onto a catalogue of Taiwan.
    expect(
      errorsFor({ ...spot, geometry: { type: 'Point', coordinates: [127.68, 26.21] }, startPoint: { type: 'Point', coordinates: [127.68, 26.21] } }),
    ).toContain('outside-coverage')
  })

  it('reports every problem at once rather than stopping at the first', () => {
    // A submitter fixing one thing at a time, with a round trip each, gives up.
    const codes = errorsFor({ ...route, activities: [], route: null })
    expect(codes).toContain('needs-an-activity')
    expect(codes).toContain('route-needs-metrics')
  })
})
