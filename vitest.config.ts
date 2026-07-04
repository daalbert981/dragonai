import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    // The default forks pool hangs in some sandboxed environments
    pool: 'threads',
    include: ['lib/__tests__/**/*.test.ts', 'app/**/__tests__/**/*.test.ts'],
  },
})
