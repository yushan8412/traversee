import { describe, expect, it } from 'vitest'
import { userIdFromSubject, toUserDocument } from './identity'

describe('userIdFromSubject', () => {
  it('is stable for the same subject', () => {
    // The id is the Cosmos partition key and document id, so the same person
    // signing in tomorrow has to land on the same document rather than a second
    // account with none of their history.
    expect(userIdFromSubject('118273645')).toBe(userIdFromSubject('118273645'))
  })

  it('differs between subjects', () => {
    expect(userIdFromSubject('118273645')).not.toBe(userIdFromSubject('118273646'))
  })

  it('does not contain the subject itself', () => {
    // Storing the raw provider identifier is what the hash exists to avoid; it
    // is a stable cross-service handle on a person.
    expect(userIdFromSubject('118273645')).not.toContain('118273645')
  })

  it('rejects an empty subject rather than hashing nothing', () => {
    // Hashing '' would give every provider that omits a subject the same user
    // document, quietly merging strangers into one account.
    expect(() => userIdFromSubject('')).toThrow()
    expect(() => userIdFromSubject('   ')).toThrow()
  })
})

describe('toUserDocument', () => {
  const profile = {
    subject: '118273645',
    email: 'owner@example.com',
    displayName: 'Yushan',
    avatarUrl: 'https://example.com/a.png',
    locale: 'zh' as const,
  }
  const now = '2026-08-31T00:00:00.000Z'

  it('builds a document keyed by the hashed subject', () => {
    const doc = toUserDocument(profile, { role: 'admin', now })
    expect(doc.id).toBe(userIdFromSubject('118273645'))
    expect(doc.role).toBe('admin')
    expect(doc.email).toBe('owner@example.com')
    expect(doc.lastLoginAt).toBe(now)
    expect(doc.createdAt).toBe(now)
  })

  it('preserves the original createdAt on a returning user', () => {
    // Overwriting it on every sign-in would erase when someone joined, and the
    // upsert writes the whole document.
    const doc = toUserDocument(profile, {
      role: 'user',
      now,
      existingCreatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(doc.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(doc.lastLoginAt).toBe(now)
  })

  it('falls back to the default locale when the provider gives none', () => {
    const doc = toUserDocument({ ...profile, locale: undefined }, { role: 'user', now })
    expect(doc.preferredLocale).toBe('zh')
  })

  it('never carries the raw subject into the document', () => {
    const doc = toUserDocument(profile, { role: 'user', now })
    expect(JSON.stringify(doc)).not.toContain('118273645')
  })
})
