import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '../../../i18n/navigation'
import type { Locale } from '../../../i18n/routing'
import { listPublishedPlaces } from '../../../lib/places/repository'
import { resolveText } from '../../../lib/places/text'
import { PlaceMap, type MapMarker } from './place-map'
import { TranslatedText } from './translated-text'

// Every query is per request against Cosmos. Caching is deliberately not added
// yet: the spec wants the list cached for a few minutes to conserve the free
// throughput grant, but Static Web Apps' hybrid runtime is in preview and
// documents ISR image caching as disabled, so which caching primitives actually
// work here needs measuring rather than assuming.
export const dynamic = 'force-dynamic'

export default async function PlacesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('places')
  const places = await listPublishedPlaces()

  // startPoint is already in the list projection, so the overview map costs no
  // extra throughput. Route shapes need `geometry`, which the projection omits
  // deliberately, so those appear on the detail page instead.
  const markers: MapMarker[] = places.map((place) => ({
    slug: place.slug,
    name: resolveText(place.name, locale as Locale)?.value ?? place.slug,
    point: place.startPoint,
  }))

  return (
    <main>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mb-6 text-sm text-dim">{t('count', { count: places.length })}</p>

      {markers.length > 0 && <PlaceMap markers={markers} className="mb-8 h-80 w-full" />}

      {places.length === 0 ? (
        <p className="text-dim">{t('empty')}</p>
      ) : (
        <ul className="space-y-4">
          {places.map((place) => {
            const name = resolveText(place.name, locale as Locale)
            const summary = resolveText(place.summary, locale as Locale)

            return (
              <li key={place.id} className="rounded border border-line bg-panel p-5">
                <Link href={`/places/${place.slug}`} className="text-accent hover:underline">
                  {name ? (
                    <TranslatedText text={name} as="span" className="text-lg font-medium" />
                  ) : (
                    place.slug
                  )}
                </Link>

                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-dim">
                  <span>{t(`city.${place.city}`)}</span>
                  <span>{t(`kind.${place.kind}`)}</span>
                  {place.activities.map((activity) => (
                    <span key={activity}>{t(`activity.${activity}`)}</span>
                  ))}
                </p>

                {summary && <TranslatedText text={summary} className="mt-2 text-sm" />}

                {place.route && (
                  <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-dim">
                    <span>
                      {t('metrics.distance')} {t('metrics.kilometres', { value: place.route.distanceKm })}
                    </span>
                    <span>
                      {t('metrics.elevationGain')}{' '}
                      {t('metrics.metres', { value: place.route.elevationGainM })}
                    </span>
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
