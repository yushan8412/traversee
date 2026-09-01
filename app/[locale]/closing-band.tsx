import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'

/**
 * The last thing before the footer: one wide photograph of the region, tinted
 * blue so it closes the page on a different note from the green band above it.
 *
 * The invitation is to browse, not to sign up. Submission is still gated to
 * administrators, and a closing call to action that nobody can act on is worse
 * than none — see the same reasoning in site-footer.tsx.
 */
export async function ClosingBand({ count, emphasis }: { count: number; emphasis: string }) {
  const t = await getTranslations('closing')

  return (
    <section className="relative isolate flex min-h-[26rem] items-center justify-center overflow-hidden sm:min-h-[34rem]">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed art direction */}
      <img
        src="/closing/nanya.webp"
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* Blue, not green. The featured band immediately above is a green field,
          and a second one here made the two read as one long section. A flat
          wash ties the photograph to the palette; the gradient is what keeps
          the type legible over whatever is in the middle of the frame. */}
      <div className="absolute inset-0 -z-10 bg-deep/78" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/40 via-transparent to-deep/70" />

      <div className="mx-auto max-w-2xl px-6 py-20 text-center text-white sm:py-28">
        <span className="inline-block -rotate-2 font-[family-name:var(--font-hand)] text-3xl text-sea">
          {t('scribble')}
        </span>
        <h2 className="hero-type mt-3 font-[family-name:var(--font-display)] text-[2rem] font-normal leading-[1.15] tracking-[-0.01em] sm:text-[2.75rem]">
          {t('title')}
          <br />
          <span className={emphasis}>{t('title2')}</span>
        </h2>
        <p className="hero-type mx-auto mt-6 max-w-[44ch] text-[15px] leading-[1.85] text-white/85">
          {t('body', { count })}
        </p>
        <Link
          href="/places"
          className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-paper px-8 py-4 text-sm font-medium text-ink no-underline transition-transform hover:scale-[1.03]"
        >
          {t('cta')}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <span className="absolute bottom-3 right-5 text-[10px] text-white/55">{t('credit')}</span>
    </section>
  )
}
