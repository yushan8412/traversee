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
