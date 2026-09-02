/**
 * Which photos a submission is carrying, as the person picking them changes
 * their mind.
 *
 * A file input cannot be pre-filled and its list cannot be edited, so the
 * chosen photos have to be held outside it. That makes picking additive: the
 * picker opens empty every time, and adding a second photo means choosing the
 * first one again.
 */
function identity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/**
 * Puts the chosen photos into the form data in place of whatever the file input
 * contributed, which is the last selection made rather than what is on screen.
 */
export function attachPhotos(formData: FormData, photos: File[], field = 'photos'): FormData {
  formData.delete(field)
  for (const photo of photos) formData.append(field, photo)
  return formData
}

export function acceptPhotos(current: File[], incoming: File[], max: number): File[] {
  const seen = new Set(current.map(identity))
  const chosen = [...current]

  for (const file of incoming) {
    if (chosen.length >= max) break
    if (seen.has(identity(file))) continue
    seen.add(identity(file))
    chosen.push(file)
  }

  return chosen
}
