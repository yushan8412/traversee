import { ClientSecretCredential } from '@azure/identity'
import { auth } from '../../../auth'
import { readTranslations, translatableTexts, translateUrl } from '../../../lib/translate/translator'

/**
 * Translates the Chinese fields of a submission into English.
 *
 * Administrator-only, and the allowance is the reason: F0 covers two million
 * characters a month, which is generous for one person writing descriptions and
 * gone quickly if anyone can post text through it.
 *
 * Authenticated with a service principal token rather than a key, because the
 * account is created with local auth disabled — same posture as Maps, and here
 * it costs nothing, since nothing about translation happens in the browser.
 */

const SCOPE = 'https://cognitiveservices.azure.com/.default'
const RENEW_BEFORE_MS = 5 * 60 * 1000

// A description long enough to exceed this is not a description.
const MOST_CHARACTERS = 4000

let cached: { token: string; expiresOnTimestamp: number } | null = null
let credential: ClientSecretCredential | null = null

async function token(): Promise<string> {
  if (!credential) {
    const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
      throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET must all be set.')
    }
    credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
  }
  if (!cached || cached.expiresOnTimestamp - Date.now() < RENEW_BEFORE_MS) {
    const issued = await credential.getToken(SCOPE)
    cached = { token: issued.token, expiresOnTimestamp: issued.expiresOnTimestamp }
  }
  return cached.token
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return Response.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const endpoint = process.env.TRANSLATOR_ENDPOINT
  if (!endpoint) {
    return Response.json({ error: 'Translation is not configured.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { texts?: unknown } | null
  const texts = Array.isArray(body?.texts) ? body.texts.filter((t) => typeof t === 'string') : []
  const wanted = translatableTexts(texts)

  // Nothing to translate is a valid request with an empty answer, not an error:
  // the form asks for both fields and either may legitimately be blank.
  if (wanted.length === 0) return Response.json({ translations: texts.map(() => '') })

  if (wanted.reduce((total, { text }) => total + text.length, 0) > MOST_CHARACTERS) {
    return Response.json({ error: 'Too much text.' }, { status: 413 })
  }

  try {
    const response = await fetch(translateUrl(endpoint), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wanted.map(({ text }) => ({ Text: text }))),
    })

    if (!response.ok) {
      console.error('Azure AI Translator failed', response.status)
      return Response.json({ error: 'Translation is unavailable.' }, { status: 502 })
    }

    const translated = readTranslations(await response.json())
    if (translated.length !== wanted.length) {
      return Response.json({ error: 'Translation is unavailable.' }, { status: 502 })
    }

    // Back into the positions they came from, so a blank middle field stays
    // blank rather than shifting the answers up by one.
    const out = texts.map(() => '')
    wanted.forEach(({ index }, at) => {
      out[index] = translated[at] ?? ''
    })

    return Response.json({ translations: out }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    console.error('Azure AI Translator failed', error)
    return Response.json({ error: 'Translation is unavailable.' }, { status: 502 })
  }
}
