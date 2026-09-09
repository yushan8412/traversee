import { describe, expect, it } from 'vitest'
import { canEdit, applyEdit, type PlaceEdit } from './editing'
import type { TrackSummary } from './route-submission'
import type { Photo } from './types'
import type { Place } from './types'

const place = {
  id: 'p1',
  slug: 'mt-datun',
  city: 'taipei',
  status: 'published',
  kind: 'spot',
  activities: ['hiking'],
  name: { zh: '大屯山', en: 'Mount Datun' },
  summary: { zh: '芒草開闊', en: 'Open silvergrass' },
  description: { zh: null, en: null },
  submittedBy: 'user-1',
  updatedAt: '2026-09-01T00:00:00.000Z',
} as unknown as Place

const edit: PlaceEdit = {
  nameZh: '大屯山主峰',
  nameEn: 'Mount Datun Main Peak',
  summaryZh: '',
  summaryEn: '',
  descriptionZh: '',
  descriptionEn: '',
  city: 'taipei',
  activities: ['hiking'],
}

const NOW = '2026-09-07T00:00:00.000Z'

// `place` above is a partial cast and carries no geometry, so the two fixtures
// below fill it in rather than relying on it.
const spotPlace = () =>
  ({
    ...place,
    kind: 'spot',
    geometry: { type: 'Point', coordinates: [121.52, 25.17] },
    startPoint: { type: 'Point', coordinates: [121.52, 25.17] },
    route: null,
    approach: null,
    photos: [],
  }) as unknown as Place

const routePlace = () =>
  ({
    ...place,
    kind: 'route',
    geometry: { type: 'LineString', coordinates: [[121.4, 25.0], [121.5, 25.1]] },
    startPoint: { type: 'Point', coordinates: [121.4, 25.0] },
    route: {
      distanceKm: 12.3,
      elevationGainM: 540,
      duration: { minMinutes: 200, maxMinutes: 240, basis: 'gpx' },
      gpxPath: 'gpx/original.gpx',
    },
    approach: null,
    photos: [],
  }) as unknown as Place

const aTrack = (): TrackSummary => ({
  distanceKm: 8.4,
  elevationGainM: 320,
  duration: { minMinutes: 150, maxMinutes: 180, basis: 'gpx' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [121.5, 25.1],
      [121.6, 25.2],
    ],
  },
  startPoint: { type: 'Point', coordinates: [121.5, 25.1] },
})

const anApproach = () => ({
  distanceKm: 1.2,
  elevationGainM: 60,
  duration: { minMinutes: 25, maxMinutes: 30, basis: 'gpx' as const },
  gpxPath: 'gpx/approach.gpx',
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [121.4, 25.0],
      [121.45, 25.05],
    ] as [number, number][],
  },
})

describe('canEdit', () => {
  it('lets the person who submitted it fix their own entry', () => {
    expect(canEdit(place, { id: 'user-1', role: 'user' })).toBe(true)
  })

  it('lets an administrator fix anybody’s', () => {
    expect(canEdit(place, { id: 'someone-else', role: 'admin' })).toBe(true)
  })

  it('refuses a signed-in stranger', () => {
    expect(canEdit(place, { id: 'user-2', role: 'user' })).toBe(false)
  })

  it('refuses nobody at all', () => {
    expect(canEdit(place, null)).toBe(false)
  })

  it('refuses when the entry has no submitter recorded and the visitor is not an administrator', () => {
    // Seeded entries carry no submitter. Matching a missing submitter against a
    // missing id would hand them to anyone whose session lacked one.
    const seeded = { ...place, submittedBy: undefined } as unknown as Place
    expect(canEdit(seeded, { id: '', role: 'user' })).toBe(false)
  })
})

describe('applyEdit', () => {
  it('writes the new wording and leaves everything else alone', () => {
    const next = applyEdit(place, edit, '2026-09-03T10:00:00.000Z')
    expect(next.name).toEqual({ zh: '大屯山主峰', en: 'Mount Datun Main Peak' })
    expect(next.id).toBe('p1')
    expect(next.status).toBe('published')
    expect(next.updatedAt).toBe('2026-09-03T10:00:00.000Z')
  })

  it('does not move the entry through moderation', () => {
    // Status is the reviewer's to set. An edit that quietly unpublished a place
    // would make correcting a typo a way to take it off the site.
    const next = applyEdit({ ...place, status: 'pending' } as Place, edit, '2026-09-03T10:00:00.000Z')
    expect(next.status).toBe('pending')
  })

  it('keeps the original slug, because the old URL is already out there', () => {
    const next = applyEdit(place, { ...edit, nameEn: 'Something Else Entirely' }, '2026-09-03T10:00:00.000Z')
    expect(next.slug).toBe('mt-datun')
  })

  it('treats a cleared field as absent rather than as an empty string', () => {
    const next = applyEdit(place, edit, '2026-09-03T10:00:00.000Z')
    expect(next.summary).toEqual({ zh: null, en: null })
  })
})

