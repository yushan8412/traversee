import { getTranslations } from 'next-intl/server'
import { Mountain } from './mountain'

/**
 * The route-level loading state.
 *
 * The site had none: a slow navigation showed the previous page until the new
 * one arrived, which reads as a dead tap. What fills the gap is the mark
 * drawing itself — the trail arrives a dash at a time and the summit lights
 * when it reaches the top.
 *
 * It is the same mark the header shows, from the same file, for the reason
 * given there: an indicator that animated into a shape the site never displays
 * would be a second logo wearing the first one's name.
 */
export default async function Loading() {
  const site = await getTranslations('site')

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-7 px-6"
      role="status"
      aria-live="polite"
    >
      <Mountain variant="full" climbing size={220} className="max-w-[62vw]" />
      <p className="text-sm text-dim">{site('loading')}</p>
    </div>
  )
}
