'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MAX_PHOTOS, LIMIT_MESSAGE_VALUES } from '../../../../../lib/photos/limits'
import { PhotoPicker } from '../../../submit/photo-picker'
import { LABEL, SECTION_NOTE } from '../../../submit/field-styles'

export interface StoredPhoto {
  path: string
  src: string
}

/**
 * The photographs an entry already has, and the ones being added to it.
 *
 * Kept apart on purpose. A stored photograph is a file in blob storage that a
 * save will delete; a chosen one is bytes in this browser that a save will
 * upload. Showing them in one list would hide which of those two things a
 * cross is about to do.
 *
 * Nothing is deleted while this is open — removing a photograph here only stops
 * it being posted back, and the action deletes what the entry no longer
 * references once the document has been saved.
 */
export function PhotoEditor({
  stored,
  added,
  onKeptChange,
  onAddedChange,
}: {
  stored: StoredPhoto[]
  added: File[]
  onKeptChange: (paths: string[]) => void
  onAddedChange: (files: File[]) => void
}) {
  const t = useTranslations('edit')
  const ts = useTranslations('submit')
  const [kept, setKept] = useState<string[]>(stored.map((photo) => photo.path))

  function drop(path: string) {
    const next = kept.filter((each) => each !== path)
    setKept(next)
    onKeptChange(next)
  }

  function restore(path: string) {
    // In the order they were stored, so putting one back does not move it to
    // the end of the entry's photographs.
    const next = stored.filter((photo) => kept.includes(photo.path) || photo.path === path)
    const paths = next.map((photo) => photo.path)
    setKept(paths)
    onKeptChange(paths)
  }

  const room = Math.max(0, MAX_PHOTOS - kept.length)

  return (
    <div>
      <h3 className={LABEL}>{t('sectionPhotos')}</h3>
      <p className={SECTION_NOTE}>{ts('photosHint', LIMIT_MESSAGE_VALUES)}</p>

      {stored.length > 0 && (
        <ul className="mb-4 mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {stored.map((photo) => {
            const keeping = kept.includes(photo.path)
            return (
              <li key={photo.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob storage URLs */}
                <img
                  src={photo.src}
                  alt=""
                  className={`aspect-square w-full rounded-xl border border-line bg-panel
                    object-cover transition-opacity ${keeping ? '' : 'opacity-25'}`}
                />
                <button
                  type="button"
                  onClick={() => (keeping ? drop(photo.path) : restore(photo.path))}
                  aria-label={keeping ? t('removePhoto') : t('keepPhoto')}
                  className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full
                    bg-ink/65 text-white transition-colors hover:bg-ink"
                >
                  {keeping ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 12a8 8 0 1 0 2.3-5.6" />
                      <path d="M4 4v4h4" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Says the editor was on the form at all. Without it, removing every
          photograph is indistinguishable from a form that never carried the
          editor — and "delete them all" would silently do nothing. */}
      <input type="hidden" name="photoEditor" value="1" />

      {/* Which stored photographs survive this edit. Sent as the entry's own
          paths so the action can check each one against the document rather
          than trusting the form. */}
      {kept.map((path) => (
        <input key={path} type="hidden" name="keepPhotos" value={path} />
      ))}

      {room === 0 ? (
        <p className={SECTION_NOTE}>{t('photosFull', LIMIT_MESSAGE_VALUES)}</p>
      ) : (
        <PhotoPicker photos={added} onChange={onAddedChange} max={room} heading={false} />
      )}
    </div>
  )
}
