import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BUDGET_BYTES = 2048
const dir = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(dir, '..', 'dist', 'index.global.js')

const source = readFileSync(target)
const gzipped = gzipSync(source)

console.log(`SDK bundle: ${target}`)
console.log(`raw: ${source.length} bytes, gzipped: ${gzipped.length} bytes (budget: ${BUDGET_BYTES} bytes)`)

if (gzipped.length > BUDGET_BYTES) {
  console.error(`FAIL: gzipped size ${gzipped.length} exceeds budget of ${BUDGET_BYTES} bytes`)
  process.exit(1)
}

console.log('OK: within size budget')
