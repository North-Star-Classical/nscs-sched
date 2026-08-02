#!/usr/bin/env node
/**
 * Seed the default AYE 2027 plan into Supabase.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 *
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role — never commit).");
  process.exit(1);
}

// Dynamic import of supabase-js if available; fallback to REST
let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch {
  console.error("Install @supabase/supabase-js for seeding, or insert via SQL Editor.");
  process.exit(1);
}

const sb = createClient(url, serviceKey);

// Load seed data from built defaults file
const seedPath = join(root, "scripts", "seed-data.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));

const planId = seed.id || "plan-aye-2027-default";
const row = {
  id: planId,
  name: seed.name || "AYE 2027 Draft",
  data: {
    blocks: seed.blocks,
    teachers: seed.teachers,
    customRooms: seed.customRooms || [],
    extraGaps: seed.extraGaps || {},
    deletedGaps: seed.deletedGaps || [],
    gapOv: seed.gapOv || {},
    params: seed.params,
    dismissed: seed.dismissed || [],
    createdAt: seed.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  updated_at: new Date().toISOString(),
};

const { error } = await sb.from("plans").upsert(row, { onConflict: "id" });
if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`✓ Seeded plan "${row.name}" (${seed.blocks.length} blocks, ${seed.teachers.length} teachers)`);
