#!/usr/bin/env node
/**
 * Execute the shipped prose stripper, rather than a description of it.
 *
 * Why this exists
 * ---------------
 * process-ai-reports now treats the synthesis request's `context` as untrusted
 * input to a prompt and removes learner free text from it before it can reach
 * the model. That removal is the privacy control for the synthesis report, and
 * privacy controls have a habit of being *believed* rather than tested.
 *
 * A copy of the logic would prove nothing — the bug this guards against is the
 * shipped version drifting away from what everyone assumes it does. So this test
 * slices the real definitions (PROSE_KEYS, stripProse, loadInterpretedProfile)
 * straight out of index.ts, transpiles them, and runs them.
 *
 * If the slice markers move, this fails loudly instead of quietly testing an
 * empty region — an unverifiable check must never report success.
 *
 * Run:  node scripts/check-synthesis-prose-strip.js
 * Exits 1 on any failure or if it cannot verify.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const INDEX = path.join(__dirname, '..', 'supabase', 'functions', 'process-ai-reports', 'index.ts');

function bail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(INDEX)) bail(`cannot find the edge function at ${INDEX}`);

const src = fs.readFileSync(INDEX, 'utf8');

// ── Slice the region that holds the three definitions ───────────────────────
const START = 'const PROSE_KEYS';
const END = 'const ALLOWED_ORIGINS';
const start = src.indexOf(START);
const end = src.indexOf(END);
if (start < 0) bail(`marker "${START}" not found in index.ts — cannot verify the stripper`);
if (end < 0) bail(`marker "${END}" not found in index.ts — cannot verify the stripper`);
if (end <= start) bail('slice markers are in the wrong order — cannot verify the stripper');

const region = src.slice(start, end);
for (const needed of ['stripProse', 'loadInterpretedProfile']) {
  if (!region.includes(needed)) {
    bail(`the sliced region does not contain ${needed}() — markers have drifted, so this test would verify nothing`);
  }
}

// ── Transpile the slice so Node can run it ─────────────────────────────────
const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 's8t-strip-'));
const tsFile = path.join(tmpdir, 'region.ts');
const jsFile = path.join(tmpdir, 'region.js');
fs.writeFileSync(tsFile, region + '\nmodule.exports = { PROSE_KEYS, stripProse, loadInterpretedProfile };\n');

try {
  execFileSync('npx', ['--yes', 'esbuild', '--loader:.ts=ts', '--format=cjs', `--outfile=${jsFile}`, tsFile],
    { stdio: 'pipe' });
} catch (e) {
  const detail = (e.stderr || e.stdout || '').toString().slice(0, 400);
  bail('could not transpile the region (is esbuild available?)\n  ' + detail);
}

// `supabase` is module-scope in index.ts, so the slice needs one in scope.
function fakeSupabase(extraction) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: extraction }) })
      })
    })
  };
}

let mod;
const rows = [];
function check(label, pass, extra) {
  rows.push({ label, pass, extra });
}

try {
  mod = require(jsFile);
} catch (e) {
  bail('the transpiled region threw on load: ' + e.message);
}

global.supabase = fakeSupabase(null);
// The slice references `supabase` as a free variable, so re-evaluate with the
// stub injected. Reading the file's source and evaluating it keeps the test on
// the shipped text.
function loadWithStub(stub) {
  const body = fs.readFileSync(jsFile, 'utf8')
    .replace(/module\.exports\s*=\s*\{[^}]*\};?/, '');
  const sandbox = { supabase: stub, module: { exports: {} }, exports: {} };
  // eslint-disable-next-line no-new-func
  const fn = new Function('supabase', 'module', 'exports',
    body + '\nreturn { PROSE_KEYS, stripProse, loadInterpretedProfile };');
  return fn(stub, sandbox.module, sandbox.exports);
}

// ── 1. The stripper removes prose, at any depth ─────────────────────────────
{
  const { stripProse, PROSE_KEYS } = loadWithStub(fakeSupabase(null));

  check('PROSE_KEYS is a non-empty set of names',
    PROSE_KEYS instanceof Set && PROSE_KEYS.size > 0,
    `size=${PROSE_KEYS && PROSE_KEYS.size}`);

  // The exact shape of the live leak: one level down, inside `onboarding`.
  const ctx = stripProse({
    basis: 'grammatica',
    onboarding: { english_level: 'upper-intermediate', goal: 'Sono Marco, voglio diventare bilingue' },
    keep_me: [1, 2, 3]
  });
  const ser = JSON.stringify(ctx);
  check('removes onboarding.goal (the live leak shape)', !ser.includes('goal') && !ser.includes('Marco'), ser);
  check('keeps the neighbouring non-prose field', ctx.onboarding && ctx.onboarding.english_level === 'upper-intermediate');
  check('keeps unrelated top-level data', ser.includes('grammatica') && ser.includes('keep_me'));

  // Depth: a field-name check that only looked at the top level missed this once.
  const deep = stripProse({ a: { b: { c: { short_term_goal: 'SEKRIT' } } } });
  check('removes prose nested three levels down', !JSON.stringify(deep).includes('SEKRIT'));

  // Inside an array of objects.
  const arr = stripProse([{ goal: 'SEKRIT2', ok: 1 }]);
  check('removes prose inside an array of objects',
    !JSON.stringify(arr).includes('SEKRIT2') && arr[0].ok === 1);

  // Scalars survive untouched.
  check('leaves scalars and nulls alone',
    stripProse(5) === 5 && stripProse(null) === null && stripProse('plain') === 'plain');

  // A pathologically nested object must not recurse forever.
  let bomb = { x: 1 };
  for (let i = 0; i < 40; i++) bomb = { n: bomb };
  let bombOk = true;
  try { JSON.stringify(stripProse(bomb)); } catch (e) { bombOk = false; }
  check('terminates on deep nesting', bombOk);
}

// ── 2. Goals still reach the report, from the database ──────────────────────
// This is the half that stops "remove the prose" from quietly becoming "send
// nothing": the client no longer carries the goal, so if this mapping broke, the
// synthesis report would lose personalisation with no error anywhere.
{
  const extraction = {
    payload: {
      goals: { short_term: ['Tenere una presentazione'], long_term: [] },
      difficulties: ['agreement'],
      contexts: ['studio'],
      motivation: ['instrumental'],
      cefr_self_assessed: 'B2',
      constraints: []
    },
    coverage: 'substantial'
  };
  const { loadInterpretedProfile } = loadWithStub(fakeSupabase(extraction));

  loadInterpretedProfile('user-1').then((r) => {
    const g = JSON.stringify(r.profile.goals || {});
    check('carries goals through from the extraction', g.includes('Tenere una presentazione'), g);
    check('carries coverage through', r.profile.coverage === 'substantial');
    check('personalises when there is data',
      /Base all personalisation on interpreted_profile/.test(r.instruction));

    return loadInterpretedProfile('user-2');
  }).then(() => {
    // With no extraction the instruction must switch, and must not invent.
    const { loadInterpretedProfile: load2 } = loadWithStub(fakeSupabase(null));
    return load2('user-3');
  }).then((r) => {
    check('defaults to coverage none when there is no row', r.profile.coverage === 'none');
    check('forbids inference when coverage is none',
      /coverage is "none"/.test(r.instruction) && /Do not infer/.test(r.instruction));

    const failed = rows.filter((x) => !x.pass);
    for (const x of rows) {
      console.log(`  ${x.pass ? 'ok  ' : 'FAIL'}  ${x.label}${x.pass ? '' : '  -> ' + (x.extra || '')}`);
    }
    fs.rmSync(tmpdir, { recursive: true, force: true });
    if (failed.length) {
      console.error(`✗ ${failed.length} prose-strip assertion(s) failed`);
      process.exit(1);
    }
    console.log('✓ prose stripped at any depth, and goals still arrive from the extraction');
  }).catch((e) => {
    bail('loadInterpretedProfile threw: ' + e.message);
  });
}
