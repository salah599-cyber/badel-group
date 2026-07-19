import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL="([^"]+)"/)?.[1];
if (!url) throw new Error("No DATABASE_URL");

const sql = neon(url);

const sponsors = await sql`SELECT id, name, tier, logo_url FROM sponsors ORDER BY created_at DESC LIMIT 10`;
console.log("Sponsor count:", sponsors.length);
console.log(JSON.stringify(sponsors, null, 2));
