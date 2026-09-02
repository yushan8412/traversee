'use client'

import { useTranslations } from 'next-intl'
import { FIELD, LABEL, OPTIONAL } from './field-styles'

/**
 * A piece of prose in both languages, side by side.
 *
 * Stacked one after another, the four description fields read as four separate
 * questions and it is not obvious that two of them are the same sentence twice.
 * Pairing them puts the Chinese next to the English it becomes, which is also
 * where the translate control belongs once there is one.
 */
export function TranslatablePair({ field }: { field: 'summary' | 'description' }) {
  const t = useTranslations('submit')
  const zh = `${field}Zh` as const
  const en = `${field}En` as const
  const rows = field === 'summary' ? 2 : 5

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {([zh, en] as const).map((name) => (
        <div key={name}>
          <label className={LABEL} htmlFor={name}>
            {t(name)} <span className={OPTIONAL}>({t('optional')})</span>
          </label>
          <textarea id={name} name={name} rows={rows} className={`${FIELD} resize-y`} />
        </div>
      ))}
    </div>
  )
}
