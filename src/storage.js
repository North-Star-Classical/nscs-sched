/* Plan persistence — Supabase or in-memory (tests). Uses global sb, NSCS_TEST_MODE. */

var PLAN_SELECT = "*, plan_blocks(*), plan_teachers(*)";

function backupSummary(data) {
  var tables = (data && data.tables) || {};
  return {
    planCount: (tables.plans || []).length,
    blockCount: (tables.plan_blocks || []).length,
    teacherCount: (tables.plan_teachers || []).length,
    autosaveCount: (tables.plan_autosaves || []).length,
  };
}

async function restoreSnapshotTables(client, exportData) {
  var plans = (exportData.tables && exportData.tables.plans) || [];
  var blocks = (exportData.tables && exportData.tables.plan_blocks) || [];
  var teachers = (exportData.tables && exportData.tables.plan_teachers) || [];
  var autosaves = (exportData.tables && exportData.tables.plan_autosaves) || [];

  for (var pi = 0; pi < plans.length; pi++) {
    var plan = plans[pi];
    var planRes = await client.from("plans").upsert(plan, { onConflict: "id" });
    if (planRes.error) throw planRes.error;
    var planId = plan.id;
    var planBlocks = blocks.filter(function (b) { return b.plan_id === planId; });
    var planTeachers = teachers.filter(function (t) { return t.plan_id === planId; });

    var delB = await client.from("plan_blocks").delete().eq("plan_id", planId);
    if (delB.error) throw delB.error;
    var delT = await client.from("plan_teachers").delete().eq("plan_id", planId);
    if (delT.error) throw delT.error;

    if (planBlocks.length) {
      var insB = await client.from("plan_blocks").insert(planBlocks);
      if (insB.error) throw insB.error;
    }
    if (planTeachers.length) {
      var insT = await client.from("plan_teachers").insert(planTeachers);
      if (insT.error) throw insT.error;
    }
  }

  for (var ai = 0; ai < autosaves.length; ai++) {
    var autoRes = await client.from("plan_autosaves").upsert(autosaves[ai], { onConflict: "plan_id" });
    if (autoRes.error) throw autoRes.error;
  }
}

function memoryPlansFromExport(exportData) {
  var tables = (exportData && exportData.tables) || {};
  var planRows = tables.plans || [];
  var blockRows = tables.plan_blocks || [];
  var teacherRows = tables.plan_teachers || [];
  return planRows.map(function (row) {
    var planId = row.id;
    return planFromRow(Object.assign({}, row, {
      plan_blocks: blockRows.filter(function (b) { return b.plan_id === planId; }),
      plan_teachers: teacherRows.filter(function (t) { return t.plan_id === planId; }),
    }));
  });
}

function memoryExportFromPlans(planList, autosaveMap) {
  var tables = { plans: [], plan_blocks: [], plan_teachers: [], plan_autosaves: [] };
  planList.forEach(function (p) {
    tables.plans.push({
      id: p.id,
      name: p.name || "Untitled Plan",
      data: planToData(p),
      updated_at: p.updatedAt || new Date().toISOString(),
    });
    (p.blocks || []).forEach(function (b, i) { tables.plan_blocks.push(blockToRow(p.id, b, i)); });
    (p.teachers || []).forEach(function (t, i) { tables.plan_teachers.push(teacherToRow(p.id, t, i)); });
  });
  Object.keys(autosaveMap || {}).forEach(function (planId) {
    var snap = autosaveMap[planId];
    tables.plan_autosaves.push({
      plan_id: planId,
      data: snap,
      updated_at: snap.updatedAt || new Date().toISOString(),
    });
  });
  return { exportedAt: new Date().toISOString(), tables: tables };
}

function createMemoryStorage() {
  if (typeof globalThis !== "undefined" && globalThis.__NSCS_MEM_STORE__) {
    return globalThis.__NSCS_MEM_STORE__;
  }
  var plans = [];
  var autosaves = {};
  var backups = [];
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
    async listBackups() {
      return backups.map(function (b) {
        var summary = backupSummary(b.data);
        return Object.assign({ id: b.id, label: b.label, exportedAt: b.exportedAt }, summary);
      });
    },
    async getBackup(id) {
      var entry = backups.find(function (b) { return b.id === id; });
      if (!entry) throw new Error("Backup not found");
      return entry.data;
    },
    async createBackup(label) {
      var data = memoryExportFromPlans(plans, autosaves);
      var entry = {
        id: "backup-" + Date.now(),
        label: label || ("Backup " + new Date().toLocaleString()),
        exportedAt: data.exportedAt,
        data: data,
      };
      backups.push(entry);
      return entry;
    },
    async restoreBackup(id) {
      var entry = backups.find(function (b) { return b.id === id; });
      if (!entry) throw new Error("Backup not found");
      plans = memoryPlansFromExport(entry.data).map(function (p) { return Object.assign({}, p); });
      autosaves = {};
      ((entry.data.tables && entry.data.tables.plan_autosaves) || []).forEach(function (a) {
        autosaves[a.plan_id] = a.data;
      });
    },
    async deleteBackup(id) {
      backups = backups.filter(function (b) { return b.id !== id; });
    },
    dump() {
      return { plans: plans, autosaves: autosaves, backups: backups };
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
    async listBackups() {
      var res = await client.from("plan_backups").select("id, label, exported_at, data").order("exported_at", { ascending: false });
      if (res.error) throw res.error;
      return (res.data || []).map(function (row) {
        return Object.assign({
          id: row.id,
          label: row.label,
          exportedAt: row.exported_at,
        }, backupSummary(row.data));
      });
    },
    async getBackup(id) {
      var res = await client.from("plan_backups").select("data").eq("id", id).single();
      if (res.error) throw res.error;
      return res.data.data;
    },
    async createBackup(label) {
      var tables = {};
      var tableNames = ["plans", "plan_blocks", "plan_teachers", "plan_autosaves"];
      for (var ti = 0; ti < tableNames.length; ti++) {
        var tname = tableNames[ti];
        var res = await client.from(tname).select("*");
        if (res.error) throw res.error;
        tables[tname] = res.data || [];
      }
      var data = { exportedAt: new Date().toISOString(), tables: tables };
      var row = {
        label: label || ("Backup " + new Date().toLocaleString()),
        exported_at: data.exportedAt,
        data: data,
      };
      var sess = await client.auth.getSession();
      if (sess.data.session) row.created_by = sess.data.session.user.id;
      var ins = await client.from("plan_backups").insert(row).select("id, label, exported_at, data").single();
      if (ins.error) throw ins.error;
      return Object.assign({
        id: ins.data.id,
        label: ins.data.label,
        exportedAt: ins.data.exported_at,
      }, backupSummary(ins.data.data));
    },
    async restoreBackup(id) {
      var res = await client.from("plan_backups").select("data").eq("id", id).single();
      if (res.error) throw res.error;
      await restoreSnapshotTables(client, res.data.data);
    },
    async deleteBackup(id) {
      var res = await client.from("plan_backups").delete().eq("id", id);
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
  if (NSCS_TEST_MODE || !ensureSupabaseClient()) {
    _storage = createMemoryStorage();
  } else {
    _storage = createSupabaseStorage(ensureSupabaseClient());
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
