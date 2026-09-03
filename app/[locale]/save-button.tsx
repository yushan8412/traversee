'use client'

import { useFormStatus } from 'react-dom'
import { Mountain } from './mountain'

/**
 * A submit button that can actually tell you it is working.
 *
 * Every form here tracked its own `pending` boolean, set at the top of the
 * action and cleared in a `finally`. None of them ever rendered: React wraps a
 * function passed to `<form action>` in a transition, and a transition
 * deliberately withholds intermediate states so the screen does not flicker
 * through a half-finished render. The flag flipped true and false without a
 * commit in between, so "儲存中…" was never on screen for a single frame — the
 * button simply sat there until the save finished. Measured on 2026-09-03 with
 * a MutationObserver across a whole save: zero changes.
 *
 * `useFormStatus` is the one thing that reads that state, and it only works
 * from inside the form, which is why this is a component rather than a helper.
 */
export function SaveButton({
  label,
  busyLabel,
  className,
  disabled = false,
}: {
  label: string
  busyLabel: string
  className: string
  /** For a form that is not ready to send yet, such as a route with no GPX. */
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending && <Mountain size={17} strokeWidth={2} tracing className="mr-2" />}
      {pending ? busyLabel : label}
    </button>
  )
}
