// Smoke test: compile src and render it in jsdom exactly as a browser would.
// Run: npm test

const { JSDOM } = require("jsdom");
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

execSync("node scripts/build.mjs", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, NSCS_TEST_MODE: "1" },
});

const html = readFileSync(path.join(root, "dist", "index.html"), "utf8");
const start = html.indexOf("<script defer>\n") + "<script defer>\n".length;
const end = html.lastIndexOf("\n</script>");
const code = html.slice(start, end).replace(/<\\\/script>/g, "</script>");

if (code.includes("require(")) {
  console.error("✗ FAIL: bundle contains require()");
  process.exit(1);
}

const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"root\"></div></body></html>", {
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
global.supabase = w.supabase = { createClient: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } }) };

const React = require("react");
const ReactDOM = require("react-dom/client");
global.React = w.React = React;
global.ReactDOM = w.ReactDOM = ReactDOM;
global.html2pdf = w.html2pdf = () => ({ set() { return this; }, from() { return this; }, save() { return Promise.resolve(); } });

const errors = [];
w.addEventListener("error", (e) => errors.push(e.message || String(e.error)));

try {
  new Function("React", "ReactDOM", "window", "document", "localStorage", "html2pdf", "supabase", code)(
    React, ReactDOM, w, w.document, w.localStorage, global.html2pdf, global.supabase
  );
} catch (e) {
  console.error("✗ BOOT CRASH:", e.stack);
  process.exit(1);
}

setTimeout(() => {
  const rootEl = w.document.getElementById("root");
  const len = rootEl ? rootEl.innerHTML.length : 0;
  if (len < 5000 || errors.length) {
    console.error(`✗ FAIL: app rendered ${len} chars, ${errors.length} errors`);
    errors.forEach((e) => console.error(" ", e));
    process.exit(1);
  }
  console.log(`✓ PASS: app rendered (${len} chars of DOM), ${errors.length} errors`);
}, 200);
