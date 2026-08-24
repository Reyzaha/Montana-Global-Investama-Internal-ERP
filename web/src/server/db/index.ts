import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

export const client = postgres(databaseUrl ?? "postgres://localhost/mgi_erp", {
  max: 1,
  prepare: false,
});

export const db = drizzle(client, { schema });