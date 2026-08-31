import { XMLParser } from 'fast-xml-parser'
import type { Position } from './geo'

export interface Trackpoint {
  position: Position
  elevationM: number | null
  time: string | null
}

// processEntities: false stops internal entity expansion, which is verified by
// an A/B test — flipping it to true makes lib/gpx/parse.test.ts fail. That
// closes entity-expansion blowup, where a small upload multiplies into
// gigabytes in memory.
//
// It is *not* what protects against classic XXE. fast-xml-parser never resolves
// external SYSTEM entities under either setting, so immunity there comes from
// the library rather than from this configuration. The external-entity test
// exists as a guard for the day someone swaps the parser, not as evidence that
// this line is doing the work. Nothing in GPX needs entities either way.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  processEntities: false,
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => name === 'trk' || name === 'trkseg' || name === 'trkpt',
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function finiteOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function textOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') return value
  if (typeof value === 'number') return String(value)
  return null
}

export function parseGpx(source: string): Trackpoint[] {
  let document: Record<string, unknown>
  try {
    document = parser.parse(source) as Record<string, unknown>
  } catch {
    // Malformed input is a bad upload, not an exceptional condition. The caller
    // gets an empty track and can report it as a rejected file.
    return []
  }

  const gpx = document?.gpx as Record<string, unknown> | undefined
  if (!gpx) return []

  const points: Trackpoint[] = []

  for (const track of asArray(gpx.trk as Record<string, unknown> | Record<string, unknown>[])) {
    for (const segment of asArray(
      track?.trkseg as Record<string, unknown> | Record<string, unknown>[],
    )) {
      for (const point of asArray(
        segment?.trkpt as Record<string, unknown> | Record<string, unknown>[],
      )) {
        const lat = finiteOrNull(point?.['@lat'])
        const lng = finiteOrNull(point?.['@lon'])
        // A point without usable coordinates is dropped here rather than passed
        // on as NaN, which would otherwise reach a distance calculation intact.
        if (lat === null || lng === null) continue

        points.push({
          position: [lng, lat],
          elevationM: finiteOrNull(point?.ele),
          time: textOrNull(point?.time),
        })
      }
    }
  }

  return points
}
