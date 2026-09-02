'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { TileSource } from '../../../lib/maps/tile-source'
import { submitSpot, type SubmitResult } from './actions'

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

const AZURE_TILES =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'
/** Free stand-in for anywhere that is not production. See lib/maps/tile-source. */
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// Every county the coverage box reaches, in the order they run down the island.
// This list was still Taipei/New Taipei/Keelung after the scope widened, so the
// form could not submit anywhere the validator was by then happy to accept.
const CITIES = [
  'taipei', 'newTaipei', 'keelung', 'taoyuan', 'hsinchuCity', 'hsinchuCounty',
  'miaoli', 'taichung', 'changhua', 'nantou', 'yunlin', 'chiayiCity',
  'chiayiCounty', 'tainan', 'kaohsiung', 'pingtung', 'yilan', 'hualien',
  'taitung', 'penghu',
] as const
const ACTIVITIES = [
  'hiking',
  'cycling',
  'camping',
  'surfing',
  'waterfall',
  'climbing',
  'vtt',
] as const

const FIELD = 'w-full rounded border border-line bg-panel px-3 py-2 text-sm'
const LABEL = 'mb-1 block text-xs font-medium text-dim'

export function SpotForm({ tileSource }: { tileSource: TileSource }) {
  const useAzure = tileSource === 'azure'
  const t = useTranslations('submit')
  const tp = useTranslations('places')
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)

  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!container.current || map.current) return
    let cancelled = false

    async function start() {
      // Only Azure's tiles need a credential; OpenStreetMap's do not, and
      // asking for one would make the map depend on Azure being configured.
      let credentials = { token: '', clientId: '' }
      if (useAzure) {
        try {
          const response = await fetch('/api/maps-token')
          credentials = (await response.json()) as { token: string; clientId: string }
        } catch {
          return
        }
      }
      if (cancelled || !container.current) return

      const instance = new MapLibreMap({
        container: container.current,
        style: {
          version: 8,
          sources: { azure: { type: 'raster', tiles: [useAzure ? AZURE_TILES : OSM_TILES], tileSize: 256, maxzoom: 18 } },
          layers: [{ id: 'azure', type: 'raster', source: 'azure' }],
        },
        center: [121.56, 25.05],
        zoom: 9,
        maxBounds: new LngLatBounds([119.3, 21.75], [122.1, 25.4]),
        minZoom: 8,
        maxZoom: 17,
        attributionControl: { compact: true },
        transformRequest: (url: string) =>
          url.startsWith('https://atlas.microsoft.com')
            ? {
                url,
                headers: {
                  Authorization: `Bearer ${credentials.token}`,
                  'x-ms-client-id': credentials.clientId,
                },
              }
            : { url },
      })

      instance.addControl(new NavigationControl({ showCompass: false }), 'top-right')
      instance.on('click', (event) => {
        const { lng, lat } = event.lngLat
        setPosition({ lng, lat })
        if (marker.current) marker.current.setLngLat([lng, lat])
        else marker.current = new Marker({ color: '#2f6b4f' }).setLngLat([lng, lat]).addTo(instance)
      })

      map.current = instance
    }

    void start()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // The map is built once. `useAzure` is here only because it is read inside;
    // it is derived from a prop that does not change while the form is open.
  }, [useAzure])

  async function onSubmit(formData: FormData) {
    setPending(true)
    try {
      setResult(await submitSpot(formData))
    } catch {
      setResult({ ok: false, errors: ['unknown'] })
    } finally {
      setPending(false)
    }
  }

  if (result?.ok) {
    return (
      <p className="rounded border border-line bg-panel p-5 text-sm">
        {t('submitted')}{' '}
        <span className="font-mono text-dim">{result.slug}</span>
      </p>
    )
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <div>
        <span className={LABEL}>{t('pickLocation')}</span>
        <div ref={container} className="h-72 w-full rounded border border-line" />
        <p className="mt-1 text-xs text-dim">
          {t('coordinates')}:{' '}
          {position ? `${position.lng.toFixed(5)}, ${position.lat.toFixed(5)}` : '—'}
        </p>
        <input type="hidden" name="lng" value={position?.lng ?? ''} />
        <input type="hidden" name="lat" value={position?.lat ?? ''} />
      </div>

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

      {(
        [
          ['nameZh', false],
          ['nameEn', true],
          ['summaryZh', true],
          ['summaryEn', true],
        ] as const
      ).map(([field, optional]) => (
        <div key={field}>
          <label className={LABEL} htmlFor={field}>
            {t(field)} {optional && <span className="font-normal">({t('optional')})</span>}
          </label>
          <input id={field} name={field} className={FIELD} />
        </div>
      ))}

      {(['descriptionZh', 'descriptionEn'] as const).map((field) => (
        <div key={field}>
          <label className={LABEL} htmlFor={field}>
            {t(field)} <span className="font-normal">({t('optional')})</span>
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
        disabled={pending}
        className="rounded border border-line bg-panel px-4 py-2 text-accent hover:underline disabled:opacity-50"
      >
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
