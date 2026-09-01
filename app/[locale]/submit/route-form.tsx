'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { parseGpx } from '../../../lib/gpx/parse'
import { summariseTrack, type TrackSummary } from '../../../lib/places/route-submission'
import { PlaceMap } from '../places/place-map'
import { submitRoute, type SubmitResult } from './route-actions'

const CITIES = ['taipei', 'newTaipei', 'keelung'] as const
const ACTIVITIES = ['hiking', 'cycling', 'camping', 'surfing', 'waterfall'] as const

const FIELD = 'w-full rounded border border-line bg-panel px-3 py-2 text-sm'
const LABEL = 'mb-1 block text-xs font-medium text-dim'

export function RouteForm() {
  const t = useTranslations('submit')
  const tp = useTranslations('places')

  const [summary, setSummary] = useState<TrackSummary | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [pending, setPending] = useState(false)

  // Parsed in the browser so the submitter sees the track before sending and can
  // tell at a glance they picked the right file. The server parses the bytes
  // again and stores its own numbers — this is a preview, not a source of truth.
  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setSummary(null)
    setParseError(null)
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
      setResult(await submitRoute(formData))
    } catch {
      setResult({ ok: false, errors: ['unknown'] })
    } finally {
      setPending(false)
    }
  }

  if (result?.ok) {
    return (
      <p className="rounded border border-line bg-panel p-5 text-sm">
        {t('submitted')} <span className="font-mono text-dim">{result.slug}</span>
      </p>
    )
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <label className={LABEL} htmlFor="gpx">
          {t('gpxFile')}
        </label>
        <input
          id="gpx"
          name="gpx"
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          required
          onChange={onFile}
          className="text-sm"
        />
        {parseError && <p className="mt-1 text-sm text-dim">{t(`errors.${parseError}` as never)}</p>}
      </div>

      {summary && (
        <div className="space-y-3">
          <PlaceMap
            markers={[{ slug: 'preview', name: t('preview'), point: summary.startPoint }]}
            geometry={summary.geometry}
            className="h-72 w-full"
          />
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1 text-sm">
            <dt className="text-dim">{tp('metrics.distance')}</dt>
            <dd>{tp('metrics.kilometres', { value: summary.distanceKm })}</dd>
            <dt className="text-dim">{tp('metrics.elevationGain')}</dt>
            <dd>{tp('metrics.metres', { value: summary.elevationGainM })}</dd>
            <dt className="text-dim">{tp('metrics.duration')}</dt>
            <dd>
              {summary.duration.basis === 'gpx'
                ? tp('metrics.minutes', {
                    min: summary.duration.minMinutes,
                    max: summary.duration.maxMinutes,
                  })
                : t('noTimestamps')}
              <span className="ml-2 text-xs text-dim">
                {tp(`basis.${summary.duration.basis}` as never)}
              </span>
            </dd>
            <dt className="text-dim">{t('storedPoints')}</dt>
            <dd>{summary.geometry.coordinates.length}</dd>
          </dl>
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor="city">
          {t('city')}
        </label>
        <select id="city" name="city" className={FIELD} defaultValue="taipei">
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {tp(`city.${city}`)}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={LABEL}>{t('activities')}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {ACTIVITIES.map((activity) => (
            <label key={activity} className="flex items-center gap-1.5">
              <input type="checkbox" name="activities" value={activity} />
              {tp(`activity.${activity}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {(['nameZh', 'nameEn', 'summaryZh', 'summaryEn'] as const).map((field) => (
        <div key={field}>
          <label className={LABEL} htmlFor={field}>
            {t(field)}
          </label>
          <input id={field} name={field} className={FIELD} />
        </div>
      ))}

      {(['descriptionZh', 'descriptionEn'] as const).map((field) => (
        <div key={field}>
          <label className={LABEL} htmlFor={field}>
            {t(field)}
          </label>
          <textarea id={field} name={field} rows={4} className={FIELD} />
        </div>
      ))}


      <div>
        <label className={LABEL} htmlFor="photos">
          {t('photos')} <span className="font-normal">({t('optional')})</span>
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className="text-sm"
        />
        <p className="mt-1 text-xs text-dim">{t('photosHint')}</p>
      </div>

      {result && !result.ok && (
        <ul className="rounded border border-line bg-panel p-4 text-sm">
          {result.errors.map((code) => (
            <li key={code}>{t(`errors.${code}` as never)}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pending || !summary}
        className="rounded border border-line bg-panel px-4 py-2 text-accent hover:underline disabled:opacity-50"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
