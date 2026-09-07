# Replacing a place's geometry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a posted entry's location be replaced wholesale — a spot's pin re-dropped, a route's GPX swapped, and either turned into the other — without touching the fields the edit whitelist exists to guard.

**Architecture:** `applyEdit` gains one optional `GeometryReplacement`; absent means today's behaviour exactly. The map picker and the GPX picker are extracted out of the two submission forms so the edit page composes the same components rather than a second copy. County is auto-filled from the administrative district already present in the geocoding response the submit page pays for.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, MapLibre GL, Azure Maps geocoding, Azure Blob Storage, next-intl.

**Spec:** [`docs/specs/2026-09-07-replacing-geometry-design.md`](../specs/2026-09-07-replacing-geometry-design.md)

**Run tests with:** `npm test` (node 22 — `nvm use` reads `.nvmrc`)

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `lib/places/editing.ts` | `GeometryReplacement`, `applyEdit` transitions | Modify |
| `lib/places/types.ts` | `AZURE_DISTRICTS` beside `CITIES` | Modify |
| `lib/maps/search.ts` | Surface the district on `SearchResult` | Modify |
| `lib/storage/blob.ts` | Generalise `uploadToPending` → `upload(container, …)` | Modify |
| `app/[locale]/submit/pin-picker.tsx` | Map + search + lng/lat, reusable | Create |
| `app/[locale]/submit/gpx-picker.tsx` | File input + client preview, reusable | Create |
| `app/[locale]/submit/spot-form.tsx` | Compose `PinPicker` instead of owning a map | Modify |
| `app/[locale]/submit/route-form.tsx` | Compose `GpxPicker` instead of owning the field | Modify |
| `app/[locale]/places/[slug]/edit/geometry-section.tsx` | Collapsed "location" block | Create |
| `app/[locale]/places/[slug]/edit/edit-form.tsx` | Render the section | Modify |
| `app/[locale]/places/[slug]/edit/actions.ts` | Parse, upload, save, delete old | Modify |
| `app/[locale]/places/[slug]/edit/page.tsx` | Pass current geometry + tile source | Modify |
| `messages/{zh,en}.json` | New keys under `edit` | Modify |

---

## Task 1: `applyEdit` accepts a geometry replacement

**Files:**
- Modify: `lib/places/editing.ts`
- Test: `lib/places/editing.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/places/editing.test.ts` (the file already builds a `Place` fixture — reuse its existing helper rather than adding a second one):

```ts
describe('applyEdit with a geometry replacement', () => {
  it('leaves geometry, startPoint and route alone when no replacement is given', () => {
    const before = routePlace()
    const after = applyEdit(before, edit, NOW)
    expect(after.geometry).toEqual(before.geometry)
    expect(after.startPoint).toEqual(before.startPoint)
    expect(after.route).toEqual(before.route)
    expect(after.kind).toBe('route')
  })

  it('moves a spot to a new point', () => {
    const after = applyEdit(
      spotPlace(),
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.kind).toBe('spot')
    expect(after.geometry).toEqual({ type: 'Point', coordinates: [121.7, 25.1] })
    expect(after.startPoint).toEqual({ type: 'Point', coordinates: [121.7, 25.1] })
    expect(after.route).toBeNull()
  })

  it('turns a spot into a route, taking the metrics from the track', () => {
    const after = applyEdit(
      spotPlace(),
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/new.gpx' } },
      NOW,
    )
    expect(after.kind).toBe('route')
    expect(after.geometry).toEqual(aTrack().geometry)
    expect(after.startPoint).toEqual(aTrack().startPoint)
    expect(after.route).toEqual({
      distanceKm: aTrack().distanceKm,
      elevationGainM: aTrack().elevationGainM,
      duration: aTrack().duration,
      gpxPath: 'gpx/new.gpx',
    })
  })

  it('turns a route into a spot, and drops the metrics that described a line', () => {
    const after = applyEdit(
      routePlace(),
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.kind).toBe('spot')
    expect(after.geometry.type).toBe('Point')
    // A spot carrying route metrics is what `spot-cannot-have-route-metrics`
    // refuses; nulling it here is what keeps the edit valid.
    expect(after.route).toBeNull()
  })

  it('replaces one track with another', () => {
    const after = applyEdit(
      routePlace(),
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/second.gpx' } },
      NOW,
    )
    expect(after.route?.gpxPath).toBe('gpx/second.gpx')
    expect(after.route?.distanceKm).toBe(aTrack().distanceKm)
  })

  it('does not touch approach, even when the kind changes', () => {
    const before = { ...spotPlace(), approach: anApproach() }
    const after = applyEdit(
      before,
      { ...edit, geometry: { kind: 'route', summary: aTrack(), gpxPath: 'gpx/new.gpx' } },
      NOW,
    )
    // Nothing in the app can write `approach` yet, so inventing a rule for it
    // here would be a guess. Pinned so the omission stays deliberate.
    expect(after.approach).toEqual(anApproach())
  })

  it('still refuses to touch what the whitelist guards', () => {
    const before = routePlace()
    const after = applyEdit(
      before,
      { ...edit, geometry: { kind: 'spot', lng: 121.7, lat: 25.1 } },
      NOW,
    )
    expect(after.slug).toBe(before.slug)
    expect(after.status).toBe(before.status)
    expect(after.submittedBy).toBe(before.submittedBy)
    expect(after.photos).toEqual(before.photos)
  })
})
```

