import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import { routing } from '../../i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('places')

  return (
    <main>
      <p className="mb-8 text-lg">{t('intro')}</p>
      <Link
        href="/places"
        className="inline-block rounded border border-line bg-panel px-4 py-2 text-accent hover:underline"
      >
        {t('title')}
      </Link>
    </main>
  )
}
