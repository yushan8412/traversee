import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '../../../i18n/routing'
import { listPublishedPlaces } from '../../../lib/places/repository'
import { cardSpans } from '../../../lib/places/layout'
import { toCardData } from '../place-card-data'
import { PlaceCard } from '../place-card'

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
  // A place with no photograph of its own draws a borrowed stand-in, and the
  // largest card is the page's loudest claim about what is worth looking at.
  const spans = cardSpans(
    places.length,
    places.map((place) => place.photos.length > 0),
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-[26px] font-semibold tracking-tight sm:text-[32px]">{t('title')}</h1>
      <p className="mt-2 text-sm text-dim">{t('count', { count: places.length })}</p>

      {/* No map here any more. The explore page is a map of exactly these
          places, with filters, so a second one at the top of the index was the
          same view twice — and it fetched tiles on every visit to a page whose
          job is the photographs. */}

      {places.length === 0 ? (
        <p className="mt-10 text-dim">{t('empty')}</p>
      ) : (
        <ul className="mt-8 grid grid-flow-dense gap-5 sm:mt-10 sm:auto-rows-[15.5rem] sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place, index) => {
            const span = spans[index] ?? 'normal'
            return (
              <li
                key={place.id}
                style={{ '--card-index': index } as React.CSSProperties}
                className={`tv-card-in tv-drift-host flex ${
                  span === 'feature'
                    // Two rows at every width that has rows. At `sm` the two
                    // columns leave nothing to sit beside it, so without this
                    // the feature is a full-width card one row tall — a 124px
                    // strip of photograph under a 752px card.
                    ? 'sm:col-span-2 sm:row-span-2'
                    : span === 'wide'
                      ? 'sm:col-span-2 lg:col-span-3'
                      : ''
                }`}
              >
                <PlaceCard
                  item={toCardData(place, locale as Locale, t as never)}
                  noPhoto={t('noPhoto')}
                  span={span}
                />
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
