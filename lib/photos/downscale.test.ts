import { describe, expect, it } from 'vitest'
import { fitWithin } from './downscale'
import { MAX_EDGE } from './limits'

describe('fitWithin', () => {
  it('leaves an image that already fits alone', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('brings a landscape photo down by its long edge', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('brings a portrait photo down by its long edge', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never rounds a dimension away to nothing', () => {
    expect(fitWithin(10000, 3, 1600)).toEqual({ width: 1600, height: 1 })
  })

  it('targets the size the server publishes, so the upload carries no wasted pixels', () => {
    expect(fitWithin(4032, 3024, MAX_EDGE).width).toBe(MAX_EDGE)
  })
})