describe('applyEdit with a geometry replacement', () => {
  it('leaves geometry, startPoint and route alone when no replacement is given', () => {
    const before = routePlace()
    const after = applyEdit(before, edit, NOW)
    expect(after.geometry).toEqual(before.geometry)
    expect(after.startPoint).toEqual(before.startPoint)
    expect(after.route).toEqual(before.route)
    expect(after.kind).toBe('route')
  })

  it('moves a spot to a new point', () => {
    const after = applyEdit(
      spotPlace(),
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.kind).toBe('spot')
    expect(after.geometry).toEqual({ type: 'Point', coordinates: [121.7, 25.1] })
    expect(after.startPoint).toEqual({ type: 'Point', coordinates: [121.7, 25.1] })
    expect(after.route).toBeNull()
  })

  it('turns a spot into a route, taking the metrics from the track', () => {
    const after = applyEdit(
      spotPlace(),
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/new.gpx' } },
      NOW,
    )
    expect(after.kind).toBe('route')
    expect(after.geometry).toEqual(aTrack().geometry)
    expect(after.startPoint).toEqual(aTrack().startPoint)
    expect(after.route).toEqual({
      distanceKm: aTrack().distanceKm,
      elevationGainM: aTrack().elevationGainM,
      duration: aTrack().duration,
      gpxPath: 'gpx/new.gpx',
    })
  })

  it('turns a route into a spot, and drops the metrics that described a line', () => {
    const after = applyEdit(
      routePlace(),
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.kind).toBe('spot')
    expect(after.geometry.type).toBe('Point')
    // A spot carrying route metrics is what `spot-cannot-have-route-metrics`
    // refuses; nulling it here is what keeps the edit valid.
    expect(after.route).toBeNull()
  })

  it('replaces one track with another', () => {
    const after = applyEdit(
      routePlace(),
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/second.gpx' } },
      NOW,
    )
    expect(after.route?.gpxPath).toBe('gpx/second.gpx')
    expect(after.route?.distanceKm).toBe(aTrack().distanceKm)
  })

  it('replaces the duration even when the new track cannot say what it was', () => {
    // Replace-wholesale includes replacing a measured time with "unknown". The
    // form warns before the save; nothing is preserved behind the user's back.
    const untimed: TrackSummary = {
      ...aTrack(),
      duration: { minMinutes: 0, maxMinutes: 0, basis: 'submitter' },
    }
    const after = applyEdit(
      routePlace(),
      { ...edit, geometry: { kind: 'route', summary: untimed, gpxPath: 'gpx/untimed.gpx' } },
      NOW,
    )
    expect(after.route?.duration).toEqual({ minMinutes: 0, maxMinutes: 0, basis: 'submitter' })
  })

  it('does not touch approach, even when the kind changes', () => {
    const before = { ...spotPlace(), approach: anApproach() } as unknown as Place
    const after = applyEdit(
      before,
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/new.gpx' } },
      NOW,
    )
    // Nothing in the app can write `approach` yet, so inventing a rule for it
    // here would be a guess. Pinned so the omission stays deliberate.
    expect(after.approach).toEqual(anApproach())
  })

  it('still refuses to touch what the whitelist guards', () => {
    const before = routePlace()
    const after = applyEdit(
      before,
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.slug).toBe(before.slug)
    expect(after.status).toBe(before.status)
    expect(after.submittedBy).toBe(before.submittedBy)
    expect(after.photos).toEqual(before.photos)
  })
})

describe('applyEdit with photographs', () => {
  const shot = (name: string): Photo => ({
    path: `photos/p1/${name}.webp`,
    thumbPath: `photos/p1/${name}-thumb.webp`,
    width: 1600,
    height: 1200,
  })

  const withPhotos = (photos: Photo[], coverPhotoIndex: number) =>
    ({ ...spotPlace(), photos, coverPhotoIndex }) as unknown as Place

  it('leaves the photographs alone when none are given', () => {
    const before = withPhotos([shot('a'), shot('b')], 1)
    const after = applyEdit(before, edit, NOW)
    expect(after.photos).toEqual(before.photos)
    expect(after.coverPhotoIndex).toBe(1)
  })

  it('removes the ones that were dropped', () => {
    const after = applyEdit(
      withPhotos([shot('a'), shot('b'), shot('c')], 0),
      { ...edit, photos: [shot('a'), shot('c')] },
      NOW,
    )
    expect(after.photos.map((p) => p.path)).toEqual(['photos/p1/a.webp', 'photos/p1/c.webp'])
  })

  it('keeps the cover on the same photograph when something before it goes', () => {
    // Stored as a position, so dropping the first would otherwise hand the
    // cover to a different picture without anybody asking for that.
    const after = applyEdit(
      withPhotos([shot('a'), shot('b'), shot('c')], 2),
      { ...edit, photos: [shot('b'), shot('c')] },
      NOW,
    )
    expect(after.coverPhotoIndex).toBe(1)
    expect(after.photos[after.coverPhotoIndex]!.path).toBe('photos/p1/c.webp')
  })

  it('falls back to the first when the cover itself is removed', () => {
    const after = applyEdit(
      withPhotos([shot('a'), shot('b')], 1),
      { ...edit, photos: [shot('a')] },
      NOW,
    )
    expect(after.coverPhotoIndex).toBe(0)
  })

  it('never leaves the cover pointing past the end of the list', () => {
    // A card whose cover index is out of range shows no picture at all.
    const after = applyEdit(
      withPhotos([shot('a'), shot('b'), shot('c')], 2),
      { ...edit, photos: [] },
      NOW,
    )
    expect(after.photos).toEqual([])
    expect(after.coverPhotoIndex).toBe(0)
  })

  it('adds new photographs after the ones that were kept', () => {
    const after = applyEdit(
      withPhotos([shot('a')], 0),
      { ...edit, photos: [shot('a'), shot('new')] },
      NOW,
    )
    expect(after.photos.map((p) => p.path)).toEqual(['photos/p1/a.webp', 'photos/p1/new.webp'])
    expect(after.coverPhotoIndex).toBe(0)
  })
})
