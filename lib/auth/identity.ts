import { createHash } from 'node:crypto'
import type { Role } from './roles'

export interface Profile {
  /** The provider's stable identifier for this person. Never stored raw. */
  subject: string
  email: string
  displayName: string
  avatarUrl?: string | null
  locale?: 'zh' | 'en'
}

export interface UserDocument {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: Role
  preferredLocale: 'zh' | 'en'
  createdAt: string
  lastLoginAt: string
}

/**
 * The Google subject is a stable handle on a person that works across any
 * service they sign into, so it is hashed rather than stored. The digest is
 * still deterministic, which is what lets the same person land on the same
 * document on every sign-in.
 */
export function userIdFromSubject(subject: string): string {
  const trimmed = subject.trim()
  if (!trimmed) {
    // Hashing an empty subject would give every provider that omits one the
    // same id, quietly merging different people into a single account.
    throw new Error('Cannot derive a user id from an empty subject.')
  }
  return createHash('sha256').update(trimmed).digest('hex')
}

export function toUserDocument(
  profile: Profile,
  {
    role,
    now,
    existingCreatedAt,
  }: { role: Role; now: string; existingCreatedAt?: string },
): UserDocument {
  return {
    id: userIdFromSubject(profile.subject),
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl ?? null,
    role,
    preferredLocale: profile.locale ?? 'zh',
    // The upsert rewrites the whole document, so an existing join date has to be
    // carried forward explicitly or every sign-in erases it.
    createdAt: existingCreatedAt ?? now,
    lastLoginAt: now,
  }
}
