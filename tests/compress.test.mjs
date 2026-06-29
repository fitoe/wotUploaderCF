import assert from 'node:assert/strict'
import test from 'node:test'
import { compressImageWithBrowserLibrary, shouldCompressImageFile } from '../dist/test/compress.js'

test('default compressor returns original path outside H5 runtime', async () => {
  assert.equal(await compressImageWithBrowserLibrary('file://image.jpg'), 'file://image.jpg')
})

test('compresses only when file is over 300KB or long edge is over 1600px', () => {
  assert.equal(shouldCompressImageFile({ size: 300 * 1024, width: 1600, height: 1200 }), false)
  assert.equal(shouldCompressImageFile({ size: 300 * 1024 + 1, width: 1200, height: 1200 }), true)
  assert.equal(shouldCompressImageFile({ size: 100 * 1024, width: 1601, height: 1200 }), true)
  assert.equal(shouldCompressImageFile({ size: 100 * 1024, width: 1200, height: 1601 }), true)
})
