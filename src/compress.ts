import imageCompression from 'browser-image-compression'

export interface DefaultCompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  initialQuality?: number
  useWebWorker?: boolean
}

const defaultCompressOptions: Required<DefaultCompressOptions> = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1600,
  initialQuality: 0.8,
  useWebWorker: true,
}
const defaultCompressThresholdBytes = 300 * 1024

export interface ImageCompressionCandidate {
  size: number
  width: number
  height: number
}

export function shouldCompressImageFile(candidate: ImageCompressionCandidate) {
  return candidate.size > defaultCompressThresholdBytes
    || candidate.width > defaultCompressOptions.maxWidthOrHeight
    || candidate.height > defaultCompressOptions.maxWidthOrHeight
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

function readImageDimensions(file: File) {
  return new Promise<{ width: number, height: number }>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('image dimensions read failed'))
    }

    image.src = objectUrl
  })
}

export async function compressImageWithBrowserLibrary(
  filePath: string,
  options: DefaultCompressOptions = {},
) {
  if (!isH5Runtime())
    return filePath

  const sourceFile = await readFileFromPath(filePath)
  const dimensions = await readImageDimensions(sourceFile)
  if (!shouldCompressImageFile({ size: sourceFile.size, ...dimensions }))
    return filePath

  const compressed = await imageCompression(sourceFile, {
    ...defaultCompressOptions,
    ...options,
  })
  return URL.createObjectURL(compressed)
}
