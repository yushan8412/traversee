import { CosmosClient, type Container } from '@azure/cosmos'
import { fixturePlaces } from './fixtures'
import type { Place, PlaceSummary } from './types'

const DATABASE = process.env.COSMOS_DATABASE ?? 'traversee'
const CONTAINER = 'places'

// The fields the list page needs. Kept in one place because the projection is
// the whole reason list queries stay cheap — `description` and the full geometry
// are the two large fields, and both are excluded.
const SUMMARY_FIELDS = [
  'c.id',
  'c.slug',
  'c.city',
  'c.kind',
  'c.activities',
  'c.name',
  'c.summary',
  'c.difficulty',
  'c.startPoint',
  'c.route',
  'c.photos',
  'c.coverPhotoIndex',
].join(', ')

let container: Container | null = null

function isConfigured(): boolean {
  return Boolean(process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY)
}

function getContainer(): Container {
  if (!container) {
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      key: process.env.COSMOS_KEY!,
    })
    container = client.database(DATABASE).container(CONTAINER)
  }
  return container
}

/**
 * Falling back to fixtures is for local development only. In production the same
 * fallback would serve invented content from a real URL and look completely
 * healthy while doing it, so missing configuration fails loudly instead.
 */
function shouldUseFixtures(): boolean {
  if (isConfigured()) return false
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'COSMOS_ENDPOINT and COSMOS_KEY are not set. Refusing to serve fixture data in production.',
    )
  }
  return true
}

function toSummary(place: Place): PlaceSummary {
  const { id, slug, city, kind, activities, name, summary, difficulty } = place
  const { startPoint, route, photos, coverPhotoIndex } = place
  return { id, slug, city, kind, activities, name, summary, difficulty, startPoint, route, photos, coverPhotoIndex }
}

/**
 * The catalogue for a page that has to render whether or not the database
 * answers.
 *
 * The home page is a hero, eight activities, a footer — and a rail of places.
 * Losing the last of those should cost the rail, not the page: a front door
 * that returns 500 because a query failed is worse than one that is briefly
 * short of content. The same is true of the map, which still has its filters.
 *
 * This is not the fixture fallback wearing a different hat. It returns nothing,
 * which is true, rather than seed data, which would be a lie — that distinction
 * is the whole point of the guard in `shouldUseFixtures`.
 *
 * `/places` deliberately does not use this. A catalogue page that cannot reach
 * the catalogue has nothing to say, and "no published places yet" would be a
 * false statement rather than an empty one.
 */
export async function listPublishedPlacesOrNone(): Promise<PlaceSummary[]> {
  try {
    return await listPublishedPlaces()
  } catch (error) {
    console.error('Could not read the catalogue; rendering it as empty', error)
    return []
  }
}

export async function listPublishedPlaces(): Promise<PlaceSummary[]> {
  if (shouldUseFixtures()) {
    return fixturePlaces.filter((p) => p.status === 'published').map(toSummary)
  }

  const { resources } = await getContainer()
    .items.query<PlaceSummary>({
      query: `SELECT ${SUMMARY_FIELDS} FROM c WHERE c.status = @status`,
      parameters: [{ name: '@status', value: 'published' }],
    })
    .fetchAll()

  return resources
}

/**
 * Writes a submission. `create` rather than `upsert`, so a repeated id fails
 * loudly instead of silently overwriting somebody's entry.
 */
export async function createPlace(place: Place): Promise<void> {
  if (shouldUseFixtures()) {
    throw new Error('Cosmos is not configured; refusing to accept a submission that cannot be saved.')
  }
  await getContainer().items.create(place)
}

/**
 * Everything, whatever its status, newest first. Administrators only — the
 * caller enforces that; this does not filter by viewer.
 *
 * Published entries are included deliberately. Excluding them left no way to
 * reach an entry in order to take it down, and it also removed the one view
 * that answers "what have I added, and where did each thing get to".
 */
export async function listPlacesForReview(): Promise<Place[]> {
  if (shouldUseFixtures()) return [...fixturePlaces]
  const { resources } = await getContainer()
    .items.query<Place>('SELECT * FROM c ORDER BY c.updatedAt DESC')
    .fetchAll()
  return resources
}

