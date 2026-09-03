export type ProseField = 'summaryZh' | 'summaryEn' | 'descriptionZh' | 'descriptionEn'

export type Language = 'zh-Hant' | 'en'

export interface TranslationGroup {
  from: Language
  to: Language
  items: { target: ProseField; text: string }[]
}

const PAIRS = [
  { zh: 'summaryZh', en: 'summaryEn' },
  { zh: 'descriptionZh', en: 'descriptionEn' },
] as const

/**
 * Which halves of a submission are missing, and which way to translate them.
 *
 * The form asks for prose once, in whatever language the page is in, and this
 * decides what the other language should be. Written as a plan rather than done
 * inline because the interesting cases are the ones nobody types on purpose: a
 * pair where both halves are already filled must be left alone, and an entry
 * with Chinese in one field and English in the other has to be sent as two
 * requests rather than one that translates English into English.
 *
 * A pair with both halves written is somebody's deliberate wording. Overwriting
 * it with a machine translation would be the form quietly disagreeing with the
 * person filling it in.
 */
export function translationPlan(values: Record<ProseField, string>): TranslationGroup[] {
  const toEnglish: TranslationGroup['items'] = []
  const toChinese: TranslationGroup['items'] = []

  for (const { zh, en } of PAIRS) {
    const chinese = values[zh].trim()
    const english = values[en].trim()

    if (chinese !== '' && english === '') toEnglish.push({ target: en, text: chinese })
    else if (english !== '' && chinese === '') toChinese.push({ target: zh, text: english })
  }

  const groups: TranslationGroup[] = []
  if (toEnglish.length > 0) groups.push({ from: 'zh-Hant', to: 'en', items: toEnglish })
  if (toChinese.length > 0) groups.push({ from: 'en', to: 'zh-Hant', items: toChinese })
  return groups
}
