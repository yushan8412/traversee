/**
 * The site's mark, and the only copy of it.
 *
 * The ridgeline was written out by hand in the header and again in the footer.
 * That is the same duplication that has caused every drift bug in this project,
 * and it now matters more: the saving indicator is this same path being drawn,
 * so a mark that differed between two files would animate into a shape the
 * header never shows.
 */
export const MOUNTAIN_PATH = 'M3 19l6-12 4 7 3-4 5 9z'

export function Mountain({
  size = 15,
  stroke = 'currentColor',
  strokeWidth = 2.4,
  /** Traces the ridgeline on a loop, for work that is in progress. */
  tracing = false,
  className = '',
}: {
  size?: number
  stroke?: string
  strokeWidth?: number
  tracing?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={`${tracing ? 'tv-tracing' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <path d={MOUNTAIN_PATH} />
    </svg>
  )
}
