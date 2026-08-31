import { movingMinutes } from '../gpx/duration'
import { elevationGainM, trackLengthKm, type Position } from '../gpx/geo'
import type { Trackpoint } from '../gpx/parse'
import { simplify } from '../gpx/simplify'
import { slugify } from './slug'
import { validateSubmission, type ValidationError } from './validate'
import type { Activity, City, Duration, LineString, Place, Point } from './types'

/**
 * How far the stored shape may sit from a dropped point. Ten metres is below
 * what is visible at the zoom levels the site uses, and takes a few thousand
 * recorded points down to a hundred or so.
 */
const SIMPLIFY_TOLERANCE_M = 10

export interface TrackSummary {
  distanceKm: number
  elevationGainM: number
  duration: Duration
  geometry: LineString
  startPoint: Point
}

export function summariseTrack(points: Trackpoint[]): TrackSummary {
  if (points.length < 2) {
    throw new Error('A route needs at least two trackpoints.')
  }

  const positions: Position[] = points.map((p) => p.position)
  const minutes = movingMinutes(points.map((p) => p.time))

  return {
    // Rounded because six decimal places of a kilometre reads as precision the
    // underlying track does not have.
    distanceKm: Number(trackLengthKm(positions).toFixed(2)),
    elevationGainM: Math.round(elevationGainM(points.map((p) => p.elevationM))),
    duration:
      minutes === null
        ? // No timestamps in the file. Zero with basis 'submitter' says the site
          // does not know, and the form asks the submitter to fill it in —
          // inventing a figure would give a guess the confidence of a
          // measurement.
          { minMinutes: 0, maxMinutes: 0, basis: 'submitter' }
        : {
            minMinutes: Math.round(minutes),
            // A range rather than a point estimate: the recorded time is one
            // person on one day, and a fifth either way is a fairer claim than
            // a single number.
            maxMinutes: Math.round(minutes * 1.2),
            basis: 'gpx',
          },
    geometry: { type: 'LineString', coordinates: simplify(positions, SIMPLIFY_TOLERANCE_M) },
    startPoint: { type: 'Point', coordinates: positions[0]! },
  }
}

export interface RouteSubmissionInput {
  city: City
  activities: Activity[]
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
  difficulty: Partial<Record<Activity, number>>
  points: Trackpoint[]
  /** Where the original file was archived, if it was. */
  gpxPath?: string | null
}

export interface SubmissionContext {
  submittedBy: string
  now: string
  id: string
}

const orNull = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function buildRouteSubmission(
  input: RouteSubmissionInput,
  context: SubmissionContext,
): { place: Place; errors: ValidationError[] } {
  const summary = summariseTrack(input.points)

  const place: Place = {
    id: context.id,
    slug: slugify(input.nameEn) || `route-${context.id}`,
    city: input.city,
    status: 'pending',
    kind: 'route',
    activities: input.activities,
    name: { zh: orNull(input.nameZh), en: orNull(input.nameEn) },
    summary: { zh: orNull(input.summaryZh), en: orNull(input.summaryEn) },
    description: { zh: orNull(input.descriptionZh), en: orNull(input.descriptionEn) },
    difficulty: input.difficulty,
    geometry: summary.geometry,
    startPoint: summary.startPoint,
    route: {
      distanceKm: summary.distanceKm,
      elevationGainM: summary.elevationGainM,
      duration: summary.duration,
      gpxPath: input.gpxPath ?? null,
    },
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
