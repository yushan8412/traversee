#!/usr/bin/env node
// maplibre-gl ships its Web Worker as a separate module and resolves the URL
// through import.meta.url. Next's bundler replaces that with a build-machine
// file:// path, so the worker request ends up somewhere that does not exist and
// Next's catch-all answers it with page HTML — a 200 with the wrong MIME type
// rather than an honest 404.
//
// The visible symptom is deceptive: raster tiles keep working because they load
// on the main thread, while GeoJSON sources never finish, so a map can look
// healthy while silently missing every vector layer.
//
// Copying at build time rather than committing the files keeps them from
// drifting out of step with the installed version.

import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const distDir = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'))
const targetDir = join(process.cwd(), 'public', 'maplibre')

// The worker imports the shared chunk with a relative specifier, so the two must
// stay side by side.
const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

await mkdir(targetDir, { recursive: true })
for (const file of files) {
  await copyFile(join(distDir, file), join(targetDir, file))
}

const { version } = JSON.parse(await readFile(require.resolve('maplibre-gl/package.json'), 'utf8'))
console.log(`copied maplibre-gl ${version} worker files to public/maplibre/`)
