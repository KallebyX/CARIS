import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set")
}

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL,
  },
}
