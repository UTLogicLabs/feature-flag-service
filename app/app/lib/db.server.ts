import pg from 'pg'

const { Pool } = pg

declare global {
  var __featureFlagsPool: pg.Pool | undefined
}

export const pool =
  global.__featureFlagsPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') {
  global.__featureFlagsPool = pool
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params)
}
