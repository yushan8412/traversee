export type DoodleShape = 'pine' | 'peaks' | 'wave' | 'tent' | 'bloom' | 'leaf' | 'sprig'

/**
 * Big flat silhouettes for the empty margins of the dark band.
 *
 * Deliberately not the activity icons. Those are 1.6px line drawings built to
 * be read at sixteen pixels on a card; blown up to a hundred and fifty they
 * become a tangle of thick outlines rather than a shape. Filling instead of
 * stroking is what makes a mark this size register at a glance, which is the
 * only job it has here.
 *
 * Four shapes, no people and no equipment — a person or a bicycle at this scale
 * reads as an illustration that means something, and these mean nothing. They
 * are texture.
 */
const SHAPES: Record<DoodleShape, React.ReactNode> = {
  // Two stacked triangles, the plainest possible conifer.
  pine: (
    <>
      <path d="M12 2.5 19 12H5Z" />
      <path d="M12 8.5 21.5 21.5H2.5Z" />
    </>
  ),
  peaks: <path d="M1.5 21 9 5.5l4.6 9.4L17 9l5.5 12Z" />,
  wave: <path d="M1.5 15.2c3.6-5.6 6.6 3.4 10.4-1 3.2-3.7 6 2 10.6-1.4v8.7H1.5Z" />,
  // Even-odd leaves the doorway open rather than drawing it as a second colour,
  // so the shape works on any ground. The opening is kept small on purpose: cut
  // it to a realistic size and the tent stops being a solid mark and becomes a
  // thin triangular outline, which is the thing these replaced.
  tent: <path fillRule="evenodd" d="M12 3 22.5 21H1.5Zm0 12.4L9.6 19.4h4.8Z" clipRule="evenodd" />,

  // Botanical set. Same construction as the landscape shapes — filled, no
  // outlines — so the two families sit on the same page without looking drawn
  // by different people.
  bloom: (
    <>
      <circle cx="12" cy="5.6" r="3.6" />
      <circle cx="17.6" cy="8.8" r="3.6" />
      <circle cx="17.6" cy="15.2" r="3.6" />
      <circle cx="12" cy="18.4" r="3.6" />
      <circle cx="6.4" cy="15.2" r="3.6" />
      <circle cx="6.4" cy="8.8" r="3.6" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  leaf: <path d="M21.4 2.6C10.6 3.2 3.2 10.6 2.6 21.4c10.8-.6 18.2-8 18.8-18.8Z" />,
  sprig: (
    <>
      <rect x="11.2" y="6" width="1.7" height="16" rx="0.85" />
      <ellipse cx="7.4" cy="10.2" rx="3.8" ry="2.2" transform="rotate(-26 7.4 10.2)" />
      <ellipse cx="16.6" cy="13.4" rx="3.8" ry="2.2" transform="rotate(26 16.6 13.4)" />
      <ellipse cx="7.8" cy="16.6" rx="3.2" ry="1.9" transform="rotate(-26 7.8 16.6)" />
      <circle cx="12" cy="3.6" r="2.7" />
    </>
  ),
}

function Doodle({ shape, size }: { shape: DoodleShape; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {SHAPES[shape]}
    </svg>
  )
}

export interface DoodleMark {
  key: string
  shape: DoodleShape
  /** Tailwind position classes, e.g. `left-[4%] top-[9%]`. */
  place: string
  /** Its own tint. One ink across the whole set makes a band look flatly printed. */
  tone: string
  size: number
  tilt: number
}

/**
 * A layer of marks in a section's empty margins.
 *
 * Big, flat and few. An earlier version reused the card's line icons at 40-odd
 * pixels; at that weight they read as smudges and did nothing about the
 * emptiness they were there for. It sits behind the content and `aria-hidden`
 * keeps it out of the reading order, because it carries nothing to miss.
 *
 * Positions are per section, not shared: what counts as an empty margin depends
 * entirely on the layout it is decorating, and a mark that lands behind a card
 * is a mark that was never drawn.
 */
export function DoodleField({ marks }: { marks: DoodleMark[] }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
      {marks.map((mark) => (
        <span
          key={mark.key}
          className={`absolute ${mark.tone} ${mark.place}`}
          style={{ transform: `rotate(${mark.tilt}deg)` }}
        >
          <Doodle shape={mark.shape} size={mark.size} />
        </span>
      ))}
    </span>
  )
}
