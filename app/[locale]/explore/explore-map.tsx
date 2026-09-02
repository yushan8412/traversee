'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { LngLatBounds, MapLibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Link } from '../../../i18n/navigation'
import type { Activity, City } from '../../../lib/places/types'
import { regionOf, type Region } from '../../../lib/places/regions'
import type { TileSource } from '../../../lib/maps/tile-source'
import { ActivityIcon, activityIconMarkup } from '../activity-icon'

const AZURE_TILES =
  'https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}'
/**
 * Free stand-in for anywhere that is not production. See lib/maps/tile-source.
 *
 * Esri's Light Gray Canvas rather than OpenStreetMap's own tiles. The default
 * OSM style paints administrative and territorial boundaries as heavy purple
 * lines, which on this map drew a box in the sea around Taiwan, and its bright
 * greens and reds fight a palette built to let photographs be the only
 * saturated thing on a page.
 *
 * Carto's Positron was the first choice and is out: its tiles still answer
 * without a key, but they now come back stamped API KEY REQUIRED across every
 * one. Esri's needs no key. Note the {z}/{y}/{x} order, which is not the usual
 * one. Attribution is required and is declared on the source.
 */
const OSM_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const OSM_ATTRIBUTION = 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors'

/**
 * Room around the island when the map first frames it.
 *
 * Not a single number, because two things sit on top of the map: the site
 * header floats over the first sixty-odd pixels, and on a wide window the
 * filter panel owns the left three hundred and forty. Framed with even padding,
 * the northern pins landed between y −41 and +16 — half of them above the top
 * edge, the rest under the header — which is exactly where every place in the
 * catalogue currently is.
 */
function framePadding() {
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  return { padding: { top: 56, right: 48, bottom: 48, left: wide ? 380 : 48 } }
}

/** The same box the submission validator accepts; see lib/gpx/geo.ts. */
const COVERAGE: [[number, number], [number, number]] = [
  [119.3, 21.75],
  [122.1, 25.4],
]

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
  difficultyLabel: string | null
  /** Cover photograph, or a stand-in, or nothing. */
  photo: string | null
  metrics: string
  lng: number
  lat: number
}

interface Filters {
  activities: Set<Activity>
  regions: Set<Region>
  /**
   * Exact grades, not a ceiling. "3 or under" answered a question nobody asked:
   * someone who wants a hard walk has to select every band below it to get
   * there. Ticking the grades you want is both simpler to say and simpler to
   * read back.
   */
  difficulties: Set<number>
}

const DIFFICULTY_STEPS = [1, 2, 3, 4, 5]

function matches(pin: ExplorePin, filters: Filters): boolean {
  if (filters.activities.size > 0 && !pin.activities.some((a) => filters.activities.has(a))) {
    return false
  }
  if (filters.regions.size > 0) {
    const region = regionOf(pin.city)
    if (region === null || !filters.regions.has(region)) return false
  }
  // An ungraded place is not "easy" and it is not "hard" — it is unknown, so a
  // difficulty filter has nothing to test it against and it drops out. Hiding it
  // silently would be the wrong call, which is why the panel says how many.
  if (filters.difficulties.size > 0) {
    if (pin.difficulty === null || !filters.difficulties.has(pin.difficulty)) return false
  }
  return true
}

