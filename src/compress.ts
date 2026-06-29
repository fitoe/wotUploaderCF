import imageCompression from 'browser-image-compression'

export interface DefaultCompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  initialQuality?: number
  useWebWorker?: boolean
}

const defaultCompressOptions: Required<DefaultCompressOptions> = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 1024,
  initialQuality: 0.8,
  useWebWorker: true,
}

function isH5Runtime() {
  return typeof window !== 'undefined'
    && typeof fetch === 'function'
    && typeof File !== 'undefined'
    && typeof URL !== 'undefined'
    && typeof URL.createObjectURL === 'function'
}

function getFileNameFromPath(filePath: string) {
  const fallback = 'image.jpg'
  try {
    const path = filePath.split('?')[0] || ''
    const name = path.split('/').pop()
    return name || fallback
  }
  catch {
    return fallback
  }
}

async function readFileFromPath(filePath: string) {
  const response = await fetch(filePath)
  if (!response.ok)
    throw new Error(`image read failed: ${response.status}`)

  const blob = await response.blob()
  return new File([blob], getFileNameFromPath(filePath), {
    type: blob.type || 'image/jpeg',
  })
}

export async function compressImageWithBrowserLibrary(
  filePath: string,
  options: DefaultCompressOptions = {},
) {
  if (!isH5Runtime())
    return filePath

  const sourceFile = await readFileFromPath(filePath)
  if (sourceFile.size <= defaultCompressOptions.maxSizeMB * 1024 * 1024)
    return filePath

  const compressed = await imageCompression(sourceFile, {
    ...defaultCompressOptions,
    ...options,
  })
  return URL.createObjectURL(compressed)
}
