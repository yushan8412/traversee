import { describe, expect, it } from 'vitest'
import { getPublishedPlaceBySlug, listPublishedPlaces } from './repository'

// These run against the fixtures, which is the point: they pin down the rules
// that must hold whatever the data source is.
describe('published place queries', () => {
  it('never returns anything that is not published', async () => {
    const places = await listPublishedPlaces()
    expect(places.length).toBeGreaterThan(0)
    expect(places.some((p) => p.slug === 'pending-example')).toBe(false)
  })

  it('omits the two large fields from list results', async () => {
    // A list carrying description and full geometry is the difference between a
    // cheap query and one that eats the free throughput grant.
    const [place] = await listPublishedPlaces()
    expect(place).not.toHaveProperty('description')
    expect(place).not.toHaveProperty('geometry')
  })

  it('refuses to serve an unpublished place by slug', async () => {
    expect(await getPublishedPlaceBySlug('pending-example')).toBeNull()
  })

  it('returns the full document for a published slug', async () => {
    const place = await getPublishedPlaceBySlug('wanggu-waterfall')
    expect(place?.kind).toBe('spot')
    expect(place?.approach).not.toBeNull()
  })
})
