#!/usr/bin/env node
/**
 * One-shot Supabase setup for NSCS Schedule Planner.
 *
 * Requires in environment (or .env loaded by caller):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_DB_PASSWORD  (project database password, for running migration SQL)
 *
 * Usage:
 *   source .env && node scripts/setup-supabase.mjs
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

console.log("→ Project:", projectRef || url);

// 1. Run migrations via psql if connection available
const migrationFiles = readdirSync(join(root, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

function runMigrations(connLabel, conn) {
  for (const file of migrationFiles) {
    const path = join(root, "supabase/migrations", file);
    console.log(`→ Running ${file} via ${connLabel}…`);
    execSync(`psql "${conn}" -v ON_ERROR_STOP=1 -f "${path}"`, {
      stdio: "inherit",
      env: process.env,
    });
  }
  console.log("✓ Migrations applied");
}

const dbUrl = process.env.SUPABASE_DB_URL;

if (dbUrl) {
  try {
    runMigrations("SUPABASE_DB_URL", dbUrl);
  } catch {
    console.error("✗ Migration via SUPABASE_DB_URL failed.");
    console.error("  Run files in supabase/migrations/ via Supabase SQL Editor.");
    process.exit(1);
  }
} else if (dbPassword && projectRef) {
  const host = `db.${projectRef}.supabase.co`;
  const conn = `postgresql://postgres:${encodeURIComponent(dbPassword)}@${host}:5432/postgres?sslmode=require`;
  try {
    runMigrations("psql", conn);
  } catch {
    console.error("✗ Migration failed (direct DB may be IPv6-only from this network).");
    console.error("  Add SUPABASE_DB_URL from Dashboard → Connect → Session pooler URI,");
    console.error("  or run supabase/migrations/*.sql in SQL Editor.");
    process.exit(1);
  }
} else {
  console.log("⚠ SUPABASE_DB_PASSWORD / SUPABASE_DB_URL not set — skipping migrations.");
  console.log("  Run supabase/migrations/*.sql in Supabase SQL Editor, then re-run.");
}

// 2. Seed default plan
console.log("→ Seeding default AYE 2027 plan…");
execSync("node scripts/seed.mjs", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

// 3. Verify tables
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, serviceKey);
const { data, error } = await sb.from("plans").select("id,name, plan_blocks(count), plan_teachers(count)").limit(5);
if (error) {
  console.error("✗ Could not read plans table:", error.message);
  if (!dbPassword) console.error("  Migration may not have been applied yet.");
  process.exit(1);
}
console.log("✓ plans table readable:", data?.length ?? 0, "row(s)");
if (data?.length) data.forEach((r) => console.log("   -", r.id, ":", r.name));

console.log("\nNext steps:");
console.log("  1. Supabase Dashboard → Auth → disable public sign-up");
console.log("  2. Invite users: Authentication → Users → Invite user");
console.log("  3. Cloudflare Pages: set SUPABASE_URL + SUPABASE_ANON_KEY build env vars");
console.log("  4. npm run build && deploy dist/");
