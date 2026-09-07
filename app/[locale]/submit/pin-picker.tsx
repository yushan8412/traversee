'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { TileSource } from '../../../lib/maps/tile-source'
import type { City } from '../../../lib/places/types'
import { PlaceSearch } from './place-search'

/**
 * MapLibre fetches its worker as a module, and Static Web Apps served it as
 * `application/octet-stream` until this was pointed at a copy under `public`.
 * The basemap renders either way; every GeoJSON layer silently never appears.
 */
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

const AZURE_TILES =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'

/**
 * OpenStreetMap's own tiles, chosen for their labels: Azure's basemap has no
 * zh-Hant place names, and Chinese place names matter more here than licensed
 * tiles do. See lib/maps/tile-source.ts for where that decision is recorded.
 */
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * Putting a point on the map, for whoever is filing or correcting an entry.
 *
 * Extracted out of the submission form when the edit page needed the same
 * thing. Copying it would have been the fifth time something on this codebase
 * existed twice and one copy drifted — counties lived in four files, activities
 * in four, and the photo size limit in a sentence that went stale.
 */
export function PinPicker({
  tileSource,
  initial,
  onCityGuess,
  onMove,
}: {
  tileSource: TileSource
  /** Where the pin already is, for an entry being corrected. */
  initial?: { lng: number; lat: number } | null
  /** A county the geocoder named. Never fires for a pin placed by tapping. */
  onCityGuess?: (city: City) => void
  /** Fires on every placement, so a caller can flag a stale county. */
  onMove?: () => void
}) {
  const useAzure = tileSource === 'azure'
  const t = useTranslations('submit')
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)

  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(initial ?? null)
  // Captured once, on purpose. The map effect below reads this, and depending
  // on the prop object itself would rebuild the map — refetching every tile —
  // on any parent render that happened to produce a new object.
  const [startsAt] = useState(() => initial ?? null)
  // `PlaceSearch` calls an administrator-only endpoint while `canEdit` admits
  // the submitter, so a contributor correcting their own entry is answered 403.
  // The box withdraws and the map still takes a tap, rather than leaving a
  // control that looks live and always fails.
  const [searchable, setSearchable] = useState(true)

  // Held in a ref so the map effect below does not depend on them, which would
  // rebuild the map — and refetch every tile — on each parent render. That
  // exact bug once spent two thirds of a month's tile grant in one afternoon.
  const callbacks = useRef({ onMove })
  callbacks.current = { onMove }

  // One way to place the pin, whether it came from a tap or from search. Two
  // copies of "set the state, then move or create the marker" is how the two
  // end up disagreeing about which one exists.
  const dropPin = useCallback((lng: number, lat: number) => {
    setPosition({ lng, lat })
    callbacks.current.onMove?.()
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
        // An entry being corrected opens on the pin it already has; a new one
        // opens on the north, where most of the catalogue currently is.
        center: startsAt ? [startsAt.lng, startsAt.lat] : [121.56, 25.05],
        zoom: startsAt ? 14 : 9,
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

      // The marker for a pin that was already there. Placed directly rather
      // than through dropPin, which would report a move that nobody made and
      // flag the county as needing confirmation on load.
      if (startsAt) {
        marker.current = new Marker({ color: '#2f6b4f' })
          .setLngLat([startsAt.lng, startsAt.lat])
          .addTo(instance)
      }
    }

    void start()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // The map is built once. `useAzure` and `startsAt` come from props that do
    // not change while the form is open and `dropPin` holds no state of its
    // own, so none of these fires a rebuild — they are listed because they are
    // read inside.
  }, [useAzure, dropPin, startsAt])

  return (
    <>
      {searchable && (
        <div className="mt-4">
          <PlaceSearch
            onSelect={(result) => {
              dropPin(result.lng, result.lat)
              map.current?.flyTo({ center: [result.lng, result.lat], zoom: 14 })
              // Free: the call was already made and the county was already in
              // the response. Null for a national park, which names no county —
              // the form then asks rather than guessing.
              if (result.city) onCityGuess?.(result.city)
            }}
            onUnavailable={() => setSearchable(false)}
          />
        </div>
      )}

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
    </>
  )
}
