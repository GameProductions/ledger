import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

export function getDb(env: any) {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}
