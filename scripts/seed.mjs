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

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(url, serviceKey);

const seedPath = join(root, "scripts", "seed-data.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));

const planId = seed.id || "plan-aye-2027-default";
const now = new Date().toISOString();

const planRow = {
  id: planId,
  name: seed.name || "AYE 2027 Draft",
  data: {
    customRooms: seed.customRooms || [],
    extraGaps: seed.extraGaps || {},
    deletedGaps: seed.deletedGaps || [],
    gapOv: seed.gapOv || {},
    params: seed.params,
    dismissed: seed.dismissed || [],
    createdAt: seed.createdAt || now,
    updatedAt: now,
  },
  updated_at: now,
};

const blockRows = (seed.blocks || []).map((b, i) => {
  const known = new Set([
    "id", "band", "course", "subject", "days", "start", "end",
    "teacher", "teacher2", "room", "anchor", "staff", "splitGroup", "grades",
  ]);
  const extra = {};
  for (const [k, v] of Object.entries(b)) {
    if (!known.has(k)) extra[k] = v;
  }
  return {
    plan_id: planId,
    id: b.id,
    band: b.band || null,
    course: b.course,
    subject: b.subject || null,
    days: b.days || [],
    start_min: b.start,
    end_min: b.end,
    teacher: b.teacher || null,
    teacher2: b.teacher2 || null,
    room: b.room || null,
    anchor: !!b.anchor,
    staff: !!b.staff,
    split_group: b.splitGroup || null,
    grades: b.grades || null,
    extra,
    sort_order: i,
  };
});

const teacherRows = (seed.teachers || []).map((t, i) => ({
  plan_id: planId,
  id: t.id,
  name: t.name,
  rate: t.rate != null ? t.rate : null,
  flat: t.flat != null ? t.flat : null,
  status: t.status || null,
  subjects: t.subjects || [],
  allowed_days: t.allowedDays || null,
  windows: t.windows || null,
  max_classes: t.maxClasses != null ? t.maxClasses : null,
  virtual: !!t.virtual,
  note: t.note || null,
  sort_order: i,
}));

const { error: planErr } = await sb.from("plans").upsert(planRow, { onConflict: "id" });
if (planErr) {
  console.error("Seed failed (plans):", planErr.message);
  process.exit(1);
}

await sb.from("plan_blocks").delete().eq("plan_id", planId);
await sb.from("plan_teachers").delete().eq("plan_id", planId);

if (blockRows.length) {
  const { error } = await sb.from("plan_blocks").insert(blockRows);
  if (error) {
    console.error("Seed failed (plan_blocks):", error.message);
    console.error("Run supabase/migrations/002_blocks_teachers_tables.sql in SQL Editor first.");
    process.exit(1);
  }
}

if (teacherRows.length) {
  const { error } = await sb.from("plan_teachers").insert(teacherRows);
  if (error) {
    console.error("Seed failed (plan_teachers):", error.message);
    process.exit(1);
  }
}

console.log(`✓ Seeded plan "${planRow.name}" (${blockRows.length} blocks, ${teacherRows.length} teachers)`);
