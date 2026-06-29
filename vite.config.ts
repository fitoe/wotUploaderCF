import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WotUploaderCF',
      fileName: 'wot-uploader-cf',
    },
    rollupOptions: {
      external: ['vue', 'wot-design-uni'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          'wot-design-uni': 'WotDesignUni',
        },
      },
    },
  },
})
