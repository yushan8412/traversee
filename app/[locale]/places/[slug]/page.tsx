import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '../../../../auth'
import { notFound } from 'next/navigation'
import { Link } from '../../../../i18n/navigation'
import type { Locale } from '../../../../i18n/routing'
import { getPublishedPlaceBySlug } from '../../../../lib/places/repository'
import { resolveText } from '../../../../lib/places/text'
import type { Activity, RouteMetrics } from '../../../../lib/places/types'
import { PlaceMap } from '../place-map'
import { resolveTileSource } from '../../../../lib/maps/tile-source'
import { PlacePhoto } from '../photo'
import { standInPhotos } from '../../../../lib/places/stand-in-photos'
import { TranslatedText } from '../translated-text'
import { canEdit } from '../../../../lib/places/editing'
import { DifficultyDots } from '../../place-card'
import { ActivityIcon } from '../../activity-icon'
import { PlaceGallery, PhotoStrip, ZoomTrigger, type GalleryShot } from '../photo-gallery'
import { publicPhotoUrl } from '../../../../lib/photos/public-url'

export const dynamic = 'force-dynamic'

/** The reading measure. The photograph and the map are not bound by it. */
const COLUMN = 'mx-auto w-full max-w-3xl px-5 sm:px-6'

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
  const te = await getTranslations('edit')
  const session = await auth()
  const mayEdit = canEdit(
    place,
    session?.user ? { id: session.user.id, role: session.user.role } : null,
  )
  const name = resolveText(place.name, locale as Locale)
  const summary = resolveText(place.summary, locale as Locale)
  const description = resolveText(place.description, locale as Locale)
  const title = name?.value ?? place.slug

  const activities = place.activities.map((activity) => ({
    key: activity,
    label: t(`activity.${activity}` as never) as string,
  }))

  // Borrowed photography only where the entry has none of its own, never mixed
  // with the author's, and always credited because the licences require it.
  const own = place.photos
  const standIns = own.length === 0 ? (standInPhotos[place.slug] ?? []) : []
  const cover = own[0]

  // One list for every picture on the page, in the order they appear, so the
  // gallery's indices and what the reader sees cannot drift apart. The cover is
  // index 0 and is reachable from the hero as well as from the strip.
  const shots: GalleryShot[] = [
    ...own.map((photo) => ({
      src: publicPhotoUrl(photo.path),
      width: photo.width,
      height: photo.height,
      credit: null,
    })),
    ...standIns.map((photo) => ({
      src: photo.path,
      width: 1600,
      height: 1200,
      credit: photo.credit,
    })),
  ]

  // The highest-graded activity, so the hero carries one grade rather than a
  // list. Camping, surfing, diving and waterfalls have no scale defined at all
  // — deliberately — so most places carry none.
  const graded = Object.entries(place.difficulty) as [Activity, number][]
  const topGrade = graded.sort((a, b) => b[1] - a[1])[0]

  return (
    <PlaceGallery shots={shots} alt={title}>
      <main className="pb-24">
      {/* ── The photograph, and the name on it ───────────────────────────────
          The index leads with the picture and so does this, because the card
          that brought the reader here was a photograph and landing on a page of
          grey text reads as arriving somewhere else. */}
      <header className="relative isolate overflow-hidden bg-panel">
        {shots[0] && (
          <ZoomTrigger
            index={0}
            label={t('openPhoto')}
            className="absolute inset-0 h-full w-full cursor-zoom-in"
          >
            {cover ? (
              <PlacePhoto
                photo={cover}
                alt={title}
                priority
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- already WebP at a bounded size
              <img
                src={shots[0].src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </ZoomTrigger>
        )}

        {/* The scrim is what makes white type legible over an unknown
            photograph. Without a picture there is nothing to darken, so the
            name is set in ink on the panel instead. */}
        {(cover || standIns[0]) && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/5"
            />
            {/* A second, shorter scrim at the top. The first one fades to 5%
                there, which left the back and edit links sitting on whatever
                the photograph happened to be — bright rock, in the first one
                tested — well under the 4.5:1 they need. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/55 to-transparent"
            />
          </>
        )}

        <div
          className={`${COLUMN} relative flex min-h-[19rem] flex-col justify-end pb-7 pt-24
            sm:min-h-[24rem] sm:pb-9`}
        >
          <div className="absolute inset-x-5 top-4 flex items-center justify-between sm:inset-x-6">
            <Link
              href="/places"
              className={`inline-flex min-h-11 items-center text-[13px] no-underline ${
                cover || standIns[0] ? 'text-white/85 hover:text-white' : 'text-dim hover:text-ink'
              }`}
            >
              ← {t('backToList')}
            </Link>
            {/* Only for whoever may actually save the change; an edit link that
                leads to a refusal is worse than no link. */}
            {mayEdit && (
              <Link
                href={`/places/${place.slug}/edit`}
                className={`inline-flex min-h-11 items-center text-[13px] no-underline ${
                  cover || standIns[0] ? 'text-white/85 hover:text-white' : 'text-dim hover:text-ink'
                }`}
              >
                {te('edit')}
              </Link>
            )}
          </div>

          <h1
            className={`font-[family-name:var(--font-display)] text-[30px] leading-tight
              tracking-tight sm:text-[44px] ${
                cover || standIns[0] ? 'text-white' : 'text-ink'
              }`}
          >
            {name ? <TranslatedText text={name} as="span" /> : place.slug}
          </h1>

          <p
            className={`mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] ${
              cover || standIns[0] ? 'text-white/80' : 'text-dim'
            }`}
          >
            <span>{t(`city.${place.city}`)}</span>
            {activities.map((activity) => (
              <span key={activity.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <ActivityIcon activity={activity.key} size={15} />
                {activity.label}
              </span>
            ))}
          </p>

          {/* Borrowed photography carries its credit on the picture, because the
              licence requires it and because nobody should mistake a stand-in
              for the catalogue's own work. Its own backing, since a credit that
              lands on bright sky is not a credit. */}
          {standIns[0]?.credit && (
            <span
              className="absolute bottom-2 right-5 rounded bg-ink/55 px-1.5 py-0.5 text-[10px]
                text-white/90 sm:right-6"
            >
              {standIns[0].credit}
            </span>
          )}
        </div>

      </header>

      {/* ── What a reader deciding at 6am wants first ────────────────────────
          These three numbers used to sit in a grey box at the foot of the page,
          the least designed element carrying the most-wanted facts. A spot with
          nothing to measure gets no bar at all rather than an empty one. */}
      {place.route && <DecisionBar metrics={place.route} label={t} />}

      <div className={`${COLUMN} mt-8 sm:mt-10`}>
        {/* No row rather than an empty one — the same rule the index card
            follows, because most places carry no grade at all. */}
        {topGrade && (
          <div className="border-b border-line pb-4">
            <DifficultyDots
              difficulty={{
                label: `${t(`activity.${topGrade[0]}` as never)} · ${t('metrics.difficultyValue', { value: topGrade[1] })}`,
                value: topGrade[1],
              }}
            />
          </div>
        )}

        {/* ── The prose, and saying so when there is none ─────────────────── */}
        <div className="mt-7">
          {summary && (
            <TranslatedText
              text={summary}
              className="text-[19px] leading-relaxed text-ink sm:text-[21px]"
            />
          )}

          {description ? (
            <div className={summary ? 'mt-5' : ''}>
              {!description.translated && (
                <p className="mb-2 text-xs text-dim">{t('notTranslatedHint')}</p>
              )}
              <TranslatedText
                text={description}
                className="whitespace-pre-line leading-relaxed text-ink/90"
                showMarker={false}
              />
            </div>
          ) : (
            // Absence is displayed, not hidden — a page that simply omits the
            // description makes the catalogue look fuller than it is.
            !summary && <p className="text-[15px] text-dim">{t('noDescription')}</p>
          )}
        </div>
      </div>

      {/* ── Where it is ──────────────────────────────────────────────────────
          Wider and taller than the old h-96 inside a 768px column. The detail
          query returns the whole document, so the simplified track is already
          in hand and drawing it costs nothing extra. */}
      <section className="mt-10 sm:mt-12">
        <h2 className={`${COLUMN} mb-3 text-[13px] font-medium text-dim`}>{t('whereItIs')}</h2>
        <PlaceMap
          tileSource={resolveTileSource()}
          markers={[{ slug: place.slug, name: title, point: place.startPoint }]}
          geometry={place.geometry}
          className="h-[22rem] w-full sm:h-[30rem]"
        />
      </section>

      {/* ── The photographs ─────────────────────────────────────────────────
          A strip you scroll rather than a grid you scan, with the middle one
          enlarged. Every picture opens full-screen, where it is shown
          uncropped — the strip has to crop to a common shape, and the reason to
          open a photograph is to see what the crop took away. */}
      {shots.length > 1 && (
        <section className="mt-10 sm:mt-12">
          <h2 className={`${COLUMN} text-[13px] font-medium text-dim`}>{t('photographs')}</h2>
          <PhotoStrip shots={shots} alt={title} />
        </section>
      )}

      {/* ── Supporting detail ───────────────────────────────────────────────── */}
      {(place.approach || Object.keys(place.attributes).length > 0) && (
        <section className={`${COLUMN} mt-10 space-y-6 sm:mt-12`}>
          <h2 className="text-[13px] font-medium text-dim">{t('aboutThisPlace')}</h2>

          {place.approach && (
            <div className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
              <h3 className="text-[15px] font-medium text-ink">{t('approach.title')}</h3>
              <p className="mt-1 text-[13px] text-dim">{t('approach.note')}</p>
              <div className="mt-4">
                <Figures metrics={place.approach} label={t} compact />
              </div>
            </div>
          )}

          {Object.keys(place.attributes).length > 0 && (
            <div className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
              {Object.entries(place.attributes).map(([activity, values]) => (
                <div key={activity} className="mb-4 last:mb-0">
                  <h3 className="text-[15px] font-medium text-ink">
                    {t(`activity.${activity}` as never)}
                  </h3>
                  <dl className="mt-2 grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
                    {Object.entries(values ?? {}).map(([key, value]) => (
                      <ReadOnlyAttribute key={key} name={key} value={value} />
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </main>
    </PlaceGallery>
  )
}

type Label = Awaited<ReturnType<typeof getTranslations<'places'>>>

/**
 * Distance, ascent and time, at the size their importance deserves.
 *
 * Full-width on its own ground rather than a card, so it reads as part of the
 * page's spine instead of an aside. `tabular-nums` because three figures side
 * by side that shift as digits change look like they are still loading.
 */
function DecisionBar({ metrics, label }: { metrics: RouteMetrics; label: Label }) {
  return (
    <div className="mt-0 border-b border-line bg-paper">
      <div className={`${COLUMN} py-6 sm:py-7`}>
        <Figures metrics={metrics} label={label} />
      </div>
    </div>
  )
}

function Figures({
  metrics,
  label,
  compact = false,
}: {
  metrics: RouteMetrics
  label: Label
  compact?: boolean
}) {
  const size = compact ? 'text-[17px]' : 'text-[22px] sm:text-[26px]'

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-5 sm:gap-x-14">
      <div>
        <dt className="text-[12px] uppercase tracking-wider text-dim">
          {label('metrics.distance')}
        </dt>
        <dd className={`mt-1 font-[family-name:var(--font-display)] tabular-nums ${size}`}>
          {label('metrics.kilometres', { value: metrics.distanceKm })}
        </dd>
      </div>

      <div>
        <dt className="text-[12px] uppercase tracking-wider text-dim">
          {label('metrics.elevationGain')}
        </dt>
        <dd className={`mt-1 font-[family-name:var(--font-display)] tabular-nums ${size}`}>
          {label('metrics.metres', { value: metrics.elevationGainM })}
        </dd>
      </div>

      <div>
        <dt className="text-[12px] uppercase tracking-wider text-dim">
          {label('metrics.duration')}
        </dt>
        <dd className={`mt-1 font-[family-name:var(--font-display)] tabular-nums ${size}`}>
          {label('metrics.minutes', {
            min: metrics.duration.minMinutes,
            max: metrics.duration.maxMinutes,
          })}
        </dd>
        {/* Whether this was measured or guessed, next to the number it
            qualifies rather than in a legend somewhere else. */}
        <dd className="mt-0.5 text-[12px] text-dim">
          {label(`basis.${metrics.duration.basis}` as never)}
        </dd>
      </div>
    </dl>
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