export function ExploreMap({
  pins,
  tileSource,
  activities,
  regions,
}: {
  pins: ExplorePin[]
  tileSource: TileSource
  activities: { key: Activity; label: string }[]
  /** Every region, with how many places each holds — including none. */
  regions: { key: Region; label: string; count: number }[]
}) {
  const t = useTranslations('explore')
  const tp = useTranslations('places')
  const locale = useLocale()
  // Memoised because the marker effect depends on it; rebuilt every render it
  // would rebuild every popup on every render.
  const detail = useMemo(
    () => ({ label: t('viewDetail'), noPhoto: t('noPhoto'), locale }),
    [t, locale],
  )
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const framed = useRef(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    activities: new Set(),
    regions: new Set(),
    difficulties: new Set(),
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
              ...(useAzure ? {} : { attribution: OSM_ATTRIBUTION }),
            },
          },
          layers: [{ id: 'base', type: 'raster', source: 'base' }],
        },
        // Opens on the whole island, framed by the coverage box rather than by
        // a centre and a zoom. A fixed zoom shows a different amount of Taiwan
        // on every window; fitting the bounds shows all of it on any of them.
        bounds: COVERAGE,
        fitBoundsOptions: framePadding(),
        attributionControl: { compact: true },
        // Padded well outside the coverage box. Set to the box exactly, MapLibre
        // has to keep the whole viewport inside it — and since a wide window at
        // this zoom is wider than Taiwan, it zoomed in to comply and opened on
        // the north with the rest of the island off screen.
        // Generous, because this is only the limit on panning, not the framing.
        // Set close to the coverage box it silently fought the initial fit: the
        // padding that keeps the island clear of the header and the filter panel
        // pushes the camera west, and a tight limit clamped it straight back.
        // Ocean tiles are nearly empty, so the extra room costs almost nothing.
        maxBounds: [
          [117.0, 20.0],
          [124.5, 27.5],
        ],
        minZoom: 5.5,
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
        // And frame the island again now the size is real. The constructor's
        // `bounds` was computed against whatever the container measured then,
        // which was wrong for the same reason — the map opened at roughly half
        // a degree of longitude, a twentieth of Taiwan, and the marker pass
        // below then zoomed to the northern cluster because nothing was in
        // view. Refitting here is what makes the first frame the whole island.
        instance.fitBounds(COVERAGE, { padding: framePadding().padding, duration: 0 })
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
      // Which activity the pin wears. A beach that is both a surf break and a
      // campsite shows the one being filtered for — otherwise filtering to
      // camping leaves a row of surfboards on the map.
      const lead =
        pin.activities.find((activity) => filters.activities.has(activity)) ??
        pin.activities[0] ??
        'hiking'

      const existing = markers.current.get(pin.slug)
      if (existing) {
        const element = existing.getElement()
        if (element.dataset.activity !== lead) {
          element.dataset.activity = lead
          element.innerHTML = activityIconMarkup(lead, 18)
        }
        continue
      }

      // A pin per activity rather than one green dot for everything. The
      // activity is the first thing anyone scanning the map wants, and a
      // uniform dot makes them click each one to find out.
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'tv-pin'
      element.dataset.activity = lead
      element.setAttribute('aria-label', `${pin.name} — ${pin.activityLabels.join(' · ')}`)
      element.innerHTML = activityIconMarkup(lead, 18)
      const marker = new Marker({ element })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(new Popup({ offset: 20, closeButton: false, maxWidth: 'none' }).setHTML(card(pin, detail)))
        .addTo(instance)
      markers.current.set(pin.slug, marker)
    }

    // The first pass never moves the camera. The map has just been framed on
    // the whole island, and refitting to wherever the pins happen to be undid
    // that immediately — it opened at zoom 12 on the northern cluster, which is
    // the `maxZoom` below, and that is how this was caught.
    if (!framed.current) {
      framed.current = true
      return
    }

    // After that, only move when the filter has left nothing to look at.
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
  }, [visible, ready, detail, filters.activities])

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const cleared =
    filters.activities.size === 0 && filters.regions.size === 0 && filters.difficulties.size === 0

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
              on={filters.difficulties.has(step)}
              onClick={() => setFilters((f) => ({ ...f, difficulties: toggle(f.difficulties, step) }))}
            >
              {t('grade', { value: step })}
            </Chip>
          ))}
          {/* Stated rather than left to be discovered. Most entries have no grade
              and a difficulty filter necessarily excludes them, which looks like
              a broken filter unless the page says so. */}
          {filters.difficulties.size > 0 && ungraded > 0 && (
            <p className="mt-2 w-full text-[11px] leading-relaxed text-dim">
              {t('ungradedHidden', { count: ungraded })}
            </p>
          )}
        </Group>

        <Group label={t('region')}>
          {/* All five are listed, including the empty ones, because the site now
              says it covers Taiwan and a panel offering only the north would
              quietly contradict that. The empty ones are shown as unavailable
              rather than as a click that returns nothing. */}
          {regions.map((region) => (
            <Chip
              key={region.key}
              on={filters.regions.has(region.key)}
              disabled={region.count === 0}
              title={region.count === 0 ? t('regionEmpty') : undefined}
              onClick={() => setFilters((f) => ({ ...f, regions: toggle(f.regions, region.key) }))}
            >
              {region.label}
              <span className="opacity-60">{region.count}</span>
            </Chip>
          ))}
        </Group>

        {!cleared && (
          <button
            type="button"
            onClick={() =>
              setFilters({ activities: new Set(), regions: new Set(), difficulties: new Set() })
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
  disabled,
  title,
  children,
}: {
  on: boolean
  onClick: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        on
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-paper text-ink enabled:hover:border-brand/50'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * The popup takes an HTML string, so every value interpolated into it is
 * escaped. Place names and summaries are submitted content, and MapLibre offers
 * no element-based popup that would make this structural.
 */
function card(pin: ExplorePin, detail: { label: string; noPhoto: string; locale: string }): string {
  const dots = Array.from(
    { length: DIFFICULTY_STEPS.length },
    (_, step) => `<i class="${pin.difficulty !== null && step < pin.difficulty ? 'on' : ''}"></i>`,
  ).join('')

  return `<div class="tv-card">
  ${
    pin.photo
      ? `<img src="${escapeHtml(pin.photo)}" alt="">`
      : `<div class="tv-card-empty">${escapeHtml(detail.noPhoto)}</div>`
  }
  <div class="tv-card-body">
    <span class="tv-card-name">${escapeHtml(pin.name)}</span>
    <div class="tv-card-meta">${escapeHtml([pin.cityLabel, ...pin.activityLabels].join(' · '))}</div>
    <div class="tv-card-facts">
      <span>${escapeHtml(pin.metrics)}</span>
      ${
        pin.difficultyLabel
          ? `<span><span class="tv-dots">${dots}</span> ${escapeHtml(pin.difficultyLabel)}</span>`
          : ''
      }
    </div>
    <a href="/${escapeHtml(detail.locale)}/places/${escapeHtml(pin.slug)}">${escapeHtml(detail.label)} →</a>
  </div>
</div>`
}

/** The popup takes HTML, and a place name is user-submitted content. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  )
}