Add the fixtures the tests above need, near the top of the file. The existing
`place` const is a partial spot cast with `as unknown as Place` and carries no
geometry, so both fixtures below fill that in rather than relying on it:

```ts
const NOW = '2026-09-07T00:00:00.000Z'

const spotPlace = () =>
  ({
    ...place,
    kind: 'spot',
    geometry: { type: 'Point', coordinates: [121.52, 25.17] },
    startPoint: { type: 'Point', coordinates: [121.52, 25.17] },
    route: null,
    approach: null,
    photos: [],
  }) as unknown as Place

const routePlace = () =>
  ({
    ...place,
    kind: 'route',
    geometry: { type: 'LineString', coordinates: [[121.4, 25.0], [121.5, 25.1]] },
    startPoint: { type: 'Point', coordinates: [121.4, 25.0] },
    route: {
      distanceKm: 12.3,
      elevationGainM: 540,
      duration: { minMinutes: 200, maxMinutes: 240, basis: 'gpx' },
      gpxPath: 'gpx/original.gpx',
    },
    approach: null,
    photos: [],
  }) as unknown as Place

const aTrack = (): TrackSummary => ({
  distanceKm: 8.4,
  elevationGainM: 320,
  duration: { minMinutes: 150, maxMinutes: 180, basis: 'gpx' },
  geometry: { type: 'LineString', coordinates: [[121.5, 25.1], [121.6, 25.2]] },
  startPoint: { type: 'Point', coordinates: [121.5, 25.1] },
})

const anApproach = () => ({
  distanceKm: 1.2,
  elevationGainM: 60,
  duration: { minMinutes: 25, maxMinutes: 30, basis: 'gpx' as const },
  gpxPath: 'gpx/approach.gpx',
  geometry: { type: 'LineString' as const, coordinates: [[121.4, 25.0], [121.45, 25.05]] },
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- editing`
Expected: FAIL — `geometry` is not a property of `PlaceEdit`.

- [ ] **Step 3: Implement**

In `lib/places/editing.ts`, add the type and extend `PlaceEdit`:

```ts
import type { TrackSummary } from './route-submission'

/**
 * A whole new shape for an entry, never a partial adjustment.
 *
 * Yulia's rule, 2026-09-07: replacing a location means discarding the old one.
 * There is no vertex editing and no nudging a pin, so this carries everything
 * needed to rebuild the geometry from nothing — which is also why it can move
 * an entry between kinds.
 *
 * Absent means the geometry is not being touched at all, which is the case for
 * every edit that is only fixing words.
 */
export type GeometryReplacement =
  | { kind: 'spot'; lng: number; lat: number }
  | { kind: 'route'; summary: TrackSummary; gpxPath: string }
```

Add `geometry?: GeometryReplacement` to `PlaceEdit`, then extend `applyEdit`:

