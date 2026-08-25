/* globals injected at build time: SUPABASE_URL, SUPABASE_ANON_KEY, NSCS_TEST_MODE, APP_VERSION */

var SUPABASE_URL = "__SUPABASE_URL__";
var SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
var NSCS_TEST_MODE = __NSCS_TEST_MODE__;
var APP_VERSION = "__APP_VERSION__";

var sb = null;

function ensureSupabaseClient() {
  if (NSCS_TEST_MODE) return null;
  if (sb) return sb;
  if (typeof supabase !== "undefined" && SUPABASE_URL && SUPABASE_ANON_KEY) {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return sb;
}

var DEFAULT_ROOMS = [
  "202/203", "204", "205", "206", "207/208", "209/210", "211", "212", "213", "214",
  "C130", "F.Hall", "COVE", "Gym", "Field", "TBD",
];

function resolvePlanRooms(metaOrPlan) {
  var d = metaOrPlan || {};
  if (d.rooms && d.rooms.length) return d.rooms.slice().sort();
  if (d.planRooms && d.planRooms.length) return d.planRooms.slice().sort();
  var legacy = d.customRooms || [];
  var merged = DEFAULT_ROOMS.slice();
  legacy.forEach(function (r) {
    if (r && merged.indexOf(r) < 0) merged.push(r);
  });
  return merged.sort();
}

var BLOCK_ROW_KEYS = {
  id: 1, band: 1, course: 1, subject: 1, days: 1, start: 1, end: 1,
  teacher: 1, teacher2: 1, room: 1, anchor: 1, staff: 1, splitGroup: 1, grades: 1,
};

var TEACHER_ROW_KEYS = {
  id: 1, name: 1, rate: 1, flat: 1, status: 1, subjects: 1,
  allowedDays: 1, windows: 1, maxClasses: 1, virtual: 1, note: 1, roles: 1,
};

function blockFromRow(r) {
  if (!r) return null;
  var b = {
    id: r.id,
    band: r.band,
    course: r.course,
    subject: r.subject,
    days: r.days || [],
    start: r.start_min < 0 ? null : r.start_min,
    end: r.end_min < 0 ? null : r.end_min,
    teacher: r.teacher,
    room: r.room,
  };
  if (r.teacher2) b.teacher2 = r.teacher2;
  if (r.anchor) b.anchor = true;
  if (r.staff) b.staff = true;
  if (r.split_group) b.splitGroup = r.split_group;
  if (r.grades) b.grades = r.grades;
  var extra = r.extra || {};
  for (var k in extra) {
    if (Object.prototype.hasOwnProperty.call(extra, k)) b[k] = extra[k];
  }
  return b;
}

function blockToRow(planId, b, sortOrder) {
  var extra = {};
  for (var k in b) {
    if (Object.prototype.hasOwnProperty.call(b, k) && !BLOCK_ROW_KEYS[k]) extra[k] = b[k];
  }
  return {
    plan_id: planId,
    id: b.id,
    band: b.band || null,
    course: b.course,
    subject: b.subject || null,
    days: b.days || [],
    start_min: b.start == null || b.start < 0 ? -1 : b.start,
    end_min: b.end == null || b.end < 0 ? -1 : b.end,
    teacher: b.teacher || null,
    teacher2: b.teacher2 || null,
    room: b.room || null,
    anchor: !!b.anchor,
    staff: !!b.staff,
    split_group: b.splitGroup || null,
    grades: b.grades || null,
    extra: extra,
    sort_order: sortOrder,
  };
}

function teacherFromRow(r) {
  if (!r) return null;
  var t = {
    id: r.id,
    name: r.name,
    status: r.status,
    subjects: r.subjects || [],
  };
  if (r.rate != null) t.rate = Number(r.rate);
  if (r.flat != null) t.flat = Number(r.flat);
  if (r.allowed_days) t.allowedDays = r.allowed_days;
  if (r.windows) t.windows = r.windows;
  if (r.max_classes != null) t.maxClasses = r.max_classes;
  if (r.virtual) t.virtual = true;
  if (r.note) t.note = r.note;
  if (r.roles && r.roles.length) t.roles = r.roles;
  return t;
}

function teacherToRow(planId, t, sortOrder) {
  return {
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
    roles: t.roles && t.roles.length ? t.roles : [],
    sort_order: sortOrder,
  };
}

function planMetaFromRow(row) {
  if (!row) return {};
  var d = row.data || {};
  return {
    rooms: resolvePlanRooms(d),
    extraGaps: d.extraGaps || {},
    deletedGaps: d.deletedGaps || [],
    gapOv: d.gapOv || {},
    params: d.params || {},
    dismissed: d.dismissed || [],
    mathRoster: d.mathRoster || null,
    createdAt: d.createdAt || row.created_at,
    updatedAt: d.updatedAt || row.updated_at,
  };
}

function planFromRow(row) {
  if (!row) return null;
  var meta = planMetaFromRow(row);
  var blocks = (row.plan_blocks || [])
    .slice()
    .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
    .map(blockFromRow);
  var teachers = (row.plan_teachers || [])
    .slice()
    .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
    .map(teacherFromRow);
  if (!blocks.length && row.data && row.data.blocks) blocks = row.data.blocks;
  if (!teachers.length && row.data && row.data.teachers) teachers = row.data.teachers;
  return Object.assign({
    id: row.id,
    name: row.name,
    blocks: blocks,
    teachers: teachers,
  }, meta);
}

function planToData(plan) {
  return {
    rooms: resolvePlanRooms(plan),
    extraGaps: plan.extraGaps || {},
    deletedGaps: plan.deletedGaps || [],
    gapOv: plan.gapOv || {},
    params: plan.params || {},
    dismissed: plan.dismissed || [],
    mathRoster: plan.mathRoster || null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
