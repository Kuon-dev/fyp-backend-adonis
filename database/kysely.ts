import type { DB } from "./kysely/types.js"; // this is the Database interface we defined earlier
import pg from "pg";
import { Kysely, PostgresDialect } from "kysely";
import env from '#start/env'

const { Pool } = pg;

// const pool = new Pool({ connectionString: env.get("DATABASE_URL });

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: env.get("DATABASE_URL"),
    //host: env.get("DATABASE_LOCAL_HOST"),
    //database: env.get("DATABASE_LOCAL_DB"),
    //user: env.get("DATABASE_LOCAL_USER"),
    //password: env.get("DATABASE_LOCAL_PASSWORD"),
    //port: env.get("DATABASE_LOCAL_PORT"),
    // ssl: true,
    // connection: {
    //   options: `project=${env.get("DATABASE_PGPROJECT}`,
    // },
  }),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const kyselyDb = new Kysely<DB>({
  dialect,
});
