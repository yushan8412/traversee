import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { LanguageSwitcher } from './language-switcher'
import type { Locale } from '../../i18n/routing'

const REPOSITORY = 'https://github.com/yushan8412/traversee'

/**
 * Every page ended on a cliff before this existed.
 *
 * It carries two things the site is obliged to say rather than chooses to: that
 * the catalogue is still small and hand-built, and that the photography is
 * borrowed under licences that require crediting. Neither is decoration.
 */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer')
  const nav = await getTranslations('nav')
  const site = await getTranslations('site')
  const other: Locale = locale === 'zh' ? 'en' : 'zh'

  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-12">
        <div>
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
                <path d="M3 19l6-12 4 7 3-4 5 9z" />
              </svg>
            </span>
            {site('name')}
          </span>
          <p className="mt-4 max-w-[38ch] text-[13px] leading-relaxed text-dim">{t('blurb')}</p>
        </div>

        <nav className="flex flex-col items-start gap-3 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            {t('browse')}
          </span>
          <Link href="/places" className="text-ink no-underline hover:text-brand">
            {nav('places')}
          </Link>
          {/* No "add a place" link. Submission is still administrator-only, so
              for everyone else it is a door that refuses them — and the site is
              meant to invite contribution, not tease it. It belongs here the day
              the gate opens, not before. */}
          <LanguageSwitcher target={other} label={nav('switchLanguage')} />
        </nav>

        <div className="flex flex-col items-start gap-3 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            {t('about')}
          </span>
          <a
            href={REPOSITORY}
            target="_blank"
            rel="noreferrer noopener"
            className="text-ink no-underline hover:text-brand"
          >
            {t('source')}
          </a>
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-dim">{t('credits')}</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-5 text-[12px] text-dim">{t('legal')}</div>
      </div>
    </footer>
  )
}
