/* Math roster — student placements, sections, master schedule sync */

var MATH_ROSTER_SEED = __MATH_ROSTER_SEED__;

var MATH_TEACHER_LABELS = {
  wolfe: "Linda Wolfe",
  morris: "Anna Morris",
  matlin: "Kathy Matlin",
  rohde: "Greta Rohde",
  lee: "Mrs. Lee",
  weir: "Mrs. Weir",
  gabrielson: "Mrs. Gabrielson",
  nowacki: "Viola / Kathryn",
  norman: "Kathryn Norman",
  various: "Various (Math)",
};

function mathSectionKey(course, room, teacherLabel) {
  return [(course || ""), (room || ""), (teacherLabel || "")].join("|").toLowerCase();
}

function defaultMathRoster() {
  var seed = typeof MATH_ROSTER_SEED === "object" ? MATH_ROSTER_SEED : { students: [], sections: [] };
  return {
    version: seed.version || 1,
    source: seed.source || "",
    importedAt: seed.importedAt || null,
    lastSyncedAt: null,
    students: (seed.students || []).map(function (s) { return Object.assign({}, s); }),
    sections: (seed.sections || []).map(function (s) { return Object.assign({}, s); }),
  };
}

function normalizeMathRoster(raw) {
  if (!raw || !raw.students) return defaultMathRoster();
  return {
    version: raw.version || 1,
    source: raw.source || "",
    importedAt: raw.importedAt || null,
    lastSyncedAt: raw.lastSyncedAt || null,
    students: (raw.students || []).map(function (s) { return Object.assign({}, s); }),
    sections: (raw.sections || []).map(function (s) { return Object.assign({}, s); }),
  };
}

function rebuildMathSections(students) {
  var map = {};
  (students || []).forEach(function (s) {
    var key = s.sectionKey || mathSectionKey(s.course, s.room, s.teacherLabel);
    if (!map[key]) {
      map[key] = {
        id: "math-sec-" + (Object.keys(map).length + 1),
        course: s.course,
        bookEdition: s.bookEdition || "",
        room: s.room || "",
        teacherLabel: s.teacherLabel || "",
        teacherId: s.teacherId || null,
        division: s.division || "",
        masterBlockId: null,
        studentCount: 0,
      };
    }
    map[key].studentCount++;
    if (!map[key].bookEdition && s.bookEdition) map[key].bookEdition = s.bookEdition;
    if (!map[key].teacherId && s.teacherId) map[key].teacherId = s.teacherId;
    if (!map[key].division && s.division) map[key].division = s.division;
  });
  return Object.values(map).sort(function (a, b) {
    return a.course.localeCompare(b.course) || (a.room || "").localeCompare(b.room || "");
  });
}

/** Rebuild sections after edits while preserving ids and masterBlockId where the section key matches. */
function rebuildMathSectionsPreserve(students, prevSections, preferSectionId) {
  var prevByKey = {};
  var prevById = {};
  (prevSections || []).forEach(function (s) {
    prevByKey[mathSectionKey(s.course, s.room, s.teacherLabel)] = s;
    prevById[s.id] = s;
  });
  var fresh = rebuildMathSections(students);
  fresh.forEach(function (s) {
    var key = mathSectionKey(s.course, s.room, s.teacherLabel);
    var prev = prevByKey[key] || (preferSectionId && prevById[preferSectionId]) || null;
    if (prev) {
      s.id = prev.id;
      s.masterBlockId = prev.masterBlockId;
    }
  });
  (students || []).forEach(function (stu) {
    var sec = fresh.find(function (s) {
      return mathSectionKey(s.course, s.room, s.teacherLabel) === mathSectionKey(stu.course, stu.room, stu.teacherLabel);
    });
    if (sec) {
      stu.sectionId = sec.id;
      stu.sectionKey = mathSectionKey(stu.course, stu.room, stu.teacherLabel);
    }
  });
  return fresh;
}

function isMathMasterBlock(b) {
  if (!b || b.staff) return false;
  if (b.subject === "Math") return true;
  return !!(b.band && String(b.band).indexOf("Math:") === 0);
}

function blockCourseLabel(b) {
  if (!b) return "";
  if (b.band && String(b.band).indexOf("Math:") === 0) return String(b.band).replace(/^Math:\s*/, "");
  return b.course || "";
}

function matchBlockToSection(block, section) {
  var bc = blockCourseLabel(block).toLowerCase();
  var sc = (section.course || "").toLowerCase();
  if (!bc || !sc) return false;
  if (bc === sc) return true;
  if (sc.indexOf("alg 2") >= 0 && bc.indexOf("algebra ii") >= 0) return true;
  if (sc.indexOf("alg 1") >= 0 && bc.indexOf("algebra i") >= 0) return true;
  if (sc.indexOf("geometry") >= 0 && bc.indexOf("geometry") >= 0) return true;
  if (sc.indexOf("pre-calc") >= 0 && bc.indexOf("pre") >= 0) return true;
  return false;
}

