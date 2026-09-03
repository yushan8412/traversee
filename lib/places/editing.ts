import type { Activity, City, Place } from './types'

/**
 * Correcting an entry after it has been submitted.
 *
 * This exists because there was no way to. On 2026-09-03 an entry reached
 * production with no name at all — nothing validated one, so the slug fell back
 * to `place-<uuid>` and that identifier is what appeared on the site. Yulia
 * could see it was wrong and could do nothing about it, which is a worse
 * property for a shared database than the original bug.
 */

export interface PlaceEdit {
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
  city: City
  activities: Activity[]
}

export interface Editor {
  id: string
  role: 'user' | 'admin'
}

/**
 * Whoever wrote it, or an administrator.
 *
 * The submitter is included rather than reserving this to administrators
 * because submission is meant to open up, and a catalogue where every typo has
 * to go through one person is a catalogue that stays wrong. Today it makes no
 * practical difference — the only submitter is also the only administrator.
 */
export function canEdit(place: Place, editor: Editor | null): boolean {
  if (!editor) return false
  if (editor.role === 'admin') return true
  // Seeded entries carry no submitter, and a session can carry no id. Matching
  // one absence against the other would hand those entries to anybody.
  return Boolean(editor.id) && place.submittedBy === editor.id
}

const orNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Everything an edit is allowed to touch, and nothing else.
 *
 * Written as a whitelist rather than a merge because the fields it must not
 * touch are the dangerous ones. `status` belongs to the reviewer — an edit that
 * changed it would make correcting a typo a way to publish past review, or to
 * quietly take a place off the site. `slug` stays because it is already a URL
 * somebody may have shared. `submittedBy`, `photos` and the geometry are not
 * on this form at all.
 */
export function applyEdit(place: Place, edit: PlaceEdit, now: string): Place {
  return {
    ...place,
    city: edit.city,
    activities: edit.activities,
    name: { zh: orNull(edit.nameZh), en: orNull(edit.nameEn) },
    summary: { zh: orNull(edit.summaryZh), en: orNull(edit.summaryEn) },
    description: { zh: orNull(edit.descriptionZh), en: orNull(edit.descriptionEn) },
    updatedAt: now,
  }
}
