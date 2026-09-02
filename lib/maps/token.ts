import { ClientSecretCredential } from '@azure/identity'

// Shared by the endpoint that hands a token to the browser for tiles and by the
// server-side geocoding call. Held in one place so there is one cache and one
// set of credentials rather than a second copy that expires on its own schedule.

const SCOPE = 'https://atlas.microsoft.com/.default'

// Entra tokens last about an hour. Minting one per request would add a round
// trip for no benefit, so the token is held until shortly before it expires.
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

export async function mapsToken(): Promise<{ token: string; expiresOnTimestamp: number }> {
  if (!cached || cached.expiresOnTimestamp - Date.now() < RENEW_BEFORE_MS) {
    const issued = await getCredential().getToken(SCOPE)
    cached = { token: issued.token, expiresOnTimestamp: issued.expiresOnTimestamp }
  }
  return cached
}
