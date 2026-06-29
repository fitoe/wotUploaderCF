import type { UploadFileItem } from 'wot-design-uni/components/wd-upload/types'

export interface CloudflareUploadResponse {
  key: string
  [key: string]: unknown
}

export interface WotUploaderFile {
  url?: string
  path?: string
  name?: string
  thumb?: string
  size?: number
  type?: string
  status?: 'pending' | 'loading' | 'uploading' | 'success' | 'fail'
  imageKey?: string
}

export interface UploadRequestContext {
  filePath: string
  file: WotUploaderFile
  uploadUrl: string
  uploadName: string
  formData: Record<string, unknown>
  headers: Record<string, string>
}

export interface SecurityCheckContext {
  imageKey: string
  file: WotUploaderFile
  securityCheckUrl: string
  openid?: string
}

export type UploadRequest = (context: UploadRequestContext) => Promise<CloudflareUploadResponse | string>
export type SecurityCheckRequest = (context: SecurityCheckContext) => Promise<unknown>
export type CompressImage = (filePath: string) => Promise<string>

export interface WotUploaderCFProps {
  modelValue?: WotUploaderFile[]
  maxCount?: number
  variant?: 'default' | 'moments'
  uploadUrl?: string
  uploadName?: string
  formData?: Record<string, unknown>
  headers?: Record<string, string>
  securityCheckUrl?: string
  openid?: string
  validateImage?: boolean
  compressImage?: CompressImage
  uploadRequest?: UploadRequest
  securityCheckRequest?: SecurityCheckRequest
}

export type WotUploadFileItem = UploadFileItem & {
  imageKey?: string
  path?: string
}
