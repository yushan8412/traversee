import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import type { Locale } from '../../i18n/routing'
import { listPublishedPlacesOrNone } from '../../lib/places/repository'
import { resolveText } from '../../lib/places/text'
import { publicPhotoUrl } from '../../lib/photos/store'
import { standInPhotos } from '../../lib/places/stand-in-photos'
import { ActivityCarousel } from './activity-carousel'
import { ClosingBand } from './closing-band'
import { DoodleField, type DoodleMark } from './doodle'
import { FeaturedRail, type RailItem } from './featured-rail'

export const dynamic = 'force-dynamic'

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('home')
  const tp = await getTranslations('places')
  const places = await listPublishedPlacesOrNone()

  // The footage is not in the repository — see .gitignore. Point this at Blob
  // Storage in production; the local path is the convenience for development,
  // and its absence costs a poster rather than a broken hero.
  const heroVideo = process.env.HERO_VIDEO_URL ?? '/hero/hero.mp4'

  // Latin italics are a designed second face; a browser asked to italicise
  // Chinese just slants the upright one, which is a counterfeit, not a style.
  // The emphasis on a heading's second line therefore changes with the script.
  const emphasis = locale === 'en' ? 'italic' : 'tracking-[0.14em]'

  const counts: Record<string, number> = {}
  for (const place of places) {
    for (const activity of place.activities) counts[activity] = (counts[activity] ?? 0) + 1
  }

  const rail: RailItem[] = places.map((place) => {
    // The cover first, then the next photograph that is not the cover — that
    // second one is what the card reveals on hover.
    const cover = place.photos[place.coverPhotoIndex]
    const own = [cover, ...place.photos.filter((photo) => photo !== cover)]
      .filter((photo) => photo !== undefined)
      .slice(0, 2)
      .map((photo) => ({ src: publicPhotoUrl(photo.path), credit: null }))

    // Stand-ins fill in only for a place with no photograph at all. Mixing
    // them with a real one would put somebody else's picture beside the
    // author's under the same silent frame.
    const photos =
      own.length > 0
        ? own
        : (standInPhotos[place.slug] ?? []).map((photo) => ({
            src: photo.path,
            credit: photo.credit,
          }))

    // Difficulty is per activity because the scales are not comparable, so the
    // card shows the one belonging to the activity it leads with, and nothing
    // at all where nobody has graded it.
    const graded = place.activities.find((activity) => place.difficulty[activity] !== undefined)
    const value = graded ? place.difficulty[graded] : undefined

    return {
      slug: place.slug,
      name: resolveText(place.name, locale as Locale)?.value ?? place.slug,
      meta: [tp(`city.${place.city}`), ...place.activities.map((a) => tp(`activity.${a}`))].join(
        ' · ',
      ),
      metrics: place.route
        ? `${tp('metrics.kilometres', { value: place.route.distanceKm })} · ↑${tp('metrics.metres', { value: place.route.elevationGainM })}`
        : tp(`kind.${place.kind}`),
      activities: place.activities.map((activity) => ({
        key: activity,
        label: tp(`activity.${activity}`),
      })),
      difficulty:
        value === undefined
          ? null
          : {
              value,
              label: `${tp('metrics.difficulty')} ${tp('metrics.difficultyValue', { value })}`,
            },
      photos,
    }
  })

  // The band's top and bottom padding, not its side margins. The reading
  // column was widened to make the prose and the photographs bigger, which left
  // barely forty pixels at the sides on a 1280 window — the marks that used to
  // live there ended up behind the content, which is the same as not drawing
  // them. The horizontal bands above and below survive any window width.
  const marks: DoodleMark[] = [
    { key: 'pine-tl', shape: 'pine', place: 'left-[5%] top-[1%]', tone: 'text-brandSoft/25', size: 96, tilt: -9 },
    { key: 'tent-tr', shape: 'tent', place: 'right-[7%] top-[2%]', tone: 'text-mint/20', size: 72, tilt: 12 },
    { key: 'peaks-bl', shape: 'peaks', place: 'left-[7%] bottom-[1%]', tone: 'text-moss/25', size: 92, tilt: 7 },
    { key: 'wave-bc', shape: 'wave', place: 'left-[34%] bottom-[2%]', tone: 'text-sea/25', size: 84, tilt: -6 },
    { key: 'pine-br', shape: 'pine', place: 'right-[10%] bottom-[1%]', tone: 'text-moss/22', size: 76, tilt: -11 },
  ]

  const offers = [
    [t('offer1'), t('offer1d')],
    [t('offer2'), t('offer2d')],
    [t('offer3'), t('offer3d')],
    [t('offer4'), t('offer4d')],
  ]

  return (
    <main>
      <section className="relative flex min-h-[38rem] items-center justify-center overflow-hidden sm:min-h-[86vh]">
        {/* Muted and inline so iOS plays it without a tap; the poster carries
            the first paint so the hero is never an empty rectangle while the
            video arrives. */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={heroVideo}
          poster="/hero/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        {/* Three scrims doing different jobs: a flat wash that puts a floor
            under the brightest frames, a soft pool behind the copy so the
            subhead survives white water, and a vertical gradient that seats the
            header and the fold. Darkening the whole frame instead would buy the
            same contrast by turning the footage to mud. */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_52%_44%_at_50%_50%,rgb(0_0_0/0.62)_10%,rgb(0_0_0/0.34)_55%,transparent_78%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />

        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center text-white">
          <h1 className="hero-type font-[family-name:var(--font-display)] text-[2.5rem] font-normal leading-[1.12] tracking-[-0.015em] sm:text-6xl lg:text-[4.25rem]">
            {t('heroTitle')}
            <br />
            <span className={emphasis}>{t('heroTitle2')}</span>
          </h1>
          <p className="hero-type mx-auto mt-7 max-w-[46ch] text-pretty text-sm leading-relaxed text-white/95 sm:text-base">
            {t('heroSub')}
          </p>
          <Link
            href="/places"
            className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-paper px-8 py-4 text-sm font-medium text-ink no-underline transition-transform hover:scale-[1.03]"
          >
            {t('startExploring')}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <ActivityCarousel counts={counts} emphasis={emphasis} />

      <section className="relative overflow-hidden bg-brandInk text-white">
        <DoodleField marks={marks} />

        <div className="relative mx-auto grid max-w-[78rem] gap-16 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              {t('offerKicker')}
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-[2rem] font-normal leading-[1.15] tracking-[-0.01em] sm:text-[2.75rem]">
              {t('offerTitle')}
              <br />
              <span className={`text-brandSoft ${emphasis}`}>{t('offerTitle2')}</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-[18px] leading-[1.85] text-white/80">{t('offerBody')}</p>

            <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {offers.map(([label, detail], i) => (
                <div key={label} className="border-t border-white/25 pt-4">
                  <span className="font-[family-name:var(--font-display)] text-sm text-brandSoft">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <dt className="mt-1.5 text-[18px] font-medium">{label}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-white/65">{detail}</dd>
                </div>
              ))}
            </dl>

            {/* This band stated four things the site does and then linked
                nowhere. It was the only section on the page with no exit. */}
            <Link
              href="/places"
              className="mt-10 inline-flex items-center gap-2.5 rounded-full bg-paper px-7 py-3.5 text-sm font-medium text-ink no-underline transition-transform hover:scale-[1.03]"
            >
              {t('offerCta')}
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* One tall picture with a smaller one riding over its corner, rather
              than a four-up grid: the asymmetry is what stops a set of frames
              reading as a contact sheet. */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed art direction */}
            <img
              src="/activities/hiking.jpg"
              alt=""
              className="aspect-[4/5] w-full rounded-[1.75rem] object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed art direction */}
            <img
              src="/activities/waterfall.jpg"
              alt=""
              className="absolute -bottom-12 -left-8 hidden aspect-square w-56 rounded-[1.25rem] border-[6px] border-brandInk object-cover sm:block lg:-left-16 lg:w-[22rem]"
            />
          </div>
        </div>
      </section>

      {rail.length > 0 && <FeaturedRail items={rail} emphasis={emphasis} />}

      <ClosingBand count={places.length} emphasis={emphasis} />
    </main>
  )
}
