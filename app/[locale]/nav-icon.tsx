import type { ReactNode } from 'react'

/**
 * The three marks for the main tabs, drawn rather than borrowed.
 *
 * Same stroke weight and cap style as the activity icons, so the header does
 * not read as a different drawing hand from the map pins beneath it.
 */
const SHAPES: Record<'home' | 'explore' | 'places', ReactNode> = {
  home: (
    <>
      <path d="M4 10.5L12 4l8 6.5" />
      <path d="M6 9.6V19a1 1 0 001 1h10a1 1 0 001-1V9.6" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.4 8.6l-2 4.8-4.8 2 2-4.8z" />
    </>
  ),
  places: (
    <>
      <path d="M12 21s6.5-5.7 6.5-10.2A6.5 6.5 0 105.5 10.8C5.5 15.3 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.4" />
    </>
  ),
}

export function NavIcon({ name, size = 16 }: { name: keyof typeof SHAPES; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  )
}
