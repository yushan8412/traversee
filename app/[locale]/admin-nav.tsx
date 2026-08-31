import { getTranslations } from 'next-intl/server'
import { auth } from '../../auth'
import { Link } from '../../i18n/navigation'

/**
 * Administrator links, rendered only for administrators. This is convenience,
 * not access control — both pages check the session themselves and so do the
 * actions behind them.
 */
export async function AdminNav() {
  let session
  try {
    session = await auth()
  } catch {
    return null
  }

  if (session?.user?.role !== 'admin') return null

  const nav = await getTranslations('nav')

  return (
    <>
      <Link href="/submit" className="text-accent hover:underline">
        {nav('submit')}
      </Link>
      <Link href="/review" className="text-accent hover:underline">
        {nav('review')}
      </Link>
    </>
  )
}
