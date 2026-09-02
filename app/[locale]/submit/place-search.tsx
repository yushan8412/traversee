'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { SearchResult } from '../../../lib/maps/search'
import { BUTTON_QUIET, FIELD } from './field-styles'

type State =
  | { at: 'idle' }
  | { at: 'searching' }
  | { at: 'results'; results: SearchResult[]; query: string }
  | { at: 'failed' }

/**
 * Finding a place by typing its name.
 *
 * Runs on Enter or on the button, never per keystroke: each call is one
 * billable transaction, and type-ahead would spend ten of them on a four
 * character name. The delay is not a limitation to design around — a place name
 * is short and you know it before you start typing.
 */
export function PlaceSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const t = useTranslations('submit')
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>({ at: 'idle' })
  const input = useRef<HTMLInputElement>(null)

  async function run() {
    const asked = query.trim()
    if (asked === '') return

    setState({ at: 'searching' })
    try {
      const response = await fetch(`/api/place-search?q=${encodeURIComponent(asked)}`)
      if (!response.ok) throw new Error(String(response.status))
      const { results } = (await response.json()) as { results: SearchResult[] }
      setState({ at: 'results', results, query: asked })
    } catch {
      setState({ at: 'failed' })
    }
  }

  function choose(result: SearchResult) {
    onSelect(result)
    setState({ at: 'idle' })
    setQuery(result.name)
    input.current?.blur()
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim"
            width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // This input sits inside the submission form, where Enter would
            // otherwise submit the whole thing — half-filled, from a keystroke
            // meant to run a search.
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              void run()
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className={`${FIELD} pl-10`}
          />
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={state.at === 'searching' || query.trim() === ''}
          className={BUTTON_QUIET}
        >
          {state.at === 'searching' ? t('searching') : t('search')}
        </button>
      </div>

      {state.at === 'results' && state.results.length > 0 && (
        <ul
          aria-label={t('searchResults')}
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line
            bg-paper shadow-[0_18px_40px_-24px_rgb(31_42_36/0.5)]"
        >
          {state.results.map((result) => (
            <li key={`${result.lng},${result.lat}`}>
              <button
                type="button"
                onClick={() => choose(result)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left
                  transition-colors hover:bg-panel focus-visible:bg-panel"
              >
                <span className="text-[15px] text-ink">{result.name}</span>
                <span className="font-mono text-[12px] tabular-nums text-dim">
                  {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.at === 'results' && state.results.length === 0 && (
        <p className="mt-2 text-[13px] text-dim">{t('searchNoResults', { query: state.query })}</p>
      )}

      {state.at === 'failed' && <p className="mt-2 text-[13px] text-clayDeep">{t('searchFailed')}</p>}
    </div>
  )
}
