<script setup lang="ts">
import type {
  CloudflareUploadResponse,
  UploadRequestContext,
  WotUploadFileItem,
  WotUploaderCFProps,
  WotUploaderFile,
} from './types'
import type {
  UploadBeforeUpload,
  UploadChangeEvent,
  UploadErrorEvent,
  UploadMethod,
  UploadRemoveEvent,
  UploadSuccessEvent,
} from 'wot-design-uni/components/wd-upload/types'
import { computed, ref, watch } from 'vue'
import { compressImageWithBrowserLibrary } from './compress'
import { isSameUploaderFile, parseUploadResponse, toUploaderFile, toWotFile } from './core'

const props = withDefaults(defineProps<WotUploaderCFProps>(), {
  modelValue: () => [],
  maxCount: 9,
  multiple: true,
  variant: 'default',
  uploadUrl: '/r2/upload',
  uploadName: 'file',
  formData: () => ({}),
  headers: () => ({}),
  securityCheckUrl: '',
  openid: '',
  validateImage: true,
  compressOptions: () => ({}),
  compressImage: undefined,
  uploadRequest: undefined,
  securityCheckRequest: undefined,
  successStatus: 200,
})

const emit = defineEmits<{
  'update:modelValue': [value: WotUploaderFile[]]
  'update:uploading': [value: boolean]
  'upload-success': [files: WotUploaderFile[]]
  'upload-error': [error: unknown]
  'beforeUpload': [files: WotUploaderFile[]]
}>()

const uploadingCount = ref(0)
const uploadedKeyByUrl = new Map<string, string>()
const currentFileList = computed(() => props.modelValue || [])
const wotFileList = computed(() => currentFileList.value.map(toWotFile))
const isUploading = computed(() => uploadingCount.value > 0)

watch(isUploading, value => emit('update:uploading', value))

function updateFileList(files: WotUploaderFile[]) {
  emit('update:modelValue', files)
}

function readFileInfo(filePath: string) {
  return new Promise<{ size: number }>((resolve) => {
    uni.getFileInfo({
      filePath,
      success: result => resolve({ size: Number(result.size || 0) }),
      fail: () => resolve({ size: 0 }),
    })
  })
}

async function readFileHeader(filePath: string) {
  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const response = await fetch(filePath)
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer).subarray(0, 4)
  }

  const fs = uni.getFileSystemManager()
  const buffer = fs.readFileSync(filePath)
  const bytes = typeof buffer === 'string'
    ? new TextEncoder().encode(buffer)
    : new Uint8Array(buffer as ArrayBuffer)
  return bytes.subarray(0, 4)
}

async function isImageFile(filePath: string) {
  if (!props.validateImage)
    return true

  try {
    const header = Array.from(await readFileHeader(filePath))
      .map(value => value.toString(16).padStart(2, '0'))
      .join('')
    return ['89504e47', 'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'].includes(header)
  }
  catch {
    return false
  }
}

function defaultUploadRequest(context: UploadRequestContext) {
  return new Promise<CloudflareUploadResponse | string>((resolve, reject) => {
    uni.uploadFile({
      url: context.uploadUrl,
      name: context.uploadName,
      filePath: context.filePath,
      formData: context.formData,
      header: context.headers,
      success: result => resolve(result.data),
      fail: reject,
    })
  })
}

async function runSecurityCheck(imageKey: string, file: WotUploaderFile) {
  if (props.securityCheckRequest) {
    await props.securityCheckRequest({
      imageKey,
      file,
      securityCheckUrl: props.securityCheckUrl,
      openid: props.openid || undefined,
    })
    return
  }

  if (!props.securityCheckUrl)
    return

  await new Promise<void>((resolve, reject) => {
    uni.request({
      url: props.securityCheckUrl,
      method: 'POST',
      data: {
        image: imageKey,
        openid: props.openid,
      },
      success: () => resolve(),
      fail: reject,
    })
  })
}

