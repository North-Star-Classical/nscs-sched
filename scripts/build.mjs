// Build: src/*.js(x) -> dist/index.html (standalone file for Cloudflare Pages)
//
// Pipeline:
//   1. Concatenate bootstrap.js, storage.js, auth.js, then App.jsx (React import stripped)
//   2. HARD FAIL if any import/export survives (except transformed React import)
//   3. Compile JSX with esbuild (iife)
//   4. HARD FAIL if require( appears in bundle
//   5. Wrap in HTML shell (React UMD, Supabase UMD, Tailwind, html2pdf)
//
// Env (production): SUPABASE_URL, SUPABASE_ANON_KEY
// Env (tests):       NSCS_TEST_MODE=1

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const distDir = join(root, "dist");
const outHtml = join(distDir, "index.html");
const legacyHtml = join(distDir, "nscs-schedule-planner.html");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const appVersion = pkg.version || "1.0.0";

const testMode = process.env.NSCS_TEST_MODE === "1" || process.env.NSCS_TEST_MODE === "true";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!testMode && (!supabaseUrl || !supabaseKey)) {
  console.warn("⚠ SUPABASE_URL / SUPABASE_ANON_KEY not set — building in test mode (in-memory storage, no login).");
}

function readSrc(name) {
  return readFileSync(join(srcDir, name), "utf8");
}

let bootstrap = readSrc("bootstrap.js")
  .replace("__SUPABASE_URL__", supabaseUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
  .replace("__SUPABASE_ANON_KEY__", supabaseKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
  .replace("__NSCS_TEST_MODE__", testMode || !supabaseUrl || !supabaseKey ? "true" : "false")
  .replace("__APP_VERSION__", appVersion);

let storage = readSrc("storage.js");
let history = readSrc("history.js");
let auth = readSrc("auth.js");

let app = readSrc("App.jsx");

// React import -> strip; hooks use React.useState / React.useMemo (UMD global)
let reactImports = 0;
app = app.replace(
  /import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s*["']react["'];?/,
  () => {
    reactImports++;
    return "";
  }
);
if (reactImports !== 1) {
  throw new Error(`Expected exactly 1 React import in App.jsx, transformed ${reactImports}.`);
}
app = app.replace(/\buseState\b/g, "React.useState");
app = app.replace(/\buseMemo\b/g, "React.useMemo");

app = app.replace(/^import .*$/gm, "");
const exportCount = (app.match(/export\s+default\s+function\s+App\(\)/g) || []).length;
if (exportCount !== 1) {
  throw new Error(`Expected exactly 1 'export default function App()', found ${exportCount}.`);
}
app = app.replace(/export\s+default\s+function\s+App\(\)/, "function App()");

let src = [bootstrap, storage, history, auth, app].join("\n\n");

const leftovers = src.match(/^\s*(import|export)\b.*$/gm);
if (leftovers) {
  throw new Error(`Import/export statements survived stripping:\n${leftovers.join("\n")}`);
}

src += `\n\nfunction __nscsBoot() {
  if (typeof React === "undefined" || typeof ReactDOM === "undefined") {
    console.error("NSCS: React failed to load — check CDN scripts in index.html");
    return;
  }
  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Root));
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", __nscsBoot);
} else {
  __nscsBoot();
}
`;

const result = buildSync({
  stdin: { contents: src, loader: "jsx", resolveDir: root },
  bundle: false,
  format: "iife",
  jsx: "transform",
  minifyWhitespace: true,
  write: false,
  logLevel: "warning",
});
let js = result.outputFiles[0].text;

if (js.includes("require(")) {
  throw new Error("Compiled bundle contains require() — would crash in the browser.");
}

js = js.replace(/<\/script>/g, "<\\/script>");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="app-version" content="${appVersion}">
<title>North Star Schedule Planner — AYE 2027</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>body{margin:0}</style>
</head>
<body>
<div id="root"></div>
<script defer>
${js}
</script>
</body>
</html>`;

mkdirSync(distDir, { recursive: true });
writeFileSync(outHtml, html);
writeFileSync(legacyHtml, html);

// Static assets for Cloudflare Pages
const staticDir = join(root, "public");
if (existsSync(staticDir)) {
  for (const name of ["robots.txt", "_headers"]) {
    const src = join(staticDir, name);
    if (existsSync(src)) copyFileSync(src, join(distDir, name));
  }
}

console.log(`✓ Built ${outHtml} (${Math.round(html.length / 1024)} KB) v${appVersion}${testMode || !supabaseUrl ? " [test mode]" : ""}`);
