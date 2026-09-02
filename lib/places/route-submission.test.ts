import { describe, expect, it } from 'vitest'
import { buildRouteSubmission, summariseTrack } from './route-submission'
import type { Trackpoint } from '../gpx/parse'

/** A climb along Yangmingshan, logged every 30 seconds. */
function track(count = 40, withTime = true): Trackpoint[] {
  return Array.from({ length: count }, (_, i) => ({
    position: [121.55 + i * 0.0004, 25.16 + i * 0.0003] as [number, number],
    elevationM: 700 + i * 5,
    time: withTime ? new Date(Date.UTC(2026, 7, 31, 0, 0, i * 30)).toISOString() : null,
  }))
}

const base = {
  city: 'taipei' as const,
  activities: ['hiking' as const],
  nameZh: '測試路線',
  nameEn: 'Test Route',
  summaryZh: '',
  summaryEn: '',
  descriptionZh: '',
  descriptionEn: '',
  difficulty: { hiking: 3 },
}

const context = { submittedBy: 'user-1', now: '2026-08-31T12:00:00.000Z', id: 'fixed-id' }

describe('summariseTrack', () => {
  it('computes distance and cumulative ascent from the points', () => {
    const summary = summariseTrack(track())
    expect(summary.distanceKm).toBeGreaterThan(0)
    // 40 points climbing 5 m each step is 195 m of ascent.
    expect(summary.elevationGainM).toBe(195)
  })

  it('reads the duration from timestamps and says so', () => {
    const summary = summariseTrack(track())
    expect(summary.duration.basis).toBe('gpx')
    // 39 gaps of 30 seconds is 19.5 minutes.
    expect(summary.duration.minMinutes).toBe(20)
  })

  it('falls back to the submitter when the file carries no times', () => {
    // Plenty of exports have no timestamps. Inventing a duration would present a
    // guess with the same confidence as a measurement.
    const summary = summariseTrack(track(40, false))
    expect(summary.duration.basis).toBe('submitter')
    expect(summary.duration.minMinutes).toBe(0)
  })

  it('simplifies the geometry rather than storing every point', () => {
    const summary = summariseTrack(track(2000))
    expect(summary.geometry.coordinates.length).toBeLessThan(200)
    expect(summary.geometry.coordinates.length).toBeGreaterThan(1)
  })

  it('keeps the first recorded point as the start', () => {
    const summary = summariseTrack(track())
    expect(summary.startPoint.coordinates).toEqual([121.55, 25.16])
  })

  it('refuses a track too short to be a route', () => {
    expect(() => summariseTrack([])).toThrow()
    expect(() => summariseTrack(track(1))).toThrow()
  })
})

describe('buildRouteSubmission', () => {
  it('produces a route carrying its metrics and a LineString', () => {
    const { place, errors } = buildRouteSubmission({ ...base, points: track() }, context)
    expect(errors).toEqual([])
    expect(place.kind).toBe('route')
    expect(place.geometry.type).toBe('LineString')
    expect(place.route?.distanceKm).toBeGreaterThan(0)
    expect(place.status).toBe('pending')
  })

  it('records where the full file was stored', () => {
    const { place } = buildRouteSubmission(
      { ...base, points: track(), gpxPath: 'gpx/fixed-id.gpx' },
      context,
    )
    expect(place.route?.gpxPath).toBe('gpx/fixed-id.gpx')
  })

  it('rejects a track that leaves the covered region', () => {
    // The coordinates come from a file this site did not produce, so a track
    // recorded elsewhere must not publish onto a catalogue of Taiwan.
    const elsewhere = track().map((p) => ({ ...p, position: [127.68, 26.21] as [number, number] }))
    const { errors } = buildRouteSubmission({ ...base, points: elsewhere }, context)
    expect(errors.map((e) => e.code)).toContain('outside-coverage')
  })

  it('rounds the stored metrics rather than keeping full float precision', () => {
    // 6.437376 km reads as false precision on a page; the underlying track is
    // not accurate to the metre anyway.
    const { place } = buildRouteSubmission({ ...base, points: track() }, context)
    expect(place.route?.distanceKm).toBe(Number(place.route?.distanceKm.toFixed(2)))
  })
})
