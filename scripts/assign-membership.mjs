#!/usr/bin/env node
/**
 * Assign a 3-digit membership number to a Clerk user by email.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_... DATABASE_URL=... node scripts/assign-membership.mjs user@example.com
 */
import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

function loadEnvFile(filename) {
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/assign-membership.mjs <email>");
  process.exit(1);
}

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is required.");
  process.exit(1);
}

const MEMBERSHIP_MIN = 100;
const MEMBERSHIP_MAX = 999;

function normalizeMembershipNumber(input) {
  const digits = String(input).replace(/\D/g, "");
  if (!digits || digits.length > 3) return null;
  const value = Number.parseInt(digits, 10);
  if (Number.isNaN(value) || value < MEMBERSHIP_MIN || value > MEMBERSHIP_MAX) return null;
  return String(value);
}

function randomMembershipNumber() {
  return String(Math.floor(Math.random() * (MEMBERSHIP_MAX - MEMBERSHIP_MIN + 1)) + MEMBERSHIP_MIN);
}

function readMembership(meta) {
  const raw = meta?.membershipNumber ?? meta?.membership_number;
  if (raw == null || raw === "") return null;
  return normalizeMembershipNumber(raw);
}

const clerk = createClerkClient({ secretKey });

const { data } = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
const user = data[0];
if (!user) {
  console.error(`No Clerk user found for ${email}`);
  process.exit(1);
}

const existing = readMembership(user.publicMetadata);
if (existing) {
  console.log(`User already has membership #${existing} (${user.id})`);
  process.exit(0);
}

let assigned = null;
for (let attempt = 0; attempt < 50; attempt += 1) {
  const candidate = randomMembershipNumber();
  const { data: all } = await clerk.users.getUserList({ limit: 100 });
  const taken = all.some((u) => readMembership(u.publicMetadata) === candidate);
  if (taken) continue;

  await clerk.users.updateUserMetadata(user.id, {
    publicMetadata: {
      ...user.publicMetadata,
      membershipNumber: candidate,
    },
  });
  assigned = candidate;
  break;
}

if (!assigned) {
  console.error("Could not assign a unique membership number.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes("localhost:5432/ci")) {
  try {
    const sql = neon(databaseUrl);
    await sql`
      INSERT INTO user_membership_numbers (user_id, membership_number)
      VALUES (${user.id}, ${assigned})
      ON CONFLICT (user_id) DO UPDATE SET membership_number = EXCLUDED.membership_number
    `;
  } catch (error) {
    console.warn("Database index update failed (membership still set in Clerk):", error);
  }
}

console.log(`Assigned membership #${assigned} to ${email}`);
