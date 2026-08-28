#!/usr/bin/env node
// Proves that the target is really rendering server-side, and is not a static
// export wearing an SSR costume.
//
// Usage:  node scripts/verify-ssr.mjs [baseUrl]
//         VERIFY_URL=https://… node scripts/verify-ssr.mjs
//
// The test: request the probe twice and require the two responses to differ.
// A static export physically cannot vary between requests, so identical bodies
// mean Static Web Apps degraded the app to static hosting — which is the exact
// failure this milestone exists to catch, and one that is otherwise invisible
// because a statically-served site still looks completely healthy.
//
// Each request carries a unique query string so that a caching layer returning
// a stored copy cannot be mistaken for static rendering, and vice versa.

const base = (process.argv[2] ?? process.env.VERIFY_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
)

const failures = []
const pass = (m) => console.log(`  PASS  ${m}`)
const fail = (m) => {
  console.log(`  FAIL  ${m}`)
  failures.push(m)
}

async function probe(label) {
  const url = `${base}/api/render-check?cb=${label}-${Date.now()}`
  const res = await fetch(url, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } })
  if (!res.ok) throw new Error(`${url} responded ${res.status} ${res.statusText}`)
  const body = await res.json()
  if (typeof body.renderedAt !== 'string' || typeof body.requestId !== 'string') {
    throw new Error(`${url} returned unexpected shape: ${JSON.stringify(body)}`)
  }
  return body
}

console.log(`\nVerifying server-side rendering at ${base}\n`)

let first
let second
try {
  first = await probe('a')
  // ISO timestamps have millisecond resolution, so two back-to-back requests
  // could legitimately share one. requestId alone would settle it, but the
  // pause lets the timestamp be independently convincing too.
  await new Promise((r) => setTimeout(r, 50))
  second = await probe('b')
} catch (error) {
  console.error(`  FAIL  could not reach the probe — ${error.message}\n`)
  console.error(`Is the server running? For a local check:  npm run build && npm start\n`)
  process.exit(1)
}

if (first.requestId === second.requestId) {
  fail(`identical requestId across two requests (${first.requestId}) — served statically, not rendered`)
} else {
  pass('requestId differs between requests')
}

if (first.renderedAt === second.renderedAt) {
  fail(`identical renderedAt across two requests (${first.renderedAt}) — timestamp is frozen`)
} else {
  pass(`renderedAt advances (${first.renderedAt} → ${second.renderedAt})`)
}

try {
  const res = await fetch(`${base}/?cb=${Date.now()}`, { cache: 'no-store' })
  const html = await res.text()
  if (!res.ok) fail(`the landing page responded ${res.status}`)
  else if (!html.includes('Traversee')) fail('the landing page rendered without its own content')
  else pass('the landing page renders server-side HTML')
} catch (error) {
  fail(`could not fetch the landing page — ${error.message}`)
}

console.log(`\n  Observed runtime: Node ${first.nodeVersion}, region ${first.region ?? 'local'}\n`)

if (failures.length > 0) {
  console.error(`Server-side rendering is NOT working at ${base} (${failures.length} failed).\n`)
  process.exit(1)
}

console.log(`Server-side rendering confirmed at ${base}.\n`)
