import { mkdir, rm } from 'node:fs/promises'
import { build } from 'esbuild'

await rm('dist/test', { recursive: true, force: true })
await mkdir('dist/test', { recursive: true })
await build({
  entryPoints: ['src/core.ts'],
  outfile: 'dist/test/core.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
})
