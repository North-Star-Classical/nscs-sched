# NSCS Schedule Planner — AYE 2027

Schedule planning tool for North Star Classical Christian School's first full K–12
year. Ships as a **single standalone HTML file** (`dist/nscs-schedule-planner.html`)
that runs in any modern browser with no server — open the file and go. All data
persists in the browser's localStorage.

## Quick start

```bash
npm install
npm run build      # src/App.jsx  ->  dist/nscs-schedule-planner.html
npm run test:all   # smoke test + 41-check end-to-end suite
```

Open `dist/nscs-schedule-planner.html` in a browser to use the app.

## Project layout

```
src/App.jsx            All application code (single React component file, ~1,900 lines)
scripts/build.mjs      Build pipeline (JSX -> standalone HTML)
dist/                  Built output (committed so non-developers can download it)
test/smoke.test.cjs    Renders the built app in jsdom; fails on any boot error
test/e2e.test.cjs      41-check suite: tabs, save/load, auto-save, browser-reopen recovery
docs/                  Change logs and session notes
```

## Architecture

- **No framework tooling** — deliberately not a Vite/CRA project. The app is one
  JSX file compiled by esbuild into an IIFE and inlined into an HTML shell that
  loads React 18 UMD, Tailwind 2.2.19, and html2pdf 0.10.1 from CDNs. This keeps
  the deliverable a single file that school staff can double-click.
- **State**: React `useState` throughout, no external state library.
- **Persistence** (browser localStorage):
  - `nscs_plans` — array of named plan snapshots (explicit saves via Plans tab)
  - `nscs_autosave` — debounced (~1 s) snapshot of the working state; restored on
    boot if newer than the last explicit save ("crash recovery")
  - Snapshot fields: `blocks, teachers, customRooms, extraGaps, deletedGaps,
    gapOv, params, dismissed, name, createdAt, updatedAt`
- **`DEFAULT_PARAMS`** (top of `App.jsx`) is the single source of truth for
  schedule parameters. School day 7:45 AM–3:45 PM, 480-min budget, 3-min
  transitions, 15% plan ratio, 5-min setup/teardown, 10-min cleaning, 10-min idle
  threshold. `loadPlan` merges saved params **over** defaults so plans saved by
  older versions load safely.

## Domain notes

- **Teachers**: 23 seed entries = 21 confirmed staff + `tbd-theo` (unfilled
  Applied Theology position) + `various`.
- **Schedule**: 124 seed blocks across grade bands, Mon–Thu (4-day week).
  Blocks use a `grades[]` array; `BAND_GRADES` maps bands to grade lists.
- **Conflict engine**: detects teacher/room/time collisions; dismissals persist
  per-plan via signature strings in `dismissed[]`.
- Tuesday 10:00–11:15 AM is a BSF (Bible Study Fellowship) facility blackout —
  relevant to room analysis, not enforced by the app.

## Build pipeline — why it's paranoid

The build converts `import React ... from "react"` into a UMD global destructure.
An earlier version did this with an exact-string replace that silently missed,
shipping a Node-style `require("react")` call that crashed the app in the browser
("Uncaught Error: Script error."). The current pipeline:

1. Regex-matches any form of the React import — **fails the build** if it doesn't
   transform exactly one.
2. **Fails the build** if any `import`/`export` statement survives stripping.
3. **Fails the build** if `require(` appears in the compiled bundle.

Keep those checks if you rework the build. The e2e test also boots the *built*
HTML (not the source) in jsdom, so a broken bundle can't pass CI.

## Known limitations / next steps

- localStorage is per-browser, per-device; clearing site data deletes plans.
  A JSON export/import feature is the highest-value next addition (real backups
  + moving plans between machines).
- PDF generation (html2pdf) requires a real browser; it's stubbed in tests.
- Planned but unbuilt: student-placement layer for cross-band math/Latin;
  server-side PDF with selectable text.

## Open scheduling questions (carried from planning sessions)

- Applied Theology hire (Q D20); Gentile "Applied Humanities" vs "Applied
  Theology" naming confirmation
- Sorboro Thursday availability window (Q D22)
- Whether an Upper School Algebra I section is needed (Q C17)
- Plan ratio 15% vs 20% (Q A2)
- Seed blocks not yet verified against Kristy's finalized schedules
