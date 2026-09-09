'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslations } from 'next-intl'

export interface GalleryShot {
  src: string
  width: number
  height: number
  /** Set on borrowed photography, and shown wherever the picture is shown. */
  credit: string | null
}

/**
 * Looking at the photographs properly.
 *
 * The grid this replaces cropped every picture to 4:3 with `object-cover` and
 * offered no way to open one, which on a catalogue whose whole content is
 * somebody's photographs of places meant a portrait taken on a phone could only
 * ever be seen with its top and bottom cut off.
 *
 * A `<dialog>` rather than a hand-built overlay, on the same reasoning as
 * `menu-drawer.tsx`: the browser puts it in the top layer so no ancestor's
 * overflow can clip it, traps focus, and closes on Escape. Reimplementing those
 * is where accessible overlays usually go wrong.
 */
const GalleryContext = createContext<{ open: (index: number) => void } | null>(null)

export function PlaceGallery({ shots, alt, children }: { shots: GalleryShot[]; alt: string; children: ReactNode }) {
  const t = useTranslations('places')
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const show = useCallback(
    (at: number) => {
      if (shots.length === 0) return
      setIndex(at)
      setOpen(true)
      dialog.current?.showModal()
    },
    [shots.length],
  )

  const step = useCallback(
    (by: number) => setIndex((at) => (at + by + shots.length) % shots.length),
    [shots.length],
  )

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step])

  const shot = shots[index]

  return (
    <GalleryContext.Provider value={{ open: show }}>
      {children}

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        // Clicking the backdrop closes it. The dialog element itself fills the
        // screen, so the test is whether the click landed outside the picture
        // rather than on some coordinate arithmetic.
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close()
        }}
        // `fixed inset-0` rather than a width and height, because a dialog is
        // `position: absolute; margin: auto` by default and centres itself
        // inside that box — which left the backdrop short of the top of the
        // page and the picture hanging past the bottom of the viewport.
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0
          backdrop:bg-ink/90 [&:not([open])]:hidden"
        aria-label={alt}
      >
        {shot && (
          <div className="relative grid h-full w-full place-items-center p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob storage URLs */}
            <img
              src={shot.src}
              alt={alt}
              width={shot.width}
              height={shot.height}
              // contain, not cover: the point of opening a photograph is to see
              // the parts the card had to crop away.
              //
              // Bounded in viewport units rather than `max-h-full`. Percentage
              // max-height against a grid row that is itself sized by its
              // content is circular, so the browser drops it — and a portrait
              // photograph then ran off the bottom of the screen, which is
              // exactly the cropping this view exists to undo.
              className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] object-contain
                sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100vw-4rem)]"
            />

            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={t('closePhoto')}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full
                bg-ink/60 text-white transition-colors hover:bg-ink/80 sm:right-6 sm:top-6"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {shots.length > 1 && (
              <>
                <GalleryArrow side="left" label={t('previousPhoto')} onClick={() => step(-1)} />
                <GalleryArrow side="right" label={t('nextPhoto')} onClick={() => step(1)} />
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] tabular-nums text-white/75">
                  {index + 1} / {shots.length}
                </p>
              </>
            )}

            {/* The licence requires attribution wherever the picture appears,
                and a picture shown full-screen is the least excusable place to
                drop it. */}
            {shot.credit && (
              <p className="absolute bottom-4 right-4 text-[11px] text-white/70 sm:right-8">
                {shot.credit}
              </p>
            )}
          </div>
        )}
      </dialog>
    </GalleryContext.Provider>
  )
}

