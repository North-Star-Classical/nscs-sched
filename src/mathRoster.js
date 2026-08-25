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
        tuesdayBlockId: null,
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
      s.tuesdayBlockId = prev.tuesdayBlockId;
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
  if (courseFuzzyMatch(bc, sc)) return true;
  if (sc.indexOf("alg 2") >= 0 && bc.indexOf("algebra ii") >= 0) return true;
  if (sc.indexOf("alg 1") >= 0 && bc.indexOf("algebra i") >= 0) return true;
  if (sc.indexOf("geometry") >= 0 && bc.indexOf("geometry") >= 0) return true;
  if (sc.indexOf("pre-calc") >= 0 && bc.indexOf("pre") >= 0) return true;
  return false;
}

function normCourse(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function courseFuzzyMatch(a, b) {
  var na = normCourse(a);
  var nb = normCourse(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
  if (na.indexOf("alg 2") >= 0 && nb.indexOf("algebra ii") >= 0) return true;
  if (nb.indexOf("alg 2") >= 0 && na.indexOf("algebra ii") >= 0) return true;
  if (na.indexOf("mammoth") >= 0 && nb.indexOf("mammoth") >= 0) return true;
  if (na.indexOf("saxon") >= 0 && nb.indexOf("saxon") >= 0) return true;
  if (na.indexOf("geometry") >= 0 && nb.indexOf("geometry") >= 0) return true;
  if (na.indexOf("pre calc") >= 0 && nb.indexOf("pre") >= 0) return true;
  return false;
}

function rosterCourseToBlockCourse(secCourse) {
  var c = String(secCourse || "");
  if (/^ALG 2 US/i.test(c)) return "Algebra II";
  if (/^Alg 1 LS/i.test(c)) return "Algebra I";
  if (/^Alg 1 US/i.test(c)) return "US Algebra I";
  if (/^Geometry$/i.test(c)) return "Geometry";
  if (/^Pre-Calc/i.test(c)) return "Pre-Calculus";
  var mammoth = c.match(/Mammoth\s*(\d|[Kk])/i);
  if (mammoth) return "Math (Mammoth " + mammoth[1].toUpperCase() + ")";
  var saxon = c.match(/Saxon\s*([\d/]+)/i);
  if (saxon) return "Math (Saxon " + saxon[1] + ")";
  var math65 = c.match(/Math\s*6\/5/i);
  if (math65) return "Math (6/5)";
  return c;
}

function blockHasScheduleTime(b) {
  return !!(b && typeof b.start === "number" && typeof b.end === "number" && b.end > b.start);
}

function uniqueBlocks(list) {
  var seen = {};
  return (list || []).filter(function (b) {
    if (!b || seen[b.id]) return false;
    seen[b.id] = true;
    return true;
  });
}

function sectionBandHint(sec) {
  var c = (sec.course || "").toLowerCase();
  var d = (sec.division || "").toLowerCase();
  if (/pre-calc|alg 2 us|^alg 2/.test(c)) return "11th/12th";
  if (/geometry|alg 1 us|alg 1 ls|jacobs/.test(c)) return "9th/10th";
  if (/saxon 8|8\/7|8 7/.test(c)) return "7th/8th";
  if (/saxon 7|7\/6|7 6/.test(c)) return "5th/6th";
  if (/saxon 5|5\/4|math 6\/5|6\/5/.test(c)) return "3rd/4th";
  if (/mammoth 4|mammoth 3/.test(c)) return "3rd/4th";
  if (/mammoth 2/.test(c)) return "2nd";
  if (/mammoth 1|mammoth k/.test(c)) return "1st";
  if (d.indexOf("upper") >= 0) return "9th/10th";
  if (d.indexOf("logic") >= 0) return "7th/8th";
  return null;
}

/** Tuesday "Math (by level)" window for upper/logic bands — shared block, used for report timing. */
function tuesdayMathBlockForSection(blocks, sec) {
  var band = sectionBandHint(sec);
  if (!band) return null;
  if (sec.tuesdayBlockId) {
    var pinned = (blocks || []).find(function (b) { return b.id === sec.tuesdayBlockId; });
    if (pinned) return pinned;
  }
  return (blocks || []).find(function (b) {
    return b.mathBlock && b.subject === "Math" && b.band === band
      && b.days && b.days.indexOf("T") >= 0 && blockHasScheduleTime(b);
  }) || null;
}

function isSharedTuesdayMathBlock(b) {
  return !!(b && b.mathBlock && b.days && b.days.indexOf("T") >= 0 && b.teacher === "various");
}

function findBlocksForMathSection(blocks, sec) {
  var out = [];
  if (sec.masterBlockId) {
    var pinned = (blocks || []).find(function (b) { return b.id === sec.masterBlockId; });
    if (pinned) out.push(pinned);
  }
  (blocks || []).filter(isMathMasterBlock).forEach(function (b) {
    if (matchBlockToSection(b, sec)) out.push(b);
  });
  if (sec.teacherId) {
    (blocks || []).filter(function (b) {
      return !b.staff && b.subject === "Math" && (b.teacher === sec.teacherId || b.teacher2 === sec.teacherId);
    }).forEach(function (b) {
      if (courseFuzzyMatch(b.course, sec.course) || courseFuzzyMatch(blockCourseLabel(b), sec.course)) out.push(b);
    });
  }
  return uniqueBlocks(out);
}

function linkMathRosterSections(blocks, roster) {
  var r = normalizeMathRoster(roster);
  r.sections.forEach(function (sec) {
    var matches = findBlocksForMathSection(blocks, sec);
    if (matches.length) sec.masterBlockId = matches[0].id;
    var tue = tuesdayMathBlockForSection(blocks, sec);
    sec.tuesdayBlockId = tue ? tue.id : null;
  });
  return r;
}

function mathTemplateBlockForSection(blocks, sec, day) {
  if (day === "T") {
    var tue = tuesdayMathBlockForSection(blocks, sec);
    if (tue) return tue;
    return null;
  }
  var matches = findBlocksForMathSection(blocks, sec);
  if (day) {
    var onDay = matches.find(function (b) {
      return blockHasScheduleTime(b) && b.days && b.days.indexOf(day) >= 0;
    });
    if (onDay) return onDay;
  }
  var timed = matches.find(blockHasScheduleTime);
  if (timed) return timed;
  var upper = /upper school|alg|geometry|pre-calc/i.test((sec.division || "") + " " + (sec.course || ""));
  var tpl = (blocks || []).find(function (b) {
    return blockHasScheduleTime(b) && b.subject === "Math" && (upper ? b.crossBand : (b.mathBlock || !b.crossBand));
  });
  return tpl || (blocks || []).find(function (b) { return blockHasScheduleTime(b) && b.subject === "Math"; });
}

function mathTeacherLabel(id) {
  return MATH_TEACHER_LABELS[id] || id;
}

/** Teachers for math roster dropdowns — includes roster-only math instructors. */
function mergeTeachersForMathRoster(teachers, roster) {
  var byId = {};
  (teachers || []).filter(function (t) { return !t.virtual; }).forEach(function (t) {
    if ((t.subjects || []).indexOf("Math") >= 0) byId[t.id] = t;
  });
  normalizeMathRoster(roster).sections.forEach(function (sec) {
    if (!sec.teacherId) return;
    var existing = (teachers || []).find(function (t) { return t.id === sec.teacherId; });
    byId[sec.teacherId] = existing || {
      id: sec.teacherId,
      name: sec.teacherLabel || mathTeacherLabel(sec.teacherId),
      subjects: ["Math"],
      status: "RPT",
      mathRosterOnly: true,
    };
  });
  return Object.values(byId).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
}

/** Faculty report teacher list — anyone with blocks or math roster sections. */
function reportTeacherOptions(validationRows, teachers, roster) {
  var byId = {};
  (validationRows || []).forEach(function (r) { byId[r.id] = Object.assign({}, r); });
  mergeTeachersForMathRoster(teachers, roster).forEach(function (t) {
    if (byId[t.id]) return;
    byId[t.id] = {
      id: t.id,
      name: t.name,
      status: t.status || "—",
      subjects: t.subjects || ["Math"],
      blocks: 0,
      teachHrs: 0,
      planBudgetHrs: 0,
      planActualHrs: 0,
      totalActualHrs: 0,
    };
  });
  var rosterTeacherIds = {};
  normalizeMathRoster(roster).sections.forEach(function (s) {
    if (s.teacherId) rosterTeacherIds[s.teacherId] = true;
  });
  return Object.values(byId).filter(function (r) {
    return r.blocks > 0 || rosterTeacherIds[r.id];
  }).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
}

/** Extra faculty-report rows from math roster sections not already on the master grid. */
function mathRosterRowsForTeacherDay(tid, day, roster, blocks, existingBlockIds) {
  var seen = existingBlockIds || {};
  var rows = [];
  normalizeMathRoster(roster).sections.forEach(function (sec) {
    if (sec.teacherId !== tid) return;
    var linked = sec.masterBlockId ? (blocks || []).find(function (b) { return b.id === sec.masterBlockId; }) : null;
    if (linked && linked.teacher === tid && seen[linked.id]) return;
    if (linked && linked.teacher === tid && blockHasScheduleTime(linked) && linked.days && linked.days.indexOf(day) >= 0) return;
    var tpl = mathTemplateBlockForSection(blocks, sec, day);
    if (!tpl || !tpl.days || tpl.days.indexOf(day) < 0 || !blockHasScheduleTime(tpl)) return;
    var label = sec.course + (sec.bookEdition ? " · " + sec.bookEdition : "");
    rows.push({
      id: "math-roster-" + sec.id + "-" + day,
      course: label,
      start: tpl.start,
      end: tpl.end,
      room: sec.room || tpl.room || "",
      synthetic: false,
      fromMathRoster: true,
      days: tpl.days,
    });
  });
  return rows;
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

  r = linkMathRosterSections(blocks, r);
  r.lastSyncedAt = new Date().toISOString();
  return r;
}

/** Push section teacher/room/course changes to all linked master math blocks. Returns updated blocks array. */
function syncMasterFromMathRoster(blocks, roster) {
  var r = normalizeMathRoster(roster);
  var updated = (blocks || []).map(function (b) { return Object.assign({}, b); });
  r.sections.forEach(function (sec) {
    var matches = findBlocksForMathSection(updated, sec);
    if (!matches.length) return;
    var blockCourse = rosterCourseToBlockCourse(sec.course);
    matches.forEach(function (block) {
      var idx = updated.findIndex(function (b) { return b.id === block.id; });
      if (idx < 0) return;
      if (isSharedTuesdayMathBlock(updated[idx])) return;
      var patch = {};
      if (sec.teacherId) patch.teacher = sec.teacherId;
      if (sec.room) patch.room = sec.room;
      if (blockCourse) patch.course = blockCourse;
      updated[idx] = Object.assign({}, updated[idx], patch);
    });
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
  else if (patch.teacherId) sec.teacherLabel = mathTeacherLabel(patch.teacherId);
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
