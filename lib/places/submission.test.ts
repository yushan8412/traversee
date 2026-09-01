import { describe, expect, it } from 'vitest'
import { buildSpotSubmission } from './submission'

const input = {
  city: 'newTaipei' as const,
  activities: ['surfing' as const],
  nameZh: '福隆海水浴場',
  nameEn: 'Fulong Beach',
  summaryZh: '東北角的沙岸浪點。',
  summaryEn: 'A sandy beach break.',
  descriptionZh: '雙溪河出海口形成的沙洲。',
  descriptionEn: '',
  difficulty: {},
  lng: 121.9438,
  lat: 25.0223,
}

const context = { submittedBy: 'user-1', now: '2026-08-31T12:00:00.000Z', id: 'fixed-id' }

describe('buildSpotSubmission', () => {
  it('produces a spot with a point geometry and no route metrics', () => {
    const { place } = buildSpotSubmission(input, context)
    expect(place.kind).toBe('spot')
    expect(place.geometry).toEqual({ type: 'Point', coordinates: [121.9438, 25.0223] })
    expect(place.route).toBeNull()
    expect(place.startPoint).toEqual(place.geometry)
  })

  it('always writes status pending, whatever the caller sent', () => {
    // Status is the moderation state. If it could be set from the form, a
    // submitter could publish straight past review.
    const { place } = buildSpotSubmission(
      { ...input, status: 'published' } as never,
      context,
    )
    expect(place.status).toBe('pending')
    expect(place.publishedAt).toBeNull()
  })

  it('records who submitted it from the session, not from the form', () => {
    const { place } = buildSpotSubmission({ ...input, submittedBy: 'someone-else' } as never, context)
    expect(place.submittedBy).toBe('user-1')
    expect(place.source).toBe('user')
  })

  it('derives the slug from the English name', () => {
    expect(buildSpotSubmission(input, context).place.slug).toBe('fulong-beach')
  })

  it('falls back to an id-based slug when there is no romanisable name', () => {
    // A Chinese-only submission still needs a URL. Machine romanisation would
    // invent a name nobody chose, so the identifier is used instead and an
    // editor can set a readable one later.
    const { place } = buildSpotSubmission({ ...input, nameEn: '' }, context)
    expect(place.slug).toBe('place-fixed-id')
  })

  it('stores empty bilingual fields as null rather than empty strings', () => {
    // The language fallback treats blank as missing; storing '' would make a
    // place look translated when it is not.
    const { place } = buildSpotSubmission(input, context)
    expect(place.description.en).toBeNull()
    expect(place.description.zh).toBe('雙溪河出海口形成的沙洲。')
  })

  it('reports validation problems instead of returning a document to store', () => {
    const { errors } = buildSpotSubmission({ ...input, activities: [] }, context)
    expect(errors.map((e) => e.code)).toContain('needs-an-activity')
  })

  it('rejects a location outside the covered region', () => {
    const { errors } = buildSpotSubmission({ ...input, lng: 127.68, lat: 26.21 }, context)
    expect(errors.map((e) => e.code)).toContain('outside-coverage')
  })
})
