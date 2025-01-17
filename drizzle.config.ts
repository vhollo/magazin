import { config } from 'dotenv';
import { defineConfig } from "drizzle-kit";

/*
export default defineConfig({
  schema: "./src/lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  breakpoints: true,
  dbCredentials: {
    url: process.env.C_URL!,
    connectionString: process.env.C_PASSWORD!,
  },
  verbose: true,
  strict: true,
});
*/


console.log('.env:',process.env.BASE_URL)
if (!process.env.MODXDB_URL)
    throw new Error("env.MODXDB_URL is not set");

export default defineConfig({
  //schema: "./src/lib/vercel/schema.ts",
  schema: "./drizzle/schema.ts",
  out: './drizzle',
  dialect: "mysql",
  driver: "mysql2",
  dbCredentials: {
      url: process.env.MODXDB_URL
  },

  verbose: true,
  //strict: true
})
