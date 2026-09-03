import { describe, expect, it } from 'vitest'
import { canEdit, applyEdit, type PlaceEdit } from './editing'
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
