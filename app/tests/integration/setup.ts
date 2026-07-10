import path from 'node:path'
import dotenv from 'dotenv'
import { beforeEach } from 'vitest'

dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') })

beforeEach(async () => {
  const { pool } = await import('../../app/lib/db.server')
  await pool.query('TRUNCATE flags, segments, audit_log, users RESTART IDENTITY CASCADE')
})
