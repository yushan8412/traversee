/**
 * The site's mark, and the only copy of it.
 *
 * Every number below is transcribed from the artwork's own SVG rather than
 * measured off a render. That matters more than it sounds: several earlier
 * attempts reconstructed this shape from a PNG and each disagreed with the
 * last, because the two things a raster cannot tell you are exactly the two
 * that define this drawing — how many shapes there are, and what is a fill
 * rather than a blend.
 *
 * There are five triangles, not three. The darker sage and the salmon are their
 * own shapes with their own apexes, not the crossings they happen to sit over,
 * which is why no compositing of three fills ever reproduced them.
 *
 * The source leans blue left of its base centre and salmon right; green, clay
 * and sage are true isosceles. Those leans are transcribed, not corrected — a
 * mark is not improved by tidying the drawing it is a copy of.
 */

/** Transcribed from the artwork. Clay and salmon carry their own opacity. */
export const MARK_COLOURS = {
  green: '#a8bda0',
  blue: '#a9bfcd',
  clay: '#c9714f',
  sage: '#7d9678',
  salmon: '#e0a179',
  summit: '#d4835c',
} as const

const WIDTH = 578
const HEIGHT = 365

export const MARK_VIEWBOX = `0 0 ${WIDTH} ${HEIGHT}`

/** Apex first, then the two base corners on the baseline at y=365. */
const LAYERS = [
  { key: 'green', d: 'M326 51 578 365 74 365Z', fill: MARK_COLOURS.green, opacity: 1 },
  { key: 'blue', d: 'M156 117 346 365 0 365Z', fill: MARK_COLOURS.blue, opacity: 1 },
  { key: 'clay', d: 'M454 177 578 365 330 365Z', fill: MARK_COLOURS.clay, opacity: 0.9 },
  { key: 'sage', d: 'M270 213 398 365 142 365Z', fill: MARK_COLOURS.sage, opacity: 1 },
  { key: 'salmon', d: 'M378 247 468 365 258 365Z', fill: MARK_COLOURS.salmon, opacity: 0.95 },
] as const

export const TRAIL_PATH =
  'M144 365C166 337 202 309 248 289C294 269 338 265 370 237C394 215 384 189 348 175C318 163 304 147 306 125C310 97 324 83 326 61'

const SUMMIT = { cx: 326, cy: 37, r: 12 }

/**
 * The rays, held as multiples of the summit's radius rather than as absolute
 * coordinates, so enlarging the summit for small sizes carries them with it
 * instead of leaving a big dot inside a ring of stubs. The lower pair is short
 * in the source because the mountain is directly beneath it.
 */
const RAYS = [
  [0, -2.0, 0, -2.83],
  [1.42, -1.42, 2.0, -2.0],
  [-1.42, -1.42, -2.0, -2.0],
  [2.0, 0, 2.83, 0],
  [-2.0, 0, -2.83, 0],
  [1.5, 1.17, 1.83, 1.5],
  [-1.5, 1.17, -1.83, 1.5],
] as const
const RAY_REACH = 2.83
const RAY_WIDTH = 0.417

export function Mountain({
  size = 15,
  variant = 'compact',
  /**
   * Breathes the summit, for work in progress. It is an opacity change rather
   * than a moving line, which is why it needs no reduced-motion variant: the
   * previous indicator redrew a ridgeline and had to fall back to exactly this
   * when motion was unwelcome.
   */
  pulsing = false,
  /**
   * The full mark's loading state: the trail arrives a dash at a time and the
   * summit lights when it gets there. Ignored by `compact`, whose trail is not
   * drawn at all.
   */
  climbing = false,
  className = '',
  title,
}: {
  size?: number
  variant?: 'compact' | 'full'
  pulsing?: boolean
  climbing?: boolean
  className?: string
  title?: string
}) {
  const full = variant === 'full'
  // The artwork's summit is 2% of the mark's width. That is right at the size
  // the drawing was made for and invisible at the size a header can spare, so
  // the small variant enlarges it — the one place any of this geometry is
  // allowed to differ from the source.
  const r = full ? SUMMIT.r : 24
  const rayWidth = r * RAY_WIDTH
  // A ray thinner than a device pixel is a smudge, not a ray. Below that the
  // summit keeps its dot and loses the halo, the same trade the trail makes.
  const showRays = (rayWidth / WIDTH) * size >= 1
  // Enlarged rays reach past the artwork's top edge, so the box grows to hold
  // them rather than the drawing shrinking to fit.
  const headroom = showRays ? Math.max(0, r * RAY_REACH + rayWidth / 2 - SUMMIT.cy) : 0

  return (
    <svg
      viewBox={`0 ${-headroom} ${WIDTH} ${HEIGHT + headroom}`}
      width={size}
      height={(size * (HEIGHT + headroom)) / WIDTH}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {title && <title>{title}</title>}
      {full && climbing && (
        // One loading mark renders at a time, so a fixed id is safe here. If a
        // second ever shares a page, this needs useId and a client boundary.
        <mask id="tv-trail-reveal">
          <path
            d={TRAIL_PATH}
            pathLength="1"
            fill="none"
            stroke="#fff"
            strokeWidth="34"
            strokeLinecap="round"
            className="tv-trail-climb"
          />
        </mask>
      )}
      {LAYERS.map((layer) => (
        <path key={layer.key} d={layer.d} fill={layer.fill} fillOpacity={layer.opacity} />
      ))}
      {full && (
        <path
          d={TRAIL_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray="26 24"
          mask={climbing ? 'url(#tv-trail-reveal)' : undefined}
        />
      )}
      <g className={climbing ? 'tv-summit-rise' : pulsing ? 'tv-summit-pulse' : undefined}>
        {showRays &&
          RAYS.map(([x1, y1, x2, y2]) => (
            <line
              key={`${x1},${y1}`}
              x1={SUMMIT.cx + x1 * r}
              y1={SUMMIT.cy + y1 * r}
              x2={SUMMIT.cx + x2 * r}
              y2={SUMMIT.cy + y2 * r}
              stroke={MARK_COLOURS.summit}
              strokeWidth={rayWidth}
              strokeLinecap="round"
            />
          ))}
        <circle cx={SUMMIT.cx} cy={SUMMIT.cy} r={r} fill={MARK_COLOURS.summit} />
      </g>
    </svg>
  )
}
