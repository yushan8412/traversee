import { describe, expect, it } from 'vitest'
import { resolveText } from './text'

describe('resolveText', () => {
  it('uses the requested language when it is present', () => {
    const result = resolveText({ zh: '冷水坑環走', en: 'Lengshuikeng Loop' }, 'en')
    expect(result).toEqual({ value: 'Lengshuikeng Loop', translated: true, locale: 'en' })
  })

  it('falls back to the other language and says so', () => {
    const result = resolveText({ zh: '望古瀑布', en: null }, 'en')
    expect(result).toEqual({ value: '望古瀑布', translated: false, locale: 'zh' })
  })

  it('treats whitespace-only text as missing', () => {
    // An editor clearing a field usually leaves an empty string, not null. If
    // that counted as present, the English page would render a blank heading
    // instead of falling back — a silent hole rather than a visible marker.
    const result = resolveText({ zh: '望古瀑布', en: '   ' }, 'en')
    expect(result).toEqual({ value: '望古瀑布', translated: false, locale: 'zh' })
  })

  it('returns null when neither language has content', () => {
    expect(resolveText({ zh: '', en: null }, 'zh')).toBeNull()
    expect(resolveText(undefined, 'zh')).toBeNull()
  })
})
