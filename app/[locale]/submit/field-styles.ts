/**
 * One vocabulary for both submission forms.
 *
 * The two forms ask for different things but they are the same surface, and
 * they had drifted into different paddings and a differently shaped submit
 * button. Holding the classes here is what keeps a route and a spot feeling
 * like one tool rather than two.
 *
 * The sizes are set for a phone held one-handed, which is where these get
 * filled in: 16px on inputs because anything smaller makes iOS zoom the page on
 * focus, and controls at least 44px tall.
 */
export const SECTION = 'rounded-2xl border border-line bg-paper p-5 sm:p-7'

export const SECTION_TITLE = 'text-base font-semibold tracking-tight text-ink'

export const SECTION_NOTE = 'mt-1 text-[13px] leading-relaxed text-dim'

export const LABEL = 'mb-1.5 block text-[13px] font-medium text-ink'

export const OPTIONAL = 'font-normal text-dim'

export const FIELD =
  'w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base text-ink ' +
  'transition-colors placeholder:text-dim/70 hover:border-dim/50 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25'

export const HINT = 'mt-1.5 text-[13px] leading-relaxed text-dim'

export const BUTTON_PRIMARY =
  'inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-[15px] ' +
  'font-medium text-white transition-colors hover:bg-brandInk ' +
  'disabled:cursor-not-allowed disabled:opacity-55'

export const BUTTON_QUIET =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line ' +
  'bg-canvas px-4 text-[15px] font-medium text-ink transition-colors hover:border-dim/50 ' +
  'hover:bg-panel disabled:cursor-not-allowed disabled:opacity-55'

/**
 * A chip reads as pressed or not from its fill, not from a tick. `aria-pressed`
 * carries that to a screen reader, which is the half a coloured background
 * cannot do on its own.
 */
export const CHIP =
  'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] ' +
  'transition-colors cursor-pointer select-none'

export const CHIP_OFF = 'border-line bg-canvas text-ink hover:border-dim/50 hover:bg-panel'

export const CHIP_ON = 'border-brand bg-brand text-white hover:bg-brandInk'
