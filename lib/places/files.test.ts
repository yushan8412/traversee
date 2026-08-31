import { describe, expect, it } from 'vitest'
import { filesOf } from './files'
import type { Place } from './types'

const base = {
  route: null,
  approach: null,
  photos: [],
} as unknown as Place

describe('filesOf', () => {
  it('finds a route GPX', () => {
    const place = { ...base, route: { gpxPath: 'gpx/a.gpx' } } as unknown as Place
    expect(filesOf(place)).toEqual(['gpx/a.gpx'])
  })

  it('finds an approach GPX too', () => {
    // A waterfall carries a walk-in track in `approach`, not `route`. Missing it
    // would leave that file behind in the private container after approval.
    const place = {
      ...base,
      route: { gpxPath: 'gpx/a.gpx' },
      approach: { gpxPath: 'gpx/b.gpx' },
    } as unknown as Place
    expect(filesOf(place)).toEqual(['gpx/a.gpx', 'gpx/b.gpx'])
  })

  it('finds photos and their thumbnails', () => {
    const place = {
      ...base,
      photos: [
        { path: 'photos/x/1.webp', thumbPath: 'photos/x/1-thumb.webp' },
        { path: 'photos/x/2.webp', thumbPath: 'photos/x/2-thumb.webp' },
      ],
    } as unknown as Place
    expect(filesOf(place)).toEqual([
      'photos/x/1.webp',
      'photos/x/1-thumb.webp',
      'photos/x/2.webp',
      'photos/x/2-thumb.webp',
    ])
  })

  it('skips entries with nothing stored', () => {
    // A spot has no route, and a route whose GPX was never archived has a null
    // path. Neither is an error, and neither is a file to move.
    expect(filesOf(base)).toEqual([])
    expect(filesOf({ ...base, route: { gpxPath: null } } as unknown as Place)).toEqual([])
  })

  it('does not repeat a path listed twice', () => {
    // Moving the same blob twice would fail the second time, and the first
    // failure would look like a real one.
    const place = {
      ...base,
      route: { gpxPath: 'gpx/a.gpx' },
      approach: { gpxPath: 'gpx/a.gpx' },
    } as unknown as Place
    expect(filesOf(place)).toEqual(['gpx/a.gpx'])
  })
})
