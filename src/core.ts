import type { CloudflareUploadResponse, WotUploadFileItem, WotUploaderFile } from './types'

export interface PresignedUploadInput {
  uploadUrl: string
  body: BodyInit
  contentType?: string
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
}

export interface PresignedUploadResult {
  ok: true
  status: number
  data?: unknown
  text?: string
}

export function resolveImageKeyFromResponse(response: unknown): string | undefined {
  if (!response)
    return undefined

  if (typeof response === 'string') {
    const text = response.trim()
    if (text && !text.startsWith('{') && !text.startsWith('['))
      return text

    try {
      return resolveImageKeyFromResponse(JSON.parse(text))
    }
    catch {
      return undefined
    }
  }

  if (typeof response === 'object') {
    const payload = response as Record<string, unknown>
    const key = payload.key || payload.imageKey || payload.imageMediaId || payload.id
    return key ? String(key) : undefined
  }

  return undefined
}

export function normalizeWotStatus(status: unknown): WotUploaderFile['status'] {
  if (status === 'loading' || status === 'pending' || status === 'fail' || status === 'success')
    return status

  return 'pending'
}

export function toUploaderFile(file: WotUploadFileItem, uploadedKeyByUrl = new Map<string, string>()): WotUploaderFile {
  const filePath = file.url || file.path || ''
  const imageKey = file.imageKey || (file.url ? uploadedKeyByUrl.get(file.url) : undefined) || resolveImageKeyFromResponse(file.response)
  return {
    url: filePath,
    path: filePath,
    name: file.name,
    thumb: file.thumb,
    size: file.size,
    status: imageKey ? 'success' : normalizeWotStatus(file.status),
    imageKey: imageKey ? String(imageKey) : undefined,
  }
}

export function toWotFile(file: WotUploaderFile): WotUploadFileItem {
  const previewUrl = file.thumb || file.url || file.path || ''
  return {
    uid: 0,
    url: file.url || file.path || '',
    name: file.name || '',
    thumb: previewUrl,
    size: file.size || 0,
    status: file.status === 'uploading' ? 'loading' : (file.status || 'success'),
    percent: file.status === 'success' ? 100 : 0,
    response: file.imageKey ? { key: file.imageKey } : '',
    imageKey: file.imageKey,
  } as WotUploadFileItem
}

export function isSameUploaderFile(left: WotUploaderFile, right: WotUploaderFile) {
  return Boolean(
    (left.path && left.path === right.path)
    || (left.url && left.url === right.url)
    || (left.name && left.name === right.name && left.size === right.size),
  )
}

export function parseUploadResponse(response: CloudflareUploadResponse | string): string {
  const imageKey = resolveImageKeyFromResponse(response)
  if (!imageKey)
    throw new Error('upload response missing image key')

  return imageKey
}

function buildPresignedUploadHeaders(headers: Record<string, string> = {}, contentType?: string) {
  const nextHeaders: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization')
      continue
    if (key.toLowerCase() === 'content-type')
      continue
    nextHeaders[key] = value
  }

  if (contentType)
    nextHeaders['Content-Type'] = contentType

  return nextHeaders
}

export async function uploadToPresignedUrl(input: PresignedUploadInput): Promise<PresignedUploadResult> {
  const fetchImpl = input.fetchImpl || fetch
  const response = await fetchImpl(input.uploadUrl, {
    method: 'PUT',
    headers: buildPresignedUploadHeaders(input.headers, input.contentType),
    body: input.body,
  })

  if (!response.ok)
    throw new Error(`presigned upload failed: ${response.status}`)

  const text = await response.text()
  if (!text)
    return { ok: true, status: response.status }

  try {
    return { ok: true, status: response.status, data: JSON.parse(text), text }
  }
  catch {
    return { ok: true, status: response.status, text }
  }
}
