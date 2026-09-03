'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '../../../../../auth'
import { getPlaceById, savePlace } from '../../../../../lib/places/repository'
import { applyEdit, canEdit } from '../../../../../lib/places/editing'
import { validateSubmission } from '../../../../../lib/places/validate'
import { ACTIVITIES, CITIES } from '../../../../../lib/places/types'
import type { Activity, City } from '../../../../../lib/places/types'

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
    },
    new Date().toISOString(),
  )

  // The same rules a submission has to pass. An edit that emptied the name would
  // otherwise reproduce exactly the fault this page exists to repair.
  const errors = validateSubmission(edited)
  if (errors.length > 0) return { ok: false, errors: errors.map((e) => e.code) }

  await savePlace(edited, place.city)

  revalidatePath(`/[locale]/places/${place.slug}`, 'page')
  revalidatePath('/[locale]/places', 'page')
  revalidatePath('/[locale]/review', 'page')

  return { ok: true, errors: [] }
}
