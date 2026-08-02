// Smoke test: compile src and render it in jsdom exactly as a browser would.
// Catches boot crashes (e.g., stray require(), reference errors) before shipping.
// Run: npm test

const { JSDOM } = require("jsdom");
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

// Build first so we test exactly what ships
execSync("node scripts/build.mjs", { cwd: root, stdio: "inherit" });

// Extract the inline script from the built HTML
const html = readFileSync(path.join(root, "dist", "nscs-schedule-planner.html"), "utf8");
const start = html.lastIndexOf("<script>\n") + "<script>\n".length;
const end = html.lastIndexOf("\n</script>");
const code = html.slice(start, end).replace(/<\\\/script>/g, "</script>");

if (code.includes("require(")) {
  console.error("✗ FAIL: bundle contains require()");
  process.exit(1);
}

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const w = dom.window;
global.window = w;
global.document = w.document;
global.navigator = w.navigator;
global.localStorage = w.localStorage;
global.HTMLElement = w.HTMLElement;
global.Element = w.Element;
global.Node = w.Node;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const React = require("react");
const ReactDOM = require("react-dom/client");
global.React = w.React = React;
global.ReactDOM = w.ReactDOM = ReactDOM;
global.html2pdf = w.html2pdf = () => ({
  set() { return this; },
  from() { return this; },
  save() { return Promise.resolve(); },
});

const errors = [];
w.addEventListener("error", (e) => errors.push("window error: " + e.message));
process.on("uncaughtException", (e) => errors.push("uncaught: " + e.stack));
const origError = console.error;
console.error = (...args) => {
  const msg = String(args[0] || "");
  if (!msg.includes("act(")) errors.push("console.error: " + args.map(String).join(" "));
};

try {
  new Function("React", "ReactDOM", "window", "document", "localStorage", "html2pdf", code)(
    React, ReactDOM, w, w.document, w.localStorage, global.html2pdf
  );
} catch (e) {
  errors.push("BOOT CRASH: " + e.stack);
}

setTimeout(() => {
  console.error = origError;
  const rendered = w.document.getElementById("root").innerHTML.length;
  const pass = rendered > 5000 && errors.length === 0;
  console.log(pass
    ? `✓ PASS: app rendered (${rendered} chars of DOM), 0 errors`
    : `✗ FAIL: rendered=${rendered} chars, errors=${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 400)));
  process.exit(pass ? 0 : 1);
}, 1500);
