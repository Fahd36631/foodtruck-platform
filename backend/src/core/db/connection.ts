import knex from "knex";

import { env } from "../../config/env";

export const db = knex({
  client: "mysql2",
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
  },
  pool: {
    min: 2,
    max: 10
  }
});
