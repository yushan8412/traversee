'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { reviewPlace, type ReviewResult } from './actions'
import { SaveButton } from '../save-button'
import { BUTTON_QUIET } from '../submit/field-styles'
import type { Status } from '../../../lib/places/types'

// The same button as everywhere else. These were a link in a box, which made
// publishing something look less consequential than choosing a photo.
const BUTTON = `${BUTTON_QUIET} px-3.5 text-[14px]`

export function ReviewActions({ id, city, status }: { id: string; city: string; status: Status }) {
  const t = useTranslations('review')
  const [result, setResult] = useState<ReviewResult | null>(null)
  // The reason box only appears for a rejection, since that is the only place it
  // is required, and an always-visible field invites filling it in for approvals.
  const [rejecting, setRejecting] = useState(false)

  async function run(formData: FormData) {
    setResult(await reviewPlace(formData))
  }

  // Each action is its own form, so each button reads its own form's status —
  // which is also what makes the indicator appear on the button that was
  // actually pressed rather than on all three.

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
            <SaveButton label={t('publish')} busyLabel={t('publishBusy')} className={BUTTON} />
          </form>
        )}

        {status === 'published' && (
          <form action={run}>
            {hidden('pending')}
            <SaveButton label={t('unpublish')} busyLabel={t('unpublishBusy')} className={BUTTON} />
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
            <SaveButton label={t('reject')} busyLabel={t('rejectBusy')} className={BUTTON} />
            <button type="button" onClick={() => setRejecting(false)} className={BUTTON}>
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
