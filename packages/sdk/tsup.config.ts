import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    minify: true,
    sourcemap: true,
    clean: true,
    globalName: 'FeatureFlags',
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    minify: true,
    sourcemap: false,
    globalName: 'FeatureFlags',
    outExtension: () => ({ js: '.global.js' }),
  },
])
