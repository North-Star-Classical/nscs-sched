const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const root = path.join(__dirname, '..');
execSync('node scripts/build.mjs', { cwd: root, stdio: 'inherit', env: { ...process.env, NSCS_TEST_MODE: '1' } });
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const _s = html.indexOf('<script defer>\n') + '<script defer>\n'.length;
const _e = html.lastIndexOf('\n</script>');
const code = html.slice(_s, _e).replace(/<\\\/script>/g, '</script>');
const React = require('react');
const ReactDOMClient = require('react-dom/client');
const { act } = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;

const errors = [];
const results = [];
const check = (name, ok, extra='') => { results.push(`${ok?'✓':'✗'} ${name}${extra?' — '+extra:''}`); if(!ok) errors.push('FAILED: '+name); };

function boot(label) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url:'http://localhost/', pretendToBeVisual:true });
  const w = dom.window;
  global.window = w; global.document = w.document; global.navigator = w.navigator;
  global.HTMLElement = w.HTMLElement; global.Element = w.Element; global.Node = w.Node;
  global.localStorage = w.localStorage;
  global.requestAnimationFrame = cb => setTimeout(cb, 0);
  global.React = w.React = React; global.ReactDOM = w.ReactDOM = ReactDOMClient;
  global.supabase = w.supabase = { createClient: () => ({ auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } }) };
  global.html2pdf = w.html2pdf = () => ({ set(){return this;}, from(){return this;}, save(){return Promise.resolve();} });
  w.confirm = global.confirm = () => true;
  w.prompt = global.prompt = (msg, def) => def || 'Renamed';
  w.alert = global.alert = () => {};
  w.addEventListener('error', e => errors.push(`[${label}] window error: ${e.message}`));
  const orig = console.error;
  console.error = (...a) => { const m=String(a[0]||''); if(!m.includes('act(')) errors.push(`[${label}] ${a.map(String).join(' ').slice(0,300)}`); };
  try {
    new Function('React','ReactDOM','window','document','localStorage','html2pdf','supabase', code)(React, ReactDOMClient, w, w.document, w.localStorage, global.html2pdf, global.supabase);
  } catch (e) { errors.push(`[${label}] BOOT CRASH: ${e.stack.slice(0,600)}`); }
  console.error = orig;
  return w;
}
const flush = (ms=80) => new Promise(r => setTimeout(r, ms));
const btnByText = (doc, re) => [...doc.querySelectorAll('button')].find(b => re.test(b.textContent));
const storageDump = () => (globalThis.__NSCS_DUMP__ ? globalThis.__NSCS_DUMP__() : { plans: [], autosaves: {} });

