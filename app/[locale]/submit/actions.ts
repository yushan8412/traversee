'use server'

import { randomUUID } from 'node:crypto'
import { auth } from '../../../auth'
import { createPlace, slugExists } from '../../../lib/places/repository'
import { checkUploads } from '../../../lib/photos/paths'
import { storePhotos } from '../../../lib/photos/store'
import { buildSpotSubmission, type SpotSubmissionInput } from '../../../lib/places/submission'
import { ACTIVITIES, CITIES } from '../../../lib/places/types'
import type { Activity, City } from '../../../lib/places/types'

export interface SubmitResult {
  ok: boolean
  /** Validation codes, translated for display by the caller. */
  errors: string[]
  slug?: string
}


function readNumber(value: FormDataEntryValue | null): number {
  // NaN rather than 0 for unparseable input: 0 is a real coordinate in the
  // Atlantic and would pass a naive check, while NaN fails the region test.
  return typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN
}

export async function submitSpot(formData: FormData): Promise<SubmitResult> {
  const session = await auth()

  // Submission is administrator-only for now. The data model, the pending
  // status and the moderation states are all built for public submissions, but
  // opening it up needs the review console that does not exist yet — so the
  // gate is here rather than in the shape of the data.
  if (!session?.user || session.user.role !== 'admin') {
    return { ok: false, errors: ['not-allowed'] }
  }

  const photos = formData.getAll('photos').filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  )
  const photoProblem = checkUploads(photos)
  if (photoProblem) return { ok: false, errors: [photoProblem] }

  const city = String(formData.get('city') ?? '') as City
  if (!CITIES.includes(city)) return { ok: false, errors: ['invalid-city'] }

  const activities = formData
    .getAll('activities')
    .map(String)
    .filter((value): value is Activity => ACTIVITIES.includes(value as Activity))

  const input: SpotSubmissionInput = {
    city,
    activities,
    nameZh: String(formData.get('nameZh') ?? ''),
    nameEn: String(formData.get('nameEn') ?? ''),
    summaryZh: String(formData.get('summaryZh') ?? ''),
    summaryEn: String(formData.get('summaryEn') ?? ''),
    descriptionZh: String(formData.get('descriptionZh') ?? ''),
    descriptionEn: String(formData.get('descriptionEn') ?? ''),
    difficulty: {},
    lng: readNumber(formData.get('lng')),
    lat: readNumber(formData.get('lat')),
  }

  const id = randomUUID()
  const { place, errors } = buildSpotSubmission(input, {
    submittedBy: session.user.id,
    now: new Date().toISOString(),
    id,
  })

  if (errors.length > 0) {
    return { ok: false, errors: errors.map((e) => e.code) }
  }

  // Slugs are URLs, so a collision would leave one entry unreachable. The
  // identifier suffix is unique by construction.
  if (await slugExists(place.slug)) {
    place.slug = `${place.slug}-${id.slice(0, 8)}`
  }

  // Photos are processed and stored before the document, for the same reason
  // the GPX is: an orphaned blob is harmless, while a document referencing
  // images that were never stored renders as broken content.
  if (photos.length > 0) {
    try {
      place.photos = await storePhotos(id, photos)
    } catch {
      // processPhoto throws for anything it cannot decode, whatever the
      // browser declared the type to be.
      return { ok: false, errors: ['photo-not-an-image'] }
    }
  }

  await createPlace(place)
  return { ok: true, errors: [], slug: place.slug }
}
