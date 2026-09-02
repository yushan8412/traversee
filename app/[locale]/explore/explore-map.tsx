'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Link } from '../../../i18n/navigation'
import type { Activity, City } from '../../../lib/places/types'
import type { TileSource } from '../../../lib/maps/tile-source'
import { ActivityIcon } from '../activity-icon'

const AZURE_TILES =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

export interface ExplorePin {
  slug: string
  name: string
  city: City
  cityLabel: string
  kind: string
  activities: Activity[]
  activityLabels: string[]
  /** The activity it leads with, or null where nobody has graded it. */
  difficulty: number | null
  metrics: string
  lng: number
  lat: number
}

interface Filters {
  activities: Set<Activity>
  cities: Set<City>
  /** Upper bound. `null` means difficulty is not being filtered on at all. */
  maxDifficulty: number | null
}

const DIFFICULTY_STEPS = [1, 2, 3, 4, 5]

function matches(pin: ExplorePin, filters: Filters): boolean {
  if (filters.activities.size > 0 && !pin.activities.some((a) => filters.activities.has(a))) {
    return false
  }
  if (filters.cities.size > 0 && !filters.cities.has(pin.city)) return false
  // An ungraded place is not "easy" and it is not "hard" — it is unknown, so a
  // difficulty filter has nothing to test it against and it drops out. Hiding it
  // silently would be the wrong call, which is why the panel says how many.
  if (filters.maxDifficulty !== null) {
    if (pin.difficulty === null || pin.difficulty > filters.maxDifficulty) return false
  }
  return true
}

