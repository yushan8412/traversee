'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { auth } from '../../../../../auth'
import { getPlaceById, savePlace } from '../../../../../lib/places/repository'
import { applyEdit, canEdit, type GeometryReplacement } from '../../../../../lib/places/editing'
import { parseGpx } from '../../../../../lib/gpx/parse'
import { summariseTrack } from '../../../../../lib/places/route-submission'
import { PENDING, PUBLIC, removeEverywhere, upload } from '../../../../../lib/storage/blob'
import { validateSubmission } from '../../../../../lib/places/validate'
import { ACTIVITIES, CITIES } from '../../../../../lib/places/types'
import type { Activity, City } from '../../../../../lib/places/types'

/** Large enough for a long day's recording, small enough to bound the request. */
const MAX_GPX_BYTES = 10 * 1024 * 1024

export interface EditResult {
  ok: boolean
  errors: string[]
}

/**
 * Saves a correction to an existing entry.
 *
 * Reads the stored document first rather than trusting the form for anything
 * beyond the fields being edited. The form knows the id and the county it was
 * filed under; everything else — who submitted it, its status, its photos —
 * comes from the database, so a crafted post cannot set them.
 */
export async function editPlace(formData: FormData): Promise<EditResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, errors: ['not-allowed'] }

  const id = String(formData.get('id') ?? '')
  const previousCity = String(formData.get('previousCity') ?? '')
  const place = await getPlaceById(id, previousCity)
  if (!place) return { ok: false, errors: ['not-found'] }

  if (!canEdit(place, { id: session.user.id, role: session.user.role })) {
    return { ok: false, errors: ['not-allowed'] }
  }

  const city = String(formData.get('city') ?? '') as City
  if (!CITIES.includes(city)) return { ok: false, errors: ['invalid-city'] }

  const replacement = await readReplacement(formData, place.status === 'published')
  if ('error' in replacement) return { ok: false, errors: [replacement.error] }

  const edited = applyEdit(
    place,
    {
      nameZh: String(formData.get('nameZh') ?? ''),
      nameEn: String(formData.get('nameEn') ?? ''),
      summaryZh: String(formData.get('summaryZh') ?? ''),
      summaryEn: String(formData.get('summaryEn') ?? ''),
      descriptionZh: String(formData.get('descriptionZh') ?? ''),
      descriptionEn: String(formData.get('descriptionEn') ?? ''),
      city,
      activities: formData
        .getAll('activities')
        .map(String)
        .filter((value): value is Activity => ACTIVITIES.includes(value as Activity)),
      ...(replacement.geometry ? { geometry: replacement.geometry } : {}),
    },
    new Date().toISOString(),
  )

  // The same rules a submission has to pass. An edit that emptied the name would
  // otherwise reproduce exactly the fault this page exists to repair.
  const errors = validateSubmission(edited)
  if (errors.length > 0) return { ok: false, errors: errors.map((e) => e.code) }

  await savePlace(edited, place.city)

  // Last, and only once the document that replaced it is safely stored. The
  // order is the one the submission path already argues for: an orphaned blob
  // is harmless, while a document pointing at a file that is gone is a broken
  // entry nobody can repair. The new file always takes a fresh path, so this
  // can never delete the one just written.
  if (replacement.geometry && place.route?.gpxPath) {
    await removeEverywhere(place.route.gpxPath)
  }

  revalidatePath(`/[locale]/places/${place.slug}`, 'page')
  revalidatePath('/[locale]/places', 'page')
  revalidatePath('/[locale]/review', 'page')

  return { ok: true, errors: [] }
}

/**
 * The new location, when one was offered.
 *
 * Only when the form says so. Without `replaceGeometry` the geometry is not
 * touched at all, which is every edit that is only fixing words — and an
 * incomplete replacement is refused rather than quietly dropped, because
 * silently ignoring what somebody just did is worse than saying no.
 */
async function readReplacement(
  formData: FormData,
  published: boolean,
): Promise<{ geometry?: GeometryReplacement } | { error: string }> {
  if (formData.get('replaceGeometry') !== '1') return {}

  const kind = String(formData.get('replacementKind') ?? '')

  if (kind === 'spot') {
    const lng = Number(formData.get('lng'))
    const lat = Number(formData.get('lat'))
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { error: 'replacement-incomplete' }
    // Whether the point is inside the coverage box is validateSubmission's
    // question, and it runs on the edited document either way.
    return { geometry: { kind: 'spot', lng, lat } }
  }

  if (kind !== 'route') return { error: 'replacement-incomplete' }

  const file = formData.get('gpx')
  if (!(file instanceof File) || file.size === 0) return { error: 'replacement-incomplete' }
  if (file.size > MAX_GPX_BYTES) return { error: 'gpx-too-large' }

  // Parsed here rather than trusting what the browser computed. The client-side
  // parse exists so somebody sees the track before sending; it is a
  // convenience, never a trust boundary.
  const raw = Buffer.from(await file.arrayBuffer())
  const points = parseGpx(raw.toString('utf8'))
  if (points.length < 2) return { error: 'gpx-unreadable' }

  // A fresh path, never the one being replaced. Overwriting would let a cache
  // serve the previous file as the new content, and would already have
  // destroyed the old track if the save below then failed.
  const gpxPath = `gpx/${randomUUID()}.gpx`

  // A published entry's files live in PUBLIC, because filesOf and the
  // promote/demote pair assume a file sits in the container its status implies.
  await upload(published ? PUBLIC : PENDING, gpxPath, raw, 'application/gpx+xml')

  return { geometry: { kind: 'route', summary: summariseTrack(points), gpxPath } }
}
