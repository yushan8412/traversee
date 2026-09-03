'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { acceptPhotos } from '../../../lib/photos/selection'
import { MAX_PHOTOS, LIMIT_MESSAGE_VALUES } from '../../../lib/photos/limits'
import { BUTTON_QUIET, HINT, OPTIONAL, SECTION_NOTE, SECTION_TITLE } from './field-styles'

/**
 * The photos a submission is carrying, shown rather than listed.
 *
 * A bare file input names the files and nothing else, and its list cannot be
 * edited — so choosing the wrong shot means starting the whole selection again,
 * and there is no way to tell two photos named IMG_2589 apart before they are
 * published. Holding the files here buys both: a thumbnail of each, and a way
 * to drop one.
 */
export function PhotoPicker({
  photos,
  onChange,
}: {
  photos: File[]
  onChange: (photos: File[]) => void
}) {
  const t = useTranslations('submit')
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo))
    setPreviews(urls)
    // Each object URL pins its file in memory until it is revoked, and these are
    // camera originals.
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])

  const full = photos.length >= MAX_PHOTOS

  return (
    <div>
      <h2 className={SECTION_TITLE}>
        {t('photos')} <span className={OPTIONAL}>({t('optional')})</span>
      </h2>
      <p className={SECTION_NOTE}>{t('photosHint', LIMIT_MESSAGE_VALUES)}</p>

      {photos.length > 0 && (
        <ul className="mb-4 mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={`${photo.name}:${photo.lastModified}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a blob:
                  URL for a file that has not been uploaded yet; next/image
                  optimises remote and bundled sources, not these. */}
              <img
                src={previews[index]}
                alt={photo.name}
                className="aspect-square w-full rounded-xl border border-line bg-panel object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, at) => at !== index))}
                aria-label={t('removePhoto', { name: photo.name })}
                className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full
                  bg-ink/65 text-white backdrop-blur-sm transition-colors hover:bg-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        id="photos"
        type="file"
        accept="image/*"
        multiple
        disabled={full}
        className="peer sr-only"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? [])
          onChange(acceptPhotos(photos, picked, MAX_PHOTOS))
          // The picker always opens empty, so without this the same photo
          // cannot be chosen again after it has been removed.
          event.target.value = ''
        }}
      />
      <label
        htmlFor="photos"
        className={`${BUTTON_QUIET} ${full ? 'pointer-events-none opacity-55' : ''} ${
          photos.length === 0 ? 'mt-4' : ''
        } peer-focus-visible:outline peer-focus-visible:outline-2
          peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3 16l4.5-4.5a2 2 0 012.8 0L14 15" />
          <path d="M14.5 13.5l1.6-1.6a2 2 0 012.8 0L21 14" />
          <circle cx="15.5" cy="9.5" r="1.4" />
        </svg>
        {photos.length > 0 ? t('addMorePhotos') : t('choosePhotos')}
      </label>

      {photos.length > 0 && (
        <p className={`${HINT} tabular-nums`}>
          {photos.length} / {MAX_PHOTOS}
        </p>
      )}
    </div>
  )
}
