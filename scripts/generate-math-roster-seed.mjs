#!/usr/bin/env node
/** Generate scripts/math-roster-seed.json from consolidated roster rows. */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {[string,string,string,string,string,string,string,string,string,string?][]} */
const ROWS = [
  ["Boletti","Victoria","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","",""],
  ["Clark","Kyrie","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","",""],
  ["Dennison","Alexander","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","","Also on To-Be-Placed list"],
  ["Edwardson","Bailey","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","","Also on To-Be-Placed list"],
  ["Golzalez","Emeryld","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","","Spelling per source"],
  ["Mols","Isabella","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","",""],
  ["Rumpel","Margot","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","","Also on To-Be-Placed list"],
  ["Stanczak","Theo","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","",""],
  ["Young","Caiden","K","Lower School","Math Mammoth K","","C130","Viola / Kathryn","",""],
  ["Boletti Petcov","Celine","2nd","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","Academic Watch",""],
  ["Boletti Petcov","Thomas","2nd","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","Academic Watch",""],
  ["Bowman","Marie","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","New Student","Also on To-Be-Placed list"],
  ["Fleming","William","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Hacker","Grace","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Kolb","London","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Lauridsen","Rosemary","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","New Student",""],
  ["Lee","Christine","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Lund","Matteo","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Pruden","Ivan","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Rumpel","Rosie","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Sherrill","Nathan","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","New Student",""],
  ["Stanczak","Lucy","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Tao","Annalise","1st","Lower School","Math Mammoth 1","Book 1B","211","Linda Wolfe","",""],
  ["Albarren","Ezekial","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Flaming","Thea","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Gray","Ella","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Hartman","Jacob","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Lindholm","Annie","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Marquez","Joy","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Moore","Nora","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Rumpel","Asher","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Rumpel","Verity","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Sherrill","Greyson","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","New Student",""],
  ["Tooley","Everret","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Vann","Eric","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Zavala","Zai","2nd","Lower School","Math Mammoth 2","Book 2A","212","Anna Morris","",""],
  ["Jones","Isabelle","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Bucci","Eve","4th","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Dennison","Benjamin","4th","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Fischer","Gabe","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Fleming","Henry","4th","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Lauridsen","Henry","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","New Student",""],
  ["Maloney","Finnegan","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Morrison","Fields","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","New Student",""],
  ["Nowaki","Ben","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Nowaki","Julia","4th","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["O'Connor","Owen","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Pruden","Anastasia","4th","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Rivero","Bowie","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Robinson","Victoria","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Tao","Olivia","3rd","Lower School","Math Mammoth 4","","213","Kathy Matlin","",""],
  ["Morrison","Hazel","5th","Lower School","Saxon 5/4","","","","New Student",""],
  ["Zavala","Ian","5th","Lower School","Saxon 5/4","","","","Academic Watch","Provisional; also listed under Math 6/5"],
  ["Bucci","Olivia","5th","Lower School","Math 6/5","","202","","Academic Watch","Provisional; also listed under Saxon 7/6"],
  ["Holthaus","Evvie","6th","Lower School","Math 6/5","","202","","Academic Watch","ordered CBD 8/15"],
  ["Jones","Emmy","5th","Lower School","Math 6/5","","202","","",""],
  ["Kesarchuk","Daniel","5th","Lower School","Math 6/5","","202","","",""],
  ["Schwan","Sam","5th","Lower School","Math 6/5","","202","","",""],
  ["Zavala","Ian","5th","Lower School","Math 6/5","","202","","Academic Watch","Provisional; also listed under Saxon 5/4"],
  ["Andersen","Stella","6th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Bucci","Olivia","5th","Lower School","Saxon 7/6","","214","Greta Rohde","Academic Watch","Provisional; also listed under Math 6/5"],
  ["Kolb","Miriam","5th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Norman","Addison","6th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Pollard","Gia","7th","Lower School","Saxon 7/6","","214","Greta Rohde","","ordered CBD 8/15"],
  ["Pruden","Brett","5th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Stanczak","Edmund","6th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Tooley","Forrest","5th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Vehnlow","Amelia","6th","Lower School","Saxon 7/6","","214","Greta Rohde","",""],
  ["Weir","Eloise","6th","Lower School","Saxon 7/6","","214","Greta Rohde","New Student",""],
  ["Buerstatte","Ellie","6th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Curtis","Cash","8th","Lower School","Saxon 8/7","","207","Mrs. Lee","Academic Watch",""],
  ["Flaming","Eden","7th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Howe","Morgan","7th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Kelly","James","7th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Kolb","Grace","7th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Marquez","Rachel","8th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Morrison","Louise","8th","Lower School","Saxon 8/7","","207","Mrs. Lee","New Student",""],
  ["O'Neil","Sean","9th","Lower School","Saxon 8/7","","207","Mrs. Lee","Cross-Over","US student in LS class; also on To-Be-Placed list"],
  ["Schwan","Tom","6th","Lower School","Saxon 8/7","","207","Mrs. Lee","",""],
  ["Andersen","Sophia","9th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","Cross-Over","US student in LS class"],
  ["Dockery","Annie","7th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","",""],
  ["Gabrielson","Sean","8th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","",""],
  ["Gray","Tessa","9th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","Cross-Over","US student in LS class; also on To-Be-Placed list"],
  ["Hiett","George","8th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","",""],
  ["Holthaus","Macie","9th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","Cross-Over","US student in LS class"],
  ["Yates","Lillian","8th","Lower School","Alg 1 LS","Jacobs Algebra 1","203","Mrs. Weir","New Student",""],
  ["Adjei","Efia","8th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","Cross-Over","LS student in US class"],
  ["Kolb","Joey","9th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","",""],
  ["Larsen","Jonathan","10th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","Academic Watch",""],
  ["Larsen","Vicky","11th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","",""],
  ["Norman","Tommy","11th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","Academic Watch",""],
  ["Pollard","Alayan","9th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","",""],
  ["Schwan","Scott","8th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","Cross-Over","LS student in US class"],
  ["Weir","Bella","8th","Upper School","Geometry","Jacobs Geometry","","Mrs. Lee","Cross-Over","LS student in US class"],
  ["Dockery","Emma","10th","Upper School","ALG 2 US","Foerster Algebra 2A","202","Mrs. Gabrielson","",""],
  ["Peltz","Nathaniel","9th","Upper School","ALG 2 US","Foerster Algebra 2A","202","Mrs. Gabrielson","",""],
  ["Schwan","Joelle","10th","Upper School","ALG 2 US","Foerster Algebra 2A","202","Mrs. Gabrielson","",""],
  ["Yates","Olivia","10th","Upper School","ALG 2 US","Foerster Algebra 2A","202","Mrs. Gabrielson","",""],
  ["Adjei","Erika","12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Adjei","Matthias","10th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Andersen","Luke","12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Andreano","Joshua","11th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Dockery","Abigail","12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Gabrielson","Evan","11th/12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Hiett","Charlie","12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Howe","Garrett","12th","Upper School","Pre-Calc","Foerster Algebra 2B","203","Mrs. Weir","",""],
  ["Holthaus","","6th","Lower School","(unplaced)","","","","","To Be Placed / Evaluated"],
  ["Holthaus","","9th","Lower School","(unplaced)","","","","","To Be Placed / Evaluated"],
];

const TEACHER_LABEL_MAP = {
  "linda wolfe": "wolfe",
  "anna morris": "morris",
  "kathy matlin": "matlin",
  "greta rohde": "rohde",
  "mrs. lee": "lee",
  "mrs. weir": "weir",
  "mrs. gabrielson": "gabrielson",
  "viola / kathryn": "nowacki",
};

function resolveTeacherId(label) {
  if (!label) return null;
  const key = label.trim().toLowerCase();
  return TEACHER_LABEL_MAP[key] || null;
}

function sectionKey(course, room, teacherLabel) {
  return [course || "", room || "", teacherLabel || ""].join("|").toLowerCase();
}

const students = ROWS.map((row, i) => {
  const [lastName, firstName, grade, division, course, bookEdition, room, teacherLabel, status, notes] = row;
  const toBePlaced = /to-?be-?placed|unplaced|\(unplaced\)/i.test(`${status} ${notes} ${course}`);
  return {
    id: `math-stu-${i + 1}`,
    lastName,
    firstName,
    grade,
    division,
    course,
    bookEdition: bookEdition || "",
    room: room || "",
    teacherLabel: teacherLabel || "",
    teacherId: resolveTeacherId(teacherLabel),
    status: status || "",
    toBePlaced,
    notes: notes || "",
    sectionKey: sectionKey(course, room, teacherLabel),
  };
});

const sectionMap = {};
students.forEach((s) => {
  if (!sectionMap[s.sectionKey]) {
    sectionMap[s.sectionKey] = {
      id: `math-sec-${Object.keys(sectionMap).length + 1}`,
      course: s.course,
      bookEdition: s.bookEdition,
      room: s.room,
      teacherLabel: s.teacherLabel,
      teacherId: s.teacherId,
      division: s.division,
      masterBlockId: null,
      studentCount: 0,
    };
  }
  sectionMap[s.sectionKey].studentCount++;
  if (!sectionMap[s.sectionKey].bookEdition && s.bookEdition) sectionMap[s.sectionKey].bookEdition = s.bookEdition;
});

const out = {
  version: 1,
  source: "Math_Roster_Consolidated - Roster.pdf",
  importedAt: new Date().toISOString(),
  students,
  sections: Object.values(sectionMap).sort((a, b) => a.course.localeCompare(b.course) || a.room.localeCompare(b.room)),
};

const outPath = join(root, "scripts", "math-roster-seed.json");
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`✓ Wrote ${outPath} (${students.length} students, ${out.sections.length} sections)`);
