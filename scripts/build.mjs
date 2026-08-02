// Build: src/App.jsx -> dist/nscs-schedule-planner.html (single standalone file)
//
// Pipeline:
//   1. Strip the React import (UMD React is provided globally by the HTML shell)
//   2. Strip any other import lines; convert `export default function App` to plain function
//   3. HARD FAIL if any import/export survives (this exact silent failure once shipped
//      a require("react") call to the browser and crashed the app on load)
//   4. Compile JSX with esbuild (iife, whitespace-minified)
//   5. HARD FAIL if the bundle contains require(
//   6. Wrap in the HTML shell with CDN scripts (React 18 UMD, Tailwind 2, html2pdf)
//
// Usage: npm run build

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "src", "App.jsx");
const distDir = join(root, "dist");
const outPath = join(distDir, "nscs-schedule-planner.html");

let src = readFileSync(srcPath, "utf8");

// 1. React import -> UMD global destructure
let reactImports = 0;
src = src.replace(
  /import\s+React\s*,?\s*(\{[^}]*\})?\s*from\s*["']react["'];?/,
  (_, named) => {
    reactImports++;
    return named ? `const ${named} = React;` : "";
  }
);
if (reactImports !== 1) {
  throw new Error(`Expected exactly 1 React import, transformed ${reactImports}. Check src/App.jsx.`);
}

// 2. Strip other imports; unwrap export default
src = src.replace(/^import .*$/gm, "");
const exportCount = (src.match(/export\s+default\s+function\s+App\(\)/g) || []).length;
if (exportCount !== 1) {
  throw new Error(`Expected exactly 1 'export default function App()', found ${exportCount}.`);
}
src = src.replace(/export\s+default\s+function\s+App\(\)/, "function App()");

// 3. Hard fail on survivors
const leftovers = src.match(/^\s*(import|export)\b.*$/gm);
if (leftovers) {
  throw new Error(`Import/export statements survived stripping:\n${leftovers.join("\n")}`);
}

src += '\n\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));\n';

// 4. Compile
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

// 5. Hard fail on require()
if (js.includes("require(")) {
  throw new Error("Compiled bundle contains require() — would crash in the browser.");
}

// 6. Wrap in HTML shell
js = js.replace(/<\/script>/g, "<\\/script>");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>North Star Schedule Planner — AYE 2027</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<style>body{margin:0}</style>
</head>
<body>
<div id="root"></div>
<script>
${js}
</script>
</body>
</html>`;

mkdirSync(distDir, { recursive: true });
writeFileSync(outPath, html);
console.log(`✓ Built ${outPath} (${Math.round(html.length / 1024)} KB)`);
