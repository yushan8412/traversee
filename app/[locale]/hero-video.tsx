'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero footage, with the two things a background video owes the page.
 *
 * **It stops for people who asked motion to stop.** Every other moving part of
 * this site already checks `prefers-reduced-motion` — the carousel, the rail,
 * the cards, the gallery — and the largest moving thing on the site was the one
 * that did not. A fourteen-second loop of drone footage is exactly what that
 * setting exists to turn off.
 *
 * **It stops when nobody is looking at it.** The loop used to keep decoding
 * while a visitor read the rest of the page. Bandwidth is the cost that scales
 * with visitors on this project, and a decoding video is also the page's
 * largest steady battery draw on the phone this site is designed to be read on.
 *
 * `autoplay` stays in the markup rather than being started from an effect, so
 * the no-JavaScript behaviour is what it always was; the effect only ever
 * pauses. That way a slow hydration costs nothing and a failed one costs
 * nothing either.
 */
export function HeroVideo({
  mp4,
  webm,
  poster,
}: {
  mp4: string
  webm: string | null
  poster: string
}) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    let onScreen = true

    const settle = () => {
      if (still.matches) {
        video.pause()
        // Back to the first frame, which is the poster: a paused video parked
        // mid-loop would otherwise show a frame nobody chose.
        video.currentTime = 0
        return
      }
      if (onScreen) void video.play().catch(() => {})
      else video.pause()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // The last entry is the current state; an observer can deliver a queue.
        const entry = entries[entries.length - 1]
        if (!entry) return
        onScreen = entry.isIntersecting
        settle()
      },
      // A sliver is enough to count as visible; waiting for a threshold would
      // leave the hero frozen while part of it is still on screen.
      { threshold: 0 },
    )
    observer.observe(video)
    still.addEventListener('change', settle)
    settle()

    return () => {
      observer.disconnect()
      still.removeEventListener('change', settle)
    }
  }, [])

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    >
      {webm && <source src={webm} type="video/webm" />}
      <source src={mp4} type="video/mp4" />
    </video>
  )
}
