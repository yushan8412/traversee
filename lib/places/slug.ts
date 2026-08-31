const MAX_LENGTH = 80

/**
 * Builds the URL segment for a place.
 *
 * Returns empty for text with nothing URL-safe in it, which is the normal case
 * for a Chinese-only name. Machine romanisation is deliberately not attempted:
 * it produces slugs no reader recognises and that no author would have chosen.
 * The caller decides what to fall back to.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    // Strip combining marks so accented Latin keeps its base letter rather than
    // losing the whole character.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Apostrophes are removed rather than treated as separators, so
    // "Mountain's Ridge" reads as mountains-ridge and not mountain-s-ridge.
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    // Truncation can land mid-separator, and a trailing hyphen in a URL looks
    // like a mistake.
    .replace(/-+$/, '')
}
