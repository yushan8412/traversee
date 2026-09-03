import { getTranslations } from 'next-intl/server'
import { Link } from '../../i18n/navigation'
import type { Locale } from '../../i18n/routing'
import { AdminNav } from './admin-nav'
import { AuthControls } from './auth-controls'
import { LanguageSwitcher } from './language-switcher'
import { MainTabs, type Tab } from './main-tabs'
import { MenuDrawer } from './menu-drawer'
import { Mountain } from './mountain'

/**
 * Logo left, the three pages centred, everything else behind the menu.
 *
 * The previous header put five links, a language switcher and the account
 * controls in one row. On a phone an administrator's version overflowed a
 * fixed-height bar; letting it scroll instead left 258px of links inside a 65px
 * window, which is reachable and undiscoverable. Choosing which three pages the
 * site actually is, and putting the rest one tap away, is the answer that does
 * not depend on how wide the window is.
 */
export async function SiteHeader({ locale }: { locale: Locale }) {
  const nav = await getTranslations('nav')
  const site = await getTranslations('site')
  const other: Locale = locale === 'zh' ? 'en' : 'zh'

  const tabs: Tab[] = [
    { href: '/', icon: 'home', label: nav('home') },
    { href: '/explore', icon: 'explore', label: nav('explore') },
    { href: '/places', icon: 'places', label: nav('places') },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-semibold tracking-tight no-underline"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand">
            <Mountain stroke="#fff" />
          </span>
          {site('name')}
        </Link>

        <MainTabs tabs={tabs} />

        <div className="flex justify-end">
          <MenuDrawer label={nav('menu')} closeLabel={nav('closeMenu')}>
            <nav className="flex flex-col gap-1">
              {/* The same three, because below md they are not in the bar. */}
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim md:hidden">
                {nav('mainPages')}
              </span>
              <div className="flex flex-col gap-1 md:hidden">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className="rounded-xl px-3 py-2.5 text-[15px] text-ink no-underline transition-colors hover:bg-panel"
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <span className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim md:mt-0">
                {nav('more')}
              </span>
              {/* These components carry the accent colour they were given when
                  they sat in a header row. In a list of destinations they are
                  destinations, so the drawer restates the colour rather than
                  every one of them growing a prop for it. */}
              <div
                className="flex flex-col items-stretch gap-1
                  [&_a]:block [&_a]:rounded-xl [&_a]:px-3 [&_a]:py-2.5 [&_a]:text-[15px]
                  [&_a]:text-ink [&_a]:no-underline [&_a]:transition-colors
                  [&_a:hover]:bg-panel [&_a:hover]:text-brand"
              >
                <AdminNav />
                <LanguageSwitcher target={other} label={nav('switchLanguage')} />
              </div>

              <div
                className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-5
                  text-[15px] [&_button]:text-ink [&_button:hover]:text-brand"
              >
                <AuthControls />
              </div>
            </nav>
          </MenuDrawer>
        </div>
      </div>
    </header>
  )
}
