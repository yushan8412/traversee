export type Locale = 'zh' | 'en'

/**
 * The vocabulary, as values rather than as a union.
 *
 * The union came first and the arrays were written out again by hand wherever
 * one was needed at runtime — four times for cities, four for activities. On
 * 2026-09-02 that cost a day: the submit form offered twenty counties while the
 * server action it posted to still accepted three, so every submission outside
 * 北北基 came back "送出失敗", and diving was missing from all four copies, so
 * it could not be submitted at all despite being live everywhere else.
 *
 * Deriving the type from the array instead of the other way round makes that
 * drift impossible: there is one list, and adding to it updates the type.
 *
 * Ordered north to south. `CITIES` is the Cosmos partition key's domain, so
 * adding a value is free and renaming one is a migration.
 */
export const CITIES = [
  'taipei',
  'newTaipei',
  'keelung',
  'taoyuan',
  'hsinchuCity',
  'hsinchuCounty',
  'miaoli',
  'taichung',
  'changhua',
  'nantou',
  'yunlin',
  'chiayiCity',
  'chiayiCounty',
  'tainan',
  'kaohsiung',
  'pingtung',
  'yilan',
  'hualien',
  'taitung',
  'penghu',
] as const

export type City = (typeof CITIES)[number]

/** Shape only. A waterfall is a spot with an `approach`, not a third kind. */
export type Kind = 'route' | 'spot'

export const ACTIVITIES = [
  'hiking',
  'cycling',
  'vtt',
  'climbing',
  'camping',
  'surfing',
  'diving',
  'waterfall',
] as const

export type Activity = (typeof ACTIVITIES)[number]

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