/**
 * Applies a status change. Reads first so the transition is decided against
 * what is actually stored rather than what a form claimed the current state was.
 */
export async function getPlaceById(id: string, city: string): Promise<Place | null> {
  if (shouldUseFixtures()) return fixturePlaces.find((p) => p.id === id) ?? null
  try {
    const { resource } = await getContainer().item(id, city).read<Place>()
    return resource ?? null
  } catch {
    return null
  }
}

export async function replacePlace(place: Place): Promise<void> {
  if (shouldUseFixtures()) {
    throw new Error('Cosmos is not configured; refusing to pretend a review was saved.')
  }
  await getContainer().item(place.id, place.city).replace(place)
}

/**
 * Saves an edit, including one that changes the county.
 *
 * `city` is the partition key, and a partition key cannot be updated — Cosmos
 * has no operation for it. Moving an entry means writing it into the new
 * partition and removing it from the old one, and there is no transaction
 * spanning the two.
 *
 * So the order is deliberate: create first, delete second. A failure after the
 * create leaves the same entry filed under two counties, which is visible and
 * repairable. The other order loses the entry outright if the second step
 * fails, and a submission is somebody's afternoon written up.
 */
export async function savePlace(place: Place, previousCity: string): Promise<void> {
  if (shouldUseFixtures()) {
    throw new Error('Cosmos is not configured; refusing to pretend an edit was saved.')
  }

  if (place.city === previousCity) {
    await replacePlace(place)
    return
  }

  await getContainer().items.create(place)
  await getContainer().item(place.id, previousCity).delete()
}

/**
 * Removes an entry for good.
 *
 * The document goes before its files, deliberately. If the document is gone and
 * a file lingers, the leftover is invisible and costs a fraction of a cent; if a
 * file is gone and the document survives, the entry stays on the site with
 * broken images. Only one of those two failures is one a visitor can see.
 */
export async function deletePlace(id: string, city: string): Promise<void> {
  if (shouldUseFixtures()) {
    throw new Error('Cosmos is not configured; refusing to pretend a deletion happened.')
  }
  await getContainer().item(id, city).delete()
}

/** Slugs appear in URLs, so a collision would make one entry unreachable. */
export async function slugExists(slug: string): Promise<boolean> {
  if (shouldUseFixtures()) {
    return fixturePlaces.some((p) => p.slug === slug)
  }
  const { resources } = await getContainer()
    // SELECT VALUE returns the scalar itself rather than a wrapper object.
    .items.query<number>({
      query: 'SELECT VALUE COUNT(1) FROM c WHERE c.slug = @slug',
      parameters: [{ name: '@slug', value: slug }],
    })
    .fetchAll()
  return (resources[0] ?? 0) > 0
}

/**
 * Any status, for the edit page. A pending or rejected entry is exactly the one
 * somebody is most likely to be here to correct, so the published filter would
 * hide the cases that matter most.
 */
export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  if (shouldUseFixtures()) {
    return fixturePlaces.find((p) => p.slug === slug) ?? null
  }

  const { resources } = await getContainer()
    .items.query<Place>({
      query: 'SELECT * FROM c WHERE c.slug = @slug',
      parameters: [{ name: '@slug', value: slug }],
    })
    .fetchAll()

  return resources[0] ?? null
}

export async function getPublishedPlaceBySlug(slug: string): Promise<Place | null> {
  if (shouldUseFixtures()) {
    return fixturePlaces.find((p) => p.slug === slug && p.status === 'published') ?? null
  }

  // Cross-partition: slug is unique but the partition key is city, which the URL
  // does not carry. At this dataset size a fan-out costs a few RU; if the
  // catalogue ever grows enough for that to matter, the fix is putting the city
  // in the URL rather than changing the partition key, which is immutable.
  const { resources } = await getContainer()
    .items.query<Place>({
      query: 'SELECT * FROM c WHERE c.slug = @slug AND c.status = @status',
      parameters: [
        { name: '@slug', value: slug },
        { name: '@status', value: 'published' },
      ],
    })
    .fetchAll()

  return resources[0] ?? null
}
