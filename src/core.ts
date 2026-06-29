import type { CloudflareUploadResponse, WotUploadFileItem, WotUploaderFile } from './types'

export function resolveImageKeyFromResponse(response: unknown): string | undefined {
  if (!response)
    return undefined

  if (typeof response === 'string') {
    try {
      return resolveImageKeyFromResponse(JSON.parse(response))
    }
    catch {
      return undefined
    }
  }

  if (typeof response === 'object') {
    const payload = response as Record<string, unknown>
    const key = payload.key || payload.imageKey
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
  return {
    uid: 0,
    url: file.url || file.path || '',
    name: file.name || '',
    thumb: file.thumb || '',
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
