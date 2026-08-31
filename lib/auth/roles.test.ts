import { describe, expect, it } from 'vitest'
import { parseAdminAllowlist, resolveRole } from './roles'

describe('parseAdminAllowlist', () => {
  it('splits a comma-separated list and trims it', () => {
    expect(parseAdminAllowlist(' a@example.com , b@example.com ')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })

  it('lowercases entries so the comparison cannot depend on how it was typed', () => {
    expect(parseAdminAllowlist('Owner@Example.COM')).toEqual(['owner@example.com'])
  })

  it('is empty when the variable is unset or blank', () => {
    // An unset variable must mean "nobody is an administrator", never
    // "everybody" and never a crash on a page that checks the role.
    expect(parseAdminAllowlist(undefined)).toEqual([])
    expect(parseAdminAllowlist('')).toEqual([])
    expect(parseAdminAllowlist('  ,  ,')).toEqual([])
  })
})

describe('resolveRole', () => {
  const allowlist = ['owner@example.com']

  it('grants admin to an address on the list', () => {
    expect(resolveRole('owner@example.com', allowlist)).toBe('admin')
  })

  it('ignores case when matching', () => {
    // Google can return the address with different capitalisation than it was
    // typed into configuration, and a case-sensitive check would silently lock
    // the only administrator out of their own moderation console.
    expect(resolveRole('Owner@Example.com', allowlist)).toBe('admin')
  })

  it('gives everyone else the user role', () => {
    expect(resolveRole('someone@example.com', allowlist)).toBe('user')
  })

  it('never grants admin without an address', () => {
    // A provider that returns no email must not land in the same branch as an
    // empty allowlist entry and come out privileged.
    expect(resolveRole(null, allowlist)).toBe('user')
    expect(resolveRole(undefined, allowlist)).toBe('user')
    expect(resolveRole('', allowlist)).toBe('user')
    expect(resolveRole('', [''])).toBe('user')
  })

  it('grants nobody admin when the allowlist is empty', () => {
    expect(resolveRole('owner@example.com', [])).toBe('user')
  })
})
