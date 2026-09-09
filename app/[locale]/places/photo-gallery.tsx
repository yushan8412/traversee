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
  if (shots.length === 0) return null

  return (
    <ul
      className="tv-strip flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth
        px-[calc(50%-7.5rem)] py-6 [scrollbar-width:none] sm:px-[calc(50%-11rem)]
        [&::-webkit-scrollbar]:hidden"
    >
      {shots.map((shot, at) => (
        <li key={shot.src} className="tv-strip-shot w-60 shrink-0 snap-center sm:w-88">
          <ZoomTrigger
            index={at}
            label={t('openPhoto')}
            className="relative block w-full overflow-hidden rounded-2xl border border-line
              bg-panel transition-shadow hover:shadow-[0_18px_40px_-24px_rgb(31_42_36/0.55)]"
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
  )
}
