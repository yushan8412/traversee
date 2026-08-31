import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  // public/maplibre holds build-time copies of a dependency's files. Linting
  // someone else's minified bundle produces a thousand warnings that bury ours.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/maplibre/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default config
