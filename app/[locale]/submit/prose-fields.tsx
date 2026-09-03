'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BUTTON_QUIET, FIELD, LABEL, OPTIONAL } from './field-styles'

type Field = 'summaryZh' | 'summaryEn' | 'descriptionZh' | 'descriptionEn'

const PAIRS = [
  { zh: 'summaryZh', en: 'summaryEn', rows: 2 },
  { zh: 'descriptionZh', en: 'descriptionEn', rows: 5 },
] as const

/**
 * The prose, in both languages, with one control that writes the English.
 *
 * One button for both fields rather than one each: it is a single round trip
 * and a single decision, and translating a summary without its description is
 * not something anybody wants to do on purpose.
 *
 * The English lands in ordinary editable fields. That is the whole point of
 * translating on demand instead of on the server at submit time — the machine
 * gets it mostly right, and this is a shared database, so what publishes should
 * be something a person has read.
 */
export function ProseFields() {
  const t = useTranslations('submit')
  const [text, setText] = useState<Record<Field, string>>({
    summaryZh: '',
    summaryEn: '',
    descriptionZh: '',
    descriptionEn: '',
  })
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')

  const hasChinese = text.summaryZh.trim() !== '' || text.descriptionZh.trim() !== ''

  async function translate() {
    setState('working')
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [text.summaryZh, text.descriptionZh] }),
      })
      if (!response.ok) throw new Error(String(response.status))
      const { translations } = (await response.json()) as { translations: string[] }
      setText((current) => ({
        ...current,
        // An empty answer means that field was blank, so what is already there
        // is not overwritten with nothing.
        summaryEn: translations[0] || current.summaryEn,
        descriptionEn: translations[1] || current.descriptionEn,
      }))
      setState('done')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="space-y-4">
      {PAIRS.map(({ zh, en, rows }) => (
        <div key={zh} className="grid gap-4 sm:grid-cols-2">
          {([zh, en] as const).map((name) => (
            <div key={name}>
              <label className={LABEL} htmlFor={name}>
                {t(name)} <span className={OPTIONAL}>({t('optional')})</span>
              </label>
              <textarea
                id={name}
                name={name}
                rows={rows}
                value={text[name]}
                onChange={(event) =>
                  setText((current) => ({ ...current, [name]: event.target.value }))
                }
                className={`${FIELD} resize-y`}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void translate()}
          disabled={!hasChinese || state === 'working'}
          className={BUTTON_QUIET}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h9M7.5 6c0 4-1.6 7.2-4.5 9" />
            <path d="M5 10.5c1.4 2.4 3.4 4 6.5 5" />
            <path d="M12.5 20l4-10 4 10M14 17h5" />
          </svg>
          {state === 'working' ? t('translating') : t('translate')}
        </button>

        {state === 'done' && <span className="text-[13px] text-dim">{t('translated')}</span>}
        {state === 'failed' && (
          <span className="text-[13px] text-clayDeep">{t('translateFailed')}</span>
        )}
      </div>
    </div>
  )
}
