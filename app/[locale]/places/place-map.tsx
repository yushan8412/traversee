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
import type { TileSource } from '../../../lib/maps/tile-source'

// Verified against the account rather than taken from documentation: at this
// api-version the tileset answers with 256px PNG tiles, so a raster source is
// correct here and a hand-written vector style would be wasted work.
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
  tileSource,
}: {
  /** Decided on the server; see lib/maps/tile-source.ts for why. */
  tileSource: TileSource
  markers: MapMarker[]
  /** Drawn only where the caller already holds it — the list query omits it on purpose. */
  geometry?: LineString | Point | null
  className?: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [failed, setFailed] = useState(false)
  const t = useTranslations('places')

  // Depending on the props directly ties the effect to object identity, so any
  // re-render tears the map down and builds a new one — and a new map refetches
  // every tile. On 2026-08-31 that produced bursts of nearly ten thousand tile
  // requests a minute, roughly 150 a second, against a free grant of 5,000
  // billable transactions for the entire month.
  //
  // Keying on the serialised content instead means the map is rebuilt when the
  // data actually differs and not when React merely hands over a new array.
  const useAzure = tileSource === 'azure'
  const dataKey = JSON.stringify({ markers, geometry, tileSource })
  const latest = useRef({ markers, geometry })
  latest.current = { markers, geometry }

  useEffect(() => {
    const { markers, geometry } = latest.current
    if (!container.current || map.current) return
    let cancelled = false

    async function start() {
      // Only Azure's tiles need a credential. Minting one for OpenStreetMap
      // would be a pointless round trip, and it would make the map depend on
      // Azure being configured at all — which is the opposite of what the
      // development tile source is for.
      let credentials: MapCredentials = { token: '', clientId: '' }
      if (useAzure) {
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
            azure: {
              type: 'raster',
              tiles: [useAzure ? AZURE_TILES : OSM_TILES],
              tileSize: 256,
              maxzoom: 18,
              ...(useAzure ? {} : { attribution: OSM_ATTRIBUTION }),
            },
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
        // The site covers Taipei, New Taipei and Keelung, so panning to another
        // continent serves nobody and every pan costs tile requests against a
        // grant of 5,000 billable transactions a month. Bounding the map is a
        // product decision that happens to cap the worst case.
        maxBounds: [
          [119.3, 21.75],
          [122.1, 25.4],
        ],
        minZoom: 7,
        maxZoom: 17,
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
  }, [dataKey, useAzure])

  if (failed) {
    return (
      <div className={`rounded border border-line bg-panel p-5 text-sm text-dim ${className ?? ''}`}>
        {t('map.unavailable')}
      </div>
    )
  }

  return <div ref={container} className={`rounded border border-line ${className ?? ''}`} />
}
