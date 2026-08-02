/* globals injected at build time: SUPABASE_URL, SUPABASE_ANON_KEY, NSCS_TEST_MODE, APP_VERSION */

var SUPABASE_URL = "__SUPABASE_URL__";
var SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
var NSCS_TEST_MODE = __NSCS_TEST_MODE__;
var APP_VERSION = "__APP_VERSION__";

var sb = null;
if (!NSCS_TEST_MODE && SUPABASE_URL && SUPABASE_ANON_KEY && typeof supabase !== "undefined") {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function planFromRow(row) {
  if (!row) return null;
  var d = row.data || {};
  return {
    id: row.id,
    name: row.name,
    blocks: d.blocks || [],
    teachers: d.teachers || [],
    customRooms: d.customRooms || [],
    extraGaps: d.extraGaps || {},
    deletedGaps: d.deletedGaps || [],
    gapOv: d.gapOv || {},
    params: d.params || {},
    dismissed: d.dismissed || [],
    createdAt: d.createdAt || row.created_at,
    updatedAt: d.updatedAt || row.updated_at,
  };
}

function planToData(plan) {
  return {
    blocks: plan.blocks || [],
    teachers: plan.teachers || [],
    customRooms: plan.customRooms || [],
    extraGaps: plan.extraGaps || {},
    deletedGaps: plan.deletedGaps || [],
    gapOv: plan.gapOv || {},
    params: plan.params || {},
    dismissed: plan.dismissed || [],
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
