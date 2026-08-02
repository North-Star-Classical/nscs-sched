// Extract SEED_BLOCKS and SEED_TEACHERS from App.jsx into scripts/seed-data.json
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appPath = join(root, "src", "App.jsx");
let src = readFileSync(appPath, "utf8");
src = src.replace(/import\s+React[^;]+;/, "const React = {};");
src = src.replace(/export\s+default\s+function\s+App\(\)[\s\S]*$/, "");
src += "\nreturn { blocks: SEED_BLOCKS, teachers: SEED_TEACHERS, params: DEFAULT_PARAMS };\n";

const result = buildSync({
  stdin: { contents: src, loader: "jsx" },
  bundle: false,
  format: "cjs",
  write: false,
});
const fn = new Function(result.outputFiles[0].text + "; return { blocks: SEED_BLOCKS, teachers: SEED_TEACHERS, params: DEFAULT_PARAMS };");
const { blocks, teachers, params } = fn();

const out = {
  id: "plan-aye-2027-default",
  name: "AYE 2027 Draft",
  blocks,
  teachers,
  params,
  customRooms: [],
  extraGaps: {},
  deletedGaps: [],
  gapOv: {},
  dismissed: [],
  createdAt: new Date().toISOString(),
};

writeFileSync(join(root, "scripts", "seed-data.json"), JSON.stringify(out, null, 2));
console.log(`✓ Wrote seed-data.json (${blocks.length} blocks, ${teachers.length} teachers)`);
