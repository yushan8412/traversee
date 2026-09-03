import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Caveat } from 'next/font/google'
import type { Metadata } from 'next'
import { Link } from '../../i18n/navigation'
import { routing, type Locale } from '../../i18n/routing'
import { AdminNav } from './admin-nav'
import { AuthControls } from './auth-controls'
import { LanguageSwitcher } from './language-switcher'
import { Mountain } from './mountain'
import { SiteFooter } from './site-footer'
import '../globals.css'

// zh-Hant rather than zh: the site is written in Traditional Chinese, and the
// distinction is what lets a browser or screen reader pick the right font and
// pronunciation.
const HTML_LANG: Record<Locale, string> = { zh: 'zh-Hant', en: 'en' }

// One weight, latin only, self-hosted by next/font at build time — no runtime
// request to Google. It is used for a handful of short marker-pen labels, so a
// second weight or the full charset would be paying for nothing. The labels it
// sets are decorative English on both locales; Chinese never uses it, because a
// latin handwriting face has no CJK glyphs and would silently fall back.
const hand = Caveat({ subsets: ['latin'], weight: '600', variable: '--font-hand' })

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
    <html lang={HTML_LANG[locale]} className={hand.variable}>
      <body>
        {/* Wraps the header too, not just children: the language switcher is a
            client component and next-intl's client hooks read the locale from
            this provider. Wrapping only children makes the build fail at
            prerender rather than at runtime, which at least fails loudly. */}
        <NextIntlClientProvider>
          {/* The header spans the window; the reading width belongs to each page,
              because a full-bleed hero and a column of prose want different ones
              and a layout that picks for them makes one of the two wrong. */}
          <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-7 sm:px-6">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-semibold tracking-tight no-underline"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand">
                  <Mountain stroke="#fff" />
                </span>
                {t('name')}
              </Link>
              {/* Scrolls rather than wraps. Signing in as an administrator adds
                  two more links, which on a phone pushed the row onto a second
                  line and out through the bottom of a fixed-height header — so
                  the header looked broken on the surface an admin uses most. A
                  drawer is the fuller answer; this stops it being wrong. */}
              <nav className="tv-scroll-x flex min-w-0 flex-1 items-center gap-4 text-sm sm:ml-1 sm:gap-6 [&>*]:shrink-0">
                <Link
                  href="/explore"
                  className="whitespace-nowrap font-medium text-dim no-underline hover:text-ink"
                >
                  {nav('explore')}
                </Link>
                <Link
                  href="/places"
                  className="whitespace-nowrap font-medium text-dim no-underline hover:text-ink"
                >
                  {nav('places')}
                </Link>
                <AdminNav />
              </nav>
              <div className="ml-auto flex shrink-0 items-center gap-4 whitespace-nowrap text-sm">
                <LanguageSwitcher target={other} label={nav('switchLanguage')} />
                <AuthControls />
              </div>
            </div>
          </header>

          {/* No wrapper element: every page supplies its own <main>, and a
              second one here both nested the landmark and re-applied a reading
              width over pages that had already chosen a different one. */}
          {children}

          <SiteFooter locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
