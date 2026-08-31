import { describe, expect, it } from 'vitest'
import { parseGpx } from './parse'

const gpx = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test">${body}</gpx>`

describe('parseGpx', () => {
  it('extracts trackpoints in order', () => {
    const doc = gpx(`<trk><trkseg>
      <trkpt lat="25.1662" lon="121.5518"><ele>740</ele><time>2026-08-31T00:00:00Z</time></trkpt>
      <trkpt lat="25.1681" lon="121.5556"><ele>765</ele><time>2026-08-31T00:01:00Z</time></trkpt>
    </trkseg></trk>`)

    const points = parseGpx(doc)

    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({
      position: [121.5518, 25.1662],
      elevationM: 740,
      time: '2026-08-31T00:00:00Z',
    })
  })

  it('joins multiple segments and tracks into one sequence', () => {
    // A pause-and-resume on a GPS device splits the recording into segments.
    // Treating only the first would silently truncate the route.
    const doc = gpx(`
      <trk><trkseg><trkpt lat="25.0" lon="121.5"/></trkseg>
      <trkseg><trkpt lat="25.1" lon="121.6"/></trkseg></trk>
      <trk><trkseg><trkpt lat="25.2" lon="121.7"/></trkseg></trk>`)

    expect(parseGpx(doc)).toHaveLength(3)
  })

  it('reports missing elevation and time as null rather than guessing', () => {
    const doc = gpx('<trk><trkseg><trkpt lat="25.0" lon="121.5"/></trkseg></trk>')
    expect(parseGpx(doc)[0]).toEqual({ position: [121.5, 25.0], elevationM: null, time: null })
  })

  it('skips trackpoints with unusable coordinates', () => {
    // A missing or non-numeric coordinate would otherwise become NaN and travel
    // all the way into a distance calculation before anything noticed.
    const doc = gpx(`<trk><trkseg>
      <trkpt lat="25.0" lon="121.5"/>
      <trkpt lat="" lon="121.6"/>
      <trkpt lon="121.7"/>
      <trkpt lat="not-a-number" lon="121.8"/>
    </trkseg></trk>`)

    expect(parseGpx(doc)).toHaveLength(1)
  })

  it('does not resolve external entities', () => {
    // The classic XXE payload: if the parser expands it, the contents of a file
    // on the server end up inside the route the submitter gets back.
    //
    // Honest caveat — this passes with the current parser under either
    // processEntities setting, because fast-xml-parser does not implement
    // external entity resolution at all. It is a regression guard for the day
    // the parser is replaced, not proof that our configuration is what protects
    // us. The internal-entity test below is the one that fails when the setting
    // changes.
    // The entity sits in <time>, a field this parser actually reads. Putting it
    // in an element the parser ignores would make the assertion pass no matter
    // what the parser did.
    const attack = `<?xml version="1.0"?>
      <!DOCTYPE gpx [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <gpx version="1.1"><trk><trkseg>
        <trkpt lat="25.0" lon="121.5"><time>&xxe;</time></trkpt>
      </trkseg></trk></gpx>`

    const serialised = JSON.stringify(parseGpx(attack))
    expect(serialised).not.toContain('root:')
    expect(serialised).not.toContain('/bin/')
  })

  it('does not expand internal entities', () => {
    // Entity expansion is the other half of the XML attack surface: nested
    // internal entities multiply, and a small upload becomes gigabytes in
    // memory. Nothing in GPX needs entities, so none are expanded.
    const doc = `<?xml version="1.0"?>
      <!DOCTYPE gpx [<!ENTITY big "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA">]>
      <gpx version="1.1"><trk><trkseg>
        <trkpt lat="25.0" lon="121.5"><time>&big;</time></trkpt>
      </trkseg></trk></gpx>`

    expect(JSON.stringify(parseGpx(doc))).not.toContain('AAAAAAAAAA')
  })

  it('returns nothing for input that is not GPX', () => {
    expect(parseGpx('not xml at all')).toEqual([])
    expect(parseGpx('<html><body>hello</body></html>')).toEqual([])
  })
})
