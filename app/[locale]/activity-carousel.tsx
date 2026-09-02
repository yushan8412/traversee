'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '../../i18n/navigation'
import type { Activity } from '../../lib/places/types'

/**
 * The brand claim: eight kinds of going outside, not one.
 *
 * Activities with nothing published yet still take their turn and say
 * "collecting". Skipping them would shrink the site's stated scope down to
 * whatever happens to be catalogued this week, and scope and inventory are
 * deliberately separate things in the data model.
 */
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

const LAST = ACTIVITIES.length - 1
/**
 * Viewport heights of scrolling each activity is worth while the section is
 * pinned. This is the only thing that sets the pace: the pictures are welded to
 * the scroll position, so a bigger number means the same wheel movement carries
 * them a shorter way. It is also what the section costs in page height, which
 * is why it is not larger still.
 */
const STEP_VH = 72
const DWELL_MS = 6000

export function ActivityCarousel({
  counts,
  emphasis,
}: {
  counts: Record<string, number>
  /** Script-appropriate emphasis for a heading's second line; see page.tsx. */
  emphasis: string
}) {
  const t = useTranslations('home')
  const tp = useTranslations('places')

  const section = useRef<HTMLElement>(null)
  const layers = useRef<(HTMLImageElement | null)[]>([])
  const [index, setIndex] = useState(0)
  // The panel being replaced. It recedes rather than disappearing, so both are
  // on screen together for the length of the transition.
  const [leaving, setLeaving] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [held, setHeld] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [motion, setMotion] = useState(false)
  // Read inside the scroll handler, which must not re-subscribe on every slide.
  const at = useRef(0)

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => {
      setMotion(!still.matches)
      // Pinning trades the visitor's scrolling for the effect. That is a fair
      // trade on a desktop window with room to show it, and a trap on a phone.
      setPinned(wide.matches && !still.matches)
    }
    decide()
    wide.addEventListener('change', decide)
    still.addEventListener('change', decide)
    return () => {
      wide.removeEventListener('change', decide)
      still.removeEventListener('change', decide)
    }
  }, [])

  const commit = useCallback((next: number) => {
    if (next === at.current) return
    setLeaving(at.current)
    at.current = next
    setIndex(next)
  }, [])

  /**
   * Positions the stack straight on the DOM nodes.
   *
   * Deliberately not React state. Every scroll frame moves all eight pictures,
   * and routing that through a re-render means React reconciles the whole
   * section — headings, prose, every tab button — sixty times a second to change two
   * transforms. That is what the movement felt rough from. The index still goes
   * through state, because it changes a few times per section rather than every
   * frame.
   */
  const paint = useCallback((pos: number) => {
    layers.current.forEach((node, i) => {
      if (!node) return
      const place = travelling(i, pos)
      node.style.transform = place.transform as string
      node.style.zIndex = String(place.zIndex)
    })
  }, [])

  useEffect(() => {
    if (!pinned) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      // One read and one write per frame; reading layout inside the event
      // itself forces a synchronous reflow on every scroll tick.
      frame = requestAnimationFrame(() => {
        frame = 0
        const el = section.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const travel = rect.height - window.innerHeight
        if (travel <= 0) return
        // Kept unrounded: this value positions the pictures directly, and
        // quantising it turns a slow slide into visible eight-pixel steps.
        // requestAnimationFrame already caps this at one update per frame.
        const p = Math.min(1, Math.max(0, -rect.top / travel))
        paint(p * LAST)
        setProgress(Math.round(p * 100) / 100)
        commit(Math.round(p * LAST))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [pinned, commit, paint])

  // Without pinning there is nothing driving the panels, so they take turns on
  // a clock instead — and stop while anyone is reading one.
  useEffect(() => {
    if (pinned || !motion || held) return
    const id = setTimeout(() => commit((at.current + 1) % ACTIVITIES.length), DWELL_MS)
    return () => clearTimeout(id)
  }, [index, pinned, motion, held, commit])

  /**
   * A tab is a shortcut to a panel. While pinned the panel *is* a scroll
   * position, so the page has to move too — otherwise the picture and the
   * scrollbar disagree and the next flick of the wheel snaps it back.
   */
  const goTo = (next: number) => {
    const target = (next + ACTIVITIES.length) % ACTIVITIES.length
    const el = section.current
    if (!pinned || !el) {
      commit(target)
      return
    }
    const rect = el.getBoundingClientRect()
    const travel = rect.height - window.innerHeight
    if (travel <= 0) return
    window.scrollTo({ top: window.scrollY + rect.top + travel * (target / LAST), behavior: 'smooth' })
  }

  const current = ACTIVITIES[index]!
  const count = counts[current] ?? 0
  const enters = motion ? 'animate-[tv-rise_700ms_both_cubic-bezier(.22,.61,.36,1)]' : ''

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      style={pinned ? { height: `${100 + LAST * STEP_VH}vh` } : undefined}
      // Reading stops the clock. Rotating a panel out from under someone
      // mid-sentence is the failure mode of every carousel on the web.
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div
        className={
          pinned
            ? 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden'
            : 'py-20 sm:py-28'
        }
      >
        <header className="mx-auto max-w-2xl px-6 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dim">
            {t('activitiesKicker')}
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-[2rem] font-normal leading-[1.15] tracking-[-0.01em] sm:text-[2.75rem]">
            {t('activitiesTitle')}
            <br />
            <span className={`text-brand ${emphasis}`}>{t('activitiesTitle2')}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-dim">
            {t('activitiesSub')}
          </p>
        </header>

        {/* Quote, image, prose. The flanking columns are the point — the picture
            alone says what the activity looks like but nothing about what this
            site knows about it. */}
        {/* Wider than the page's reading column: at 6xl the picture had to stay
            small to leave the flanking text room, and the section read as a
            thumbnail between two paragraphs. */}
        <div className="mx-auto mt-10 grid w-full max-w-[84rem] items-center gap-10 px-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:px-8">
          {/* Keyed on the activity so React remounts it: the copy replays its
              entrance instead of swapping letters under a static block. */}
          <figure
            key={`lead-${current}`}
            className={`order-2 max-w-[20ch] lg:order-1 lg:ml-auto lg:text-right ${enters}`}
            style={motion ? { animationDelay: '180ms' } : undefined}
          >
            <blockquote
              className={`font-[family-name:var(--font-display)] text-xl leading-[1.6] text-brandInk sm:text-2xl ${emphasis}`}
            >
              {t(`lead.${current}`)}
            </blockquote>
            <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
              {tp(`activity.${current}`)}
            </figcaption>
          </figure>

          <Link
            href={`/places?activity=${current}`}
            aria-label={t('seeActivity', { activity: tp(`activity.${current}`) })}
            // Square, and square on purpose, unlike the rounded cards elsewhere
            // on this page.
            //
            // Two photographs overlap here at different sizes, so their own
            // edges are always visible inside the frame. Round the frame and
            // those edges stay square, which puts both treatments on screen at
            // once; round the photographs instead and a picture halfway up
            // shows its corners curving away in mid-air. Square is the only
            // option that looks the same in every frame of the movement, and it
            // is what the reference does with the same overlap.
            className="group relative order-1 block aspect-[8/5] w-full max-w-[48rem] justify-self-center overflow-hidden bg-canvas no-underline lg:order-2 lg:h-[min(30rem,50vh)] lg:w-[min(48rem,80vh)]"
          >
            {/* One transform on the stack rather than on each layer, so the
                hover zoom does not fight the movement underneath it. */}
            <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04]">
              {ACTIVITIES.map((activity, i) => (
                /* eslint-disable-next-line @next/next/no-img-element -- fixed art direction, not user content */
                <img
                  key={activity}
                  src={`/activities/${activity}.jpg`}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  // No will-change: seven promoted compositing layers cost real
                  // memory, and the transform alone is enough for the animation
                  // to stay off the main thread.
                  ref={(node) => {
                    layers.current[i] = node
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                  // While pinned the scroll handler writes these directly; this
                  // only has to be right for the first paint, before any scroll
                  // event has fired.
                  style={
                    pinned
                      ? travelling(i, 0)
                      : {
                          ...stepped(i, index, leaving),
                          transition: motion
                            ? 'transform 900ms cubic-bezier(.22,.61,.36,1)'
                            : undefined,
                        }
                  }
                />
              ))}
            </div>
            {/* Bottom left, not top left: mid-hand-over the top of the frame is
                open background, and a count floating over nothing reads as a
                bug. The lower edge always has a picture behind it. */}
            <span className="absolute bottom-5 left-5 z-[70] rounded-full bg-paper/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-ink">
              {count > 0 ? t('countPlaces', { count }) : t('gathering')}
            </span>
          </Link>

          <div
            key={`blurb-${current}`}
            className={`order-3 ${enters}`}
            style={motion ? { animationDelay: '280ms' } : undefined}
          >
            <p className="max-w-[32ch] text-[15px] leading-[1.85] text-dim">
              {t(`blurb.${current}`)}
            </p>
            <Link
              href={`/places?activity=${current}`}
              className="mt-5 inline-flex items-center gap-2 border-b border-brand/40 pb-1 text-sm font-medium text-brandInk no-underline transition-colors hover:border-brand"
            >
              {t('seeActivity', { activity: tp(`activity.${current}`) })}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-6xl items-center gap-5 px-6">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t('prev')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <span aria-hidden="true">←</span>
          </button>

          <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ACTIVITIES.map((activity, i) => (
              <button
                key={activity}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === index}
                className={`shrink-0 pb-2 text-sm transition-colors ${
                  i === index ? 'text-ink' : 'text-dim hover:text-ink'
                }`}
              >
                {tp(`activity.${activity}`)}
                <span className="mt-1.5 block h-px w-full overflow-hidden bg-line">
                  <span
                    // Keyed on the pause state as well as the slide, so a
                    // clock-driven bar restarts in step with the timer that was
                    // just re-armed.
                    key={`${index}-${held}`}
                    className="block h-px origin-left bg-brand"
                    style={fill(i, {
                      index,
                      pinned,
                      motion,
                      held,
                      // How far through this activity's own share of the scroll.
                      within: Math.min(1, Math.max(0, progress * LAST - i + 0.5)),
                    })}
                  />
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t('next')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:border-brand hover:text-brand"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}

/** How far the picture being replaced shrinks, and how far it drifts, measured
 *  off the reference: 763×508 → 610×407 at +76px, +47px. */
const RECEDE = { scale: 0.2, x: 10, y: 9 }

/**
 * Where picture `i` sits when the stack is being scrubbed by scroll.
 *
 * `pos` is a real number, not an index — 2.4 means picture 2 has receded four
 * tenths of the way and picture 3 is four tenths of the way up. Every scroll
 * pixel therefore has its own frame, which is what separates this from a
 * transition that fires once per slide and animates on its own clock.
 */
function travelling(i: number, pos: number): React.CSSProperties {
  const ahead = i - pos

  if (ahead > 0) {
    // Still to come: waiting below the frame's lower edge, climbing into it as
    // the scroll reaches its turn. Anything more than one turn away is clipped
    // out of sight, so they all park in the same place.
    return {
      transform: `translate(0, ${Math.min(1, ahead) * 104}%)`,
      zIndex: 60 - Math.ceil(ahead),
    }
  }

  // Showing, or on its way out: it shrinks and drifts back rather than
  // vanishing, which is what leaves it visible above the picture taking over.
  const back = Math.min(1, -ahead)
  return {
    transform: `translate(${RECEDE.x * back}%, ${RECEDE.y * back}%) scale(${1 - RECEDE.scale * back})`,
    zIndex: 50 + Math.ceil(ahead),
  }
}

/** The same three positions, but as discrete states for the unpinned layout,
 *  where a transition rather than the scrollbar has to carry the movement. */
function stepped(i: number, index: number, leaving: number | null): React.CSSProperties {
  if (i === index) return { transform: 'none', zIndex: 30 }
  if (i === leaving)
    return {
      transform: `translate(${RECEDE.x}%, ${RECEDE.y}%) scale(${1 - RECEDE.scale})`,
      zIndex: 20,
    }
  return { transform: 'translate(0, 104%)', zIndex: 10 }
}

/**
 * The bar under a tab reports whatever is actually advancing the carousel:
 * scroll position while pinned, the dwell timer while it is running on a clock,
 * and otherwise just which panel is showing. A bar that animates on its own
 * while scrolling drives the panels would be telling a second, untrue story.
 */
function fill(
  i: number,
  s: { index: number; pinned: boolean; motion: boolean; held: boolean; within: number },
): React.CSSProperties {
  if (i !== s.index) return { transform: 'scaleX(0)' }
  if (s.pinned) return { transform: `scaleX(${s.within})`, transition: 'transform 120ms linear' }
  if (!s.motion) return { transform: 'scaleX(1)' }
  return {
    animation: `tv-dwell ${DWELL_MS}ms linear forwards`,
    animationPlayState: s.held ? 'paused' : 'running',
  }
}
