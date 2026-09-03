import { ClientSecretCredential } from '@azure/identity'
import { readTranslations, translateUrl } from './translator'
import { translationPlan, type ProseField, type TranslationGroup } from './plan'

/**
 * Fills in the language the submitter did not write.
 *
 * The form asks for the prose once, in whatever language the page is in, and
 * this produces the other half on the way to the database. It runs on the server
 * during submission rather than behind a button, because the alternative — two
 * columns of fields, one of them a draft nobody asked for — is what the form
 * looked like before and it was twice the page for the same entry.
 *
 * It never throws. A submission is somebody's afternoon on a mountain written
 * up; losing it because a translation endpoint was briefly unavailable would be
 * a poor trade for a field that is optional anyway. When translation fails the
 * entry is stored in the one language it was written in, and the gap can be
 * filled later.
 */

const SCOPE = 'https://cognitiveservices.azure.com/.default'
const RENEW_BEFORE_MS = 5 * 60 * 1000

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

async function run(endpoint: string, group: TranslationGroup): Promise<string[]> {
  const response = await fetch(translateUrl(endpoint, group.from, group.to), {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(group.items.map(({ text }) => ({ Text: text }))),
  })

  if (!response.ok) throw new Error(`Translator answered ${response.status}`)
  return readTranslations(await response.json())
}

/**
 * Reads the prose out of a submitted form and returns it in both languages.
 *
 * Both server actions go through this rather than reading the four fields each,
 * because four fields read in two places is the shape of every drift bug this
 * form has had.
 */
export async function proseFrom(formData: FormData): Promise<Record<ProseField, string>> {
  return fillMissingProse({
    summaryZh: String(formData.get('summaryZh') ?? ''),
    summaryEn: String(formData.get('summaryEn') ?? ''),
    descriptionZh: String(formData.get('descriptionZh') ?? ''),
    descriptionEn: String(formData.get('descriptionEn') ?? ''),
  })
}

export async function fillMissingProse(
  values: Record<ProseField, string>,
): Promise<Record<ProseField, string>> {
  const groups = translationPlan(values)
  if (groups.length === 0) return values

  const endpoint = process.env.TRANSLATOR_ENDPOINT
  if (!endpoint) {
    console.error('TRANSLATOR_ENDPOINT is not set; storing the submission in one language.')
    return values
  }

  const filled = { ...values }

  for (const group of groups) {
    try {
      const translated = await run(endpoint, group)
      // A short answer would put the wrong text in the wrong field, which is
      // worse than an empty one.
      if (translated.length !== group.items.length) continue
      group.items.forEach(({ target }, at) => {
        filled[target] = translated[at] ?? ''
      })
    } catch (error) {
      console.error('Translation failed; storing the submission in one language.', error)
    }
  }

  return filled
}
