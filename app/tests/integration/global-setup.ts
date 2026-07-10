import { execSync } from 'node:child_process'
import path from 'node:path'
import dotenv from 'dotenv'

export default function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') })
  const repoRoot = path.resolve(__dirname, '../../..')
  execSync('node-pg-migrate --migrations-dir db/migrations --migrations-table pgmigrations up', {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}
