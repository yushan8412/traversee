import { ClientSecretCredential } from '@azure/identity'

// Map tiles are fetched by the browser, so some credential has to reach the
// client. This endpoint issues a short-lived Entra token instead of the account
// key: the key is disabled entirely on the Maps account, and the service
// principal behind this token holds only Azure Maps Data Reader, scoped to that
// one account.
//
// The endpoint is unauthenticated, because the map has to work for anonymous
// visitors — that is inherent to browser-rendered tiles, not an oversight. What
// it hands out is read-only and expires. The remaining exposure is transaction
// volume against the free grant, which an Azure Maps usage alert is meant to
// catch; a rate cap would need SAS tokens, which are unavailable while local
// auth is disabled.

const SCOPE = 'https://atlas.microsoft.com/.default'

// Entra tokens last about an hour. Minting one per page load would add a
// round trip to every visit for no benefit, so the token is held until shortly
// before it expires.
const RENEW_BEFORE_MS = 5 * 60 * 1000

let cached: { token: string; expiresOnTimestamp: number } | null = null
let credential: ClientSecretCredential | null = null

function getCredential(): ClientSecretCredential {
  if (!credential) {
    const tenantId = process.env.AZURE_TENANT_ID
    const clientId = process.env.AZURE_CLIENT_ID
    const clientSecret = process.env.AZURE_CLIENT_SECRET
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET must all be set.')
    }
    credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
  }
  return credential
}

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const clientId = process.env.AZURE_MAPS_CLIENT_ID
  if (!clientId) {
    return Response.json({ error: 'Azure Maps is not configured.' }, { status: 503 })
  }

  try {
    if (!cached || cached.expiresOnTimestamp - Date.now() < RENEW_BEFORE_MS) {
      const token = await getCredential().getToken(SCOPE)
      cached = { token: token.token, expiresOnTimestamp: token.expiresOnTimestamp }
    }

    return Response.json(
      { token: cached.token, clientId, expiresOn: cached.expiresOnTimestamp },
      { headers: { 'cache-control': 'no-store' } },
    )
  } catch (error) {
    // The message can carry tenant and application detail, so it stays in the
    // server log rather than going back to the caller.
    console.error('Failed to issue an Azure Maps token', error)
    return Response.json({ error: 'Could not issue a map token.' }, { status: 503 })
  }
}