/** Pull teacher/room/course from cross-band math blocks into roster sections. */
function syncMathRosterFromMaster(blocks, teachers, roster) {
  var r = normalizeMathRoster(roster);
  var tById = {};
  (teachers || []).forEach(function (t) { tById[t.id] = t; });
  var mathBlocks = (blocks || []).filter(function (b) { return isMathMasterBlock(b) && (b.crossBand || (b.band && String(b.band).indexOf("Math:") === 0)); });

  r.sections.forEach(function (sec) {
    var match = mathBlocks.find(function (b) { return matchBlockToSection(b, sec); });
    if (match) {
      sec.masterBlockId = match.id;
      if (match.room && match.room !== "Various") sec.room = match.room;
      if (match.teacher && match.teacher !== "various") {
        sec.teacherId = match.teacher;
        sec.teacherLabel = tById[match.teacher] ? tById[match.teacher].name : sec.teacherLabel;
      }
      if (match.course) sec.course = blockCourseLabel(match) || sec.course;
    }
  });

  r.students.forEach(function (stu) {
    var sec = r.sections.find(function (s) { return s.id === stu.sectionId || mathSectionKey(s.course, s.room, s.teacherLabel) === (stu.sectionKey || mathSectionKey(stu.course, stu.room, stu.teacherLabel)); });
    if (!sec) {
      sec = r.sections.find(function (s) { return mathSectionKey(s.course, s.room, s.teacherLabel) === mathSectionKey(stu.course, stu.room, stu.teacherLabel); });
    }
    if (sec) {
      if (sec.room) stu.room = sec.room;
      if (sec.teacherId) stu.teacherId = sec.teacherId;
      if (sec.teacherLabel) stu.teacherLabel = sec.teacherLabel;
      stu.sectionKey = mathSectionKey(stu.course, stu.room, stu.teacherLabel);
    }
  });

  r.lastSyncedAt = new Date().toISOString();
  return r;
}

/** Push section teacher/room changes to linked master math blocks. Returns updated blocks array. */
function syncMasterFromMathRoster(blocks, roster) {
  var r = normalizeMathRoster(roster);
  var updated = (blocks || []).map(function (b) { return Object.assign({}, b); });
  r.sections.forEach(function (sec) {
    if (!sec.masterBlockId) return;
    var idx = updated.findIndex(function (b) { return b.id === sec.masterBlockId; });
    if (idx < 0) return;
    var patch = {};
    if (sec.teacherId) patch.teacher = sec.teacherId;
    if (sec.room) patch.room = sec.room;
    if (sec.course && updated[idx].crossBand) patch.course = sec.course.replace(/^ALG 2 US/i, "Algebra II").replace(/^Alg 1 LS/i, "Algebra I");
    updated[idx] = Object.assign({}, updated[idx], patch);
  });
  return updated;
}

function applyMathSectionPatch(roster, sectionId, patch, teachers) {
  var r = normalizeMathRoster(roster);
  var tById = {};
  (teachers || []).forEach(function (t) { tById[t.id] = t; });
  var sec = r.sections.find(function (s) { return s.id === sectionId; });
  if (!sec) return r;
  var oldKey = mathSectionKey(sec.course, sec.room, sec.teacherLabel);
  Object.assign(sec, patch);
  if (patch.teacherId && tById[patch.teacherId]) sec.teacherLabel = tById[patch.teacherId].name;
  r.students.forEach(function (stu) {
    if (stu.sectionKey === oldKey || stu.sectionId === sectionId) {
      if (patch.course != null) stu.course = patch.course;
      if (patch.bookEdition != null) stu.bookEdition = patch.bookEdition;
      if (patch.room != null) stu.room = patch.room;
      if (patch.division != null) stu.division = patch.division;
      if (patch.teacherId != null) stu.teacherId = patch.teacherId;
      if (patch.teacherLabel != null) stu.teacherLabel = patch.teacherLabel;
      else if (patch.teacherId && tById[patch.teacherId]) stu.teacherLabel = tById[patch.teacherId].name;
      stu.sectionKey = mathSectionKey(stu.course, stu.room, stu.teacherLabel);
      stu.sectionId = sectionId;
    }
  });
  r.sections = rebuildMathSectionsPreserve(r.students, r.sections, sectionId);
  return r;
}

function applyMathStudentPatch(roster, studentId, patch, teachers) {
  var r = normalizeMathRoster(roster);
  var tById = {};
  (teachers || []).forEach(function (t) { tById[t.id] = t; });
  var prevSectionId = null;
  r.students = r.students.map(function (stu) {
    if (stu.id !== studentId) return stu;
    prevSectionId = stu.sectionId;
    var next = Object.assign({}, stu, patch);
    if (patch.teacherId != null) {
      next.teacherId = patch.teacherId || null;
      next.teacherLabel = patch.teacherId && tById[patch.teacherId] ? tById[patch.teacherId].name : (patch.teacherLabel || "");
    }
    if (patch.toBePlaced != null) {
      next.toBePlaced = !!patch.toBePlaced;
    } else if (patch.course != null || patch.room != null) {
      next.toBePlaced = !next.course || next.course.indexOf("unplaced") >= 0 || !next.room;
    }
    next.sectionKey = mathSectionKey(next.course, next.room, next.teacherLabel);
    return next;
  });
  r.sections = rebuildMathSectionsPreserve(r.students, r.sections, prevSectionId);
  return r;
}

function mathRosterSummary(roster) {
  var r = normalizeMathRoster(roster);
  var placed = r.students.filter(function (s) { return !s.toBePlaced && s.course && s.course.indexOf("unplaced") < 0; }).length;
  var unplaced = r.students.filter(function (s) { return s.toBePlaced || !s.room || s.course.indexOf("unplaced") >= 0; }).length;
  var byCourse = {};
  r.sections.forEach(function (s) {
    byCourse[s.course] = (byCourse[s.course] || 0) + (s.studentCount || 0);
  });
  return {
    totalStudents: r.students.length,
    sectionCount: r.sections.length,
    placed,
    unplaced,
    byCourse: byCourse,
    lastSyncedAt: r.lastSyncedAt,
  };
}

function mathRosterForPlan(plan) {
  if (plan && plan.mathRoster && plan.mathRoster.students && plan.mathRoster.students.length) {
    return normalizeMathRoster(plan.mathRoster);
  }
  return defaultMathRoster();
}
