/**
 * The wordmark, drawn as outlines rather than set in a typeface.
 *
 * The site loads no webfonts — every stack in globals.css is a system one — and
 * a wordmark is the one place where that costs nothing to keep. Outlines render
 * identically on every machine, need no network request, and cannot reflow
 * while a font swaps in.
 *
 * The letterforms are Montserrat Medium, whose licence travels with them in
 * licenses/Montserrat-OFL.txt — the OFL requires the notice to accompany any
 * derivative, and outlines lifted from a face are a derivative of it. Identified
 * by measuring the reference: its letter widths relative to cap height matched
 * Montserrat 500 to within 0.037 on average, against 0.066 for the next closest
 * candidate and 0.122 for Jost. Tracking is 0.194em, solved so the composed
 * width over cap height reproduces the reference's 10.203 exactly.
 *
 * Do not re-set this in a font. If it needs to change, regenerate the outlines
 * from an OFL face — never from a system font such as Futura, which is licensed
 * to the machine and not for redistribution.
 */
export function Wordmark({
  className = '',
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 1020.3 100"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      fill="currentColor"
    >
      {title && <title>{title}</title>}
      <path d="M34.2 100V12.4H0V0H82.7V12.4H48.4V100Z M117.7 100V0H156.8Q176.2 0 187.3 9.2Q198.5 18.5 198.5 34.9Q198.5 45.7 193.4 53.5Q188.4 61.2 179.1 65.4Q169.8 69.6 156.8 69.6H125.6L131.9 63V100ZM184.6 100 159.1 63.7H174.5L200.1 100ZM131.9 64.4 125.6 57.5H156.3Q170 57.5 177.1 51.5Q184.1 45.6 184.1 34.9Q184.1 24.1 177.1 18.2Q170 12.4 156.3 12.4H125.6L131.9 5.3Z M225.8 100 271.1 0H285.2L330.7 100H315.7L275.2 8H281L240.5 100ZM245.1 75 249 63.5H305.3L309.3 75Z M393.8 100 349.8 0H365.3L405.6 92.3H396.8L437.6 0H451.8L407.9 100Z M486.1 100V0H556.7V12.4H500.3V87.6H558.7V100ZM499.1 55.3V43.2H550.5V55.3Z M601.2 100V0H640.3Q659.7 0 670.8 9.2Q682 18.5 682 34.9Q682 45.7 676.9 53.5Q671.9 61.2 662.6 65.4Q653.3 69.6 640.3 69.6H609.1L615.4 63V100ZM668.1 100 642.6 63.7H658L683.6 100ZM615.4 64.4 609.1 57.5H639.8Q653.5 57.5 660.6 51.5Q667.6 45.6 667.6 34.9Q667.6 24.1 660.6 18.2Q653.5 12.4 639.8 12.4H609.1L615.4 5.3Z M753.6 101.2Q742.2 101.2 731.7 97.6Q721.3 94.1 715.3 88.6L720.6 77.4Q726.3 82.4 735.1 85.7Q744 89 753.6 89Q762.3 89 767.7 87Q773.1 85 775.7 81.5Q778.3 78 778.3 73.6Q778.3 68.4 775 65.3Q771.7 62.1 766.3 60.2Q760.9 58.3 754.5 56.8Q748 55.4 741.5 53.5Q735 51.6 729.7 48.6Q724.3 45.5 721 40.5Q717.7 35.5 717.7 27.5Q717.7 19.7 721.8 13.2Q725.9 6.7 734.4 2.8Q742.9 -1.2 756.1 -1.2Q764.8 -1.2 773.4 1.2Q782 3.5 788.2 7.7L783.5 19.1Q777 14.9 769.9 12.9Q762.7 11 756 11Q747.6 11 742.2 13.1Q736.8 15.3 734.3 18.9Q731.8 22.4 731.8 26.9Q731.8 32.1 735.1 35.3Q738.4 38.4 743.8 40.3Q749.1 42.1 755.6 43.6Q762.1 45.2 768.6 47Q775 48.9 780.4 51.8Q785.7 54.8 789 59.8Q792.3 64.8 792.3 72.7Q792.3 80.3 788.2 86.8Q784 93.3 775.4 97.2Q766.8 101.2 753.6 101.2Z M832.6 100V0H903.2V12.4H846.8V87.6H905.2V100ZM845.6 55.3V43.2H897V55.3Z M947.7 100V0H1018.3V12.4H961.9V87.6H1020.3V100ZM960.7 55.3V43.2H1012.1V55.3Z" />
    </svg>
  )
}
