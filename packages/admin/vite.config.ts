import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['naive-ui', 'pinia', 'vue', 'zod']
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
