# wotUploaderCF

A reusable `uni-app` upload component built on `wot-design-uni` for Cloudflare R2 style image uploads.

It wraps `wd-upload` and handles:

- image file validation for H5 and mini program runtimes
- H5 image compression through `browser-image-compression`, with an injected `compressImage` override when needed
- default `uni.uploadFile` upload to a Cloudflare Worker/R2 endpoint
- Cloudflare-style upload responses like `{ "key": "image-key" }`
- optional async media/security check after upload
- `v-model` state shaped for post/comment image publishing

## Install

```bash
pnpm add wot-uploader-cf
```

`vue` is a peer dependency. `wot-design-uni@1.14.0` is a direct dependency because the component intentionally uses its `wd-upload` UI.

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { WotUploaderCF, type WotUploaderFile } from 'wot-uploader-cf'

const images = ref<WotUploaderFile[]>([])
</script>

<template>
  <WotUploaderCF
    v-model="images"
    upload-url="https://api.example.com/r2/upload"
    :max-count="9"
  />
</template>
```

The upload endpoint should accept multipart form data and return:

```json
{
  "key": "abc123"
}
```

Uploaded items will include `imageKey`, so you can submit only keys to your API:

```ts
const imageKeys = images.value
  .filter(item => item.status === 'success' && item.imageKey)
  .map(item => item.imageKey)
```

## With WeChat Media Check

```vue
<WotUploaderCF
  v-model="images"
  upload-url="https://api.example.com/r2/upload"
  security-check-url="https://api.example.com/wechat/imagecheck"
  :openid="openid"
/>
```

The default security check posts:

```json
{
  "image": "abc123",
  "openid": "user-openid"
}
```

For custom APIs, pass `securityCheckRequest`.

## Custom Upload Request

```vue
<script setup lang="ts">
import type { UploadRequest } from 'wot-uploader-cf'

const uploadRequest: UploadRequest = async ({ filePath, file }) => {
  const imageMediaId = await uploadProductImageForProduct(productId, {
    filePath,
    name: file.name || 'product-image',
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
  })

  return { imageMediaId }
}
</script>

<template>
  <WotUploaderCF
    v-model="images"
    :max-count="1"
    :multiple="false"
    :upload-request="uploadRequest"
  />
</template>
```

When `uploadRequest` is provided, the component follows the same flow as the built-in upload:

- it validates the selected local image
- it runs `compressImage(filePath)` first
- it passes the compressed `filePath`, `name`, `size`, and `type` into your custom request
- it skips only the default `uni.uploadFile`
- it accepts upload results shaped as `{ key }`, `{ imageKey }`, `{ imageMediaId }`, `{ id }`, JSON strings, or a plain string id

## Frontend Presigned R2 Upload

For direct browser-to-R2 uploads, keep secrets on your API. Your app should first request a short-lived upload policy from your backend, then use `uploadToPresignedUrl` to PUT the file bytes to R2:

```ts
import { uploadToPresignedUrl, type UploadRequest } from 'wot-uploader-cf'

const uploadRequest: UploadRequest = async ({ filePath, file }) => {
  const policy = await requestUploadPolicy({
    fileName: file.name || 'image.png',
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size || 0,
  })

  const body = await fetch(filePath).then(res => res.blob())
  await uploadToPresignedUrl({
    uploadUrl: policy.uploadUrl,
    headers: policy.headers,
    contentType: file.type || 'application/octet-stream',
    body,
  })

  await confirmUpload({
    mediaId: policy.mediaId,
    objectKey: policy.objectKey,
    uploadMode: policy.uploadMode,
  })

  return { imageKey: policy.mediaId }
}
```

`uploadToPresignedUrl` intentionally removes any app `Authorization` header before PUT. R2 signed URLs authenticate through the URL signature, and adding your app bearer token can break CORS/preflight. Empty successful PUT responses are treated as success.

For edit forms, pass existing files into `v-model` with their public preview URL:

```ts
images.value = [{
  url: mediaPublicUrl,
  thumb: mediaPublicUrl,
  status: 'success',
  imageKey: mediaId,
}]
```

## Optional Compression

```vue
<WotUploaderCF
  v-model="images"
  :compress-options="{ maxSizeMB: 0.3, maxWidthOrHeight: 1600, initialQuality: 0.8 }"
/>
```

By default, H5 uploads use `browser-image-compression` only when the selected image is larger than 300KB or its longest side is larger than 1600px. The default compression target is longest side `1600`, initial quality `0.8`, target size `0.3MB`.

For non-H5 runtimes, the default compressor returns the original path. You can still pass `compressImage` to override the compression pipeline; it receives the local file path and should return the path to upload.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `WotUploaderFile[]` | `[]` | Uploaded file state for `v-model`. |
| `maxCount` | `number` | `9` | Maximum image count. |
| `multiple` | `boolean` | `true` | Whether Wot allows selecting multiple files. Use `false` for one-image product uploaders. |
| `variant` | `'default' \| 'moments'` | `'default'` | `moments` hides the Wot limit counter. |
| `uploadUrl` | `string` | `'/r2/upload'` | Default `uni.uploadFile` target URL. |
| `uploadName` | `string` | `'file'` | Multipart file field name. |
| `formData` | `Record<string, unknown>` | `{}` | Extra upload form data. |
| `headers` | `Record<string, string>` | `{}` | Upload request headers. |
| `securityCheckUrl` | `string` | `''` | Optional post-upload security check URL. |
| `openid` | `string` | `''` | Optional openid sent to the default security check. |
| `validateImage` | `boolean` | `true` | Validate PNG/JPEG file headers before uploading. |
| `compressOptions` | `CompressOptions` | `{ maxSizeMB: 0.3, maxWidthOrHeight: 1600, initialQuality: 0.8, useWebWorker: true }` | H5 default compression options. |
| `compressImage` | `(filePath: string) => Promise<string>` | `undefined` | Optional custom compressor. Overrides the built-in H5 compression. |
| `uploadRequest` | `UploadRequest` | `undefined` | Fully custom upload implementation. |
| `securityCheckRequest` | `SecurityCheckRequest` | `undefined` | Fully custom post-upload check. |
| `successStatus` | `number` | `200` | Status passed to Wot `onSuccess` and `success-status`. |

## Events

| Event | Payload |
| --- | --- |
| `update:modelValue` | `WotUploaderFile[]` |
| `update:uploading` | `boolean` |
| `upload-success` | `WotUploaderFile[]` |
| `upload-error` | `unknown` |
| `beforeUpload` | `WotUploaderFile[]` |

## Development

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```