function GalleryArrow({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full
        bg-ink/55 text-white transition-colors hover:bg-ink/80 ${
          side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6'
        }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

/** Wraps anything that should open the gallery at a given photograph. */
export function ZoomTrigger({
  index,
  label,
  className,
  children,
}: {
  index: number
  label: string
  className?: string
  children: ReactNode
}) {
  const gallery = useContext(GalleryContext)
  if (!gallery) return <>{children}</>

  return (
    <button type="button" onClick={() => gallery.open(index)} aria-label={label} className={className}>
      {children}
    </button>
  )
}

/**
 * The photographs as a strip you scroll rather than a grid you scan.
 *
 * The one in the middle is the big one. That is a CSS scroll-driven animation
 * on the inline axis — the same mechanism the index cards already drift with,
 * which the browser runs off the main thread, so there is no scroll listener
 * and nothing to stutter behind React.
 *
 * The animation sits on the list item and the clipping sits on a child. The
 * index page learned this the hard way: `view()` resolves against the nearest
 * scroll container, so putting it on an element that is itself `overflow:
 * hidden` measures the image's position inside its own frame, where it never
 * moves, and every photograph freezes at 50% progress.
 */
export function PhotoStrip({ shots, alt }: { shots: GalleryShot[]; alt: string }) {
  const t = useTranslations('places')
  const strip = useRef<HTMLUListElement>(null)
  const [at, setAt] = useState({ start: true, end: false })

  const measure = useCallback(() => {
    const el = strip.current
    if (!el) return
    setAt({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    })
  }, [])

  /**
   * One photograph along, by bringing that photograph to the middle.
   *
   * Not `scrollBy` with a card's width: the row snaps mandatorily, and a
   * smooth scroll of a fixed distance gets recaptured by the snap and pulled
   * back where it started — measured at nine pixels of travel instead of a
   * whole card. Asking the browser to centre a specific element is a request
   * the snap agrees with rather than fights.
   */
  // Where the row is heading, which is not where it currently is. Holding the
  // destination separately is what makes a second wheel notch add to the first
  // instead of restarting it — the difference between momentum and a series of
  // jumps.
  const target = useRef<number | null>(null)
  const frame = useRef<number | null>(null)

  /**
   * Eases the row toward `target`, a fraction of the remaining distance each
   * frame.
   *
   * Assigning `scrollLeft` straight from the wheel moves the row the full delta
   * at once — about a hundred pixels per notch, arriving instantly. It works,
   * and it feels like nothing at all. Covering a share of what is left each
   * frame starts fast and settles slowly, which is the part that reads as
   * smooth.
   */
  const glide = useCallback(() => {
    const el = strip.current
    if (!el || target.current === null) {
      frame.current = null
      return
    }

    const remaining = target.current - el.scrollLeft
    if (Math.abs(remaining) < 0.5) {
      el.scrollLeft = target.current
      target.current = null
      frame.current = null
      // Snapping comes back only once the row is at rest, so it settles onto a
      // photograph instead of tugging at every frame of the journey.
      el.style.scrollSnapType = ''
      return
    }

    el.scrollLeft += remaining * 0.16
    frame.current = requestAnimationFrame(glide)
  }, [])

  const glideTo = useCallback(
    (to: number) => {
      const el = strip.current
      if (!el) return
      const furthest = el.scrollWidth - el.clientWidth
      const destination = Math.max(0, Math.min(furthest, to))

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.scrollLeft = destination
        return
      }

      target.current = destination
      el.style.scrollSnapType = 'none'
      if (frame.current === null) frame.current = requestAnimationFrame(glide)
    },
    [glide],
  )

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const step = useCallback(
    (direction: 1 | -1) => {
      const el = strip.current
      if (!el) return
      const card = el.querySelector('li')
      const width = card ? card.clientWidth + 16 : 256
      // From where the row is heading, so a second click while it is still
      // moving goes one further rather than restarting the same trip.
      glideTo((target.current ?? el.scrollLeft) + direction * width)
    },
    [glideTo],
  )

  /**
   * A mouse wheel only ever scrolls down, so a sideways strip was unreachable
   * with one — reported from the desktop site, where the row would not move.
   *
   * The wheel goes back to the page at either end, so the strip is never a
   * place the page gets stuck. That is the trap the home page's rail comment
   * warns about: taking someone's scroll away and not giving it back.
   */
  useEffect(() => {
    const el = strip.current
    if (!el) return

    function onWheel(event: WheelEvent) {
      if (!el) return
      // A trackpad's own sideways gesture already scrolls this correctly, and a
      // finger on a phone produces no wheel event at all — so this only ever
      // takes over a vertical wheel, the one that cannot reach a sideways row.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

      const forward = event.deltaY > 0
      const heading = target.current ?? el.scrollLeft
      const atStart = heading < 2
      const atEnd = heading >= el.scrollWidth - el.clientWidth - 2
      if ((forward && atEnd) || (!forward && atStart)) return

      event.preventDefault()
      glideTo(heading + event.deltaY)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [glideTo])

  if (shots.length === 0) return null

  return (
    <div className="relative">
      {/* Visible controls as well, because a wheel that behaves differently
          over one strip is not something anybody can see. Hidden where there is
          no pointer to hover them with. */}
      <StripArrow side="left" label={t('previousPhoto')} disabled={at.start} onClick={() => step(-1)} />
      <StripArrow side="right" label={t('nextPhoto')} disabled={at.end} onClick={() => step(1)} />

    <ul
      ref={strip}
      onScroll={measure}
      // `overflow-x-auto` clips on both axes, so a photograph that grows on
      // hover loses its edges to the scroller. The padding is the room it grows
      // into, and the matching negative margin puts the row's left edge back
      // under the heading — otherwise the padding would push it out of line.
      className="tv-strip -mx-5 flex snap-x snap-proximity gap-4 overflow-x-auto px-5 py-7
        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {shots.map((shot, at) => (
        <li key={shot.src} className="w-56 shrink-0 snap-start sm:w-72">
          <ZoomTrigger
            index={at}
            label={t('openPhoto')}
            // `scale`, not `transform`: Tailwind 4's scale utilities set the
            // standalone property, so a transition naming `transform` leaves the
            // growth snapping instantly. Same lesson as the index card's press.
            className="relative block w-full overflow-hidden rounded-2xl border border-line
              bg-panel transition-[scale,box-shadow] duration-300
              ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:z-10 hover:scale-[1.11]
              hover:shadow-[0_26px_56px_-22px_rgb(31_42_36/0.6)]
              motion-reduce:hover:scale-100"
          >
            {/* A ratio so the browser holds the space before the file arrives
                and a portrait and a landscape make the same shape in the row. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- blob storage URLs */}
            <img
              src={shot.src}
              alt={alt}
              width={shot.width}
              height={shot.height}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
            {shot.credit && (
              <span className="absolute bottom-2 right-2 rounded bg-ink/55 px-1.5 py-0.5 text-[10px] text-white/90">
                {shot.credit}
              </span>
            )}
          </ZoomTrigger>
        </li>
      ))}
    </ul>
    </div>
  )
}

function StripArrow({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center
        rounded-full border border-line bg-paper/90 text-ink shadow-[0_10px_24px_-18px_rgb(31_42_36/0.6)]
        transition-opacity hover:bg-paper disabled:pointer-events-none disabled:opacity-0
        [@media(hover:hover)]:grid ${side === 'left' ? 'left-4' : 'right-4'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}
