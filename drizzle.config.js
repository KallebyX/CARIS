import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL || "postgresql://localhost:5432/caris"
  },
  verbose: true,
  strict: true,
});