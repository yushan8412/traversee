'use client'

import { useTranslations } from 'next-intl'
import { LIMIT_MESSAGE_VALUES } from '../../../lib/photos/limits'

/**
 * The reasons a submission was refused.
 *
 * Shared by both forms because both refuse for the same reasons, and because
 * the lookup below needs a cast that is better made once. Codes come from the
 * server as strings, so the message key cannot be known at compile time, and
 * the typed `t` will not take a value bag for a key it cannot resolve.
 */
export function SubmissionErrors({ codes }: { codes: string[] }) {
  const t = useTranslations('submit.errors') as unknown as (
    key: string,
    values?: Record<string, number | string>,
  ) => string

  return (
    <ul className="rounded border border-line bg-panel p-4 text-sm">
      {codes.map((code) => (
        <li key={code}>{t(code, LIMIT_MESSAGE_VALUES)}</li>
      ))}
    </ul>
  )
}
