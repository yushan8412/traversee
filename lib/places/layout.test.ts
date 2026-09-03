import { describe, expect, it } from 'vitest'
import { cardSpans } from './layout'

describe('cardSpans', () => {
  it('leads with a large card once there is enough to sit beside it', () => {
    expect(cardSpans(7)[0]).toBe('feature')
  })

  it('does not enlarge anything in a collection too small to fill around it', () => {
    // A big card with one small one beside it is not a rhythm, it is a mistake.
    expect(cardSpans(1)).toEqual(['normal'])
    expect(cardSpans(3)).toEqual(['normal', 'normal', 'normal'])
  })

  it('never leaves a single card alone on the last row', () => {
    // Seven in three columns is what prompted this: the seventh sat by itself
    // under two full rows and read as dropped rather than placed.
    for (let total = 2; total <= 40; total += 1) {
      const spans = cardSpans(total)
      const cells = spans.map((span) => (span === 'feature' ? 4 : span === 'wide' ? 3 : 1))
      const before = cells.slice(0, -1).reduce((sum, n) => sum + n, 0)
      const startsItsOwnRow = before % 3 === 0
      expect(startsItsOwnRow && cells[cells.length - 1] === 1, `total ${total}`).toBe(false)
    }
  })

  it('widens a lone trailing card to fill the row instead', () => {
    expect(cardSpans(4)).toEqual(['normal', 'normal', 'normal', 'wide'])
  })

  it('repeats the large card so a long list keeps its rhythm', () => {
    const spans = cardSpans(20)
    expect(spans.filter((span) => span === 'feature').length).toBeGreaterThan(1)
  })

  it('gives one span per place, whatever the count', () => {
    for (let total = 0; total <= 30; total += 1) {
      expect(cardSpans(total)).toHaveLength(total)
    }
  })
})

describe('cardSpans with photographs', () => {
  const some = (n: number, without: number[]) =>
    Array.from({ length: n }, (_, i) => !without.includes(i))

  it('passes the large card to the next place that has a photograph of its own', () => {
    // The largest card is the page's claim about what is worth looking at. The
    // first entry had no photograph and drew a borrowed stand-in of somewhere
    // that is not even Taiwan, at twice the size of everything around it.
    const spans = cardSpans(7, some(7, [0]))
    expect(spans[0]).toBe('normal')
    expect(spans[1]).toBe('feature')
  })

  it('leaves the large card alone when the first place has its own photograph', () => {
    expect(cardSpans(7, some(7, []))[0]).toBe('feature')
  })

  it('enlarges nothing when no place has a photograph', () => {
    expect(cardSpans(7, some(7, [0, 1, 2, 3, 4, 5, 6]))).not.toContain('feature')
  })

  it('still never leaves a card alone on the last row once the feature has moved', () => {
    for (let total = 2; total <= 40; total += 1) {
      const spans = cardSpans(total, some(total, [0]))
      const cells = spans.map((s) => (s === 'feature' ? 4 : s === 'wide' ? 3 : 1))
      const before = cells.slice(0, -1).reduce((sum, n) => sum + n, 0)
      expect(before % 3 === 0 && cells[cells.length - 1] === 1, `total ${total}`).toBe(false)
    }
  })
})
