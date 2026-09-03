'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
 * Both languages, unlike the submission form.
 *
 * Submitting asks for one language and translates the other, because writing is
 * the expensive part and nobody wants to do it twice. Editing is the opposite:
 * you are here because something specific is wrong, and it may be the machine's
 * half that is wrong. Hiding it would mean the translated text could never be
 * corrected at all.
 */
export function EditForm({ place }: { place: EditablePlace }) {
  const t = useTranslations('edit')
  const ts = useTranslations('submit')
  const tp = useTranslations('places')
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

  // Each half names its own language, unlike the submission form, where the
  // page's language is implied and only one half is asked for.
  const pairs = [
    { zh: 'nameZh', en: 'nameEn', rows: 0 },
    { zh: 'summaryZh', en: 'summaryEn', rows: 2 },
    { zh: 'descriptionZh', en: 'descriptionEn', rows: 5 },
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
          {pairs.map(({ zh, en, rows }) => (
            <div key={zh} className="grid gap-4 sm:grid-cols-2">
              {([zh, en] as const).map((name) => (
                <div key={name}>
                  <label className={LABEL} htmlFor={name}>
                    {ts(name)}
                  </label>
                  {rows === 0 ? (
                    <input
                      id={name}
                      name={name}
                      defaultValue={place[name as keyof EditablePlace] as string}
                      className={FIELD}
                    />
                  ) : (
                    <textarea
                      id={name}
                      name={name}
                      rows={rows}
                      defaultValue={place[name as keyof EditablePlace] as string}
                      className={`${FIELD} resize-y`}
                    />
                  )}
                </div>
              ))}
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
