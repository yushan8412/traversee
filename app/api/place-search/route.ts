import { auth } from '../../../auth'
import { mapsToken } from '../../../lib/maps/token'
import { readSearchResults, searchUrl } from '../../../lib/maps/search'

/**
 * Finding a place by name instead of by panning the map.
 *
 * Administrator-only, unlike the token endpoint beside it. Tiles have to work
 * for anonymous visitors; this does not, and every call is one billable
 * transaction against a monthly grant. An open search box is a way for someone
 * else to spend it.
 */

// Long enough for a full park name, short enough that nobody is posting prose
// through it.
const MOST_CHARACTERS = 60

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return Response.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const query = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (query === '' || query.length > MOST_CHARACTERS) {
    return Response.json({ results: [] })
  }

  const clientId = process.env.AZURE_MAPS_CLIENT_ID
  if (!clientId) {
    return Response.json({ error: 'Azure Maps is not configured.' }, { status: 503 })
  }

  try {
    const { token } = await mapsToken()
    const response = await fetch(searchUrl(query), {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-ms-client-id': clientId,
        // Traditional Chinese where the service holds it. Some Taiwanese peaks
        // still come back romanised; that is the service's data, not a setting.
        'Accept-Language': 'zh-Hant',
      },
    })

    if (!response.ok) {
      console.error('Azure Maps geocoding failed', response.status)
      return Response.json({ error: 'Search is unavailable.' }, { status: 502 })
    }

    return Response.json(
      { results: readSearchResults(await response.json()) },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    console.error('Azure Maps geocoding failed', error)
    return Response.json({ error: 'Search is unavailable.' }, { status: 502 })
  }
}
