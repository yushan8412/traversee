'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { LineString, Point } from '../../../lib/places/types'

// Verified against the account rather than taken from documentation: at this
// api-version the tileset answers with 256px PNG tiles, so a raster source is
// correct here and a hand-written vector style would be wasted work.
const TILE_URL =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'

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

      const instance = new MapLibreMap({
        container: container.current,
        style: {
          version: 8,
          sources: {
            azure: { type: 'raster', tiles: [TILE_URL], tileSize: 256, maxzoom: 18 },
          },
          layers: [{ id: 'azure', type: 'raster', source: 'azure' }],
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

      instance.on('load', () => {
        if (geometry?.type === 'LineString') {
          instance.addSource('track', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } })
          instance.addLayer({
            id: 'track',
            type: 'line',
            source: 'track',
            paint: { 'line-color': '#2f6b4f', 'line-width': 4 },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          })
        }

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
