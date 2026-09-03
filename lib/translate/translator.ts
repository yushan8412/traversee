/**
 * Turning the Chinese half of a submission into the English half.
 *
 * The site is bilingual from its first commit, which in practice meant every
 * description had to be written twice or the English side of the catalogue
 * stayed empty. Place names are still written by hand — a name is a decision,
 * and 象鼻岩 is not "Elephant Trunk Rock" because a service said so — but the
 * prose is written once, in whatever language the page is in, and the other
 * half is produced while the submission is being saved.
 */

import type { Language } from './plan'

export interface Translatable {
  index: number
  text: string
}

export function translatableTexts(texts: string[]): Translatable[] {
  return texts
    .map((text, index) => ({ index, text: text.trim() }))
    .filter(({ text }) => text !== '')
}

export function readTranslations(payload: unknown): string[] {
  if (!Array.isArray(payload)) return []

  const out: string[] = []
  for (const entry of payload) {
    const text = entry?.translations?.[0]?.text
    if (typeof text !== 'string') return []
    out.push(text)
  }
  return out
}

/**
 * The direction is a parameter because the form is filled in whatever language
 * the page is in, so English submissions translate the other way.
 *
 * `zh-Hant` rather than `zh`: the service treats them as different languages and
 * the site is written in Traditional Chinese.
 */
export function translateUrl(endpoint: string, from: Language, to: Language): string {
  return `${endpoint.replace(/\/+$/, '')}/translator/text/v3.0/translate?api-version=3.0&from=${from}&to=${to}`
}
