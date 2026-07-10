import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['app/tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['app/tests/integration/**/*.test.ts'],
          hookTimeout: 30000,
          testTimeout: 15000,
          fileParallelism: false,
          sequence: { concurrent: false },
          poolOptions: { forks: { singleFork: true } },
          globalSetup: ['app/tests/integration/global-setup.ts'],
          setupFiles: ['app/tests/integration/setup.ts'],
        },
      },
      {
        test: {
          name: 'sdk',
          environment: 'jsdom',
          include: ['packages/sdk/tests/**/*.test.ts'],
        },
      },
    ],
  },
})
