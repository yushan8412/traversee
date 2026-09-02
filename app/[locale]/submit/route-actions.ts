'use server'

import { randomUUID } from 'node:crypto'
import { auth } from '../../../auth'
import { parseGpx } from '../../../lib/gpx/parse'
import { buildRouteSubmission } from '../../../lib/places/route-submission'
import { createPlace, slugExists } from '../../../lib/places/repository'
import { checkUploads } from '../../../lib/photos/limits'
import { storePhotos } from '../../../lib/photos/store'
import { uploadToPending } from '../../../lib/storage/blob'
import { ACTIVITIES, CITIES } from '../../../lib/places/types'
import type { Activity, City } from '../../../lib/places/types'

export interface SubmitResult {
  ok: boolean
  errors: string[]
  slug?: string
}


/** Large enough for a long day's recording, small enough to bound the request. */
const MAX_GPX_BYTES = 10 * 1024 * 1024

export async function submitRoute(formData: FormData): Promise<SubmitResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { ok: false, errors: ['not-allowed'] }
  }

  const file = formData.get('gpx')
  if (!(file instanceof File) || file.size === 0) return { ok: false, errors: ['gpx-required'] }
  if (file.size > MAX_GPX_BYTES) return { ok: false, errors: ['gpx-too-large'] }

  const photos = formData.getAll('photos').filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  )
  const photoProblem = checkUploads(photos)
  if (photoProblem) return { ok: false, errors: [photoProblem] }

  const city = String(formData.get('city') ?? '') as City
  if (!CITIES.includes(city)) return { ok: false, errors: ['invalid-city'] }

  const raw = Buffer.from(await file.arrayBuffer())

  // Parsed again here rather than trusting what the browser computed. The
  // client-side parse exists so a submitter sees a preview before sending; it is
  // a convenience, never a trust boundary, and the numbers stored are the ones
  // this server derived from the bytes it received.
  const points = parseGpx(raw.toString('utf8'))
  if (points.length < 2) return { ok: false, errors: ['gpx-unreadable'] }

  const id = randomUUID()
  const gpxPath = `gpx/${id}.gpx`

  const { place, errors } = buildRouteSubmission(
    {
      city,
      activities: formData
        .getAll('activities')
        .map(String)
        .filter((v): v is Activity => ACTIVITIES.includes(v as Activity)),
      nameZh: String(formData.get('nameZh') ?? ''),
      nameEn: String(formData.get('nameEn') ?? ''),
      summaryZh: String(formData.get('summaryZh') ?? ''),
      summaryEn: String(formData.get('summaryEn') ?? ''),
      descriptionZh: String(formData.get('descriptionZh') ?? ''),
      descriptionEn: String(formData.get('descriptionEn') ?? ''),
      difficulty: {},
      points,
      gpxPath,
    },
    { submittedBy: session.user.id, now: new Date().toISOString(), id },
  )

  if (errors.length > 0) return { ok: false, errors: errors.map((e) => e.code) }

  if (await slugExists(place.slug)) {
    place.slug = `${place.slug}-${id.slice(0, 8)}`
  }

  // Photos first, because processing them is the step most likely to fail —
  // an undecodable file, an unsupported format. Uploading the GPX before this
  // left an orphaned blob behind on every failed attempt; four of them
  // accumulated during one afternoon of testing.
  if (photos.length > 0) {
    try {
      place.photos = await storePhotos(id, photos)
    } catch {
      // processPhoto throws for anything it cannot decode, whatever the
      // browser declared the type to be.
      return { ok: false, errors: ['photo-not-an-image'] }
    }
  }

  // Written before the document: an orphaned blob is harmless, while a document
  // pointing at a file that was never stored is a broken entry nobody can fix.
  await uploadToPending(gpxPath, raw, 'application/gpx+xml')
  await createPlace(place)

  return { ok: true, errors: [], slug: place.slug }
}
