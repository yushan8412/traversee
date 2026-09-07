'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { TileSource } from '../../../../../lib/maps/tile-source'
import type { Duration, Kind, LineString, Point } from '../../../../../lib/places/types'
import type { City } from '../../../../../lib/places/types'
import { PlaceMap } from '../../place-map'
import { PinPicker } from '../../../submit/pin-picker'
import { GpxPicker } from '../../../submit/gpx-picker'
import { BUTTON_QUIET, LABEL, SECTION_NOTE } from '../../../submit/field-styles'

export interface CurrentGeometry {
  kind: Kind
  geometry: LineString | Point
  startPoint: Point
  route: { distanceKm: number; elevationGainM: number; duration: Duration } | null
}

/**
 * Offering a new location for an entry that already has one.
 *
 * Collapsed until asked for, which is the point rather than a detail. Replacing
 * a location discards the old one outright — Yulia's rule, 2026-09-07: there is
 * no vertex editing and no nudging a pin — so it must not look like an ordinary
 * field, and it must not be reachable by someone who came here to fix a typo.
 *
 * The kind picker is inside the panel because the replacement may cross it: a
 * trailhead pinned from a phone becomes the route it always was once the
 * recorded track exists, and a route wrongly filed as one can become a point.
 */
export function GeometrySection({
  tileSource,
  current,
  onCityGuess,
  onMove,
  onBlockingChange,
}: {
  tileSource: TileSource
  current: CurrentGeometry
  onCityGuess?: (city: City) => void
  onMove?: () => void
  /**
   * Whether this section is holding the save back — true only while the panel
   * is open and the chosen kind still has nothing to save.
   */
  onBlockingChange?: (blocking: boolean) => void
}) {
  const t = useTranslations('edit')
  const tp = useTranslations('places')

  const [expanded, setExpanded] = useState(false)
  const [kind, setKind] = useState<Kind>(current.kind)

  function expand() {
    setExpanded(true)
    // Opening the panel is a statement of intent, so from here the save waits
    // for something to actually replace the location with.
    onBlockingChange?.(true)
  }

  function collapse() {
    setExpanded(false)
    setKind(current.kind)
    // Nothing is being replaced any more, so nothing is being waited on.
    onBlockingChange?.(false)
  }

  return (
    // A block inside the edit card rather than a card of its own, so it sits
    // directly above the county field. The county does not follow the pin, and
    // putting the two next to each other is the part of that gap which can be
    // closed for nothing.
    <div>
      <h3 className={LABEL}>{t('sectionLocation')}</h3>

      {!expanded && (
        <>
          <p className={SECTION_NOTE}>
            {current.kind === 'route' ? t('currentTrack') : t('currentPin')}
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <PlaceMap
              tileSource={tileSource}
              markers={[{ slug: 'current', name: '', point: current.startPoint }]}
              geometry={current.geometry}
              className="h-[220px] w-full sm:h-[260px]"
            />
          </div>

          {current.route && (
            <dl className="mt-3 grid grid-cols-[8.5rem_1fr] gap-y-1.5 text-[15px]">
              <dt className="text-dim">{tp('metrics.distance')}</dt>
              <dd className="tabular-nums">
                {tp('metrics.kilometres', { value: current.route.distanceKm })}
              </dd>
              <dt className="text-dim">{tp('metrics.elevationGain')}</dt>
              <dd className="tabular-nums">
                {tp('metrics.metres', { value: current.route.elevationGainM })}
              </dd>
            </dl>
          )}

          <button type="button" onClick={expand} className={`${BUTTON_QUIET} mt-4`}>
            {current.kind === 'route' ? t('replaceTrack') : t('replaceLocation')}
          </button>
        </>
      )}

      {expanded && (
        <>
          <p className={SECTION_NOTE}>{t('replaceNote')}</p>

          {/* Only meaningful while the panel is open. Without it the action
              leaves the geometry alone, which is what every edit that is only
              fixing words needs. */}
          <input type="hidden" name="replaceGeometry" value="1" />
          <input type="hidden" name="replacementKind" value={kind} />

          <fieldset className="mt-4">
            <legend className="sr-only">{t('sectionLocation')}</legend>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
              {(['spot', 'route'] as const).map((value) => (
                <label
                  key={value}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl
                    px-3 text-center text-[15px] leading-tight transition-colors
                    has-[:focus-visible]:outline has-[:focus-visible]:outline-2
                    has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
                      kind === value
                        ? 'bg-brand font-medium text-white'
                        : 'text-dim hover:bg-panel hover:text-ink'
                    }`}
                >
                  <input
                    type="radio"
                    name="replacementKindChoice"
                    value={value}
                    checked={kind === value}
                    onChange={() => {
                      setKind(value)
                      // Switching kind abandons whatever the other one held.
                      onBlockingChange?.(true)
                    }}
                    className="sr-only"
                  />
                  {value === 'route' ? tp('kind.route') : tp('kind.spot')}
                </label>
              ))}
            </div>
          </fieldset>

          {kind === 'spot' ? (
            <PinPicker
              tileSource={tileSource}
              onCityGuess={onCityGuess}
              onMove={() => {
                onMove?.()
                onBlockingChange?.(false)
              }}
            />
          ) : (
            <GpxPicker
              tileSource={tileSource}
              // Not `required`: the browser would otherwise refuse to submit a
              // form whose location panel is open but unused, blocking an edit
              // that only touches words.
              required={false}
              replacing={current.route}
              onSummary={(summary) => onBlockingChange?.(summary === null)}
            />
          )}

          <button type="button" onClick={collapse} className={`${BUTTON_QUIET} mt-4`}>
            {t('cancelReplace')}
          </button>
        </>
      )}
    </div>
  )
}
