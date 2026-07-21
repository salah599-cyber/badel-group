import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

function loadEnvFile(filename: string) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "$" && sql[i + 1] === "$") {
      inDollarQuote = !inDollarQuote;
      current += "$$";
      i += 1;
      continue;
    }

    if (sql[i] === ";" && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += sql[i];
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}

async function migrate() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const url = process.env.DATABASE_URL;
  if (!url || url.includes("localhost:5432/ci")) {
    console.log("Skipping database migration (no production DATABASE_URL).");
    return;
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
    const statements = splitSqlStatements(migration);

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
