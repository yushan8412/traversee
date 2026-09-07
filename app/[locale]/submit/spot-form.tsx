'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TileSource } from '../../../lib/maps/tile-source'
import { ACTIVITIES, CITIES, type City } from '../../../lib/places/types'
import { submitSpot, type SubmitResult } from './actions'
import { shrinkPhotos } from '../../../lib/photos/downscale'
import { attachPhotos } from '../../../lib/photos/selection'
import { ActivityIcon } from '../activity-icon'
import { SaveButton } from '../save-button'
import { PhotoPicker } from './photo-picker'
import { PinPicker } from './pin-picker'
import { SubmissionErrors } from './submission-errors'
import { NameFields } from './name-fields'
import { ProseFields } from './prose-fields'
import {
  BUTTON_PRIMARY,
  CHIP,
  CHIP_OFF,
  FIELD,
  LABEL,
  SECTION,
  SECTION_NOTE,
  SECTION_TITLE,
} from './field-styles'

export function SpotForm({ tileSource }: { tileSource: TileSource }) {
  const t = useTranslations('submit')
  const tp = useTranslations('places')

  const [photos, setPhotos] = useState<File[]>([])
  const [result, setResult] = useState<SubmitResult | null>(null)
  // Controlled so a searched place can fill it in: Azure names the county in
  // the same response the search has already paid for. A tapped pin names
  // nothing, so this keeps its value and is flagged for confirmation instead.
  const [city, setCity] = useState<City>('taipei')
  const [cityConfirmed, setCityConfirmed] = useState(true)

  async function onSubmit(formData: FormData) {
    try {
      setResult(await submitSpot(await shrinkPhotos(attachPhotos(formData, photos))))
    } catch {
      setResult({ ok: false, errors: ['unknown'] })
    }
  }

  if (result?.ok) {
    return (
      <p className={`${SECTION} text-[15px]`}>
        {t('submitted')} <span className="font-mono text-dim">{result.slug}</span>
      </p>
    )
  }

  return (
    <form action={onSubmit} className="space-y-4 sm:space-y-5">
      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>{t('sectionWhere')}</h2>
        <p className={SECTION_NOTE}>{t('sectionWhereNote')}</p>

        <PinPicker
          tileSource={tileSource}
          onCityGuess={(guessed) => {
            setCity(guessed)
            setCityConfirmed(true)
          }}
          onMove={() => setCityConfirmed(false)}
        />

        <div className="mt-5">
          <label className={LABEL} htmlFor="city">
            {t('city')}
          </label>
          <div className="relative">
            <select
              id="city"
              name="city"
              value={city}
              onChange={(event) => {
                setCity(event.target.value as City)
                setCityConfirmed(true)
              }}
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
          {!cityConfirmed && <p className="mt-1.5 text-[13px] text-clayDeep">{t('confirmCity')}</p>}
        </div>
      </section>

      <section className={SECTION}>
        <fieldset>
          <legend className={SECTION_TITLE}>{t('activities')}</legend>
          <p className={SECTION_NOTE}>{t('sectionActivitiesNote')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ACTIVITIES.map((activity) => (
              <label
                key={activity}
                className={`${CHIP} ${CHIP_OFF} has-[:checked]:border-brand has-[:checked]:bg-brand
                  has-[:checked]:text-white has-[:focus-visible]:outline
                  has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2
                  has-[:focus-visible]:outline-brand`}
              >
                <input type="checkbox" name="activities" value={activity} className="sr-only" />
                <ActivityIcon activity={activity} size={17} />
                {tp(`activity.${activity}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>{t('sectionAbout')}</h2>
        <p className={SECTION_NOTE}>{t('sectionAboutNote')}</p>

        <div className="mt-4 space-y-4">
          <NameFields />

          <ProseFields />
        </div>
      </section>

      <section className={SECTION}>
        <PhotoPicker photos={photos} onChange={setPhotos} />
      </section>

      {result && !result.ok && <SubmissionErrors codes={result.errors} />}

      <div className="pt-1">
        <SaveButton
          label={t('submit')}
          busyLabel={t('submitting')}
          className={`${BUTTON_PRIMARY} w-full sm:w-auto`}
        />
      </div>
    </form>
  )
}
