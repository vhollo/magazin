//import { drizzle } from 'drizzle-orm/vercel-postgres'
//import { sql } from "@vercel/postgres"
import { MODXDB_URL } from "$env/static/private"
//console.log({MODXDB_URL})
//export const db = drizzle(sql)


import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
const connection = await mysql.createConnection({
  host: "185.187.72.2",
  port: 3306,
  user: "diabete_diabetes",
  database: "diabete_dev",
  password: "zgdZo4BuOYWqTzvb5UqN",

  /*dbCredentials: {
		url: MODXDB_URL,
    //host: "host",
    //user: "user",
    //database: "database",
	}*/
})
export const modxdb = drizzle(connection)

//export const modx = 'drizzle(connection)'