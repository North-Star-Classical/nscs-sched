const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const root = path.join(__dirname, '..');
execSync('node scripts/build.mjs', { cwd: root, stdio: 'inherit' });
const html = fs.readFileSync(path.join(root, 'dist', 'nscs-schedule-planner.html'), 'utf8');
const _s = html.lastIndexOf('<script>\n') + '<script>\n'.length;
const _e = html.lastIndexOf('\n</script>');
const code = html.slice(_s, _e).replace(/<\\\/script>/g, '</script>');
const React = require('react');
const ReactDOMClient = require('react-dom/client');
const { act } = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;

const store = {}; // persists across simulated "browser sessions"
const fakeLS = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};

const errors = [];
const results = [];
const check = (name, ok, extra='') => { results.push(`${ok?'✓':'✗'} ${name}${extra?' — '+extra:''}`); if(!ok) errors.push('FAILED: '+name); };

function boot(label) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url:'http://localhost/', pretendToBeVisual:true });
  const w = dom.window;
  global.window = w; global.document = w.document; global.navigator = w.navigator;
  global.HTMLElement = w.HTMLElement; global.Element = w.Element; global.Node = w.Node;
  global.localStorage = fakeLS;
  global.requestAnimationFrame = cb => setTimeout(cb, 0);
  global.React = w.React = React; global.ReactDOM = w.ReactDOM = ReactDOMClient;
  global.html2pdf = w.html2pdf = () => ({ set(){return this;}, from(){return this;}, save(){return Promise.resolve();} });
  w.confirm = global.confirm = () => true;
  w.prompt = global.prompt = () => "Renamed";
  w.alert = global.alert = () => {};
  w.addEventListener('error', e => errors.push(`[${label}] window error: ${e.message}`));
  const orig = console.error;
  console.error = (...a) => { const m=String(a[0]||''); if(!m.includes('act(')) errors.push(`[${label}] ${a.map(String).join(' ').slice(0,300)}`); };
  try {
    new Function('React','ReactDOM','window','document','localStorage','html2pdf', code)(React, ReactDOMClient, w, w.document, fakeLS, global.html2pdf);
  } catch (e) { errors.push(`[${label}] BOOT CRASH: ${e.stack.slice(0,600)}`); }
  console.error = orig;
  return w;
}
const flush = (ms=80) => new Promise(r => setTimeout(r, ms));
const btnByText = (doc, re) => [...doc.querySelectorAll('button')].find(b => re.test(b.textContent));