export function ExploreMap({
  pins,
  tileSource,
  activities,
  cities,
}: {
  pins: ExplorePin[]
  tileSource: TileSource
  activities: { key: Activity; label: string }[]
  cities: { key: City; label: string }[]
}) {
  const t = useTranslations('explore')
  const tp = useTranslations('places')
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    activities: new Set(),
    cities: new Set(),
    maxDifficulty: null,
  })

  const visible = useMemo(() => pins.filter((pin) => matches(pin, filters)), [pins, filters])
  const ungraded = useMemo(() => pins.filter((pin) => pin.difficulty === null).length, [pins])

  /**
   * The map is built exactly once.
   *
   * This is the whole reason the explore page does not reuse `PlaceMap`, whose
   * effect is keyed on its data: there, changing what is shown tears the map
   * down and builds a new one, and a new map refetches every tile. Measured on
   * 2026-09-02, that is 27 requests — so ten clicks on a filter would cost what
   * a whole visit costs, against a grant of 5,000 billable transactions a month.
   * Here the basemap is untouched by filtering and only the markers move.
   */
  useEffect(() => {
    if (!container.current || map.current) return
    let cancelled = false
    const useAzure = tileSource === 'azure'

    async function start() {
      let credentials = { token: '', clientId: '' }
      if (useAzure) {
        try {
          const response = await fetch('/api/maps-token')
          if (!response.ok) throw new Error(String(response.status))
          credentials = (await response.json()) as typeof credentials
        } catch {
          if (!cancelled) setFailed(true)
          return
        }
      }
      if (cancelled || !container.current) return

      const instance = new MapLibreMap({
        container: container.current,
        style: {
          version: 8,
          sources: {
            base: {
              type: 'raster',
              tiles: [useAzure ? AZURE_TILES : OSM_TILES],
              tileSize: 256,
              maxzoom: 18,
            },
          },
          layers: [{ id: 'base', type: 'raster', source: 'base' }],
        },
        center: [120.98, 23.7],
        zoom: 7,
        attributionControl: { compact: true },
        maxBounds: [
          [119.3, 21.75],
          [122.1, 25.4],
        ],
        minZoom: 6.5,
        maxZoom: 17,
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
      instance.on('error', (event) => console.error('MapLibre error', event.error ?? event))
      map.current = instance
      // Markers are added by the effect below, which cannot run usefully until
      // the map object exists. Without this flag it races and adds nothing.
      instance.on('load', () => {
        if (cancelled) return
        // The container is sized by the layout, and MapLibre reads that size
        // once at construction. If it measures zero it silently falls back to a
        // 300px canvas and the map is simply blank — tiles fetched, nothing
        // drawn. Asking for a resize after load costs nothing and removes the
        // race entirely.
        instance.resize()
        setReady(true)
      })
    }

    void start()
    const placed = markers.current
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      placed.clear()
    }
  }, [tileSource])

  // Markers are reconciled against what is already on the map rather than
  // cleared and rebuilt, so a filter that changes one pin moves one pin.
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const wanted = new Set(visible.map((pin) => pin.slug))

    for (const [slug, marker] of markers.current) {
      if (!wanted.has(slug)) {
        marker.remove()
        markers.current.delete(slug)
      }
    }

    for (const pin of visible) {
      if (markers.current.has(pin.slug)) continue
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'tv-pin'
      element.setAttribute('aria-label', pin.name)
      const marker = new Marker({ element })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(
          new Popup({ offset: 18, closeButton: false }).setHTML(
            `<strong>${escapeHtml(pin.name)}</strong><br>${escapeHtml(
              [pin.cityLabel, ...pin.activityLabels].join(' · '),
            )}<br>${escapeHtml(pin.metrics)}`,
          ),
        )
        .addTo(instance)
      markers.current.set(pin.slug, marker)
    }

    // Only move the map when the filter has left nothing to look at.
    //
    // Fitting the bounds on every change looked helpful and cost 26 tile
    // requests a click — as much as building the map from scratch — because a
    // new viewport is a new set of tiles. It also yanked the view around while
    // someone was still ticking boxes. If a match is already on screen, the
    // right amount of movement is none.
    if (visible.length === 0) return
    const inView = instance.getBounds()
    if (visible.some((pin) => inView.contains([pin.lng, pin.lat]))) return

    const bounds = new LngLatBounds()
    visible.forEach((pin) => bounds.extend([pin.lng, pin.lat]))
    instance.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 500 })
  }, [visible, ready])

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const cleared =
    filters.activities.size === 0 && filters.cities.size === 0 && filters.maxDifficulty === null

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <div ref={container} className="absolute inset-0 h-full w-full" />

      {failed && (
        <div className="absolute inset-0 grid place-items-center bg-panel px-6 text-center text-sm text-dim">
          {tp('map.unavailable')}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        className="absolute left-4 top-4 z-20 rounded-full bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-[0_10px_30px_-18px_rgb(31,42,36/0.6)] lg:hidden"
      >
        {panelOpen ? t('hideFilters') : t('showFilters')}
      </button>

      <aside
        className={`absolute left-4 top-4 z-10 w-[min(20rem,calc(100%-2rem))] overflow-y-auto rounded-[1.5rem] bg-paper/95 p-5 shadow-[0_20px_50px_-30px_rgb(31,42,36/0.7)] backdrop-blur lg:max-h-[calc(100%-2rem)] ${
          panelOpen ? 'top-20 max-h-[60vh]' : 'hidden lg:block'
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-xl">{t('title')}</h1>
          <span className="text-xs text-dim">{t('showing', { count: visible.length })}</span>
        </div>

        <Group label={t('activity')}>
          {activities.map((activity) => {
            const on = filters.activities.has(activity.key)
            return (
              <Chip
                key={activity.key}
                on={on}
                onClick={() =>
                  setFilters((f) => ({ ...f, activities: toggle(f.activities, activity.key) }))
                }
              >
                <ActivityIcon activity={activity.key} size={14} />
                {activity.label}
              </Chip>
            )
          })}
        </Group>

        <Group label={t('difficulty')}>
          {DIFFICULTY_STEPS.map((step) => (
            <Chip
              key={step}
              on={filters.maxDifficulty === step}
              onClick={() =>
                setFilters((f) => ({ ...f, maxDifficulty: f.maxDifficulty === step ? null : step }))
              }
            >
              {t('upTo', { value: step })}
            </Chip>
          ))}
          {/* Stated rather than left to be discovered. Most entries have no grade
              and a difficulty filter necessarily excludes them, which looks like
              a broken filter unless the page says so. */}
          {filters.maxDifficulty !== null && ungraded > 0 && (
            <p className="mt-2 w-full text-[11px] leading-relaxed text-dim">
              {t('ungradedHidden', { count: ungraded })}
            </p>
          )}
        </Group>

        <Group label={t('region')}>
          {cities.map((city) => (
            <Chip
              key={city.key}
              on={filters.cities.has(city.key)}
              onClick={() => setFilters((f) => ({ ...f, cities: toggle(f.cities, city.key) }))}
            >
              {city.label}
            </Chip>
          ))}
        </Group>

        {!cleared && (
          <button
            type="button"
            onClick={() =>
              setFilters({ activities: new Set(), cities: new Set(), maxDifficulty: null })
            }
            className="mt-5 text-xs text-brandInk underline decoration-brand/40 underline-offset-4"
          >
            {t('clear')}
          </button>
        )}

        {visible.length === 0 && (
          <p className="mt-5 rounded-2xl bg-panel p-3 text-xs leading-relaxed text-dim">
            {t('noMatches')}
          </p>
        )}

        <ul className="mt-5 space-y-1 border-t border-line pt-4">
          {visible.map((pin) => (
            <li key={pin.slug}>
              <Link
                href={`/places/${pin.slug}`}
                className="block rounded-xl px-2 py-1.5 text-sm text-ink no-underline hover:bg-panel"
              >
                {pin.name}
                <span className="ml-2 text-xs text-dim">{pin.cityLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-dim">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        on
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-paper text-ink hover:border-brand/50'
      }`}
    >
      {children}
    </button>
  )
}

/** The popup takes HTML, and a place name is user-submitted content. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )
}
