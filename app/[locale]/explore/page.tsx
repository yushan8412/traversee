import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { listPublishedPlaces } from '../../../lib/places/repository'
import { resolveText } from '../../../lib/places/text'
import { resolveTileSource } from '../../../lib/maps/tile-source'
import { publicPhotoUrl } from '../../../lib/photos/store'
import { standInPhotos } from '../../../lib/places/stand-in-photos'
import type { Activity, Locale } from '../../../lib/places/types'
import { REGIONS, regionOf } from '../../../lib/places/regions'
import { ExploreMap, type ExplorePin } from './explore-map'

export const dynamic = 'force-dynamic'

const ACTIVITIES: Activity[] = [
  'hiking',
  'cycling',
  'vtt',
  'climbing',
  'camping',
  'surfing',
  'diving',
  'waterfall',
]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'explore' })
  return { title: t('title') }
}

export default async function Explore({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('explore')
  const tp = await getTranslations('places')
  const places = await listPublishedPlaces()

  const pins: ExplorePin[] = places.map((place) => {
    const graded = place.activities.find((activity) => place.difficulty[activity] !== undefined)
    const value = graded ? place.difficulty[graded] : undefined
    const cover = place.photos[place.coverPhotoIndex]
    const photo = cover
      ? publicPhotoUrl(cover.path)
      : (standInPhotos[place.slug]?.[0]?.path ?? null)
    const [lng, lat] = place.startPoint.coordinates
    return {
      slug: place.slug,
      name: resolveText(place.name, locale as Locale)?.value ?? place.slug,
      city: place.city,
      cityLabel: tp(`city.${place.city}`),
      kind: place.kind,
      activities: place.activities,
      activityLabels: place.activities.map((activity) => tp(`activity.${activity}`)),
      difficulty: value ?? null,
      difficultyLabel:
        value === undefined
          ? null
          : `${tp('metrics.difficulty')} ${tp('metrics.difficultyValue', { value })}`,
      photo,
      metrics: place.route
        ? `${tp('metrics.kilometres', { value: place.route.distanceKm })} · ↑${tp('metrics.metres', { value: place.route.elevationGainM })}`
        : tp(`kind.${place.kind}`),
      lng,
      lat,
    }
  })

  // Every region, each carrying its own count. All five are offered — the site
  // says it covers Taiwan, and a panel listing only the north would quietly
  // contradict that — but the count lets the panel show which are still empty
  // instead of handing out clicks that return nothing.
  const counts = new Map<string, number>()
  for (const place of places) {
    const region = regionOf(place.city)
    if (region) counts.set(region, (counts.get(region) ?? 0) + 1)
  }

  return (
    <main>
      <ExploreMap
        pins={pins}
        tileSource={resolveTileSource()}
        activities={ACTIVITIES.map((activity) => ({
          key: activity,
          label: tp(`activity.${activity}`),
        }))}
        regions={REGIONS.map((region) => ({
          key: region,
          label: t(`regions.${region}`),
          count: counts.get(region) ?? 0,
        }))}
      />
    </main>
  )
}
