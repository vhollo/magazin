import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
if (!env.PG_URL) throw new Error('PG_URL is not set');
const client = neon(env.PG_URL);
export const db = drizzle(client);
