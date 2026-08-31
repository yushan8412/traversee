import { slugify } from './slug'
import { validateSubmission, type ValidationError } from './validate'
import type { Activity, City, Place } from './types'

/** Exactly the fields a submitter may choose. Everything else is decided here. */
export interface SpotSubmissionInput {
  city: City
  activities: Activity[]
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
  difficulty: Partial<Record<Activity, number>>
  lng: number
  lat: number
}

export interface SubmissionContext {
  /** From the session. A form field would let anyone submit as anyone. */
  submittedBy: string
  now: string
  id: string
}

/** Blank means "not written yet", and the language fallback depends on the difference. */
const orNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildSpotSubmission(
  input: SpotSubmissionInput,
  context: SubmissionContext,
): { place: Place; errors: ValidationError[] } {
  const point = { type: 'Point' as const, coordinates: [input.lng, input.lat] as [number, number] }

  const place: Place = {
    id: context.id,
    // A romanisable name gives a readable URL; a Chinese-only one falls back to
    // the identifier rather than a machine romanisation nobody chose.
    slug: slugify(input.nameEn) || `place-${context.id}`,
    city: input.city,
    // Never taken from the form. Status is the moderation state, and a form
    // field would let a submitter publish straight past review.
    status: 'pending',
    kind: 'spot',
    activities: input.activities,
    name: { zh: orNull(input.nameZh), en: orNull(input.nameEn) },
    summary: { zh: orNull(input.summaryZh), en: orNull(input.summaryEn) },
    description: { zh: orNull(input.descriptionZh), en: orNull(input.descriptionEn) },
    difficulty: input.difficulty,
    geometry: point,
    startPoint: point,
    // A spot is somewhere you go to, not a line you traverse. The walk-in, if
    // there is one, belongs in `approach` and arrives with the route path.
    route: null,
    approach: null,
    attributes: {},
    photos: [],
    coverPhotoIndex: 0,
    source: 'user',
    submittedBy: context.submittedBy,
    createdAt: context.now,
    updatedAt: context.now,
    publishedAt: null,
  }

  return { place, errors: validateSubmission(place) }
}
