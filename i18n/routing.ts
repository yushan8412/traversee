import { defineRouting } from 'next-intl/routing'

// zh is the default because the audience is in northern Taiwan, and the prefix is
// always present — /zh and /en both appear in the URL. An unprefixed default
// would give the same page two addresses, which splits search ranking between
// them and makes the language switcher's target ambiguous.
export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
