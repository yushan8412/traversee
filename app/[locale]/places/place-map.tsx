'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  LngLatBounds,
  MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LineString, Point } from '../../../lib/places/types'

// Verified against the account rather than taken from documentation: at this
// api-version the tileset answers with 256px PNG tiles, so a raster source is
// correct here and a hand-written vector style would be wasted work.
const TILE_URL =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'

// maplibre-gl resolves its worker through import.meta.url, which Next's bundler
// rewrites to a build-machine file:// path. The request then falls through to
// Next's catch-all and comes back as page HTML with a 200, so the worker never
// starts and every GeoJSON source hangs — while raster tiles keep working,
// because those load on the main thread. Pointing at the copy that
// scripts/copy-maplibre-worker.mjs places in public/ avoids the guesswork.
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

interface MapCredentials {
  token: string
  clientId: string
}

export interface MapMarker {
  slug: string
  name: string
  point: Point
}

export function PlaceMap({
  markers,
  geometry,
  className,
}: {
  markers: MapMarker[]
  /** Drawn only where the caller already holds it — the list query omits it on purpose. */
  geometry?: LineString | Point | null
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [failed, setFailed] = useState(false)
  const t = useTranslations('places')

  useEffect(() => {
    if (!container.current || map.current) return
    let cancelled = false

    async function start() {
      let credentials: MapCredentials
      try {
        const response = await fetch('/api/maps-token')
        if (!response.ok) throw new Error(`token endpoint responded ${response.status}`)
        credentials = (await response.json()) as MapCredentials
      } catch {
        // The map is an enhancement; the page's information is all in the text
        // beside it. Failing quietly to a note beats an error overlay.
        if (!cancelled) setFailed(true)
        return
      }
      if (cancelled || !container.current) return

      // The track is declared in the style rather than added on the `load`
      // event. Adding it later worked in principle and did not in practice, and
      // the runtime path had more places to fail than could be checked without a
      // browser: event ordering, a swallowed exception, a source added before
      // the style settled. Declared here there is no ordering to get wrong.
      const track =
        geometry?.type === 'LineString'
          ? {
              // Coordinates are copied rather than passed through. They arrive
              // deserialised from the server payload, and MapLibre hands source
              // data to a worker, so plain arrays remove any question about what
              // survives that boundary.
              type: 'FeatureCollection' as const,
              features: [
                {
                  type: 'Feature' as const,
                  properties: {},
                  geometry: {
                    type: 'LineString' as const,
                    coordinates: geometry.coordinates.map(([lng, lat]) => [lng, lat]),
                  },
                },
              ],
            }
          : null

      const instance = new MapLibreMap({
        container: container.current,
        style: {
          version: 8,
          sources: {
            azure: { type: 'raster', tiles: [TILE_URL], tileSize: 256, maxzoom: 18 },
            ...(track ? { track: { type: 'geojson' as const, data: track } } : {}),
          },
          layers: [
            { id: 'azure', type: 'raster', source: 'azure' },
            ...(track
              ? [
                  {
                    id: 'track',
                    type: 'line' as const,
                    source: 'track',
                    paint: { 'line-color': '#2f6b4f', 'line-width': 4 },
                    layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const },
                  },
                ]
              : []),
          ],
        },
        center: markers[0]?.point.coordinates ?? [121.56, 25.05],
        zoom: markers.length === 1 ? 12 : 9,
        attributionControl: { compact: true },
        // Every tile request carries the short-lived token. The credential never
        // reaches the tile URL itself, so it cannot end up in a browser history
        // entry, a referrer header, or a shared link.
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

      // Without this, a style or source failure is silent: the basemap and the
      // markers still appear, so the map looks fine while a layer is missing.
      // That is exactly how the track went unnoticed the first time.
      instance.on('error', (event) => {
        console.error('MapLibre error', event.error ?? event)
      })

      instance.on('load', () => {
        for (const marker of markers) {
          new Marker({ color: '#2f6b4f' })
            .setLngLat(marker.point.coordinates)
            .setPopup(new Popup({ offset: 24 }).setText(marker.name))
            .addTo(instance)
        }

        const points = [
          ...markers.map((m) => m.point.coordinates),
          ...(geometry?.type === 'LineString' ? geometry.coordinates : []),
          ...(geometry?.type === 'Point' ? [geometry.coordinates] : []),
        ]
        if (points.length > 1) {
          const bounds = points.reduce(
            (acc, point) => acc.extend(point),
            new LngLatBounds(points[0], points[0]),
          )
          instance.fitBounds(bounds, { padding: 48, maxZoom: 14, animate: false })
        }
      })

      map.current = instance
    }

    void start()

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [markers, geometry])

  if (failed) {
    return (
      <div className={`rounded border border-line bg-panel p-5 text-sm text-dim ${className ?? ''}`}>
        {t('map.unavailable')}
      </div>
    )
  }

  return <div ref={container} className={`rounded border border-line ${className ?? ''}`} />
}
