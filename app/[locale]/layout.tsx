import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Caveat } from 'next/font/google'
import type { Metadata } from 'next'
import { routing, type Locale } from '../../i18n/routing'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
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


  return (
    <html lang={HTML_LANG[locale]} className={hand.variable}>
      <body>
        {/* Wraps the header too, not just children: the language switcher is a
            client component and next-intl's client hooks read the locale from
            this provider. Wrapping only children makes the build fail at
            prerender rather than at runtime, which at least fails loudly. */}
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />

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
