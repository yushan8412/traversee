export type Locale = 'zh' | 'en'

export type City = 'taipei' | 'newTaipei' | 'keelung'

/** Shape only. A waterfall is a spot with an `approach`, not a third kind. */
export type Kind = 'route' | 'spot'

export type Activity = 'hiking' | 'cycling' | 'camping' | 'surfing' | 'waterfall'

export type Status = 'pending' | 'published' | 'rejected'

/** Either side may be missing: a place with only Chinese prose still publishes. */
export interface BilingualText {
  zh?: string | null
  en?: string | null
}

export interface Duration {
  minMinutes: number
  maxMinutes: number
  /** Where the estimate came from; the site shows recorded and estimated differently. */
  basis: 'gpx' | 'submitter' | 'editor'
}

export interface LineString {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface Point {
  type: 'Point'
  coordinates: [number, number]
}

export interface RouteMetrics {
  distanceKm: number
  elevationGainM: number
  duration: Duration
  gpxPath: string | null
}

/** The walk-in for somewhere you cannot drive to. Null when you can. */
export interface Approach extends RouteMetrics {
  geometry: LineString
}

export interface Photo {
  path: string
  /**
   * Stored rather than derived from `path`. Deriving it would put the naming
   * convention in every place that needs a thumbnail, and changing the
   * convention would then mean finding all of them.
   */
  thumbPath?: string | null
  width: number
  height: number
  caption?: BilingualText
}

export interface Place {
  id: string
  slug: string
  city: City
  status: Status
  kind: Kind
  activities: Activity[]
  name: BilingualText
  summary: BilingualText
  description: BilingualText
  /** Keyed by activity because the scales are not comparable across activities. */
  difficulty: Partial<Record<Activity, number>>
  geometry: LineString | Point
  startPoint: Point
  route: RouteMetrics | null
  approach: Approach | null
  /** Keys must appear in `activities`. Shapes differ per activity by design. */
  attributes: Partial<Record<Activity, Record<string, unknown>>>
  photos: Photo[]
  coverPhotoIndex: number
  source: 'osm' | 'user'
  submittedBy: string | null
  reviewedBy?: string | null
  /** Why a submission was refused. Shown to its submitter, so it is not internal. */
  reviewNote?: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

/**
 * What the list page needs. Deliberately excludes `description` and the full
 * geometry — a 20-item list carrying either would move far more data per request
 * than the free throughput grant is worth spending on.
 */
export type PlaceSummary = Pick<
  Place,
  | 'id'
  | 'slug'
  | 'city'
  | 'kind'
  | 'activities'
  | 'name'
  | 'summary'
  | 'difficulty'
  | 'startPoint'
  | 'route'
  | 'photos'
  | 'coverPhotoIndex'
>
