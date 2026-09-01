import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '../../../auth'
import { KindPicker } from './kind-picker'

export const dynamic = 'force-dynamic'

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('submit')
  const session = await auth()

  // Checked again in the server action. This one is for the reader's benefit —
  // hiding the form is not authorisation, and the action does not trust it.
  if (!session?.user) {
    return (
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-dim">{t('signInFirst')}</p>
      </main>
    )
  }

  if (session.user.role !== 'admin') {
    return (
      <main>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-dim">{t('adminOnly')}</p>
      </main>
    )
  }

  return (
    <main>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <KindPicker />
    </main>
  )
}