```ts
export function applyEdit(place: Place, edit: PlaceEdit, now: string): Place {
  const edited: Place = {
    ...place,
    city: edit.city,
    activities: edit.activities,
    name: { zh: orNull(edit.nameZh), en: orNull(edit.nameEn) },
    summary: { zh: orNull(edit.summaryZh), en: orNull(edit.summaryEn) },
    description: { zh: orNull(edit.descriptionZh), en: orNull(edit.descriptionEn) },
    updatedAt: now,
  }

  return edit.geometry ? replaceGeometry(edited, edit.geometry) : edited
}

/**
 * The four transitions, as one function rather than four branches at the call
 * site. `approach` is deliberately absent from both cases — see the spec.
 */
function replaceGeometry(place: Place, replacement: GeometryReplacement): Place {
  if (replacement.kind === 'spot') {
    const point: Point = {
      type: 'Point',
      coordinates: [replacement.lng, replacement.lat],
    }
    return {
      ...place,
      kind: 'spot',
      geometry: point,
      startPoint: point,
      // Distance and elevation gain describe travelling a line. Carrying them
      // onto a point is precisely what `spot-cannot-have-route-metrics` refuses.
      route: null,
    }
  }

  const { summary, gpxPath } = replacement
  return {
    ...place,
    kind: 'route',
    geometry: summary.geometry,
    startPoint: summary.startPoint,
    route: {
      distanceKm: summary.distanceKm,
      elevationGainM: summary.elevationGainM,
      // Replaced wholesale, including into "unknown" when the new file carries
      // no timestamps. The form says so before the save rather than after.
      duration: summary.duration,
      gpxPath,
    },
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- editing`
Expected: PASS.

- [ ] **Step 5: Add the safety-net test and run the whole suite**

In `lib/places/validate.test.ts`, record that the validator catches a botched transition:

```ts
it('refuses a spot that kept the metrics of the route it used to be', () => {
  const place = { ...spotFixture(), route: { distanceKm: 8, elevationGainM: 300,
    duration: { minMinutes: 100, maxMinutes: 120, basis: 'gpx' as const }, gpxPath: 'gpx/old.gpx' } }
  expect(validateSubmission(place).map((e) => e.code)).toContain('spot-cannot-have-route-metrics')
})
```

Run: `npm test`
Expected: PASS, with the new tests included.

- [ ] **Step 6: Commit**

```bash
git add lib/places/editing.ts lib/places/editing.test.ts lib/places/validate.test.ts
git commit -m "feat: an edit can replace a place's shape, not just its words"
```

---

## Task 2: County follows a searched place

**Files:**
- Modify: `lib/places/types.ts`, `lib/maps/search.ts`
- Test: `lib/places/vocabulary.test.ts`, `lib/maps/search.test.ts`

- [ ] **Step 1: Confirm the field name against a real response**

Do not infer it from documentation. With the dev server running and signed in as an administrator:

```bash
curl -s 'http://localhost:3000/api/place-search?q=陽明山' -b "$COOKIE" | python3 -m json.tool | head -40
```

Then temporarily log the raw Azure payload in `app/api/place-search/route.ts` to read `properties.address` in full. Record the real key in a comment on `AZURE_DISTRICTS` and remove the logging before committing.

- [ ] **Step 2: Write the failing tests**

In `lib/places/vocabulary.test.ts`:

```ts
describe('AZURE_DISTRICTS', () => {
  it('can reach every county the site files entries under', () => {
    const reachable = new Set(Object.values(AZURE_DISTRICTS))
    for (const city of CITIES) expect(reachable).toContain(city)
  })

  it('maps to nothing outside CITIES', () => {
    for (const city of Object.values(AZURE_DISTRICTS)) {
      expect(CITIES).toContain(city)
    }
  })
})
```

In `lib/maps/search.test.ts`:

