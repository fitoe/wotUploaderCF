import assert from 'node:assert/strict'
import test from 'node:test'
import { compressImageWithBrowserLibrary } from '../dist/test/compress.js'

test('default compressor returns original path outside H5 runtime', async () => {
  assert.equal(await compressImageWithBrowserLibrary('file://image.jpg'), 'file://image.jpg')
})