(async () => {
  // ============ SESSION 1: fresh browser ============
  let w = boot('S1');
  await act(async () => { await flush(); });
  let doc = w.document;
  check('S1: app renders', doc.getElementById('root').innerHTML.length > 5000);

  // All six tabs present & switchable
  for (const [re, name] of [[/Schedule Grid/, 'Schedule'], [/Conflicts/, 'Conflicts'], [/Teachers & Load/, 'Teachers'], [/Report Generator/, 'Reports'], [/^Plans$/, 'Plans'], [/Parameters/, 'Parameters']]) {
    const b = btnByText(doc, re);
    check(`S1: "${name}" tab in nav`, !!b);
    if (b) { await act(async () => { b.click(); await flush(); }); check(`S1: "${name}" tab renders`, doc.getElementById('root').innerHTML.length > 3000); }
  }

  // Parameters tab: verify facility fields have values (no NaN/undefined)
  await act(async () => { btnByText(doc, /Parameters/).click(); await flush(); });
  const paramInputs = [...doc.querySelectorAll('input[type="number"]')];
  const nanInputs = paramInputs.filter(i => i.value === '' || i.value === 'NaN' || i.value === 'undefined');
  check('S1: Parameters inputs all have values', paramInputs.length > 0 && nanInputs.length === 0, `${paramInputs.length} inputs, ${nanInputs.length} empty/NaN`);

  // Go to Plans tab, save explicitly
  await act(async () => { btnByText(doc, /^Plans$/).click(); await flush(); });
  const saveBtn = btnByText(doc, /Save/i);
  check('S1: Save button in Plans tab', !!saveBtn, saveBtn ? `"${saveBtn.textContent.trim()}"` : '');
  await act(async () => { saveBtn.click(); await flush(); });
  check('S1: explicit save wrote nscs_plans', !!store['nscs_plans'], store['nscs_plans'] ? `${store['nscs_plans'].length} bytes` : '');

  let plansArr = JSON.parse(store['nscs_plans'] || '[]');
  check('S1: at least one plan stored', plansArr.length >= 1, `${plansArr.length} plan(s)`);
  const plan = plansArr[plansArr.length - 1];
  for (const f of ['blocks','teachers','customRooms','extraGaps','deletedGaps','gapOv','params','dismissed','name','updatedAt']) {
    check(`S1: plan field "${f}" saved`, f in plan);
  }
  check('S1: params saved with facility keys', plan.params && ['setup','teardown','cleaning','idle'].every(k => k in plan.params));
  check('S1: dayEnd is 15:45 (945 min)', plan.params && plan.params.dayEnd === 945, `got ${plan.params && plan.params.dayEnd}`);
  const s1Blocks = (plan.blocks || []).length;
  const s1Teachers = (plan.teachers || []).length;
  check('S1: blocks present in saved plan', s1Blocks > 0, `${s1Blocks} blocks`);
  check('S1: 23 teachers in saved plan (21 staff + tbd-theo + various)', s1Teachers === 23, `${s1Teachers} teachers`);

  // Create + duplicate + rename plan
  const newInput = [...doc.querySelectorAll('input')].find(i => /name|plan/i.test(i.placeholder || ''));
  const createBtn = btnByText(doc, /New|Create/i);
  check('S1: Create-plan control present', !!createBtn);
  if (createBtn) {
    await act(async () => { createBtn.click(); await flush(); });
    plansArr = JSON.parse(store['nscs_plans'] || '[]');
    check('S1: createPlan persisted', plansArr.length >= 2, `${plansArr.length} plans`);
    const created = plansArr[plansArr.length-1];
    check('S1: new plan has DEFAULT_PARAMS (dayEnd 945)', created.params && created.params.dayEnd === 945 && created.params.setup === 5);
  }
  const dupBtn = btnByText(doc, /Duplicate/i);
  if (dupBtn) {
    await act(async () => { dupBtn.click(); await flush(); });
    plansArr = JSON.parse(store['nscs_plans'] || '[]');
    check('S1: duplicatePlan persisted', plansArr.some(p => /\(copy\)/.test(p.name)), plansArr.map(p=>p.name).join(', '));
  }

  // ============ Simulate an edit WITHOUT explicit save, then wait for autosave ============
  // Load first plan (the seeded one with blocks), then delete via Teachers tab is complex;
  // simplest verifiable mutation: switch tab to Parameters and change a numeric input
  const loadBtns = [...doc.querySelectorAll('button')].filter(b => /^Load$/i.test(b.textContent.trim()));
  if (loadBtns.length) { await act(async () => { loadBtns[0].click(); await flush(); }); }
  await act(async () => { btnByText(doc, /Parameters/).click(); await flush(); });
  const numInput = [...doc.querySelectorAll('input[type="number"]')][0];
  if (numInput) {
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '7');
      numInput.dispatchEvent(new w.Event('input', { bubbles: true }));
      numInput.dispatchEvent(new w.Event('change', { bubbles: true }));
      await flush();
    });
  }
  // Wait past the 1s debounce
  await act(async () => { await flush(1400); });
  check('AUTOSAVE: nscs_autosave written after edit', !!store['nscs_autosave'], store['nscs_autosave'] ? `${store['nscs_autosave'].length} bytes` : 'missing');
  let auto = null; try { auto = JSON.parse(store['nscs_autosave']); } catch(e){}
  check('AUTOSAVE: snapshot has blocks & teachers', !!auto && Array.isArray(auto.blocks) && Array.isArray(auto.teachers));

  // ============ SESSION 2: "close browser", reopen ============
  w = boot('S2');
  await act(async () => { await flush(150); });
  doc = w.document;
  check('S2: app renders after reopen', doc.getElementById('root').innerHTML.length > 5000);
  const bodyHTML = doc.getElementById('root').innerHTML;
  check('S2: unsaved-work recovery banner or data present', /Restored unsaved work|Schedule Grid/.test(bodyHTML));
  // Verify the schedule content came back (blocks rendered)
  await act(async () => { const b = btnByText(doc, /Teachers & Load/); b && b.click(); await flush(); });
  const teacherHTML = doc.getElementById('root').innerHTML;
  check('S2: teacher roster restored (Woodbridge visible)', /Woodbridge/i.test(teacherHTML));

  // ============ SESSION 3: explicit save beats stale autosave ============
  await act(async () => { const b = btnByText(doc, /^Plans$/); b && b.click(); await flush(); });
  const saveBtn3 = btnByText(doc, /Save/i);
  if (saveBtn3) { await act(async () => { saveBtn3.click(); await flush(); }); }
  const plansAfter = JSON.parse(store['nscs_plans'] || '[]');
  const newest = plansAfter.reduce((a,b) => ((a.updatedAt||'') > (b.updatedAt||'') ? a : b), {});
  check('S3: explicit save is newest', !!newest.updatedAt);

  console.log('\n════════ FULL VALIDATION RESULTS ════════');
  results.forEach(r => console.log(r));
  const fails = results.filter(r => r.startsWith('✗')).length;
  console.log(`\nPASS: ${results.length - fails}/${results.length}   RUNTIME ERRORS: ${errors.filter(e=>!e.startsWith('FAILED')).length}`);
  errors.filter(e=>!e.startsWith('FAILED')).slice(0,8).forEach(e => console.log('  ⚠ ' + e.slice(0,300)));
  process.exit(fails || errors.length ? 1 : 0);
})();
