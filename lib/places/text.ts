import type { BilingualText, Locale } from './types'

export interface ResolvedText {
  value: string
  /** False when this came from the other language because the requested one is missing. */
  translated: boolean
  /** The language the text is actually in, for the `lang` attribute. */
  locale: Locale
}

const OTHER: Record<Locale, Locale> = { zh: 'en', en: 'zh' }

/**
 * Bilingual content is one document with two fields, and either may be empty.
 * Hiding untranslated places from the English site would make it look far emptier
 * than it is, so the requested language wins when present and the other language
 * is shown with `translated: false` when it is not. Callers are expected to mark
 * that case in the UI rather than pass it off as a translation.
 */
export function resolveText(
  text: BilingualText | undefined | null,
  locale: Locale,
): ResolvedText | null {
  if (!text) return null

  const preferred = text[locale]?.trim()
  if (preferred) return { value: preferred, translated: true, locale }

  const fallbackLocale = OTHER[locale]
  const fallback = text[fallbackLocale]?.trim()
  if (fallback) return { value: fallback, translated: false, locale: fallbackLocale }

  return null
}
