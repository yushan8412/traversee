'use client'

import { Link, usePathname } from '../../i18n/navigation'
import type { Locale } from '../../i18n/routing'

/**
 * Switches language without leaving the page. `usePathname` here is next-intl's,
 * which returns the path with the locale segment stripped, so the same value can
 * be re-rendered under the other locale.
 */
export function LanguageSwitcher({ target, label }: { target: Locale; label: string }) {
  const pathname = usePathname()

  return (
    <Link
      href={pathname}
      locale={target}
      lang={target === 'zh' ? 'zh-Hant' : 'en'}
      className="text-accent hover:underline"
    >
      {label}
    </Link>
  )
}