```ts
it('carries the county through, so the form does not have to be told twice', () => {
  const results = readSearchResults(payloadWith({ district: '宜蘭縣', lng: 121.75, lat: 24.7 }))
  expect(results[0]!.city).toBe('yilan')
})

it('returns the result even when the response carries no district', () => {
  const results = readSearchResults(payloadWith({ district: undefined, lng: 121.5, lat: 25.05 }))
  expect(results).toHaveLength(1)
  expect(results[0]!.city).toBeNull()
})
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm test -- vocabulary search`
Expected: FAIL — `AZURE_DISTRICTS` is not exported; `city` is not on `SearchResult`.

- [ ] **Step 4: Implement**

In `lib/places/types.ts`, directly beneath `CITIES`:

```ts
/**
 * What Azure's geocoder calls each county, mapped onto what we call it.
 *
 * This is another hand-written list keyed to `CITIES`, which is the shape that
 * has broken this codebase repeatedly — counties once lived in four files and
 * three were stale. It cannot derive from `CITIES` because the strings are the
 * geocoder's, not ours, so the drift is caught by test instead: every county
 * must be reachable through this table, and nothing may map outside it.
 *
 * Both the Traditional-Chinese and English forms are listed because the search
 * endpoint asks for `zh-Hant` and Azure answers in English for some entries.
 */
export const AZURE_DISTRICTS: Record<string, City> = {
  臺北市: 'taipei', 台北市: 'taipei', 'Taipei City': 'taipei',
  新北市: 'newTaipei', 'New Taipei City': 'newTaipei',
  基隆市: 'keelung', 'Keelung City': 'keelung',
  桃園市: 'taoyuan', 'Taoyuan City': 'taoyuan',
  新竹市: 'hsinchuCity', 'Hsinchu City': 'hsinchuCity',
  新竹縣: 'hsinchuCounty', 'Hsinchu County': 'hsinchuCounty',
  苗栗縣: 'miaoli', 'Miaoli County': 'miaoli',
  臺中市: 'taichung', 台中市: 'taichung', 'Taichung City': 'taichung',
  彰化縣: 'changhua', 'Changhua County': 'changhua',
  南投縣: 'nantou', 'Nantou County': 'nantou',
  雲林縣: 'yunlin', 'Yunlin County': 'yunlin',
  嘉義市: 'chiayiCity', 'Chiayi City': 'chiayiCity',
  嘉義縣: 'chiayiCounty', 'Chiayi County': 'chiayiCounty',
  臺南市: 'tainan', 台南市: 'tainan', 'Tainan City': 'tainan',
  高雄市: 'kaohsiung', 'Kaohsiung City': 'kaohsiung',
  屏東縣: 'pingtung', 'Pingtung County': 'pingtung',
  宜蘭縣: 'yilan', 'Yilan County': 'yilan',
  花蓮縣: 'hualien', 'Hualien County': 'hualien',
  臺東縣: 'taitung', 台東縣: 'taitung', 'Taitung County': 'taitung',
  澎湖縣: 'penghu', 'Penghu County': 'penghu',
}
```

In `lib/maps/search.ts`, add `city: City | null` to `SearchResult` and read it inside the loop, using the key confirmed in Step 1:

```ts
const district = feature?.properties?.address?.adminDistricts?.[0]?.name
results.push({
  name,
  kind: String(feature?.properties?.type ?? ''),
  lng,
  lat,
  // The response already carries this and we already paid for the call, so
  // the county costs nothing extra. Null when Azure did not say — the form
  // then asks rather than guessing.
  city: (typeof district === 'string' ? AZURE_DISTRICTS[district] : undefined) ?? null,
})
```

- [ ] **Step 5: Run to verify they pass**

Run: `npm test -- vocabulary search`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/places/types.ts lib/maps/search.ts lib/places/vocabulary.test.ts lib/maps/search.test.ts
git commit -m "feat: read the county out of the search response we already pay for"
```

---

## Task 3: A file can be written straight to the public container

**Files:**
- Modify: `lib/storage/blob.ts`

- [ ] **Step 1: Implement**

Replace `uploadToPending` with a general function it now wraps:

```ts
export async function upload(
  container: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const blob = client(container).getBlockBlobClient(path)
  await blob.upload(body, body.byteLength, { blobHTTPHeaders: { blobContentType: contentType } })
  return path
}

