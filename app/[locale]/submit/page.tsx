import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '../../../auth'
import { KindPicker } from './kind-picker'
import { resolveTileSource } from '../../../lib/maps/tile-source'

export const dynamic = 'force-dynamic'

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('submit')
  const session = await auth()

  // Checked again in the server action. This one is for the reader's benefit —
  // hiding the form is not authorisation, and the action does not trust it.
  // One shell for every branch. The signed-out message had a reading width and
  // page padding; the branch that actually holds the form had neither, so the
  // only version anybody fills in was the one pressed against the window edge.
  const shell = 'mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14'
  const heading = 'text-[26px] font-semibold tracking-tight sm:text-[32px]'

  if (!session?.user) {
    return (
      <main className={shell}>
        <h1 className={heading}>{t('title')}</h1>
        <p className="mt-3 text-dim">{t('signInFirst')}</p>
      </main>
    )
  }

  if (session.user.role !== 'admin') {
    return (
      <main className={shell}>
        <h1 className={heading}>{t('title')}</h1>
        <p className="mt-3 text-dim">{t('adminOnly')}</p>
      </main>
    )
  }

  return (
    <main className={shell}>
      <h1 className={heading}>{t('title')}</h1>
      <div className="mt-7 sm:mt-9">
        <KindPicker tileSource={resolveTileSource()} />
      </div>
    </main>
  )
}
