//import { drizzle } from 'drizzle-orm/vercel-postgres'
//import { sql } from "@vercel/postgres"
import { MODXDB_HOST, MODXDB_PORT, MODXDB_USER, MODXDB_DATABASE, MODXDB_PASSWORD } from "$env/static/private"
//export const db = drizzle(sql)

//console.log(MODXDB_HOST)

import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
const connection = await mysql.createConnection({
  host: MODXDB_HOST,
  port: Number(MODXDB_PORT),
  user: MODXDB_USER,
  database: MODXDB_DATABASE,
  password: MODXDB_PASSWORD,

})
export const modxdb = drizzle(connection)

//export const modx = 'drizzle(connection)'