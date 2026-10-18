import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@contracts': resolve(import.meta.dirname, 'src/contracts'),
      '@kernel': resolve(import.meta.dirname, 'src/kernel'),
      '@platforms': resolve(import.meta.dirname, 'src/platforms'),
      '@tools': resolve(import.meta.dirname, 'src/tools')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000
  }
})
