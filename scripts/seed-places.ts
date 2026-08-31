// Loads the development fixtures into a real Cosmos container.
//
// Run with:
//   COSMOS_ENDPOINT=… COSMOS_KEY=<read-write key> \
//     node --experimental-strip-types scripts/seed-places.ts
//
// The app's own key is read-only, so this deliberately needs a different one
// passed in for the occasion rather than reusing what the site runs with.
//
// Upserts by id, so running it twice changes nothing. It never deletes: this
// script must not be capable of clearing a container that, after M6, will hold
// hand-curated content.

import { CosmosClient } from '@azure/cosmos'
import { fixturePlaces } from '../lib/places/fixtures.ts'

const endpoint = process.env.COSMOS_ENDPOINT
const key = process.env.COSMOS_KEY
const databaseName = process.env.COSMOS_DATABASE ?? 'traversee'

if (!endpoint || !key) {
  console.error('COSMOS_ENDPOINT and COSMOS_KEY must both be set.')
  process.exit(1)
}

const container = new CosmosClient({ endpoint, key }).database(databaseName).container('places')

let charge = 0
for (const place of fixturePlaces) {
  const response = await container.items.upsert(place)
  charge += response.requestCharge
  console.log(`upserted ${place.slug.padEnd(24)} ${place.status}`)
}

const { resources } = await container.items
  .query<{ status: string; n: number }>(
    'SELECT c.status, COUNT(1) AS n FROM c GROUP BY c.status',
  )
  .fetchAll()

console.log(`\n${fixturePlaces.length} documents upserted, ${charge.toFixed(2)} RU total`)
for (const row of resources) console.log(`  ${row.status}: ${row.n}`)
