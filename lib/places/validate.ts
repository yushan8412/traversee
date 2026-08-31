import { isWithinCoverage } from '../gpx/geo'
import type { Activity, Place } from './types'

export type ValidationCode =
  | 'needs-an-activity'
  | 'route-needs-linestring'
  | 'route-needs-metrics'
  | 'spot-needs-point'
  | 'spot-cannot-have-route-metrics'
  | 'attributes-outside-activities'
  | 'difficulty-outside-activities'
  | 'difficulty-out-of-range'
  | 'outside-coverage'

export interface ValidationError {
  code: ValidationCode
  /** The activity or field the problem belongs to, where there is one. */
  subject?: string
}

/**
 * Structural rules a submission must satisfy before it reaches the database.
 *
 * Cosmos is schemaless, which is what lets a new activity be added without
 * touching existing documents — and equally what lets a document claim it
 * allows camping while carrying no camping attributes at all. Nothing below the
 * application will catch that, so it is caught here.
 *
 * Every problem is reported, not just the first. A submitter fixing one thing
 * per round trip gives up.
 */
export function validateSubmission(place: Partial<Place>): ValidationError[] {
  const errors: ValidationError[] = []
  const activities = place.activities ?? []

  if (activities.length === 0) errors.push({ code: 'needs-an-activity' })

  if (place.kind === 'route') {
    if (place.geometry?.type !== 'LineString') errors.push({ code: 'route-needs-linestring' })
    if (!place.route) errors.push({ code: 'route-needs-metrics' })
  }

  if (place.kind === 'spot') {
    if (place.geometry?.type !== 'Point') errors.push({ code: 'spot-needs-point' })
    // A spot with route metrics is a contradiction: distance and elevation gain
    // describe travelling a line. The walk-in belongs in `approach`.
    if (place.route) errors.push({ code: 'spot-cannot-have-route-metrics' })
  }

  for (const key of Object.keys(place.attributes ?? {})) {
    if (!activities.includes(key as Activity)) {
      errors.push({ code: 'attributes-outside-activities', subject: key })
    }
  }

  for (const [key, level] of Object.entries(place.difficulty ?? {})) {
    if (!activities.includes(key as Activity)) {
      errors.push({ code: 'difficulty-outside-activities', subject: key })
    }
    if (typeof level !== 'number' || level < 1 || level > 5) {
      errors.push({ code: 'difficulty-out-of-range', subject: key })
    }
  }

  const positions = [
    ...(place.startPoint ? [place.startPoint.coordinates] : []),
    ...(place.geometry?.type === 'Point' ? [place.geometry.coordinates] : []),
    ...(place.geometry?.type === 'LineString' ? place.geometry.coordinates : []),
  ]
  if (positions.length > 0 && !positions.every((position) => isWithinCoverage(position))) {
    errors.push({ code: 'outside-coverage' })
  }

  return errors
}
