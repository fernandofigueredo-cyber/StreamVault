import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;

feat: drizzle config lê DATABASE_URL do ambiente
