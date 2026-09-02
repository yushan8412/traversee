'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { RouteForm } from './route-form'
import { SpotForm } from './spot-form'
import { LABEL } from './field-styles'
import type { TileSource } from '../../../lib/maps/tile-source'

/**
 * The first question, because it decides everything after it. A route is a line
 * and arrives as a GPX file; a spot is a point and is marked on the map. Asking
 * up front keeps each form to the fields its own kind actually needs.
 *
 * Two loose radio buttons said this but read as a stray pair of dots above the
 * form rather than as the choice the rest of the page hangs off. Still radios
 * underneath the styling: this is one choice from two, arrow keys should move
 * between them, and a pair of buttons pretending to be a segmented control
 * throws that away.
 */
export function KindPicker({ tileSource }: { tileSource: TileSource }) {
  const t = useTranslations('submit')
  const [kind, setKind] = useState<'route' | 'spot'>('spot')

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={LABEL}>{t('kindLabel')}</legend>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
          {(['spot', 'route'] as const).map((value) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3
                text-center text-[15px] leading-tight transition-colors
                has-[:focus-visible]:outline has-[:focus-visible]:outline-2
                has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${
                  kind === value
                    ? 'bg-brand font-medium text-white'
                    : 'text-dim hover:bg-panel hover:text-ink'
                }`}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {value === 'route' ? t('kindRoute') : t('kindSpot')}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === 'route' ? (
        <RouteForm tileSource={tileSource} />
      ) : (
        <SpotForm tileSource={tileSource} />
      )}
    </div>
  )
}
