import { mkdir, rm } from 'node:fs/promises'
import { build } from 'esbuild'

await rm('dist/test', { recursive: true, force: true })
await mkdir('dist/test', { recursive: true })
await build({
  entryPoints: ['src/core.ts', 'src/compress.ts'],
  outdir: 'dist/test',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
})
