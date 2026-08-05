#!/usr/bin/env node
/**
 * Export Supabase schedule data to JSON before deploys.
 * Usage: source .env && node scripts/export-supabase.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key);

const tables = ["plans", "plan_blocks", "plan_teachers", "plan_autosaves"];
const exportData = { exportedAt: new Date().toISOString(), tables: {} };

for (const table of tables) {
  const res = await sb.from(table).select("*");
  if (res.error) {
    console.error(`Failed to read ${table}:`, res.error.message);
    process.exit(1);
  }
  exportData.tables[table] = res.data || [];
  console.log(`✓ ${table}: ${exportData.tables[table].length} row(s)`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(root, "backups");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `supabase-export-${stamp}.json`);
writeFileSync(outPath, JSON.stringify(exportData, null, 2));
console.log(`\n✓ Wrote ${outPath}`);
