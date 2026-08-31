import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Link } from '../../i18n/navigation'
import { routing, type Locale } from '../../i18n/routing'
import { LanguageSwitcher } from './language-switcher'
import '../globals.css'

// zh-Hant rather than zh: the site is written in Traditional Chinese, and the
// distinction is what lets a browser or screen reader pick the right font and
// pronunciation.
const HTML_LANG: Record<Locale, string> = { zh: 'zh-Hant', en: 'en' }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'site' })
  return { title: t('name'), description: t('tagline') }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations('site')
  const nav = await getTranslations('nav')
  const other: Locale = locale === 'zh' ? 'en' : 'zh'

  return (
    <html lang={HTML_LANG[locale]}>
      <body>
        {/* Wraps the header too, not just children: the language switcher is a
            client component and next-intl's client hooks read the locale from
            this provider. Wrapping only children makes the build fail at
            prerender rather than at runtime, which at least fails loudly. */}
        <NextIntlClientProvider>
          <div className="mx-auto max-w-3xl px-6 py-12">
            <header className="mb-12 flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <div>
                <Link href="/" className="text-2xl font-semibold tracking-tight">
                  {t('name')}
                </Link>
                <p className="text-sm text-dim">{t('tagline')}</p>
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/places" className="text-accent hover:underline">
                  {nav('places')}
                </Link>
                <LanguageSwitcher target={other} label={nav('switchLanguage')} />
              </nav>
            </header>

            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
