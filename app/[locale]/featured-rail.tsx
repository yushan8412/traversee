'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '../../i18n/navigation'
import type { Activity } from '../../lib/places/types'
import { ActivityIcon } from './activity-icon'
import { DoodleField, type DoodleMark } from './doodle'

export interface RailItem {
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

/** Gap between cards, in pixels. Wide enough that a card growing on hover
 *  reads as growing rather than as crowding its neighbour. */
const GAP = 32

/** Viewport heights of scrolling each card is worth once the section is pinned. */
const STEP_VH = 20

/**
 * Botanical marks for this band, warm against the green ones on the dark band
 * above. One clay hue at three depths rather than three colours: the set holds
 * together, and nothing in the margins competes with the photographs, which are
 * the only saturated things here.
 *
 * Placed by measurement, not by eye. The row runs the full width of the window,
 * so there are no side margins at all; the only free ground is the strip above
 * the cards to the right of the heading, and the strip below them to the right
 * of the "see all" link. Marks placed anywhere else end up behind something,
 * which is the same as not drawing them.
 */
const MARKS: DoodleMark[] = [
  { key: 'sprig-a', shape: 'sprig', place: 'left-[42%] top-[9%]', tone: 'text-clayLight/50', size: 84, tilt: -7 },
  { key: 'leaf-a', shape: 'leaf', place: 'left-[1%] top-[17%]', tone: 'text-clayDeep/20', size: 62, tilt: -21 },
  { key: 'sprig-b', shape: 'sprig', place: 'right-[26%] top-[25%]', tone: 'text-warm/28', size: 54, tilt: 10 },
  { key: 'bloom-a', shape: 'bloom', place: 'right-[7%] top-[13%]', tone: 'text-clayLight/55', size: 98, tilt: -12 },
  { key: 'bloom-b', shape: 'bloom', place: 'left-[4%] bottom-[8%]', tone: 'text-clayLight/46', size: 90, tilt: 16 },
  { key: 'leaf-b', shape: 'leaf', place: 'left-[27%] bottom-[2%]', tone: 'text-clayDeep/24', size: 60, tilt: -25 },
  { key: 'sprig-c', shape: 'sprig', place: 'left-[46%] bottom-[6%]', tone: 'text-warm/32', size: 72, tilt: 4 },
  { key: 'leaf-c', shape: 'leaf', place: 'right-[29%] bottom-[9%]', tone: 'text-clayLight/42', size: 80, tilt: 14 },
  { key: 'bloom-c', shape: 'bloom', place: 'right-[12%] bottom-[2%]', tone: 'text-warm/26', size: 64, tilt: -9 },
  { key: 'sprig-d', shape: 'sprig', place: 'right-[2%] bottom-[10%]', tone: 'text-clayDeep/22', size: 78, tilt: -16 },
]


/**
 * The section holds still and the cards travel sideways through it.
 *
 * Pinning is the point: the wheel moves the row and nothing else moves at all.
 * An earlier attempt drifted the row while the page kept scrolling normally —
 * cheaper in page height, but two directions of movement at once is what makes
 * a page like this hard to look at.
 *
 * The pin is short by design. It used to run for four screens; measured, that
 * and the activity carousel were 82% of a 10.5-screen home page. Each card now
 * earns a fifth of a screen, which is enough to cross the row without the pin
 * outstaying its welcome.
 *
 * Below `lg`, and whenever reduced motion is asked for, none of this happens:
 * it is an ordinary swipeable list with arrows, because taking someone's scroll
 * away on a phone is a trap, not an effect.
 */
export function FeaturedRail({ items, emphasis }: { items: RailItem[]; emphasis: string }) {
  const t = useTranslations('home')
  const section = useRef<HTMLElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0)
  const [pinned, setPinned] = useState(false)
  const [at, setAt] = useState({ start: true, end: false })

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setPinned(wide.matches && !still.matches)
    decide()
    wide.addEventListener('change', decide)
    still.addEventListener('change', decide)
    return () => {
      wide.removeEventListener('change', decide)
      still.removeEventListener('change', decide)
    }
  }, [])

  useEffect(() => {
    if (!pinned) return

    // The row renders unpinned first, as a snapping scroll container, and the
    // snap leaves a scrollLeft behind. Switching to `overflow: hidden` keeps
    // that value, and every position after it is offset by however far the row
    // happened to be snapped — the first card starts already cut off at the
    // window edge. The transform is the only thing allowed to move this row.
    if (viewport.current) viewport.current.scrollLeft = 0

    let frame = 0
    const onScroll = () => {
      if (frame) return
      // One read and one write per frame: measuring inside the scroll event
      // itself forces a synchronous reflow on every tick.
      frame = requestAnimationFrame(() => {
        frame = 0
        const el = section.current
        const box = viewport.current
        const inner = track.current
        if (!el || !box || !inner) return
        const rect = el.getBoundingClientRect()
        // Finish the travel before the pin lets go, so the last card holds
        // still for a moment instead of arriving exactly as the section starts
        // scrolling away — which read as never arriving at all.
        const travel = (rect.height - window.innerHeight) * 0.82
        if (travel <= 0) return
        const progress = Math.min(1, Math.max(0, -rect.top / travel))
        const overflow = Math.max(0, inner.scrollWidth - box.clientWidth)
        setShift(progress * overflow)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pinned, items.length])

  const readEnds = () => {
    const el = viewport.current
    if (!el) return
    setAt({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    })
  }

  const nudge = (direction: 1 | -1) => {
    const el = viewport.current
    if (!el) return
    const card = track.current?.firstElementChild?.getBoundingClientRect().width ?? 320
    el.scrollBy({ left: direction * (card + GAP), behavior: 'smooth' })
  }

  return (
    <section
      ref={section}
      className="relative bg-panel"
      style={pinned ? { height: `${100 + items.length * STEP_VH}vh` } : undefined}
    >
      <div
        className={
          pinned
            ? 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden'
            : 'py-20 sm:py-28'
        }
      >
        <DoodleField marks={MARKS} />

        <div className="relative mx-auto flex w-full max-w-6xl items-end justify-between gap-6 px-6">
          <div>
            {/* Marker pen, tilted, in the accent green. The section is the one
                dark band on the page and had a great deal of empty margin; a
                small piece of handwriting is what stops that reading as an
                unfinished slide. Latin-only face, so this label stays English
                on both locales rather than falling back mid-word. */}
            <span className="inline-block -rotate-2 font-[family-name:var(--font-hand)] text-3xl text-brand">
              {t('featuredScribble')}
            </span>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-[2rem] font-normal leading-[1.15] tracking-[-0.01em] sm:text-[2.75rem]">
              {t('featuredTitle')}
              <br />
              <span className={`text-brand ${emphasis}`}>{t('featuredTitle2')}</span>
            </h2>
          </div>

          {!pinned && (
            <div className="hidden shrink-0 gap-3 lg:flex">
              <button
                type="button"
                onClick={() => nudge(-1)}
                disabled={at.start}
                aria-label={t('prev')}
                className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition disabled:opacity-30 enabled:hover:border-brand enabled:hover:text-brand"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                onClick={() => nudge(1)}
                disabled={at.end}
                aria-label={t('next')}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition disabled:opacity-25 enabled:hover:border-white"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </div>

        <div
          ref={viewport}
          onScroll={pinned ? undefined : readEnds}
          className={`mt-10 ${
            pinned
              ? 'overflow-hidden'
              : 'snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }`}
        >
          <div
            ref={track}
            // `w-max` so the track's own width is the width of the cards. Left
            // at auto it fills the viewport and reports that as its scrollWidth,
            // because an element that is not itself a scroll container does not
            // count children overflowing it — the row then stopped short and the
            // last card never came fully into view.
            className="flex w-max items-start gap-8 py-8"
            style={{
              // Inline rather than an arbitrary Tailwind class. As a class this
              // silently produced no padding at all and the first card sat flush
              // against the window edge instead of lining up under the heading.
              paddingInline: 'max(1.5rem, calc((100vw - 72rem) / 2 + 1.5rem))',
              ...(pinned
                ? { transform: `translate3d(${-shift}px,0,0)`, transition: 'transform .12s linear' }
                : {}),
            }}
          >
            {items.map((item) => (
              <Link
                key={item.slug}
                href={`/places/${item.slug}`}
                // `tv-lift` carries the grow-on-hover; see globals.css for why
                // it is not a Tailwind scale utility. `z-10` so the card that
                // grows rises above its neighbours instead of going behind the
                // next one along.
                className="tv-lift group relative block w-[300px] shrink-0 snap-start overflow-hidden rounded-[1.75rem] border border-line bg-paper no-underline hover:z-10 sm:w-[340px]"
              >
                {/* Picture on top, facts underneath on their own ground. The
                    earlier card laid white type over the photograph, which
                    forced a second layout for the entries that have no
                    photograph — and most of them do not. One structure carries
                    both: the picture area simply says so when it is empty. */}
                <div className="relative h-[300px] w-full overflow-hidden bg-panel">
                  {item.photos[0] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- already WebP at a bounded size */}
                      <img
                        src={item.photos[0].src}
                        alt=""
                        className={`h-full w-full object-cover transition-all duration-700 ease-out ${
                          item.photos[1] ? 'group-hover:opacity-0' : 'group-hover:scale-[1.05]'
                        }`}
                      />
                      {/* The second photograph is the reveal. Rendered only when
                          there is one — a hover that swaps an image for itself
                          is a promise the card cannot keep. */}
                      {item.photos[1] && (
                        // eslint-disable-next-line @next/next/no-img-element -- already WebP at a bounded size
                        <img
                          src={item.photos[1].src}
                          alt=""
                          className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100"
                        />
                      )}
                      {/* Credits the picture actually on screen, so it changes
                          with the hover rather than crediting one photographer
                          for both. */}
                      {(item.photos[0].credit || item.photos[1]?.credit) && (
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-2 pt-6 text-[10px] leading-tight text-white/85">
                          <span className={item.photos[1] ? 'group-hover:hidden' : ''}>
                            {item.photos[0].credit}
                          </span>
                          {item.photos[1]?.credit && (
                            <span className="hidden group-hover:inline">
                              {item.photos[1].credit}
                            </span>
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
                      {t('noPhoto')}
                    </span>
                  )}

                  <span className="absolute left-4 top-4 flex gap-1.5">
                    {item.activities.map((activity) => (
                      <span
                        key={activity.key}
                        title={activity.label}
                        className="grid h-8 w-8 place-items-center rounded-full bg-paper/95 text-brandInk"
                      >
                        <ActivityIcon activity={activity.key} />
                      </span>
                    ))}
                  </span>

                  <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-paper text-[11px] font-medium tracking-wide text-ink opacity-0 transition group-hover:opacity-100">
                    {t('view')}
                  </span>
                </div>

                <div className="flex h-[152px] flex-col p-5">
                  <span className="block font-[family-name:var(--font-display)] text-lg leading-snug text-ink">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-xs text-dim">{item.meta}</span>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                    <span className="text-xs text-dim">{item.metrics}</span>
                    {item.difficulty && (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-dim">
                        <span className="flex gap-[3px]" aria-hidden="true">
                          {Array.from({ length: DIFFICULTY_STEPS }, (_, step) => (
                            <span
                              key={step}
                              className={`h-1.5 w-1.5 rounded-full ${
                                step < item.difficulty!.value ? 'bg-brand' : 'bg-line'
                              }`}
                            />
                          ))}
                        </span>
                        {item.difficulty.label}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-6xl px-6">
          <Link
            href="/places"
            className="inline-flex items-center gap-2 border-b border-brand/40 pb-1 text-sm font-medium text-brandInk no-underline transition-colors hover:border-brand"
          >
            {t('seeAll', { count: items.length })}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
