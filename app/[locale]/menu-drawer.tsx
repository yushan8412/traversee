'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from '../../i18n/navigation'

/**
 * Everything the three tabs do not carry, behind one control.
 *
 * A `<dialog>` rather than a positioned div, because the browser already knows
 * how to do the hard parts of this: it puts the panel in the top layer so no
 * ancestor's overflow or stacking context can clip it, it traps focus, and it
 * closes on Escape. Reimplementing those by hand is where accessible drawers
 * usually go wrong.
 *
 * What the element does not do is animate, or close when you click beside it,
 * or reopen scrolled to where it was. Those are below.
 */
export function MenuDrawer({
  label,
  closeLabel,
  children,
}: {
  label: string
  closeLabel: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  function close() {
    setOpen(false)
    // Let the transition finish before the element leaves the top layer,
    // otherwise the panel vanishes instead of sliding out.
    window.setTimeout(() => dialog.current?.close(), 220)
  }

  // Following a link inside the drawer changes the route without unmounting the
  // header, so without this the panel stays open over the page just navigated to.
  useEffect(() => {
    if (dialog.current?.open) close()
    // Only the route matters here.
  }, [pathname])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal()
          setOpen(true)
        }}
        aria-haspopup="dialog"
        className="flex items-center gap-2.5 rounded-full px-2 py-2 text-[13px] font-medium
          uppercase tracking-[0.14em] text-ink transition-colors hover:text-brand"
      >
        <span aria-hidden="true" className="flex w-5 flex-col gap-[5px]">
          <span className="h-px w-full bg-current" />
          <span className="h-px w-full bg-current" />
        </span>
        {label}
      </button>

      <dialog
        ref={dialog}
        // Escape fires this rather than closing outright, so the panel slides
        // away instead of disappearing.
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
        // A dialog's backdrop is not a child, so a click beside the panel lands
        // on the dialog element itself. Anything inside stops here first.
        onClick={(event) => {
          if (event.target === dialog.current) close()
        }}
        className={`tv-drawer ml-auto mr-0 h-dvh max-h-none w-[min(20rem,88vw)] max-w-none
          border-l border-line bg-paper p-0 text-ink backdrop:bg-ink/35
          ${open ? 'is-open' : ''}`}
      >
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <button
            type="button"
            onClick={close}
            className="mb-8 self-end rounded-full p-1.5 text-dim transition-colors hover:text-ink"
            aria-label={closeLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {children}
        </div>
      </dialog>
    </>
  )
}
