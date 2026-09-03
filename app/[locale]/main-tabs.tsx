'use client'

import { usePathname } from '../../i18n/navigation'
import { Link } from '../../i18n/navigation'
import { NavIcon } from './nav-icon'

export interface Tab {
  href: '/' | '/explore' | '/places'
  icon: 'home' | 'explore' | 'places'
  label: string
}

/**
 * The three pages the site is, centred.
 *
 * Everything else — submitting, reviewing, language, the account — is behind
 * the menu. The header used to carry all of it in one row, which on a phone
 * meant an administrator's five links overflowed a fixed-height bar; the fix
 * then was to let them scroll, which left 258px of links inside a 65px window.
 * Deciding which three matter is the actual answer.
 *
 * Hidden below `md`, where there is no room to centre anything. On a phone the
 * same three are the first thing in the menu.
 */
export function MainTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname()

  return (
    <nav className="hidden justify-center gap-1 md:flex">
      {tabs.map((tab) => {
        // `/` would otherwise match every route.
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm
              no-underline transition-colors ${
                active ? 'bg-panel font-medium text-ink' : 'text-dim hover:bg-panel/70 hover:text-ink'
              }`}
          >
            <NavIcon name={tab.icon} />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