/**
 * Where a submission's files go. Replacing the track on an entry that is
 * already published writes to PUBLIC instead, because `filesOf` and the
 * promote/demote pair assume a file sits in the container its status implies.
 */
export const uploadToPending = (path: string, body: Buffer, contentType: string) =>
  upload(PENDING, path, body, contentType)
```

- [ ] **Step 2: Verify nothing else broke**

Run: `npm test && npx tsc --noEmit`
Expected: PASS — existing call sites are unchanged.

- [ ] **Step 3: Commit**

```bash
git add lib/storage/blob.ts
git commit -m "refactor: let an upload name its container"
```

---

## Task 4: Extract `PinPicker` out of `SpotForm`

**Files:**
- Create: `app/[locale]/submit/pin-picker.tsx`
- Modify: `app/[locale]/submit/spot-form.tsx`

- [ ] **Step 1: Create the component**

Move the map ref, `dropPin`, the `useEffect` that builds the map, the tile constants, `PlaceSearch`, the coordinate readout and the two hidden inputs out of `spot-form.tsx` verbatim into `pin-picker.tsx`. Its interface:

```tsx
export function PinPicker({
  tileSource,
  initial,
  onCityGuess,
  onMove,
}: {
  tileSource: TileSource
  /** Where the pin already is, for an entry being corrected. */
  initial?: { lng: number; lat: number } | null
  /** A county Azure named for a searched place. Never fires for a tapped pin. */
  onCityGuess?: (city: City) => void
  /** Fires on every placement, so a caller can flag a county as possibly stale. */
  onMove?: () => void
})
```

Behaviour to preserve exactly, and one thing to add:

- `dropPin` stays the single path for tap and search alike — the comment in the original says why, keep it.
- When `initial` is given, drop the pin there on mount and centre the map on it at zoom 14.
- On a search selection, call `onCityGuess` when `result.city` is non-null; on any placement call `onMove`.
- **Search must degrade.** `PlaceSearch` calls an administrator-only endpoint, and `canEdit` admits the submitter, so a contributor editing their own entry gets a 403. Give `PlaceSearch` an `onUnavailable` callback fired on a 403 and hide the search box when it fires; the map still takes a tap.

- [ ] **Step 2: Compose it back into `SpotForm`**

`SpotForm` keeps the county `<select>` and everything below it, and renders `<PinPicker tileSource={tileSource} onCityGuess={setCity} onMove={() => setCityStale(true)} />` in the "where" section. The select becomes controlled by `city` state so a guess can set it.

- [ ] **Step 3: Verify by hand**

```bash
nvm use && npm run dev
```

Sign in, open `/zh-TW/submit`, choose 地標. Confirm: tapping the map drops a pin; searching 陽明山 drops one, flies to it, **and sets the county**; the coordinate readout updates; submission still succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/submit/pin-picker.tsx" "app/[locale]/submit/spot-form.tsx" "app/[locale]/submit/place-search.tsx"
git commit -m "refactor: the map that places a pin becomes a component two pages can use"
```

---

## Task 5: Extract `GpxPicker` out of `RouteForm`

**Files:**
- Create: `app/[locale]/submit/gpx-picker.tsx`
- Modify: `app/[locale]/submit/route-form.tsx`

- [ ] **Step 1: Create the component**

Move `onFile`, the `summary` / `fileName` / `parseError` state, the file input and label, and the preview block (map plus the metrics `<dl>`) out of `route-form.tsx` verbatim. Its interface:

```tsx
export function GpxPicker({
  tileSource,
  name = 'gpx',
  required = true,
  /** What the entry records now, so the preview can say what is being given up. */
  replacing,
  onSummary,
}: {
  tileSource: TileSource
  name?: string
  required?: boolean
  replacing?: { duration: Duration } | null
  onSummary?: (summary: TrackSummary | null) => void
})
```

Keep the comment explaining that the client-side parse is a preview and not a trust boundary.

**Add the duration warning.** When `replacing` has a `basis` of `'gpx'` and the newly parsed `summary.duration.basis` is `'submitter'`, render beneath the metrics:

