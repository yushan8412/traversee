import { describe, expect, it } from 'vitest'
import { simplify } from './simplify'
import type { Position } from './geo'

describe('simplify', () => {
  it('keeps both endpoints', () => {
    // Dropping either end would move where the route starts or finishes, which
    // is the one thing a simplified shape must never do.
    const track: Position[] = [
      [121.5, 25.0],
      [121.5, 25.001],
      [121.5, 25.002],
      [121.5, 25.003],
    ]
    const result = simplify(track, 50)
    expect(result[0]).toEqual([121.5, 25.0])
    expect(result.at(-1)).toEqual([121.5, 25.003])
  })

  it('drops points that lie on the line between their neighbours', () => {
    const straight: Position[] = [
      [121.5, 25.0],
      [121.5, 25.001],
      [121.5, 25.002],
    ]
    expect(simplify(straight, 10)).toHaveLength(2)
  })

  it('keeps a point that deviates further than the tolerance', () => {
    // A switchback is exactly this shape. Smoothing it away would draw a trail
    // going straight through a hillside it does not cross.
    const withCorner: Position[] = [
      [121.5, 25.0],
      [121.502, 25.001],
      [121.5, 25.002],
    ]
    expect(simplify(withCorner, 10)).toHaveLength(3)
  })

  it('returns tracks of two points or fewer unchanged', () => {
    expect(simplify([], 10)).toEqual([])
    expect(simplify([[121.5, 25.0]], 10)).toHaveLength(1)
  })

  it('reduces a dense track to a fraction of its points', () => {
    // The reason this exists: a raw file has thousands of points, and the list
    // query has to stay cheap against a fixed throughput grant.
    const dense: Position[] = Array.from({ length: 2000 }, (_, i) => [
      121.5 + i * 0.00001,
      25.0 + Math.sin(i / 100) * 0.002,
    ])
    const result = simplify(dense, 20)
    expect(result.length).toBeLessThan(200)
    expect(result.length).toBeGreaterThan(2)
  })
})
