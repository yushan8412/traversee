export type Role = 'user' | 'admin'

/**
 * Administrators are configured as an email allowlist in an environment
 * variable, so the set can change without a database edit or a deploy of new
 * code. An unset variable means nobody is an administrator — the safe direction
 * for a value that might be missing.
 */
export function parseAdminAllowlist(value: string | undefined | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
}

/**
 * Matching is case-insensitive because the address Google returns need not be
 * capitalised the way it was typed into configuration, and a mismatch there
 * would lock the only administrator out of their own moderation console.
 */
export function resolveRole(
  email: string | null | undefined,
  allowlist: string[],
): Role {
  if (!email) return 'user'
  const normalised = email.trim().toLowerCase()
  if (!normalised) return 'user'
  return allowlist.includes(normalised) ? 'admin' : 'user'
}
