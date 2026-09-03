'use client'

import { useLocale, useTranslations } from 'next-intl'
import { FIELD, LABEL, OPTIONAL } from './field-styles'

/**
 * The place's name, in both languages, written by hand.
 *
 * The one thing that is not translated. A name is a decision — 象鼻岩 is not
 * "Elephant Trunk Rock" because a service said so — and getting it wrong is
 * worse than leaving it blank, because a name is what the place is filed under.
 *
 * The page's own language comes first and carries no "optional" marker, matching
 * the prose below it. Both are genuinely optional individually: the rule is that
 * at least one of them is filled, which is a thing a label cannot say and the
 * server enforces. Until 2026-09-03 nothing enforced it at all, and an entry
 * with neither reached production and published under its own identifier.
 */
export function NameFields() {
  const locale = useLocale()
  const t = useTranslations('submit')
  const order = locale === 'zh' ? (['nameZh', 'nameEn'] as const) : (['nameEn', 'nameZh'] as const)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {order.map((field, index) => (
        <div key={field}>
          <label className={LABEL} htmlFor={field}>
            {t(field)} {index === 1 && <span className={OPTIONAL}>({t('optional')})</span>}
          </label>
          <input id={field} name={field} className={FIELD} />
        </div>
      ))}
    </div>
  )
}