```tsx
<p className="mt-3 text-[13px] text-clayDeep">{t('durationWillBeLost', {
  min: replacing.duration.minMinutes,
  max: replacing.duration.maxMinutes,
})}</p>
```

This is the spec's section 5: the value is replaced, and the form says so before the save rather than after.

- [ ] **Step 2: Compose it back into `RouteForm`**

`RouteForm` renders `<GpxPicker tileSource={tileSource} />` inside its existing "track" section and keeps everything else.

- [ ] **Step 3: Verify by hand**

On `/zh-TW/submit`, choose 路線, pick a GPX. Confirm the preview map, distance, ascent, duration and stored-point count all still appear, and that submission still succeeds.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/submit/gpx-picker.tsx" "app/[locale]/submit/route-form.tsx"
git commit -m "refactor: the GPX field and its preview become a component two pages can use"
```

---

## Task 6: The location section on the edit page

**Files:**
- Create: `app/[locale]/places/[slug]/edit/geometry-section.tsx`
- Modify: `app/[locale]/places/[slug]/edit/edit-form.tsx`, `app/[locale]/places/[slug]/edit/page.tsx`

- [ ] **Step 1: Pass the current geometry into the form**

`page.tsx` already builds an `EditablePlace`. Add to it: `kind`, `point` (the `startPoint` coordinates), `routeSummary` (`distanceKm`, `elevationGainM`, `duration`) when `place.route` exists, and pass `tileSource={resolveTileSource()}` the way `submit/page.tsx` does.

- [ ] **Step 2: Build the section**

`GeometrySection` renders collapsed by default:

- kind `spot` → a `PlaceMap` at the current point, non-interactive, plus a "更換位置" button
- kind `route` → the current distance / ascent / duration, plus a "更換路線" button

Expanded it renders a spot/route segmented control seeded from the entry's current kind, then either `<PinPicker>` or `<GpxPicker required={false} replacing={routeSummary}>`, plus a cancel that collapses and clears everything.

```tsx
{expanded && <input type="hidden" name="replaceGeometry" value="1" />}
```

Collapsed by default is the point: replacing a location discards data, so it must not look like an ordinary field or be reachable while fixing a typo.

- [ ] **Step 3: Guard the incomplete case in the browser**

While expanded, the save button is disabled until the chosen kind has what it needs — a pin for a spot, a parsed summary for a route. The server checks this too (Task 7); this only spares a round trip.

- [ ] **Step 4: Render it in `EditForm`**

Between the text section and the county selector, so the pin and the county it implies sit next to each other on screen — the spec's mitigation for the county not following the pin. Mark the county field as needing confirmation when `PinPicker`'s `onMove` has fired and the select has not been touched.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/places/[slug]/edit/"
git commit -m "feat: the edit page can offer a new location for an entry"
```

---

## Task 7: `editPlace` carries out the replacement

**Files:**
- Modify: `app/[locale]/places/[slug]/edit/actions.ts`

- [ ] **Step 1: Implement**

After the existing `canEdit` and `city` checks, before `applyEdit`:

```ts
let geometry: GeometryReplacement | undefined
let previousGpxPath: string | null = null

if (formData.get('replaceGeometry') === '1') {
  const kind = String(formData.get('replacementKind') ?? '')

  if (kind === 'spot') {
    const lng = Number(formData.get('lng'))
    const lat = Number(formData.get('lat'))
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return { ok: false, errors: ['replacement-incomplete'] }
    }
    geometry = { kind: 'spot', lng, lat }
  } else if (kind === 'route') {
    const file = formData.get('gpx')
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, errors: ['replacement-incomplete'] }
    }
    if (file.size > MAX_GPX_BYTES) return { ok: false, errors: ['gpx-too-large'] }

    // Re-parsed here rather than trusting the browser, on the same terms as the
    // submission path: the client parse exists to show a preview.
    const raw = Buffer.from(await file.arrayBuffer())
    const points = parseGpx(raw.toString('utf8'))
    if (points.length < 2) return { ok: false, errors: ['gpx-unreadable'] }

    // A fresh path, never the old one. Overwriting would let a cache serve the
    // previous file as the new content, and a failed save would have already
    // destroyed what it replaced.
    const gpxPath = `gpx/${randomUUID()}.gpx`
    await upload(
      place.status === 'published' ? PUBLIC : PENDING,
      gpxPath,
      raw,
      'application/gpx+xml',
    )
    geometry = { kind: 'route', summary: summariseTrack(points), gpxPath }
  } else {
    return { ok: false, errors: ['replacement-incomplete'] }
  }

  previousGpxPath = place.route?.gpxPath ?? null
}
```

