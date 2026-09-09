import { publicPhotoUrl } from '../../../lib/photos/public-url'
import type { Photo } from '../../../lib/places/types'

/**
 * Served straight from blob storage rather than through Next's image
 * optimisation. The files are already WebP at a bounded size, so optimising
 * them again would spend function invocations to produce what is already there
 * — and image optimisation is one of the things Static Web Apps' preview
 * support documents as unavailable.
 *
 * width and height come from the stored document so the browser reserves the
 * space before the file arrives and the page does not jump as photos load.
 */
export function PlacePhoto({
  photo,
  alt,
  thumb = false,
  priority = false,
  className,
}: {
  photo: Photo
  alt: string
  thumb?: boolean
  /**
   * For the one photograph that is the largest thing in the first viewport.
   * Lazy-loading that image delays the very paint the reader is waiting for —
   * measured on the detail page, where a lazy hero left the page showing its
   * scrim over an empty panel for seconds. Never set on more than one image
   * per page; lazy is right for every other.
   */
  priority?: boolean
  className?: string
}) {
  const path = thumb ? (photo.thumbPath ?? photo.path) : photo.path

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note above
    <img
      src={publicPhotoUrl(path)}
      alt={alt}
      width={photo.width}
      height={photo.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      className={className}
    />
  )
}
