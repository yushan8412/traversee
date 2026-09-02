import type { Activity } from '../../lib/places/types'

type Shape = { d: string } | { circle: [cx: number, cy: number, r: number] }

/**
 * One mark per activity, drawn rather than pulled from an icon set so that eight
 * silhouettes that must be told apart at sixteen pixels can be tuned against
 * each other. Cycling and mountain biking share a frame, so the mountain behind
 * the second is what separates them; everything else differs in outline.
 *
 * Held as data rather than as JSX because two very different renderers need it:
 * React, for cards and filter chips, and a plain DOM string for map markers,
 * which MapLibre creates outside React's tree entirely. Drawing them twice would
 * guarantee the two sets drift.
 *
 * Decoration, never the only label — every card that shows these also names the
 * activity in words, so nobody has to interpret a small drawing.
 */
const SHAPES: Record<Activity, Shape[]> = {
  hiking: [
    { circle: [14, 4.5, 2] },
    { d: 'M13 8.5 10 13l3 2 1 6M13 8.5l3 1.5 1.5 4M10 13l-3 1M19 21l-2-6.5' },
  ],
  cycling: [
    { circle: [5.5, 17, 3.5] },
    { circle: [18.5, 17, 3.5] },
    { d: 'M5.5 17 10 8h4l4.5 9M10 8h6' },
  ],
  vtt: [
    { d: 'M3 9.5 7 4l3 4 2-2.5 4 4' },
    { circle: [5.5, 17.5, 3] },
    { circle: [18.5, 17.5, 3] },
    { d: 'M5.5 17.5 10 11h4l4.5 6.5M10 11h5' },
  ],
  climbing: [
    { d: 'M7 3v18' },
    { circle: [14, 6, 1.8] },
    { d: 'M13 9.5 11 14l3 1.5.8 5.5M13 9.5l3.5 2 .5 3.5M11 14l-4-1.5' },
  ],
  camping: [{ d: 'M12 4 3 20h18L12 4Z' }, { d: 'M12 10.5 8 20h8l-4-9.5Z' }],
  surfing: [
    { d: 'M3 17c4.5 0 6-11 10.5-11C17 6 19 9 19 12' },
    { d: 'M3 20.5c2.5 0 3-1.5 5-1.5s2.5 1.5 5 1.5 3-1.5 5-1.5' },
  ],
  waterfall: [
    { d: 'M4 4h16M7 4v9M12 4v11M17 4v8' },
    { d: 'M3 19c2.5 0 3-1.2 5-1.2s2.5 1.2 5 1.2 3-1.2 5-1.2' },
  ],
  // A mask and its two bubbles. Surfing already owns the wave and waterfall the
  // falling water, so this one is told apart by the equipment instead.
  diving: [
    {
      d: 'M5 7.5h9a1.5 1.5 0 0 1 1.5 1.5v1.5a3 3 0 0 1-3 3h-1.2a2 2 0 0 1-1.8-1.1L8.8 11H8.2l-1.7 1.4A2 2 0 0 1 5.2 13H4a2.5 2.5 0 0 1-2.5-2.5V9A1.5 1.5 0 0 1 3 7.5Z',
    },
    { d: 'M15.5 9.5h3.2a2.3 2.3 0 0 1 2.3 2.3v6.4' },
    { circle: [18, 4.6, 1.4] },
    { circle: [21, 7.6, 0.9] },
  ],
}

export function ActivityIcon({ activity, size = 16 }: { activity: Activity; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[activity].map((shape, index) =>
        'd' in shape ? (
          <path key={index} d={shape.d} />
        ) : (
          <circle key={index} cx={shape.circle[0]} cy={shape.circle[1]} r={shape.circle[2]} />
        ),
      )}
    </svg>
  )
}

/**
 * The same drawing as SVG source, for map markers.
 *
 * MapLibre takes a DOM element, not a React node, so the marker is built by
 * hand. The geometry still comes from `SHAPES`, which is the point: the icon on
 * a pin and the icon on the card beside it cannot drift apart.
 */
export function activityIconMarkup(activity: Activity, size: number, strokeWidth = 1.9): string {
  const body = SHAPES[activity]
    .map((shape) =>
      'd' in shape
        ? `<path d="${shape.d}"/>`
        : `<circle cx="${shape.circle[0]}" cy="${shape.circle[1]}" r="${shape.circle[2]}"/>`,
    )
    .join('')

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}
