import { describe, expect, it } from 'vitest'
import { applyTransition, canTransition } from './moderation'

const now = '2026-08-31T12:00:00.000Z'

describe('canTransition', () => {
  it('allows the transitions the state machine draws', () => {
    expect(canTransition('pending', 'published')).toBe(true)
    expect(canTransition('pending', 'rejected')).toBe(true)
    expect(canTransition('published', 'pending')).toBe(true) // unpublish
    expect(canTransition('rejected', 'pending')).toBe(true) // resubmit
  })

  it('refuses the ones it does not', () => {
    // Rejecting something already public would take it down without it ever
    // going back through review, and skips the state the submitter can see.
    expect(canTransition('published', 'rejected')).toBe(false)
    expect(canTransition('rejected', 'published')).toBe(false)
  })

  it('refuses a transition to the same state', () => {
    // A no-op that still writes would overwrite reviewedBy and the timestamps
    // for no reason.
    expect(canTransition('pending', 'pending')).toBe(false)
    expect(canTransition('published', 'published')).toBe(false)
  })
})

describe('applyTransition', () => {
  const pending = { status: 'pending' as const, publishedAt: null, reviewNote: null }

  it('stamps publishedAt when something is published', () => {
    const result = applyTransition(pending, { to: 'published', reviewedBy: 'admin-1', now })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.status).toBe('published')
    expect(result.patch.publishedAt).toBe(now)
    expect(result.patch.reviewedBy).toBe('admin-1')
  })

  it('requires a reason to reject', () => {
    // The spec makes this a system rule, not a convention: the reason is shown
    // to the submitter, and "rejected, no explanation" is not a usable answer.
    const withoutReason = applyTransition(pending, { to: 'rejected', reviewedBy: 'admin-1', now })
    expect(withoutReason.ok).toBe(false)

    const withReason = applyTransition(pending, {
      to: 'rejected',
      reviewedBy: 'admin-1',
      now,
      reviewNote: 'Coordinates point at a private road.',
    })
    expect(withReason.ok).toBe(true)
    if (!withReason.ok) return
    expect(withReason.patch.reviewNote).toBe('Coordinates point at a private road.')
  })

  it('treats a blank reason as no reason', () => {
    const result = applyTransition(pending, {
      to: 'rejected',
      reviewedBy: 'admin-1',
      now,
      reviewNote: '   ',
    })
    expect(result.ok).toBe(false)
  })

  it('clears publishedAt when something is taken down', () => {
    // Leaving the old timestamp would make an unpublished entry look live to
    // anything that reads publishedAt rather than status.
    const published = { status: 'published' as const, publishedAt: now, reviewNote: null }
    const result = applyTransition(published, { to: 'pending', reviewedBy: 'admin-1', now })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.patch.publishedAt).toBeNull()
  })

  it('refuses a transition the state machine does not allow', () => {
    const published = { status: 'published' as const, publishedAt: now, reviewNote: null }
    expect(applyTransition(published, { to: 'rejected', reviewedBy: 'a', now, reviewNote: 'x' }).ok).toBe(
      false,
    )
  })
})
