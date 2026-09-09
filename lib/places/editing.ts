import type { Activity, City, Photo, Place, Point } from './types'
import type { TrackSummary } from './route-submission'

/**
 * Correcting an entry after it has been submitted.
 *
 * This exists because there was no way to. On 2026-09-03 an entry reached
 * production with no name at all — nothing validated one, so the slug fell back
 * to `place-<uuid>` and that identifier is what appeared on the site. Yulia
 * could see it was wrong and could do nothing about it, which is a worse
 * property for a shared database than the original bug.
 */

/**
 * A whole new shape for an entry, never a partial adjustment.
 *
 * Yulia's rule, 2026-09-07: replacing a location means discarding the old one.
 * There is no vertex editing and no nudging a pin, so this carries everything
 * needed to rebuild the geometry from nothing — which is also why it can move
 * an entry between kinds. Somebody who pinned a trailhead from their phone can
 * supply the recorded track later, and the entry becomes the route it always was.
 *
 * Absent means the geometry is not touched at all, which is every edit that is
 * only fixing words.
 */
export type GeometryReplacement =
  | { kind: 'spot'; lng: number; lat: number }
  | { kind: 'route'; summary: TrackSummary; gpxPath: string }

export interface PlaceEdit {
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
  city: City
  activities: Activity[]
  geometry?: GeometryReplacement
  /**
   * The entry's photographs after the edit — those kept, then those added.
   * Absent leaves them alone, which is every edit that only touches words.
   */
  photos?: Photo[]
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
 * somebody may have shared. `submittedBy` is not on this form at all.
 */
export function applyEdit(place: Place, edit: PlaceEdit, now: string): Place {
  const edited: Place = {
    ...place,
    city: edit.city,
    activities: edit.activities,
    name: { zh: orNull(edit.nameZh), en: orNull(edit.nameEn) },
    summary: { zh: orNull(edit.summaryZh), en: orNull(edit.summaryEn) },
    description: { zh: orNull(edit.descriptionZh), en: orNull(edit.descriptionEn) },
    updatedAt: now,
  }

  const withPhotos = edit.photos ? replacePhotos(edited, edit.photos) : edited

  return edit.geometry ? replaceGeometry(withPhotos, edit.geometry) : withPhotos
}

/**
 * The photographs an entry keeps, and which of them is its cover.
 *
 * The cover is stored as a position, so removing a photograph before it would
 * silently re-point the cover at a different picture — or past the end of the
 * list, which is how a card ends up with no image at all. Following the cover
 * by its path keeps it on the same photograph, and only falls back to the first
 * when the cover itself is the one being removed.
 */
function replacePhotos(place: Place, photos: Photo[]): Place {
  const coverPath = place.photos[place.coverPhotoIndex]?.path
  const stillThere = photos.findIndex((photo) => photo.path === coverPath)

  return {
    ...place,
    photos,
    coverPhotoIndex: stillThere >= 0 ? stillThere : 0,
  }
}

/**
 * The four transitions, in one place rather than as branches at the call site.
 *
 * `approach` is deliberately absent from both cases. Nothing in the app can
 * write it — both submission paths hardcode it to null — so a rule for what a
 * kind change should do to it would be invented rather than derived. Left
 * alone, and recorded in the spec so it is not later read as an oversight.
 */
function replaceGeometry(place: Place, replacement: GeometryReplacement): Place {
  if (replacement.kind === 'spot') {
    const point: Point = { type: 'Point', coordinates: [replacement.lng, replacement.lat] }
    return {
      ...place,
      kind: 'spot',
      geometry: point,
      startPoint: point,
      // Distance and elevation gain describe travelling a line, so a point
      // cannot carry them — which is exactly what `spot-cannot-have-route-metrics`
      // refuses, and validateSubmission runs on the result of this.
      route: null,
    }
  }

  const { summary, gpxPath } = replacement
  return {
    ...place,
    kind: 'route',
    geometry: summary.geometry,
    startPoint: summary.startPoint,
    route: {
      distanceKm: summary.distanceKm,
      elevationGainM: summary.elevationGainM,
      // Taken wholesale from the new track, including when that means replacing
      // a recorded time with "unknown". The form says so before the save.
      duration: summary.duration,
      gpxPath,
    },
  }
}
