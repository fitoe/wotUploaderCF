import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isSameUploaderFile,
  normalizeWotStatus,
  parseUploadResponse,
  resolveImageKeyFromResponse,
  uploadToPresignedUrl,
  toUploaderFile,
  toWotFile,
} from '../dist/test/core.js'

test('resolves cloudflare image key from object or json string responses', () => {
  assert.equal(resolveImageKeyFromResponse({ key: 'abc123' }), 'abc123')
  assert.equal(resolveImageKeyFromResponse({ imageKey: 'img456' }), 'img456')
  assert.equal(resolveImageKeyFromResponse({ imageMediaId: 'media123' }), 'media123')
  assert.equal(resolveImageKeyFromResponse({ id: 'id456' }), 'id456')
  assert.equal(resolveImageKeyFromResponse('{"key":"json789"}'), 'json789')
  assert.equal(resolveImageKeyFromResponse('plain-key-123'), 'plain-key-123')
  assert.equal(resolveImageKeyFromResponse(''), undefined)
})

test('parses upload response and rejects missing keys', () => {
  assert.equal(parseUploadResponse({ key: 'abc123' }), 'abc123')
  assert.equal(parseUploadResponse({ imageMediaId: 'media123' }), 'media123')
  assert.throws(() => parseUploadResponse('{}'), /upload response missing image key/)
})

test('converts between wot upload files and public uploader files', () => {
  const uploadedKeyByUrl = new Map([['blob:file-1', 'r2-key-1']])
  const file = toUploaderFile({
    uid: 1,
    url: 'blob:file-1',
    name: 'market.jpg',
    size: 128,
    status: 'success',
    percent: 100,
  }, uploadedKeyByUrl)

  assert.deepEqual(file, {
    url: 'blob:file-1',
    path: 'blob:file-1',
    name: 'market.jpg',
    thumb: undefined,
    size: 128,
    status: 'success',
    imageKey: 'r2-key-1',
  })

  assert.equal(toWotFile(file).response.key, 'r2-key-1')
})

test('passes existing image url as Wot preview thumb for edit echo', () => {
  const file = toWotFile({
    url: 'https://cdn.example.com/media/original.png',
    imageKey: 'media-001',
    status: 'success',
  })

  assert.equal(file.url, 'https://cdn.example.com/media/original.png')
  assert.equal(file.thumb, 'https://cdn.example.com/media/original.png')
  assert.equal(file.status, 'success')
  assert.deepEqual(file.response, { key: 'media-001' })
})

test('uploads binary to a presigned url without app authorization and accepts empty response', async () => {
  const calls = []
  const response = await uploadToPresignedUrl({
    uploadUrl: 'https://account.r2.cloudflarestorage.com/bucket/media/original.png?X-Amz-Signature=abc',
    body: new Uint8Array([1, 2, 3]),
    contentType: 'image/png',
    headers: {
      Authorization: 'Bearer app-token',
      'Content-Type': 'application/octet-stream',
      'x-custom': 'ok',
    },
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return new Response('', { status: 200 })
    },
  })

  assert.deepEqual(response, { ok: true, status: 200 })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://account.r2.cloudflarestorage.com/bucket/media/original.png?X-Amz-Signature=abc')
  assert.equal(calls[0].init.method, 'PUT')
  assert.equal(calls[0].init.headers.Authorization, undefined)
  assert.equal(calls[0].init.headers['Content-Type'], 'image/png')
  assert.equal(calls[0].init.headers['x-custom'], 'ok')
})

test('normalizes statuses and compares uploaded files', () => {
  assert.equal(normalizeWotStatus('loading'), 'loading')
  assert.equal(normalizeWotStatus('unknown'), 'pending')
  assert.equal(isSameUploaderFile({ path: 'a.jpg' }, { path: 'a.jpg' }), true)
  assert.equal(isSameUploaderFile({ name: 'a.jpg', size: 10 }, { name: 'a.jpg', size: 10 }), true)
  assert.equal(isSameUploaderFile({ name: 'a.jpg', size: 10 }, { name: 'b.jpg', size: 10 }), false)
})
