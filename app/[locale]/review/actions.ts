'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '../../../auth'
import { getPlaceById, replacePlace } from '../../../lib/places/repository'
import { applyTransition } from '../../../lib/places/moderation'
import { filesOf } from '../../../lib/places/files'
import { demoteToPending, promoteToPublic } from '../../../lib/storage/blob'
import type { Status } from '../../../lib/places/types'

export interface ReviewResult {
  ok: boolean
  error?:
    | 'not-allowed'
    | 'not-found'
    | 'reason-required'
    | 'missing-target'
    | 'missing-entry'
    | 'transition-not-allowed'
}

const STATUSES: Status[] = ['pending', 'published', 'rejected']

export async function reviewPlace(formData: FormData): Promise<ReviewResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') return { ok: false, error: 'not-allowed' }

  const id = String(formData.get('id') ?? '')
  const city = String(formData.get('city') ?? '')
  const to = String(formData.get('to') ?? '') as Status

  // Separated so a failure says which field went missing rather than collapsing
  // every cause into one unhelpful message.
  if (!id || !city) return { ok: false, error: 'missing-entry' }
  if (!STATUSES.includes(to)) return { ok: false, error: 'missing-target' }

  // Read the stored document rather than trusting the form's idea of the
  // current state; otherwise a stale page could drive an illegal transition.
  const place = await getPlaceById(id, city)
  if (!place) return { ok: false, error: 'not-found' }

  const result = applyTransition(place, {
    to,
    reviewedBy: session.user.id,
    now: new Date().toISOString(),
    reviewNote: String(formData.get('reviewNote') ?? ''),
  })

  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === 'reason-required' ? 'reason-required' : 'transition-not-allowed',
    }
  }

  // Files move before the document changes. A file that is public while the
  // document still says pending is invisible — nothing links to it. A document
  // that says published while its files are still private is broken content
  // somebody has to go and repair.
  const files = filesOf(place)
  if (files.length > 0) {
    if (to === 'published') {
      for (const path of files) await promoteToPublic(path)
    } else if (place.status === 'published') {
      // Coming down from published, whether to pending or rejected.
      for (const path of files) await demoteToPending(path)
    }
  }

  await replacePlace({ ...place, ...result.patch })

  // The public list is force-dynamic, but the review page caches its own render
  // and would otherwise keep showing an entry that is no longer pending.
  revalidatePath('/[locale]/review', 'page')
  return { ok: true }
}
