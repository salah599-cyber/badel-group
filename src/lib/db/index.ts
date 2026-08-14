import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

function isCiPlaceholderDatabase(url: string) {
  return url.includes("localhost:5432/ci");
}

export const db =
  connectionString && !isCiPlaceholderDatabase(connectionString)
    ? drizzle(neon(connectionString), { schema })
    : null;

export function hasDatabase() {
  return Boolean(db);
}
