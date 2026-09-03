'use client'

import { useLocale, useTranslations } from 'next-intl'
import { FIELD, LABEL, OPTIONAL } from './field-styles'

/**
 * The prose, asked for once.
 *
 * This was two columns — Chinese beside English, four fields for two pieces of
 * writing — which is twice the page for the same entry, and asks somebody to do
 * a translator's job while they are trying to describe a mountain. Now the form
 * is in whatever language the page is in, and the other half is produced during
 * submission by lib/translate/service.
 *
 * The field names being locale-dependent is the whole mechanism: an English page
 * posts `summaryEn` and leaves `summaryZh` empty, and the server fills whichever
 * side is missing. There is nothing to keep in step, because the empty field is
 * the signal.
 */
export function ProseFields() {
  const locale = useLocale()
  const t = useTranslations('submit')
  const suffix = locale === 'zh' ? 'Zh' : 'En'

  const fields = [
    { name: `summary${suffix}`, label: t('summary'), rows: 2 },
    { name: `description${suffix}`, label: t('description'), rows: 5 },
  ]

  return (
    <div className="space-y-4">
      {fields.map(({ name, label, rows }) => (
        <div key={name}>
          <label className={LABEL} htmlFor={name}>
            {label} <span className={OPTIONAL}>({t('optional')})</span>
          </label>
          <textarea id={name} name={name} rows={rows} className={`${FIELD} resize-y`} />
        </div>
      ))}
    </div>
  )
}
