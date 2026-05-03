import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schemas/notification_engine.ts',
  out: './db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
} satisfies Config;
