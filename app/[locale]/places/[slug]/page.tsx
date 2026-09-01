import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '../../../../i18n/navigation'
import type { Locale } from '../../../../i18n/routing'
import { getPublishedPlaceBySlug } from '../../../../lib/places/repository'
import { resolveText } from '../../../../lib/places/text'
import type { RouteMetrics } from '../../../../lib/places/types'
import { PlaceMap } from '../place-map'
import { PlacePhoto } from '../photo'
import { TranslatedText } from '../translated-text'

export const dynamic = 'force-dynamic'

export default async function PlacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const place = await getPublishedPlaceBySlug(slug)
  if (!place) notFound()

  const t = await getTranslations('places')
  const name = resolveText(place.name, locale as Locale)
  const summary = resolveText(place.summary, locale as Locale)
  const description = resolveText(place.description, locale as Locale)

  const metrics = (m: RouteMetrics) => (
    <dl className="grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
      <dt className="text-dim">{t('metrics.distance')}</dt>
      <dd>{t('metrics.kilometres', { value: m.distanceKm })}</dd>
      <dt className="text-dim">{t('metrics.elevationGain')}</dt>
      <dd>{t('metrics.metres', { value: m.elevationGainM })}</dd>
      <dt className="text-dim">{t('metrics.duration')}</dt>
      <dd>
        {t('metrics.minutes', {
          min: m.duration.minMinutes,
          max: m.duration.maxMinutes,
        })}
        <span className="ml-2 text-xs text-dim">{t(`basis.${m.duration.basis}` as never)}</span>
      </dd>
    </dl>
  )

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
      <Link href="/places" className="text-sm text-accent hover:underline">
        ← {t('backToList')}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {name ? <TranslatedText text={name} as="span" /> : place.slug}
      </h1>

      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-dim">
        <span>{t(`city.${place.city}`)}</span>
        <span>{t(`kind.${place.kind}`)}</span>
        {place.activities.map((activity) => (
          <span key={activity}>{t(`activity.${activity}`)}</span>
        ))}
      </p>

      {summary && <TranslatedText text={summary} className="mt-4 text-lg" />}

      {place.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {place.photos.map((photo) => (
            <PlacePhoto
              key={photo.path}
              photo={photo}
              alt={name?.value ?? place.slug}
              className="h-40 w-full rounded border border-line object-cover"
            />
          ))}
        </div>
      )}

      {/* The detail query returns the whole document, so the simplified track is
          already in hand and drawing it costs nothing extra. */}
      <PlaceMap
        markers={[{ slug: place.slug, name: name?.value ?? place.slug, point: place.startPoint }]}
        geometry={place.geometry}
        className="mt-6 h-96 w-full"
      />

      {Object.keys(place.difficulty).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-dim">
            {t('metrics.difficulty')}
          </h2>
          <ul className="text-sm">
            {Object.entries(place.difficulty).map(([activity, level]) => (
              <li key={activity}>
                {t(`activity.${activity}` as never)} — {t('metrics.difficultyValue', { value: level })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {place.route && (
        <section className="mt-6 rounded border border-line bg-panel p-5">
          {metrics(place.route)}
        </section>
      )}

      {place.approach && (
        <section className="mt-6 rounded border border-line bg-panel p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-dim">
            {t('approach.title')}
          </h2>
          <p className="mb-3 text-sm text-dim">{t('approach.note')}</p>
          {metrics(place.approach)}
        </section>
      )}

      {description && (
        <section className="mt-8">
          {!description.translated && (
            <p className="mb-2 text-xs text-dim">{t('notTranslatedHint')}</p>
          )}
          <TranslatedText
            text={description}
            className="whitespace-pre-line"
            showMarker={false}
          />
        </section>
      )}

      {Object.keys(place.attributes).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-dim">
            {t('attributes.title')}
          </h2>
          {Object.entries(place.attributes).map(([activity, values]) => (
            <div key={activity} className="mb-4">
              <h3 className="text-sm font-medium">{t(`activity.${activity}` as never)}</h3>
              <dl className="grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
                {Object.entries(values ?? {}).map(([key, value]) => (
                  <ReadOnlyAttribute key={key} name={key} value={value} />
                ))}
              </dl>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}

// Attribute keys are activity-specific and open-ended by design, so they are not
// in the message catalogue. Showing the raw key is honest about that rather than
// inventing a label; naming them properly is part of designing each activity's
// presentation, which happens when that activity actually launches.
function ReadOnlyAttribute({ name, value }: { name: string; value: unknown }) {
  return (
    <>
      <dt className="font-mono text-xs text-dim">{name}</dt>
      <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
    </>
  )
}
