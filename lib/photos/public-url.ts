/**
 * Where an approved photograph can be read from.
 *
 * Its own module, with nothing else in it, because of what importing it used to
 * cost. It lived beside the upload pipeline in `store.ts`, which statically
 * pulls in sharp, heic-decode and the blob SDK — so every page that draws a
 * card loaded an image processing stack and a storage client in order to join
 * two strings with a slash.
 *
 * Measured locally, warm: sharp 80ms, @azure/storage-blob 133ms, heic-decode
 * 27ms. On a cold Static Web Apps function those are several times larger, and
 * they were being paid by the home page, the index, the explore map and the
 * detail page — every public route, on every cold start.
 */
export function publicPhotoUrl(path: string): string {
  const base = process.env.BLOB_PUBLIC_BASE_URL
  if (!base) throw new Error('BLOB_PUBLIC_BASE_URL is not set.')
  return `${base.replace(/\/+$/, '')}/${path}`
}
