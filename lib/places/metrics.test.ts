import { describe, expect, it } from 'vitest'
import { placeMetrics } from './metrics'

const t = (key: string, values?: Record<string, string | number>) =>
  key === 'metrics.kilometres' ? `${values?.value} 公里` : `${values?.value} 公尺`

describe('placeMetrics', () => {
  it('gives a route its distance and ascent', () => {
    expect(placeMetrics({ distanceKm: 6.4, elevationGainM: 320 }, t)).toBe('6.4 公里 · ↑320 公尺')
  })

  it('gives a spot nothing at all', () => {
    // It used to read "地點", which is the word for what you are already
    // looking at: the meta line above says the county and the activities, and
    // the pin on the map carries the activity icon. On 2026-09-03 Yulia pointed
    // at it in the map popup and asked for it and its divider to go.
    expect(placeMetrics(null, t)).toBe('')
  })
})
