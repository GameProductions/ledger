import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e'],
    alias: {
      '@': resolve(__dirname, './apps/web'),
      '~': resolve(__dirname, './apps/api'),
      '#': resolve(__dirname, './db'),
      '@shared': resolve(__dirname, './packages/shared'),
    },
  },
})
