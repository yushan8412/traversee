import { MAX_EDGE } from './limits'

/**
 * Shrinks photos in the browser before they are uploaded.
 *
 * The server publishes at `MAX_EDGE` and throws the rest away, so a phone
 * uploading its full-resolution original is spending mobile data on pixels that
 * are discarded on arrival. A recent iPhone photo is around fifteen megabytes;
 * the same picture at the size it will actually be published is under one.
 *
 * That is the whole reason this exists. On 2026-09-02 a submission from a phone
 * was refused as too large, and the file was fifteen megabytes of detail that
 * would have been resized away a second later.
 */

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    // A very wide panorama scales its short edge below one pixel, and a canvas
    // of zero height throws.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Returns a smaller version of the file, or the file itself if it cannot make
 * one. Never throws: a browser that cannot decode the format — HEIC outside
 * Safari, most obviously — should still be able to submit, and the server's
 * size check is what refuses the ones that are genuinely too big.
 */
export async function downscaleForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    // Without `from-image` the orientation flag is ignored and every portrait
    // photo taken on a phone uploads on its side.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    // An already-small photo can come back larger than it went in, and a
    // re-encode of an original is worse than the original.
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^./\\]+$/, '')
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

/**
 * Replaces the photos a form is about to send with their shrunk versions.
 *
 * Done to the form data rather than to the file input because an input's file
 * list is read-only, and because it keeps the input behaving the way people
 * expect — the picker still shows the photo they chose.
 */
export async function shrinkPhotos(formData: FormData, field = 'photos'): Promise<FormData> {
  const photos = formData
    .getAll(field)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
  if (photos.length === 0) return formData

  const shrunk = await Promise.all(photos.map(downscaleForUpload))
  formData.delete(field)
  for (const photo of shrunk) formData.append(field, photo)
  return formData
}
