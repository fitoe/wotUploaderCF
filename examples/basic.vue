<script setup lang="ts">
import { ref } from 'vue'
import { WotUploaderCF, type WotUploaderFile } from 'wot-uploader-cf'

const images = ref<WotUploaderFile[]>([])
const openid = 'user-openid'
</script>

<template>
  <WotUploaderCF
    v-model="images"
    upload-url="https://api.example.com/r2/upload"
    security-check-url="https://api.example.com/wechat/imagecheck"
    :openid="openid"
    :max-count="9"
  />
</template>
