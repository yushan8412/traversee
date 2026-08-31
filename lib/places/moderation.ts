import type { Status } from './types'

/**
 * The transitions the spec's state machine draws, and only those.
 *
 * published → rejected is deliberately absent: taking something public straight
 * to rejected removes it without it passing back through the state its
 * submitter can act on. Unpublishing returns it to pending instead.
 */
const ALLOWED: Record<Status, Status[]> = {
  pending: ['published', 'rejected'],
  published: ['pending'],
  rejected: ['pending'],
}

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED[from].includes(to)
}

export interface TransitionRequest {
  to: Status
  reviewedBy: string
  now: string
  reviewNote?: string
}

export interface StatusPatch {
  status: Status
  publishedAt: string | null
  reviewedBy: string
  reviewNote: string | null
  updatedAt: string
}

export type TransitionResult =
  | { ok: true; patch: StatusPatch }
  | { ok: false; reason: 'not-allowed' | 'reason-required' }

export function applyTransition(
  // Only the current status is read. Asking for more would make every caller
  // supply fields this decision does not depend on.
  current: { status: Status },
  request: TransitionRequest,
): TransitionResult {
  if (!canTransition(current.status, request.to)) return { ok: false, reason: 'not-allowed' }

  const note = request.reviewNote?.trim()

  // The spec makes this a system rule rather than a convention: the reason is
  // shown to the submitter, and a rejection with no explanation tells them
  // nothing they can act on.
  if (request.to === 'rejected' && !note) return { ok: false, reason: 'reason-required' }

  return {
    ok: true,
    patch: {
      status: request.to,
      // Cleared on the way down, so an unpublished entry does not still look
      // live to anything reading publishedAt rather than status.
      publishedAt: request.to === 'published' ? request.now : null,
      reviewedBy: request.reviewedBy,
      reviewNote: note ?? null,
      updatedAt: request.now,
    },
  }
}
