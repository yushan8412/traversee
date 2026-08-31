'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { reviewPlace, type ReviewResult } from './actions'
import type { Status } from '../../../lib/places/types'

const BUTTON =
  'rounded border border-line px-3 py-1.5 text-sm text-accent hover:underline disabled:opacity-50'

export function ReviewActions({ id, city, status }: { id: string; city: string; status: Status }) {
  const t = useTranslations('review')
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [pending, setPending] = useState(false)
  // The reason box only appears for a rejection, since that is the only place it
  // is required, and an always-visible field invites filling it in for approvals.
  const [rejecting, setRejecting] = useState(false)

  async function run(formData: FormData) {
    setPending(true)
    try {
      setResult(await reviewPlace(formData))
    } finally {
      setPending(false)
    }
  }

  // Each action is its own form carrying the target status as a hidden field.
  // Putting it on the submit button instead relies on the browser sending which
  // button was pressed, which a client action does not reliably do — the first
  // version did that and every review failed with the target missing.
  const hidden = (to: Status) => (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="to" value={to} />
    </>
  )

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'published' && (
          <form action={run}>
            {hidden('published')}
            <button type="submit" disabled={pending} className={BUTTON}>
              {t('publish')}
            </button>
          </form>
        )}

        {status === 'published' && (
          <form action={run}>
            {hidden('pending')}
            <button type="submit" disabled={pending} className={BUTTON}>
              {t('unpublish')}
            </button>
          </form>
        )}

        {status === 'pending' && !rejecting && (
          <button type="button" onClick={() => setRejecting(true)} className={BUTTON}>
            {t('reject')}
          </button>
        )}

        {result && !result.ok && result.error && (
          <span className="text-sm text-dim">{t(`errors.${result.error}` as never)}</span>
        )}
      </div>

      {status === 'pending' && rejecting && (
        <form action={run} className="space-y-2">
          {hidden('rejected')}
          <textarea
            name="reviewNote"
            rows={2}
            required
            placeholder={t('reason')}
            className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BUTTON}>
              {t('reject')}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className={BUTTON}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