Pass `geometry` through to `applyEdit`, then after `savePlace` succeeds:

```ts
// Last, and only once the document that replaced it is safely stored. The
// order matters the way it does on the submission path: an orphaned blob is
// harmless, while a document pointing at a file that is gone is a broken entry
// nobody can repair.
// The new path is always a fresh UUID, so it can never collide with the old
// one and no comparison is needed.
if (previousGpxPath) await removeEverywhere(previousGpxPath)
```

- [ ] **Step 2: Add the error message**

`replacement-incomplete` needs an entry in `SubmissionErrors`' message lookup and in both message files.

- [ ] **Step 3: Verify**

Run: `npm test && npx tsc --noEmit && npx eslint .`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/places/[slug]/edit/actions.ts" "app/[locale]/submit/submission-errors.tsx"
git commit -m "feat: store a replaced location, and only then delete what it replaced"
```

---

## Task 8: Wording, in both languages

**Files:**
- Modify: `messages/zh.json`, `messages/en.json`

- [ ] **Step 1: Add the keys under `edit`**

| Key | zh | en |
|---|---|---|
| `sectionLocation` | 位置 | Location |
| `currentPin` | 目前的位置 | Where it is now |
| `currentTrack` | 目前的路線 | The track it has now |
| `replaceLocation` | 更換位置 | Replace location |
| `replaceTrack` | 更換路線 | Replace track |
| `replaceNote` | 更換會丟掉現在的位置資料，不是修改它。 | Replacing discards the current location rather than adjusting it. |
| `cancelReplace` | 取消更換 | Keep what is there |
| `confirmCity` | 位置變了，請確認縣市 | The location moved — check the county |
| `durationWillBeLost` | 這個檔案沒有時間紀錄，原本的 {min}–{max} 分鐘會變成「未知」。 | This file has no timestamps, so the recorded {min}–{max} min becomes "unknown". |
| `errors.replacement-incomplete` | 你選了要更換位置，但還沒指定新的位置。 | You chose to replace the location but have not given a new one. |

- [ ] **Step 2: Verify both files carry the same keys**

```bash
node -e "const z=require('./messages/zh.json'),e=require('./messages/en.json');const k=o=>Object.keys(o.edit).sort().join(',');if(k(z)!==k(e)){console.error('edit keys differ');process.exit(1)};console.log('edit keys match')"
```

Expected: `edit keys match`

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat: words for replacing a location, in both languages"
```

---

## Task 9: Verify the whole thing against a running site

- [ ] **Step 1: Full check**

```bash
npm test && npx tsc --noEmit && npx eslint . && npm run build
```

- [ ] **Step 2: Exercise all four transitions by hand**

Anything behind sign-in has to be driven in a browser — written is not fixed. With `npm run dev` and signed in as an administrator, on a **published** entry:

1. spot → spot: move the pin, save, confirm the detail page and the explore map both show the new position
2. spot → route: upload a GPX, save, confirm the page now renders a track with metrics
3. route → spot: drop a pin, save, confirm the metrics block is gone
4. route → route: upload a different GPX, save, confirm the numbers changed **and** that the old blob is gone from storage:

```bash
az storage blob list --container-name public --account-name <account> --query "[?contains(name,'gpx/')].name" -o tsv
```

5. Save a text-only edit and confirm the geometry is untouched.
6. Replace a timed track with an untimed one and confirm the warning appears before saving.

- [ ] **Step 3: Push and open the PR together**

CI and Deploy trigger only on `pull_request`, so a pushed branch without a PR runs nothing and gets no preview environment.

```bash
git push -u origin feat/replace-geometry
gh pr create --title "An entry's location can be replaced after it is posted" --body "..."
```
