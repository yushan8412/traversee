'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { TileSource } from '../../../lib/maps/tile-source'
import { ACTIVITIES, CITIES } from '../../../lib/places/types'
import { submitSpot, type SubmitResult } from './actions'
import { shrinkPhotos } from '../../../lib/photos/downscale'
import { attachPhotos } from '../../../lib/photos/selection'
import { ActivityIcon } from '../activity-icon'
import { PhotoPicker } from './photo-picker'
import { PlaceSearch } from './place-search'
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

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

const AZURE_TILES =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'
/**
 * Free stand-in for anywhere that is not production. See lib/maps/tile-source.
 *
 * OpenStreetMap's own tiles, chosen for their labels.
 *
 * Every alternative was rejected on the same point once it was rendered rather
 * than read about. Esri's Topographic and Light Gray both look calmer and both
 * romanise Taiwanese place names — Taipei, Taichung — which on a Traditional
 * Chinese site is a worse loss than any amount of visual noise. Carto Positron
 * answers 200 without a key and stamps API KEY REQUIRED across every tile,
 * which no status-code check catches. OpenTopoMap's relief is strong enough to
 * swallow the pins.
 *
 * The known cost, accepted deliberately: this style paints territorial
 * boundaries as a purple line, which draws a box out in the sea around Taiwan.
 * It is baked into the raster, so it cannot be styled away — the only fix is a
 * different source, and every one of those costs the Chinese labels. If that
 * trade ever needs revisiting, self-hosted vector tiles are the answer, because
 * then the style is ours.
 *
 * Not the default anywhere — see lib/maps/tile-source.ts. Production runs on it
 * as of 2026-09-02, set deliberately through MAPS_TILE_SOURCE, because the
 * Chinese place names matter more than the licensed tiles and Azure's basemap
 * does not offer zh-Hant labels. That is a choice about OpenStreetMap's tile
 * usage policy, which permits low-volume use and requires the attribution
 * below; it is revisited the moment this site has real traffic.
 */
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function SpotForm({ tileSource }: { tileSource: TileSource }) {
  const useAzure = tileSource === 'azure'
  const t = useTranslations('submit')
  const tp = useTranslations('places')
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)

  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [pending, setPending] = useState(false)

  // One way to place the pin, whether it came from a tap or from search. Two
  // copies of "set the state, then move or create the marker" is how the two
  // end up disagreeing about which one exists.
  const dropPin = useCallback((lng: number, lat: number) => {
    setPosition({ lng, lat })
    const instance = map.current
    if (!instance) return
    if (marker.current) marker.current.setLngLat([lng, lat])
    else marker.current = new Marker({ color: '#2f6b4f' }).setLngLat([lng, lat]).addTo(instance)
  }, [])

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
          sources: {
            azure: {
              type: 'raster',
              tiles: [useAzure ? AZURE_TILES : OSM_TILES],
              tileSize: 256,
              maxzoom: 18,
              ...(useAzure ? {} : { attribution: OSM_ATTRIBUTION }),
            },
          },
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
      instance.on('click', (event) => dropPin(event.lngLat.lng, event.lngLat.lat))

      map.current = instance
    }

    void start()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // The map is built once. `useAzure` is derived from a prop that does not
    // change while the form is open, and `dropPin` holds no state of its own, so
    // neither of these ever fires a rebuild — they are listed because they are
    // read inside.
  }, [useAzure, dropPin])

  async function onSubmit(formData: FormData) {
    setPending(true)
    try {
      setResult(await submitSpot(await shrinkPhotos(attachPhotos(formData, photos))))
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
        <h2 className={SECTION_TITLE}>{t('sectionWhere')}</h2>
        <p className={SECTION_NOTE}>{t('sectionWhereNote')}</p>

        <div className="mt-4">
          <PlaceSearch
            onSelect={(result) => {
              dropPin(result.lng, result.lat)
              map.current?.flyTo({ center: [result.lng, result.lat], zoom: 14 })
            }}
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <div ref={container} className="h-[300px] w-full sm:h-[380px]" />
        </div>

        <p className="mt-3 text-[13px] text-dim">
          {position ? (
            <>
              <span className="text-ink">{t('coordinates')}</span>{' '}
              <span className="font-mono tabular-nums">
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </span>
            </>
          ) : (
            t('noLocationYet')
          )}
        </p>
        <input type="hidden" name="lng" value={position?.lng ?? ''} />
        <input type="hidden" name="lat" value={position?.lat ?? ''} />

        <div className="mt-5">
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
        <button type="submit" disabled={pending} className={`${BUTTON_PRIMARY} w-full sm:w-auto`}>
          {pending ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  )
}
