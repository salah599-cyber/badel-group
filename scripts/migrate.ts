import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = neon(url);
  const migration = fs.readFileSync(
    path.join(process.cwd(), "drizzle/0000_init.sql"),
    "utf8",
  );

  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
    console.log("Executed:", statement.slice(0, 60) + "...");
  }

  console.log("Migration complete!");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
