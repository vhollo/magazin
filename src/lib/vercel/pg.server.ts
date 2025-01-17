import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString: string = process.env.PG_URL as string;

const sql = neon(connectionString);
export { sql };