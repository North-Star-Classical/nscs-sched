/* Plan persistence — Supabase or in-memory (tests). Uses global sb, NSCS_TEST_MODE. */

var PLAN_SELECT = "*, plan_blocks(*), plan_teachers(*)";

function createMemoryStorage() {
  if (typeof globalThis !== "undefined" && globalThis.__NSCS_MEM_STORE__) {
    return globalThis.__NSCS_MEM_STORE__;
  }
  var plans = [];
  var autosaves = {};
  var adapter = {
    kind: "memory",
    async loadPlans() {
      return plans.map(function (p) { return Object.assign({}, p); });
    },
    async upsertPlan(plan) {
      var i = plans.findIndex(function (p) { return p.id === plan.id; });
      var copy = Object.assign({}, plan);
      if (i >= 0) plans[i] = copy; else plans.push(copy);
      return copy;
    },
    async deletePlan(id) {
      plans = plans.filter(function (p) { return p.id !== id; });
      delete autosaves[id];
    },
    async replaceAllPlans(list) {
      plans = list.map(function (p) { return Object.assign({}, p); });
    },
    async loadAutosave(planId) {
      return autosaves[planId] ? Object.assign({}, autosaves[planId]) : null;
    },
    async saveAutosave(planId, snap) {
      autosaves[planId] = Object.assign({}, snap);
    },
    async clearAutosave(planId) {
      delete autosaves[planId];
    },
    dump() {
      return { plans: plans, autosaves: autosaves };
    },
  };
  if (typeof globalThis !== "undefined") globalThis.__NSCS_MEM_STORE__ = adapter;
  return adapter;
}

async function savePlanChildren(client, plan) {
  var planId = plan.id;
  var blockRows = (plan.blocks || []).map(function (b, i) { return blockToRow(planId, b, i); });
  var teacherRows = (plan.teachers || []).map(function (t, i) { return teacherToRow(planId, t, i); });

  var delBlocks = await client.from("plan_blocks").delete().eq("plan_id", planId);
  if (delBlocks.error) throw delBlocks.error;
  var delTeachers = await client.from("plan_teachers").delete().eq("plan_id", planId);
  if (delTeachers.error) throw delTeachers.error;

  if (blockRows.length) {
    var insBlocks = await client.from("plan_blocks").insert(blockRows);
    if (insBlocks.error) throw insBlocks.error;
  }
  if (teacherRows.length) {
    var insTeachers = await client.from("plan_teachers").insert(teacherRows);
    if (insTeachers.error) throw insTeachers.error;
  }
}

function createSupabaseStorage(client) {
  return {
    kind: "supabase",
    async loadPlans() {
      var res = await client.from("plans").select(PLAN_SELECT).order("updated_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(planFromRow);
    },
    async upsertPlan(plan) {
      var now = new Date().toISOString();
      var row = {
        id: plan.id,
        name: plan.name || "Untitled Plan",
        data: planToData(plan),
        updated_at: plan.updatedAt || now,
      };
      var sess = await client.auth.getSession();
      if (sess.data.session) row.updated_by = sess.data.session.user.id;
      var res = await client.from("plans").upsert(row, { onConflict: "id" }).select(PLAN_SELECT).single();
      if (res.error) throw res.error;
      await savePlanChildren(client, plan);
      var reload = await client.from("plans").select(PLAN_SELECT).eq("id", plan.id).single();
      if (reload.error) throw reload.error;
      return planFromRow(reload.data);
    },
    async deletePlan(id) {
      var res = await client.from("plans").delete().eq("id", id);
      if (res.error) throw res.error;
    },
    async replaceAllPlans(list) {
      var existing = await this.loadPlans();
      var keep = {};
      list.forEach(function (p) { keep[p.id] = true; });
      for (var i = 0; i < existing.length; i++) {
        if (!keep[existing[i].id]) await this.deletePlan(existing[i].id);
      }
      for (var j = 0; j < list.length; j++) await this.upsertPlan(list[j]);
    },
    async loadAutosave(planId) {
      if (!planId) return null;
      var res = await client.from("plan_autosaves").select("*").eq("plan_id", planId).maybeSingle();
      if (res.error) throw res.error;
      if (!res.data) return null;
      var d = res.data.data || {};
      return Object.assign({ id: planId, updatedAt: res.data.updated_at }, d);
    },
    async saveAutosave(planId, snap) {
      if (!planId) return;
      var row = {
        plan_id: planId,
        data: snap,
        updated_at: new Date().toISOString(),
      };
      var res = await client.from("plan_autosaves").upsert(row, { onConflict: "plan_id" });
      if (res.error) throw res.error;
    },
    async clearAutosave(planId) {
      if (!planId) return;
      var res = await client.from("plan_autosaves").delete().eq("plan_id", planId);
      if (res.error) throw res.error;
    },
  };
}

var _storage = null;

function getStorage() {
  if (typeof globalThis !== "undefined" && globalThis.__NSCS_TEST_STORAGE__) {
    return globalThis.__NSCS_TEST_STORAGE__;
  }
  if (_storage) return _storage;
  if (NSCS_TEST_MODE || !sb) {
    _storage = createMemoryStorage();
  } else {
    _storage = createSupabaseStorage(sb);
  }
  return _storage;
}

function setStorage(adapter) {
  _storage = adapter;
}

function resetStorage() {
  _storage = null;
}

if (NSCS_TEST_MODE) {
  var exposeStorageDump = function () {
    var s = getStorage();
    return s.dump ? s.dump() : { plans: [], autosaves: {} };
  };
  if (typeof globalThis !== "undefined") globalThis.__NSCS_DUMP__ = exposeStorageDump;
}
