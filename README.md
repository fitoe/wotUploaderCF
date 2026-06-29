# wotUploaderCF

A reusable `uni-app` upload component built on `wot-design-uni` for Cloudflare R2 style image uploads.

It wraps `wd-upload` and handles:

- image file validation for H5 and mini program runtimes
- optional image compression through an injected `compressImage` function
- default `uni.uploadFile` upload to a Cloudflare Worker/R2 endpoint
- Cloudflare-style upload responses like `{ "key": "image-key" }`
- optional async media/security check after upload
- `v-model` state shaped for post/comment image publishing

## Install

```bash
pnpm add wot-uploader-cf wot-design-uni
```

`vue` and `wot-design-uni` are peer dependencies. In a `uni-app` project, make sure `wot-design-uni` is already configured.

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

const uploadRequest: UploadRequest = async ({ filePath }) => {
  const result = await myUploadSdk.upload(filePath)
  return { key: result.key }
}
</script>

<template>
  <WotUploaderCF v-model="images" :upload-request="uploadRequest" />
</template>
```

## Optional Compression

```vue
<WotUploaderCF
  v-model="images"
  :compress-image="compressImage"
/>
```

`compressImage` receives the local file path and should return the compressed local file path. By default, the component uploads the original file.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `WotUploaderFile[]` | `[]` | Uploaded file state for `v-model`. |
| `maxCount` | `number` | `9` | Maximum image count. |
| `variant` | `'default' \| 'moments'` | `'default'` | `moments` hides the Wot limit counter. |
| `uploadUrl` | `string` | `'/r2/upload'` | Default `uni.uploadFile` target URL. |
| `uploadName` | `string` | `'file'` | Multipart file field name. |
| `formData` | `Record<string, unknown>` | `{}` | Extra upload form data. |
| `headers` | `Record<string, string>` | `{}` | Upload request headers. |
| `securityCheckUrl` | `string` | `''` | Optional post-upload security check URL. |
| `openid` | `string` | `''` | Optional openid sent to the default security check. |
| `validateImage` | `boolean` | `true` | Validate PNG/JPEG file headers before uploading. |
| `compressImage` | `(filePath: string) => Promise<string>` | identity | Optional compressor. |
| `uploadRequest` | `UploadRequest` | `undefined` | Fully custom upload implementation. |
| `securityCheckRequest` | `SecurityCheckRequest` | `undefined` | Fully custom post-upload check. |

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
