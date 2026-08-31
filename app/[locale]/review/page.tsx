import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '../../../auth'
import { listPlacesForReview } from '../../../lib/places/repository'
import { resolveText } from '../../../lib/places/text'
import type { Locale } from '../../../i18n/routing'
import { ReviewActions } from './review-actions'

export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('review')
  const tp = await getTranslations('places')
  const session = await auth()

  // Checked again in the action. Hiding the page is not authorisation.
  if (session?.user?.role !== 'admin') {
    return (
      <main>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-dim">{t('adminOnly')}</p>
      </main>
    )
  }

  const places = await listPlacesForReview()

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t('title')}</h1>

      {places.length === 0 ? (
        <p className="text-dim">{t('empty')}</p>
      ) : (
        <ul className="space-y-4">
          {places.map((place) => {
            const name = resolveText(place.name, locale as Locale)
            return (
              <li key={place.id} className="rounded border border-line bg-panel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-medium">{name?.value ?? place.slug}</span>
                  <span className="rounded border border-line px-1.5 py-0.5 text-xs text-dim">
                    {t(`status.${place.status}` as never)}
                  </span>
                </div>

                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-dim">
                  <span>{tp(`city.${place.city}`)}</span>
                  <span>{tp(`kind.${place.kind}`)}</span>
                  {place.activities.map((activity) => (
                    <span key={activity}>{tp(`activity.${activity}` as never)}</span>
                  ))}
                  <span className="font-mono">{place.slug}</span>
                </p>

                {/* The reason a previous reviewer gave, so a resubmission can be
                    judged against what was asked for. */}
                {place.status === 'rejected' && place.reviewNote && (
                  <p className="mt-2 text-sm text-dim">{place.reviewNote}</p>
                )}

                <ReviewActions id={place.id} city={place.city} status={place.status} />
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
