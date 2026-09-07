'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { parseGpx } from '../../../lib/gpx/parse'
import { summariseTrack, type TrackSummary } from '../../../lib/places/route-submission'
import { PlaceMap } from '../places/place-map'
import type { TileSource } from '../../../lib/maps/tile-source'
import type { Duration } from '../../../lib/places/types'
import { BUTTON_QUIET } from './field-styles'

/**
 * Choosing a GPX file, and seeing what it contains before sending it.
 *
 * Extracted out of the submission form when the edit page needed the same
 * thing — a track can now be replaced after an entry is posted, and the two
 * surfaces must agree about what a file means.
 */
export function GpxPicker({
  tileSource,
  required = true,
  replacing,
  onSummary,
}: {
  tileSource: TileSource
  required?: boolean
  /** What the entry records now, so the preview can say what is being given up. */
  replacing?: { duration: Duration } | null
  onSummary?: (summary: TrackSummary | null) => void
}) {
  const t = useTranslations('submit')
  const tp = useTranslations('places')

  const [summary, setSummary] = useState<TrackSummary | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Parsed in the browser so the submitter sees the track before sending and can
  // tell at a glance they picked the right file. The server parses the bytes
  // again and stores its own numbers — this is a preview, not a source of truth.
  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setSummary(null)
    onSummary?.(null)
    setParseError(null)
    setFileName(file?.name ?? null)
    if (!file) return

    try {
      const points = parseGpx(await file.text())
      if (points.length < 2) {
        setParseError('gpx-unreadable')
        return
      }
      const parsed = summariseTrack(points)
      setSummary(parsed)
      onSummary?.(parsed)
    } catch {
      setParseError('gpx-unreadable')
    }
  }

  /**
   * A recorded time about to become "unknown".
   *
   * Replacing a track replaces its duration outright, which is correct — the
   * numbers describe the file, and a new file is a new set of numbers. But a
   * GPX without timestamps yields a zero duration, so swapping a timed track
   * for an untimed one silently discards a measurement. Said before the save
   * rather than discovered after it.
   */
  const losingDuration =
    replacing?.duration.basis === 'gpx' && summary?.duration.basis === 'submitter'

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          id="gpx"
          name="gpx"
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          required={required}
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
          {losingDuration && replacing && (
            <p className="text-[13px] text-clayDeep">
              {t('durationWillBeLost', {
                min: replacing.duration.minMinutes,
                max: replacing.duration.maxMinutes,
              })}
            </p>
          )}
        </div>
      )}
    </>
  )
}
