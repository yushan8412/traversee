'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ACTIVITIES, CITIES, type Activity, type City } from '../../../../../lib/places/types'
import { ActivityIcon } from '../../../activity-icon'
import { SubmissionErrors } from '../../../submit/submission-errors'
import {
  BUTTON_PRIMARY,
  CHIP,
  CHIP_OFF,
  FIELD,
  LABEL,
  SECTION,
  SECTION_NOTE,
  SECTION_TITLE,
} from '../../../submit/field-styles'
import { editPlace, type EditResult } from './actions'

export interface EditablePlace {
  id: string
  city: City
  activities: Activity[]
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  descriptionZh: string
  descriptionEn: string
}

/**
 * The same rule as the submission form: the form is in the language of the page.
 *
 * This showed both languages at first, reasoning that the half most likely to
 * need correcting is the machine-translated one. Yulia's answer was that the
 * exception is worse than the problem — a form that is sometimes bilingual and
 * sometimes not is a form you have to think about. Switching the page to English
 * is how you edit the English, and the header already does that.
 *
 * The language not on screen rides along in hidden fields. Without them a save
 * would post an empty string for it and applyEdit would faithfully clear it,
 * so editing the Chinese would silently delete the English.
 */
export function EditForm({ place }: { place: EditablePlace }) {
  const t = useTranslations('edit')
  const ts = useTranslations('submit')
  const tp = useTranslations('places')
  const locale = useLocale()
  const [result, setResult] = useState<EditResult | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setPending(true)
    try {
      setResult(await editPlace(formData))
    } catch {
      setResult({ ok: false, errors: ['unknown'] })
    } finally {
      setPending(false)
    }
  }

  const zh = locale === 'zh'
  // Names are written by hand in both languages, exactly as on the submission
  // form. Only the prose follows the page.
  const names = zh ? (['nameZh', 'nameEn'] as const) : (['nameEn', 'nameZh'] as const)
  const prose = [
    { shown: zh ? 'summaryZh' : 'summaryEn', hidden: zh ? 'summaryEn' : 'summaryZh', rows: 2 },
    {
      shown: zh ? 'descriptionZh' : 'descriptionEn',
      hidden: zh ? 'descriptionEn' : 'descriptionZh',
      rows: 5,
    },
  ] as const

  return (
    <form action={onSubmit} className="space-y-4 sm:space-y-5">
      <input type="hidden" name="id" value={place.id} />
      {/* The county it is filed under now, which is the partition it has to be
          read from and removed from if this edit moves it. */}
      <input type="hidden" name="previousCity" value={place.city} />

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>{t('editTitle')}</h2>
        <p className={SECTION_NOTE}>{t('editNote')}</p>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {names.map((name) => (
              <div key={name}>
                <label className={LABEL} htmlFor={name}>
                  {ts(name)}
                </label>
                <input
                  id={name}
                  name={name}
                  defaultValue={place[name]}
                  className={FIELD}
                />
              </div>
            ))}
          </div>

          {prose.map(({ shown, hidden, rows }) => (
            <div key={shown}>
              <label className={LABEL} htmlFor={shown}>
                {shown.startsWith('summary') ? ts('summary') : ts('description')}
              </label>
              <textarea
                id={shown}
                name={shown}
                rows={rows}
                defaultValue={place[shown]}
                className={`${FIELD} resize-y`}
              />
              <input type="hidden" name={hidden} value={place[hidden]} />
            </div>
          ))}

          <div>
            <label className={LABEL} htmlFor="city">
              {ts('city')}
            </label>
            <div className="relative">
              <select
                id="city"
                name="city"
                defaultValue={place.city}
                className={`${FIELD} appearance-none pr-10`}
              >
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {tp(`city.${city}`)}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <fieldset>
            <legend className={LABEL}>{ts('activities')}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => (
                <label
                  key={activity}
                  className={`${CHIP} ${CHIP_OFF} has-[:checked]:border-brand has-[:checked]:bg-brand
                    has-[:checked]:text-white has-[:focus-visible]:outline
                    has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                    has-[:focus-visible]:outline-brand`}
                >
                  <input
                    type="checkbox"
                    name="activities"
                    value={activity}
                    defaultChecked={place.activities.includes(activity)}
                    className="sr-only"
                  />
                  <ActivityIcon activity={activity} size={17} />
                  {tp(`activity.${activity}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {result && !result.ok && <SubmissionErrors codes={result.errors} />}
      {result?.ok && (
        <p role="status" className="rounded-2xl border border-line bg-paper p-4 text-[15px]">
          {t('saved')}
        </p>
      )}

      <div className="pt-1">
        <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
          {pending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  )
}