async function uploadSingleFile(file: WotUploaderFile) {
  if (!file.url)
    throw new Error('file path is invalid')

  if (!await isImageFile(file.url))
    throw new Error('file is not an image')

  const compressedPath = props.compressImage
    ? await props.compressImage(file.url)
    : await compressImageWithBrowserLibrary(file.url, props.compressOptions)
  const fileInfo = await readFileInfo(compressedPath)
  const uploadFile = {
    ...file,
    url: compressedPath,
    path: compressedPath,
    size: fileInfo.size || file.size,
  }
  const uploadRequest = props.uploadRequest || defaultUploadRequest
  const response = await uploadRequest({
    filePath: compressedPath,
    file: uploadFile,
    uploadUrl: props.uploadUrl,
    uploadName: props.uploadName,
    formData: props.formData,
    headers: props.headers,
  })
  const imageKey = parseUploadResponse(response)
  await runSecurityCheck(imageKey, uploadFile)
  return {
    ...uploadFile,
    status: 'success',
    imageKey,
  } satisfies WotUploaderFile
}

const handleWotUpload: UploadMethod = async (uploadFile, formData, options) => {
  uploadingCount.value += 1
  try {
    const sourceFile: WotUploaderFile = {
      url: uploadFile.url,
      path: uploadFile.url,
      name: uploadFile.name,
      size: uploadFile.size,
      type: (uploadFile as WotUploadFileItem & { type?: string }).type,
      thumb: uploadFile.thumb,
      status: 'loading',
    }
    const uploadedFile = await uploadSingleFile(sourceFile)
    if (uploadFile.url)
      uploadedKeyByUrl.set(uploadFile.url, uploadedFile.imageKey || '')
    ;(uploadFile as WotUploadFileItem).imageKey = uploadedFile.imageKey
    uploadFile.response = {
      key: uploadedFile.imageKey,
      imageKey: uploadedFile.imageKey,
    }
    options.onSuccess({
      statusCode: props.successStatus,
      data: JSON.stringify({
        key: uploadedFile.imageKey,
        imageKey: uploadedFile.imageKey,
      }),
      errMsg: 'uploadFile:ok',
    }, uploadFile, formData)
  }
  catch (error) {
    uni.showToast({
      title: error instanceof Error && error.message === 'file is not an image' ? '文件不是图片' : '图片上传失败，请重试',
      icon: 'none',
    })
    options.onError({
      errMsg: error instanceof Error ? error.message : String(error),
    }, uploadFile, formData)
    emit('upload-error', error)
  }
  finally {
    uploadingCount.value = Math.max(uploadingCount.value - 1, 0)
  }
}

const handleBeforeUpload: UploadBeforeUpload = (option) => {
  const nextFiles = option.files.map(file => toUploaderFile(file as WotUploadFileItem, uploadedKeyByUrl))
  emit('beforeUpload', nextFiles)
  option.resolve(true)
}

function handleWotChange(event: UploadChangeEvent) {
  updateFileList(event.fileList.map(file => toUploaderFile(file as WotUploadFileItem, uploadedKeyByUrl)))
}

function handleWotSuccess(event: UploadSuccessEvent) {
  const nextFiles = event.fileList.map(file => toUploaderFile(file as WotUploadFileItem, uploadedKeyByUrl))
  updateFileList(nextFiles)
  emit('upload-success', [toUploaderFile(event.file as WotUploadFileItem, uploadedKeyByUrl)])
}

function handleWotFail(event: UploadErrorEvent) {
  emit('upload-error', event.error)
}

function handleWotRemove(event: UploadRemoveEvent) {
  const removed = toUploaderFile(event.file as WotUploadFileItem, uploadedKeyByUrl)
  updateFileList(currentFileList.value.filter(item => !isSameUploaderFile(item, removed)))
}
</script>

<template>
  <wd-upload
    :file-list="wotFileList"
    :limit="props.maxCount"
    :multiple="props.multiple"
    :auto-upload="true"
    :upload-method="handleWotUpload"
    :before-upload="handleBeforeUpload"
    :show-limit-num="props.variant !== 'moments'"
    image-mode="aspectFill"
    :success-status="props.successStatus"
    @change="handleWotChange"
    @success="handleWotSuccess"
    @fail="handleWotFail"
    @remove="handleWotRemove"
  />
</template>
