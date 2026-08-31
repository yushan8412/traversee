'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { RouteForm } from './route-form'
import { SpotForm } from './spot-form'

/**
 * The first question, because it decides everything after it. A route is a line
 * and arrives as a GPX file; a spot is a point and is marked on the map. Asking
 * up front keeps each form to the fields its own kind actually needs.
 */
export function KindPicker() {
  const t = useTranslations('submit')
  const [kind, setKind] = useState<'route' | 'spot'>('route')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 text-sm">
        {(['route', 'spot'] as const).map((value) => (
          <label key={value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => setKind(value)}
            />
            {value === 'route' ? t('kindRoute') : t('kindSpot')}
          </label>
        ))}
      </div>

      {kind === 'route' ? <RouteForm /> : <SpotForm />}
    </div>
  )
}
