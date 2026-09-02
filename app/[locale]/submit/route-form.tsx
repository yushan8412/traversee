'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { parseGpx } from '../../../lib/gpx/parse'
import { summariseTrack, type TrackSummary } from '../../../lib/places/route-submission'
import { PlaceMap } from '../places/place-map'
import type { TileSource } from '../../../lib/maps/tile-source'
import { ACTIVITIES, CITIES } from '../../../lib/places/types'
import { submitRoute, type SubmitResult } from './route-actions'
import { shrinkPhotos } from '../../../lib/photos/downscale'
import { attachPhotos } from '../../../lib/photos/selection'
import { ActivityIcon } from '../activity-icon'
import { PhotoPicker } from './photo-picker'
import { SubmissionErrors } from './submission-errors'
import { TranslatablePair } from './translatable-pair'
import {
  BUTTON_PRIMARY,
  BUTTON_QUIET,
  CHIP,
  CHIP_OFF,
  FIELD,
  LABEL,
  OPTIONAL,
  SECTION,
  SECTION_NOTE,
  SECTION_TITLE,
} from './field-styles'

export function RouteForm({ tileSource }: { tileSource: TileSource }) {
  const t = useTranslations('submit')
  const tp = useTranslations('places')

  const [summary, setSummary] = useState<TrackSummary | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [pending, setPending] = useState(false)

  // Parsed in the browser so the submitter sees the track before sending and can
  // tell at a glance they picked the right file. The server parses the bytes
  // again and stores its own numbers — this is a preview, not a source of truth.
  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setSummary(null)
    setParseError(null)
    setFileName(file?.name ?? null)
    if (!file) return

    try {
      const points = parseGpx(await file.text())
      if (points.length < 2) {
        setParseError('gpx-unreadable')
        return
      }
      setSummary(summariseTrack(points))
    } catch {
      setParseError('gpx-unreadable')
    }
  }

  async function onSubmit(formData: FormData) {
    setPending(true)
    try {
      setResult(await submitRoute(await shrinkPhotos(attachPhotos(formData, photos))))
    } catch {
      setResult({ ok: false, errors: ['unknown'] })
    } finally {
      setPending(false)
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
        <h2 className={SECTION_TITLE}>{t('sectionTrack')}</h2>
        <p className={SECTION_NOTE}>{t('sectionTrackNote')}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            id="gpx"
            name="gpx"
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            required
            onChange={onFile}
            className="peer sr-only"
          />
          <label
            htmlFor="gpx"
            className={`${BUTTON_QUIET} peer-focus-visible:outline peer-focus-visible:outline-2
              peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18c3-1 3.5-6 6.5-6s3.5 4 6 4 2.5-6 3.5-8" />
              <circle cx="4" cy="18" r="1.6" />
              <circle cx="20" cy="8" r="1.6" />
            </svg>
            {fileName ? t('replaceGpx') : t('chooseGpx')}
          </label>
          {fileName && <span className="text-[13px] text-dim">{fileName}</span>}
        </div>

        {parseError && (
          <p className="mt-3 text-[13px] text-clayDeep">{t(`errors.${parseError}` as never)}</p>
        )}

        {summary && (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-xl border border-line">
              <PlaceMap
                tileSource={tileSource}
                markers={[{ slug: 'preview', name: t('preview'), point: summary.startPoint }]}
                geometry={summary.geometry}
                className="h-[300px] w-full sm:h-[380px]"
              />
            </div>
            <dl className="grid grid-cols-[8.5rem_1fr] gap-y-1.5 text-[15px]">
              <dt className="text-dim">{tp('metrics.distance')}</dt>
              <dd className="tabular-nums">{tp('metrics.kilometres', { value: summary.distanceKm })}</dd>
              <dt className="text-dim">{tp('metrics.elevationGain')}</dt>
              <dd className="tabular-nums">{tp('metrics.metres', { value: summary.elevationGainM })}</dd>
              <dt className="text-dim">{tp('metrics.duration')}</dt>
              <dd className="tabular-nums">
                {summary.duration.basis === 'gpx'
                  ? tp('metrics.minutes', {
                      min: summary.duration.minMinutes,
                      max: summary.duration.maxMinutes,
                    })
                  : t('noTimestamps')}
                <span className="ml-2 text-[13px] text-dim">
                  {tp(`basis.${summary.duration.basis}` as never)}
                </span>
              </dd>
              <dt className="text-dim">{t('storedPoints')}</dt>
              <dd className="tabular-nums">{summary.geometry.coordinates.length}</dd>
            </dl>
          </div>
        )}
      </section>

      <section className={SECTION}>
        <h2 className={SECTION_TITLE}>{t('sectionRegionActivities')}</h2>
        <p className={SECTION_NOTE}>{t('sectionActivitiesNote')}</p>

        <div className="mt-4">
          <label className={LABEL} htmlFor="city">
            {t('city')}
          </label>
          <div className="relative">
            <select
              id="city"
              name="city"
              defaultValue="taipei"
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

        <fieldset className="mt-5">
          <legend className={LABEL}>{t('activities')}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
            {(['nameZh', 'nameEn'] as const).map((field) => (
              <div key={field}>
                <label className={LABEL} htmlFor={field}>
                  {t(field)}{' '}
                  {field === 'nameEn' && <span className={OPTIONAL}>({t('optional')})</span>}
                </label>
                <input id={field} name={field} className={FIELD} />
              </div>
            ))}
          </div>

          {(['summary', 'description'] as const).map((field) => (
            <TranslatablePair key={field} field={field} />
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <PhotoPicker photos={photos} onChange={setPhotos} />
      </section>

      {result && !result.ok && <SubmissionErrors codes={result.errors} />}

      <div className="pt-1">
        <button
          type="submit"
          disabled={pending || !summary}
          className={`${BUTTON_PRIMARY} w-full sm:w-auto`}
        >
          {pending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  )
}
