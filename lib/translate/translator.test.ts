import { describe, expect, it } from 'vitest'
import { readTranslations, translatableTexts } from './translator'

describe('translatableTexts', () => {
  it('sends only what has been written', () => {
    // Blank fields would spend characters from a monthly allowance to translate
    // nothing, and the service answers 400 for an empty string.
    expect(translatableTexts(['大屯山', '', '   '])).toEqual([{ index: 0, text: '大屯山' }])
  })

  it('keeps the position of each text, so the answers can be put back', () => {
    expect(translatableTexts(['', '象鼻岩'])).toEqual([{ index: 1, text: '象鼻岩' }])
  })

  it('trims, because trailing whitespace is billed by the character', () => {
    expect(translatableTexts([' 龍洞 '])).toEqual([{ index: 0, text: '龍洞' }])
  })
})

describe('readTranslations', () => {
  it('reads the English out of the response', () => {
    expect(
      readTranslations([
        { translations: [{ text: 'Mount Datun', to: 'en' }] },
        { translations: [{ text: 'Elephant Trunk Rock', to: 'en' }] },
      ]),
    ).toEqual(['Mount Datun', 'Elephant Trunk Rock'])
  })

  it('gives back nothing rather than guessing when the shape is wrong', () => {
    expect(readTranslations(null)).toEqual([])
    expect(readTranslations({ error: { code: 401000 } })).toEqual([])
    expect(readTranslations([{ translations: [] }])).toEqual([])
    expect(readTranslations([{ translations: [{ to: 'en' }] }])).toEqual([])
  })
})
