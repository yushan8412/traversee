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
 *
 * `hasPhoto` moves the large card past anything with no photograph of its own.
 * The largest card is the page's claim about what is worth looking at, and the
 * first entry had none — so it drew a borrowed stand-in of somewhere that is not
 * even Taiwan, at twice the size of everything around it.
 */
export function cardSpans(total: number, hasPhoto?: boolean[]): CardSpan[] {
  const spans: CardSpan[] = new Array(total).fill('normal')
  const eligible = (index: number) => hasPhoto === undefined || hasPhoto[index] === true

  for (let start = 0; start < total; start += EVERY) {
    if (total - start < 4 || total <= 4) break
    // Within this cycle only: a feature dragged into the next one would collide
    // with that cycle's own.
    for (let index = start; index < Math.min(start + EVERY, total); index += 1) {
      if (!eligible(index)) continue
      if (total - index < 4) break
      spans[index] = 'feature'
      break
    }
  }

  const last = total - 1
  if (last > 0) {
    const before = spans.slice(0, last).reduce((sum, span) => sum + CELLS[span], 0)
    if (before % COLUMNS === 0) spans[last] = 'wide'
  }

  return spans
}
