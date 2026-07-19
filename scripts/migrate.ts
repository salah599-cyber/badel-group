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
  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`\n--- ${file} ---`);
    const migration = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = migration
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await sql.query(statement);
        console.log("OK:", statement.slice(0, 70).replace(/\s+/g, " ") + "...");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          message.includes("already exists") ||
          message.includes("duplicate key") ||
          message.includes("does not exist")
        ) {
          console.log("Skip:", message.slice(0, 100));
        } else {
          throw error;
        }
      }
    }
  }

  console.log("\nMigration complete!");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