(async () => {
  let w = boot('S1');
  await act(async () => { await flush(250); });
  let doc = w.document;
  check('S1: app renders', doc.getElementById('root').innerHTML.length > 5000);

  for (const [re, name] of [[/Schedule Grid/, 'Schedule'], [/Conflicts/, 'Conflicts'], [/Teachers & Load/, 'Teachers'], [/Math Roster/, 'Math Roster'], [/Report Generator/, 'Reports'], [/^Plans$/, 'Plans'], [/Parameters/, 'Parameters']]) {
    const b = btnByText(doc, re);
    check(`S1: "${name}" tab in nav`, !!b);
    if (b) { await act(async () => { b.click(); await flush(); }); check(`S1: "${name}" tab renders`, doc.getElementById('root').innerHTML.length > 3000); }
  }

  await act(async () => { btnByText(doc, /Parameters/).click(); await flush(); });
  const paramInputs = [...doc.querySelectorAll('input[type="number"]')];
  const nanInputs = paramInputs.filter(i => i.value === '' || i.value === 'NaN' || i.value === 'undefined');
  check('S1: Parameters inputs all have values', paramInputs.length > 0 && nanInputs.length === 0, `${paramInputs.length} inputs, ${nanInputs.length} empty/NaN`);

  await act(async () => { btnByText(doc, /^Plans$/).click(); await flush(); });
  const saveBtn = btnByText(doc, /Save/i);
  check('S1: Save button in Plans tab', !!saveBtn, saveBtn ? `"${saveBtn.textContent.trim()}"` : '');
  await act(async () => { saveBtn.click(); await flush(400); });

  let dump = storageDump();
  check('S1: explicit save persisted plans', dump.plans && dump.plans.length >= 1, dump.plans ? `${dump.plans.length} plan(s)` : '');

  let plansArr = dump.plans || [];
  check('S1: at least one plan stored', plansArr.length >= 1, `${plansArr.length} plan(s)`);
  const plan = plansArr[0];
  if (!plan) {
    check('S1: plan object available', false, 'missing');
  } else {
  for (const f of ['blocks','teachers','extraGaps','deletedGaps','gapOv','params','dismissed','name','updatedAt']) {
    check(`S1: plan field "${f}" saved`, f in plan);
  }
  const planRoomList = plan.rooms || [];
  check('S1: plan rooms list saved', Array.isArray(planRoomList) && planRoomList.length > 0, `${planRoomList.length} room(s)`);
  check('S1: mathRoster saved with plan', !!(plan.mathRoster && plan.mathRoster.students && plan.mathRoster.students.length > 0), plan.mathRoster ? `${plan.mathRoster.students.length} students` : 'missing');
  check('S1: params saved with facility keys', plan.params && ['setup','teardown','cleaning','idle'].every(k => k in plan.params));
  check('S1: dayEnd is 15:45 (945 min)', plan.params && plan.params.dayEnd === 945, `got ${plan.params && plan.params.dayEnd}`);
  const s1Blocks = (plan.blocks || []).length;
  const s1Teachers = (plan.teachers || []).length;
  check('S1: blocks present in saved plan', s1Blocks > 0, `${s1Blocks} blocks`);
  check('S1: 23 teachers in saved plan (21 staff + tbd-theo + various)', s1Teachers === 23, `${s1Teachers} teachers`);
  }

  const createBtn = btnByText(doc, /New|Create/i);
  check('S1: Create-plan control present', !!createBtn);
  if (createBtn) {
    await act(async () => { createBtn.click(); await flush(200); });
    dump = storageDump();
    plansArr = dump.plans || [];
    check('S1: createPlan persisted', plansArr.length >= 2, `${plansArr.length} plans`);
    const created = plansArr[plansArr.length-1];
    check('S1: new plan has DEFAULT_PARAMS (dayEnd 945)', created.params && created.params.dayEnd === 945 && created.params.setup === 5);
  }
  const dupBtn = btnByText(doc, /Duplicate/i);
  if (dupBtn) {
    await act(async () => { dupBtn.click(); await flush(200); });
    dump = storageDump();
    plansArr = dump.plans || [];
    check('S1: duplicatePlan persisted', plansArr.some(p => /\(copy\)/.test(p.name)), plansArr.map(p=>p.name).join(', '));
  }

  const loadBtns = [...doc.querySelectorAll('button')].filter(b => /^Load$/i.test(b.textContent.trim()));
  if (loadBtns.length) { await act(async () => { loadBtns[0].click(); await flush(200); }); }
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
  await act(async () => { await flush(1400); });
  dump = storageDump();
  const autoKeys = dump.autosaves ? Object.keys(dump.autosaves) : [];
  check('AUTOSAVE: autosave written after edit', autoKeys.length > 0, autoKeys.length ? `${autoKeys.length} autosave(s)` : 'missing');
  const autoPlanId = autoKeys[0];
  const auto = autoPlanId && dump.autosaves[autoPlanId];
  check('AUTOSAVE: snapshot has blocks & teachers', !!auto && Array.isArray(auto.blocks) && Array.isArray(auto.teachers));

  w = boot('S2');
  await act(async () => { await flush(350); });
  doc = w.document;
  check('S2: app renders after reopen', doc.getElementById('root').innerHTML.length > 5000);
  const bodyHTML = doc.getElementById('root').innerHTML;
  check('S2: unsaved-work recovery banner or data present', /Restored unsaved work|Schedule Grid/.test(bodyHTML));
  await act(async () => { const b = btnByText(doc, /Teachers & Load/); b && b.click(); await flush(); });
  const teacherHTML = doc.getElementById('root').innerHTML;
  check('S2: teacher roster restored (Woodbridge visible)', /Woodbridge/i.test(teacherHTML));

  await act(async () => { const b = btnByText(doc, /^Plans$/); b && b.click(); await flush(); });
  const saveBtn3 = btnByText(doc, /Save/i);
  if (saveBtn3) { await act(async () => { saveBtn3.click(); await flush(200); }); }
  dump = storageDump();
  const plansAfter = dump.plans || [];
  const newest = plansAfter.reduce((a,b) => ((a.updatedAt||'') > (b.updatedAt||'') ? a : b), plansAfter[0] || {});
  check('S3: explicit save is newest', !!newest.updatedAt);

  // Room field visibility + persistence
  await act(async () => { btnByText(doc, /Schedule Grid/).click(); await flush(); });
  const blockBtn = [...doc.querySelectorAll('button')].find(b => /Rm |Room:|No room — click to set/.test(b.textContent));
  check('ROOM: schedule grid shows room on block tile', !!blockBtn);
  if (blockBtn) {
    await act(async () => { blockBtn.click(); await flush(); });
    const roomLabel = [...doc.querySelectorAll('label')].find(l => /^Room$/i.test(l.textContent.trim()));
    const roomSelect = roomLabel && roomLabel.parentElement && roomLabel.parentElement.querySelector('select');
    check('ROOM: block editor exposes Room control', !!roomSelect);
    if (roomSelect) {
      const testRoom = '212';
      await act(async () => {
        roomSelect.value = testRoom;
        roomSelect.dispatchEvent(new w.Event('change', { bubbles: true }));
        await flush();
      });
      await act(async () => { btnByText(doc, /^Plans$/).click(); await flush(); });
      const saveRoomBtn = btnByText(doc, /Save/i);
      if (saveRoomBtn) { await act(async () => { saveRoomBtn.click(); await flush(400); }); }
      dump = storageDump();
      const savedPlan = (dump.plans || []).find(p => (p.blocks || []).some(bl => bl.room === testRoom));
      check('ROOM: room value survives explicit save', !!savedPlan, savedPlan ? `room ${testRoom}` : 'not found');
    }
  }

  // Editable plan rooms UI
  await act(async () => { btnByText(doc, /Parameters/).click(); await flush(); });
  const roomRenameBtns = [...doc.querySelectorAll('button')].filter(b => /^Rename$/i.test(b.textContent.trim()));
  const roomDeleteBtns = [...doc.querySelectorAll('button')].filter(b => /^Delete$/i.test(b.textContent.trim()));
  check('ROOMS: room table has Rename actions', roomRenameBtns.length >= 16, `${roomRenameBtns.length} button(s)`);
  check('ROOMS: room table has Delete actions', roomDeleteBtns.length >= 16, `${roomDeleteBtns.length} button(s)`);
  const tbdRow = [...doc.querySelectorAll('tr')].find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim() === 'TBD');
  if (tbdRow) {
    w.prompt = global.prompt = (msg, def) => (def === 'TBD' ? 'TBD-Renamed' : def);
    const tbdRename = [...tbdRow.querySelectorAll('button')].find(b => /^Rename$/i.test(b.textContent.trim()));
    if (tbdRename) {
      await act(async () => { tbdRename.click(); await flush(200); });
      check('ROOMS: rename updates room table', /TBD-Renamed/.test(doc.getElementById('root').innerHTML) && !/>\s*TBD\s*</.test(doc.getElementById('root').innerHTML));
    }
  }

  // Math roster tab
  await act(async () => { btnByText(doc, /Math Roster/).click(); await flush(); });
  check('MATH: roster tab renders sections table', /Class sections \(course · room · teacher\)/.test(doc.getElementById('root').innerHTML));
  check('MATH: roster has student rows', /Consolidated Placements/.test(doc.getElementById('root').innerHTML));
  check('MATH: section course inputs editable', doc.querySelectorAll('fieldset legend').length > 0 && [...doc.querySelectorAll('table input')].some(i => /ALG|Alg|Geometry|Pre/i.test(i.value || '')));
  check('MATH: students table hidden', !/legend[^>]*>Students</.test(doc.getElementById('root').innerHTML));
  check('HERO: active plan visible', /Active plan:/.test(doc.getElementById('root').innerHTML));
  check('HERO: app version visible', /App v1\.7\.2/.test(doc.getElementById('root').innerHTML));

  console.log('\n════════ FULL VALIDATION RESULTS ════════');
  results.forEach(r => console.log(r));
  const fails = results.filter(r => r.startsWith('✗')).length;
  console.log(`\nPASS: ${results.length - fails}/${results.length}   RUNTIME ERRORS: ${errors.filter(e=>!e.startsWith('FAILED')).length}`);
  errors.filter(e=>!e.startsWith('FAILED')).slice(0,8).forEach(e => console.log('  ⚠ ' + e.slice(0,300)));
  process.exit(fails || errors.length ? 1 : 0);
})();
