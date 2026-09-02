import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { listPublishedPlaces } from '../../../lib/places/repository'
import { resolveText } from '../../../lib/places/text'
import { resolveTileSource } from '../../../lib/maps/tile-source'
import type { Activity, City, Locale } from '../../../lib/places/types'
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

  const tp = await getTranslations('places')
  const places = await listPublishedPlaces()

  const pins: ExplorePin[] = places.map((place) => {
    const graded = place.activities.find((activity) => place.difficulty[activity] !== undefined)
    const [lng, lat] = place.startPoint.coordinates
    return {
      slug: place.slug,
      name: resolveText(place.name, locale as Locale)?.value ?? place.slug,
      city: place.city,
      cityLabel: tp(`city.${place.city}`),
      kind: place.kind,
      activities: place.activities,
      activityLabels: place.activities.map((activity) => tp(`activity.${activity}`)),
      difficulty: graded ? (place.difficulty[graded] ?? null) : null,
      metrics: place.route
        ? `${tp('metrics.kilometres', { value: place.route.distanceKm })} · ↑${tp('metrics.metres', { value: place.route.elevationGainM })}`
        : tp(`kind.${place.kind}`),
      lng,
      lat,
    }
  })

  // Only the counties that actually have something on the map. Offering all
  // twenty when nineteen would return nothing is a filter that mostly produces
  // empty results, and the list grows on its own as the catalogue does.
  const present = [...new Set(places.map((place) => place.city))] as City[]

  return (
    <main>
      <ExploreMap
        pins={pins}
        tileSource={resolveTileSource()}
        activities={ACTIVITIES.map((activity) => ({
          key: activity,
          label: tp(`activity.${activity}`),
        }))}
        cities={present.map((city) => ({ key: city, label: tp(`city.${city}`) }))}
      />
    </main>
  )
}
