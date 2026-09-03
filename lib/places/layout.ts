export type CardSpan = 'feature' | 'wide' | 'normal'

/** Cells each span occupies in a three-column grid. */
const CELLS: Record<CardSpan, number> = { feature: 4, wide: 3, normal: 1 }

const COLUMNS = 3
const EVERY = 6

/**
 * Which cards are large, so the index has a rhythm rather than a uniform tile.
 *
 * Two rules, and both exist because of what the grid does at its edges rather
 * than in its middle.
 *
 * A card is enlarged every sixth place, but only where enough follow to sit
 * beside it — a two-by-two card with one small one next to it is not a rhythm,
 * it is a mistake, and that is what a naive `index % 6` produces at the end of
 * a list.
 *
 * And a card that would begin the final row on its own is widened to fill that
 * row. Seven places in three columns is what prompted this: the seventh sat
 * alone under two full rows and read as dropped rather than placed.
 */
export function cardSpans(total: number): CardSpan[] {
  const spans: CardSpan[] = []

  for (let index = 0; index < total; index += 1) {
    const room = total - index
    spans.push(index % EVERY === 0 && room >= 4 && total > 4 ? 'feature' : 'normal')
  }

  const last = total - 1
  if (last > 0) {
    const before = spans.slice(0, last).reduce((sum, span) => sum + CELLS[span], 0)
    if (before % COLUMNS === 0) spans[last] = 'wide'
  }

  return spans
}
