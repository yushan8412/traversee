import { getTranslations } from 'next-intl/server'
import { auth, signIn, signOut } from '../../auth'

// Reading the session here makes every page dynamic, since the header differs
// per visitor. That gives up the edge-cached landing page the site had while it
// was entirely anonymous — the cost of showing who is signed in.
/**
 * A session that cannot be read must not take the site down. This header is on
 * every page, so an exception here would turn a broken sign-in into a blank
 * site — and this platform has already failed in three unrelated ways during
 * this project. Degrading to signed-out keeps everything readable, which is
 * what a visitor came for anyway.
 */
async function currentSession() {
  try {
    return await auth()
  } catch (error) {
    console.error('Could not read the session; rendering as signed out', error)
    return null
  }
}

export async function AuthControls() {
  const session = await currentSession()
  const t = await getTranslations('auth')

  if (!session?.user?.email) {
    return (
      <form
        action={async () => {
          'use server'
          await signIn('google')
        }}
      >
        {/* "Sign in with Google" is three wrapped lines in a 390px header, so
            the narrow layout keeps only the verb. The provider is still named
            on the button the visitor actually lands on. */}
        <button type="submit" className="whitespace-nowrap text-accent hover:underline">
          <span className="sm:hidden">{t('signInShort')}</span>
          <span className="hidden sm:inline">{t('signIn')}</span>
        </button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden truncate text-dim sm:inline">
        {session.user.name ?? session.user.email}
      </span>
      {session.user.role === 'admin' && (
        <span className="rounded border border-line px-1.5 py-0.5 text-xs text-dim">
          {t('admin')}
        </span>
      )}
      <form
        action={async () => {
          'use server'
          await signOut()
        }}
      >
        <button type="submit" className="whitespace-nowrap text-accent hover:underline">
          {t('signOut')}
        </button>
      </form>
    </div>
  )
}
