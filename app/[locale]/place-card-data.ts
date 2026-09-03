import { publicPhotoUrl } from '../../lib/photos/store'
import { standInPhotos } from '../../lib/places/stand-in-photos'
import { placeMetrics } from '../../lib/places/metrics'
import { resolveText } from '../../lib/places/text'
import type { PlaceSummary } from '../../lib/places/types'
import type { Locale } from '../../i18n/routing'
import type { PlaceCardData } from './place-card'

/**
 * One place, as a card, wherever a card is drawn.
 *
 * The home page's rail built this itself, and the list page was about to build
 * it again. Two copies of "which photograph, which difficulty, how the metrics
 * read" is how a place ends up described one way on the home page and another
 * way one click later — and every bug in this project so far has been a second
 * copy of something drifting from the first.
 */
export function toCardData(
  place: PlaceSummary,
  locale: Locale,
  t: (key: string, values?: Record<string, string | number>) => string,
): PlaceCardData {
  // The cover first, then the next photograph that is not the cover — that
  // second one is what a card reveals on hover.
  const cover = place.photos[place.coverPhotoIndex]
  const own = [cover, ...place.photos.filter((photo) => photo !== cover)]
    .filter((photo) => photo !== undefined)
    .slice(0, 2)
    .map((photo) => ({ src: publicPhotoUrl(photo.path), credit: null }))

  // Stand-ins fill in only for a place with no photograph at all. Mixing them
  // with a real one would put somebody else's picture beside the author's under
  // the same silent frame.
  const photos =
    own.length > 0
      ? own
      : (standInPhotos[place.slug] ?? []).map((photo) => ({
          src: photo.path,
          credit: photo.credit,
        }))

  // Difficulty is per activity because the scales are not comparable, so a card
  // shows the one belonging to the activity it leads with, and nothing at all
  // where nobody has graded it.
  const graded = place.activities.find((activity) => place.difficulty[activity] !== undefined)
  const value = graded ? place.difficulty[graded] : undefined

  return {
    slug: place.slug,
    name: resolveText(place.name, locale)?.value ?? place.slug,
    meta: [t(`city.${place.city}`), ...place.activities.map((a) => t(`activity.${a}`))].join(' · '),
    metrics: placeMetrics(place.route, t),
    activities: place.activities.map((activity) => ({
      key: activity,
      label: t(`activity.${activity}`),
    })),
    difficulty:
      value === undefined
        ? null
        : {
            value,
            label: `${t('metrics.difficulty')} ${t('metrics.difficultyValue', { value })}`,
          },
    photos,
  }
}
