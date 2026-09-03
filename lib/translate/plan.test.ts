import { describe, expect, it } from 'vitest'
import { translationPlan } from './plan'

const blank = { summaryZh: '', summaryEn: '', descriptionZh: '', descriptionEn: '' }

describe('translationPlan', () => {
  it('fills the empty side from the side that was written', () => {
    expect(translationPlan({ ...blank, summaryZh: '芒草開闊' })).toEqual([
      { from: 'zh-Hant', to: 'en', items: [{ target: 'summaryEn', text: '芒草開闊' }] },
    ])
  })

  it('works the other way, because the form is whatever language the page is in', () => {
    expect(translationPlan({ ...blank, descriptionEn: 'Open silvergrass.' })).toEqual([
      { from: 'en', to: 'zh-Hant', items: [{ target: 'descriptionZh', text: 'Open silvergrass.' }] },
    ])
  })

  it('carries both fields in one request when they go the same way', () => {
    const plan = translationPlan({ ...blank, summaryZh: '一', descriptionZh: '二' })
    expect(plan).toHaveLength(1)
    expect(plan[0]?.items.map((i) => i.target)).toEqual(['summaryEn', 'descriptionEn'])
  })

  it('leaves alone a pair somebody wrote both halves of', () => {
    expect(
      translationPlan({ ...blank, summaryZh: '芒草開闊', summaryEn: 'Open silvergrass.' }),
    ).toEqual([])
  })

  it('does nothing when nothing was written', () => {
    expect(translationPlan(blank)).toEqual([])
  })

  it('ignores whitespace, which is not something to translate', () => {
    expect(translationPlan({ ...blank, summaryZh: '   ' })).toEqual([])
  })

  it('handles the two fields pointing in different directions', () => {
    // Not a normal way to fill the form, but the fields are free text and an
    // entry edited across two sittings could arrive like this. One request per
    // direction rather than one that silently translates English into English.
    const plan = translationPlan({ ...blank, summaryZh: '一', descriptionEn: 'two' })
    expect(plan.map((group) => `${group.from}->${group.to}`)).toEqual([
      'zh-Hant->en',
      'en->zh-Hant',
    ])
  })
})
