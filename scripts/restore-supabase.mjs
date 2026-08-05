#!/usr/bin/env node
/**
 * Restore Supabase schedule data from an export JSON file.
 * Usage: source .env && node scripts/restore-supabase.mjs [path/to/export.json]
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const arg = process.argv[2];
const backupPath = arg
  ? (arg.startsWith("/") ? arg : join(process.cwd(), arg))
  : join(root, "backups", "supabase-export-2026-08-05T06-35-07.json");

const exportData = JSON.parse(readFileSync(backupPath, "utf8"));
const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, key);

const plans = exportData.tables?.plans || [];
const blocks = exportData.tables?.plan_blocks || [];
const teachers = exportData.tables?.plan_teachers || [];
const autosaves = exportData.tables?.plan_autosaves || [];

console.log(`Restoring from ${backupPath}`);
console.log(`  exportedAt: ${exportData.exportedAt}`);
console.log(`  plans: ${plans.length}, blocks: ${blocks.length}, teachers: ${teachers.length}, autosaves: ${autosaves.length}`);

for (const plan of plans) {
  const { error: planErr } = await sb.from("plans").upsert(plan, { onConflict: "id" });
  if (planErr) {
    console.error("Failed to restore plan:", planErr.message);
    process.exit(1);
  }
  console.log(`✓ plan "${plan.name}" (${plan.id})`);

  const planId = plan.id;
  const planBlocks = blocks.filter((b) => b.plan_id === planId);
  const planTeachers = teachers.filter((t) => t.plan_id === planId);

  const { error: delB } = await sb.from("plan_blocks").delete().eq("plan_id", planId);
  if (delB) {
    console.error("Failed to clear plan_blocks:", delB.message);
    process.exit(1);
  }
  const { error: delT } = await sb.from("plan_teachers").delete().eq("plan_id", planId);
  if (delT) {
    console.error("Failed to clear plan_teachers:", delT.message);
    process.exit(1);
  }

  if (planBlocks.length) {
    const { error } = await sb.from("plan_blocks").insert(planBlocks);
    if (error) {
      console.error("Failed to insert plan_blocks:", error.message);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${planBlocks.length} block(s)`);

  if (planTeachers.length) {
    const { error } = await sb.from("plan_teachers").insert(planTeachers);
    if (error) {
      console.error("Failed to insert plan_teachers:", error.message);
      process.exit(1);
    }
  }
  console.log(`  ✓ ${planTeachers.length} teacher(s)`);
}

for (const auto of autosaves) {
  const { error } = await sb.from("plan_autosaves").upsert(auto, { onConflict: "plan_id" });
  if (error) {
    console.error("Failed to restore autosave:", error.message);
    process.exit(1);
  }
}
if (autosaves.length) console.log(`✓ ${autosaves.length} autosave(s)`);

// Verify
for (const table of ["plans", "plan_blocks", "plan_teachers", "plan_autosaves"]) {
  const res = await sb.from(table).select("*", { count: "exact", head: true });
  console.log(`  verify ${table}: ${res.count ?? 0} row(s)`);
}

console.log("\n✓ Restore complete");
