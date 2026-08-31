'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { reviewPlace, type ReviewResult } from './actions'
import type { Status } from '../../../lib/places/types'

const BUTTON = 'rounded border border-line px-3 py-1.5 text-sm text-accent hover:underline disabled:opacity-50'

export function ReviewActions({ id, city, status }: { id: string; city: string; status: Status }) {
  const t = useTranslations('review')
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [pending, setPending] = useState(false)
  // Only revealed when rejecting, since the reason is mandatory only there and
  // an always-visible box invites filling it in for an approval.
  const [rejecting, setRejecting] = useState(false)

  async function run(formData: FormData) {
    setPending(true)
    try {
      setResult(await reviewPlace(formData))
    } finally {
      setPending(false)
    }
  }

  return (
    <form action={run} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="city" value={city} />

      {rejecting && (
        <textarea
          name="reviewNote"
          rows={2}
          required
          placeholder={t('reason')}
          className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {status !== 'published' && (
          <button type="submit" name="to" value="published" disabled={pending} className={BUTTON}>
            {t('publish')}
          </button>
        )}
        {status === 'published' && (
          <button type="submit" name="to" value="pending" disabled={pending} className={BUTTON}>
            {t('unpublish')}
          </button>
        )}
        {status === 'pending' && (
          <button
            type={rejecting ? 'submit' : 'button'}
            name="to"
            value="rejected"
            disabled={pending}
            onClick={() => !rejecting && setRejecting(true)}
            className={BUTTON}
          >
            {t('reject')}
          </button>
        )}
        {result && !result.ok && result.error && (
          <span className="text-sm text-dim">{t(`errors.${result.error}` as never)}</span>
        )}
      </div>
    </form>
  )
}
