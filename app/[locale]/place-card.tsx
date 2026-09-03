import { Link } from '../../i18n/navigation'
import type { Activity } from '../../lib/places/types'
import { ActivityIcon } from './activity-icon'

export interface PlaceCardData {
  slug: string
  name: string
  meta: string
  metrics: string
  activities: { key: Activity; label: string }[]
  /**
   * Null wherever no one has graded it. Camping, surfing and waterfall have no
   * scale defined at all, on purpose — difficulty is what somebody uses to
   * judge their own safety, so an invented number is worse than none. A card
   * without a grade simply carries one fewer fact.
   */
  difficulty: { label: string; value: number } | null
  /**
   * Up to two: the cover, and whatever the card reveals on hover. `credit` is
   * set on borrowed photography and printed on the picture, because the licence
   * requires it and because nobody should mistake a stand-in for the
   * catalogue's own work.
   */
  photos: { src: string; credit: string | null }[]
}

const DIFFICULTY_STEPS = 5

/** The activities a place is for, on the photograph. Shared with the home
 *  page's rail so a place is badged the same way wherever it appears. */
export function ActivityPills({ activities }: { activities: PlaceCardData['activities'] }) {
  return (
    <span className="absolute left-3.5 top-3.5 flex gap-1.5">
      {activities.map((activity) => (
        <span
          key={activity.key}
          title={activity.label}
          className="grid h-8 w-8 place-items-center rounded-full bg-paper/95 text-brandInk"
        >
          <ActivityIcon activity={activity.key} />
        </span>
      ))}
    </span>
  )
}

export function DifficultyDots({ difficulty }: { difficulty: PlaceCardData['difficulty'] }) {
  if (!difficulty) return null
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-dim">
      <span className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: DIFFICULTY_STEPS }, (_, step) => (
          <span
            key={step}
            className={`h-1.5 w-1.5 rounded-full ${step < difficulty.value ? 'bg-brand' : 'bg-line'}`}
          />
        ))}
      </span>
      {difficulty.label}
    </span>
  )
}

/**
 * A place in the index.
 *
 * The photograph is the card. The list this replaces gave each entry a 128px
 * strip under two lines of grey text, which on a catalogue whose content is
 * somebody's own photographs of mountains was the wrong way round — the picture
 * is the reason to click and it was the smallest thing on the row.
 *
 * The frame is fixed and the image fills it, so a portrait taken on a phone and
 * a landscape taken on a camera make the same shape in the grid. Ragged card
 * heights are what makes a grid read as a list that failed.
 */
export function PlaceCard({ item, noPhoto }: { item: PlaceCardData; noPhoto: string }) {
  const photo = item.photos[0]

  return (
    <Link
      href={`/places/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper
        no-underline transition-shadow duration-200 hover:shadow-[0_18px_40px_-28px_rgb(31_42_36/0.55)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-panel">
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- blob storage
                URLs, which next/image would proxy through the function for no
                gain; the stored file is already the published size. */}
            <img
              src={photo.src}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out
                group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {photo.credit && (
              <span className="absolute bottom-2 right-2 rounded bg-ink/55 px-1.5 py-0.5 text-[10px] text-white">
                {photo.credit}
              </span>
            )}
          </>
        ) : (
          <span className="grid h-full w-full place-items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            {noPhoto}
          </span>
        )}

        <ActivityPills activities={item.activities} />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="font-[family-name:var(--font-display)] text-lg leading-snug text-ink">
          {item.name}
        </span>
        <span className="mt-1 text-xs text-dim">{item.meta}</span>

        {/* Same rule as the map popup: no row rather than an empty one. A spot
            carries neither metrics nor, usually, a grade, and the rule above
            this row was left drawing a line under nothing on five cards out of
            seven. */}
        {(item.metrics || item.difficulty) && (
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3 text-xs text-dim">
            <span>{item.metrics}</span>
            <DifficultyDots difficulty={item.difficulty} />
          </div>
        )}
      </div>
    </Link>
  )
}
