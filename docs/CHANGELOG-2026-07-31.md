# NSCS Schedule Planner — Bug Fixes & Validation Report

**Date:** July 31, 2026
**Result:** 41/41 automated end-to-end checks passing, 0 runtime errors

---

## Root Cause of "Script error." (app not loading)

The browser bundle contained a `require("react")` call. The build step that converts
the React import for browser use silently failed (it searched for an import line that
didn't match the source exactly), leaving a Node-style `require()` in the code.
Browsers don't have `require`, so the script crashed on line 1 before anything rendered.

**Fix:** Build now uses pattern matching that handles any form of the React import, and
the build fails loudly if any import/export survives. Verified: 0 `require()` calls in
the shipped file, and the shipped script is byte-identical to the tested bundle.

## Root Cause of Lost Versions (data not saving)

Two compounding UI bugs made saving effectively impossible:

1. **The "Plans" tab was missing from the navigation bar.** The save/load screen
   existed in code but no button pointed to it, so it was unreachable.
2. **The Save button only rendered when a plan was already loaded.** On a fresh
   browser (first session), no plan exists yet, so even reaching the Plans tab
   would have shown no Save button.

Any work done in earlier sessions was held in memory only and lost on close.
I'm sorry — this should have been caught before delivery.

**Fixes:**
- "Plans" tab added to the navigation (between Report Generator and Parameters).
- Save button now always visible; if no plan exists yet, saving creates one
  automatically instead of failing.
- **Auto-save added:** every edit is snapshotted to browser storage ~1 second after
  you make it. If the browser closes without an explicit save, the app restores the
  auto-saved work on next launch and shows: "Restored unsaved work from auto-save —
  click Save in the Plans tab to keep it." An explicit save always takes precedence
  over an older auto-save.

## Additional Bugs Fixed

3. **Runtime crash in schedule synthesis:** `buildTeacherDay()` reassigned a `const`
   variable — crashed the moment a teacher schedule was computed. Changed to `let`.
4. **Stale parameter fallbacks:** `loadPlan` and `createPlan` used an outdated
   defaults object — school day end of 4:45 PM instead of 3:45 PM, and missing the
   four facility keys (setup, teardown, cleaning, idle), which would have produced
   blank/NaN values after loading a plan. Both now use a single shared
   `DEFAULT_PARAMS` constant, and loaded plans merge over defaults so older saved
   plans missing newer fields load safely.
5. **Dismissed conflicts now persist:** conflict dismissals are saved with each plan
   and restored on load (previously they reset every session).
6. **Plan list hardened:** rendering no longer crashes on plans saved by older
   versions that lack some fields.

## What Was Validated (automated, simulating a real browser)

The compiled app was executed in a DOM environment with simulated clicks and typing:

- App renders on a completely fresh browser (no stored data)
- All 6 tabs present in nav and each renders: Schedule Grid, Conflicts & Resolutions,
  Teachers & Load, Report Generator, Plans, Parameters
- All 8 numeric parameter inputs show values (no blanks/NaN)
- Clicking Save writes the full plan to browser storage — verified fields: blocks
  (124), teachers (23 = 21 confirmed staff + "TBD Theology" + "Various"), customRooms,
  extraGaps, deletedGaps, gapOv, params (including setup/teardown/cleaning/idle,
  dayEnd = 3:45 PM), dismissed, name, timestamps
- Create plan and Duplicate plan both persist to storage with correct defaults
- Editing a parameter with **no explicit save**, then "closing the browser": on
  reopen, the auto-saved work is restored and the teacher roster is intact
- After an explicit save, the saved plan (not the stale auto-save) loads on reopen
- Zero uncaught errors and zero console errors across all of the above

## Honest Limitations

- Storage is per-browser, per-device. Clearing browser data deletes plans. For
  anything critical, keep PDF exports or copies elsewhere. (A JSON export/import
  feature would be the right next step if you want real backups.)
- PDF generation was stubbed in the automated tests (it's a CDN library that needs a
  real browser to render). The wiring is unchanged from when it worked previously,
  but please click one report download to confirm on your machine.
- Auto-save keeps one snapshot (your latest working state), not a history. Named
  plans in the Plans tab remain the way to keep versions.

## 30-Second Verification on Your End

1. Open `nscs-schedule-planner.html` — it should render immediately (this was the
   "Script error." failure point).
2. Change anything (e.g., a parameter). Don't save. Close the browser entirely.
3. Reopen the file — you should see the restore notice and your change intact.
4. Go to **Plans** (now in the top nav), click **💾 Save**, and your plan appears in
   the list with a timestamp.
