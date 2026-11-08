#!/usr/bin/env node
/**
 * Find database calls whose failure nobody would ever notice.
 *
 * Why this exists
 * ---------------
 * The refund in process-ai-reports never once worked. It called an RPC, the RPC
 * answered `{"refused": "no matching charge"}`, and because that arrives as a
 * NORMAL RESPONSE rather than a thrown error, the code carried on and the ledger
 * recorded nothing. Nobody saw it for months: no exception, no log line, no
 * failed cron run. The only trace was an absence — zero refund rows, ever.
 *
 * The same shape is available everywhere in this codebase. The Supabase client
 * does not throw on a database error; it hands back `{ data, error }`. Destructure
 * only `data` and the call becomes unable to fail. This scans for that.
 *
 * What it looks for
 *   R1 ignores-error     `const { data } = await supabase...`  — error discarded
 *   R2 unchecked-error   `const { data, error } = ...` — error never referenced in
 *                        the enclosing block, so the check was decorative
 *   R3 silent-catch      a catch block that neither logs nor rethrows
 *
 * It is a text scanner, not a type-aware analyser, so it scrubs comments and
 * string bodies first (keeping offsets and line numbers intact) and matches
 * brackets to find the enclosing block. It can be wrong about intent — which is
 * why violations are compared against a checked-in baseline: the point is to
 * stop a NEW silent failure being added, not to retro-fit judgement about the
 * 30-odd existing ones.
 *
 * The check is verified in --self-test against fixtures containing known-bad and
 * known-good code. A scanner that cannot fail is worse than no scanner, so if the
 * fixtures are not detected this exits non-zero instead of reporting success.
 *
 * Usage:
 *   node scripts/check-silent-db-errors.js              # compare to baseline
 *   node scripts/check-silent-db-errors.js --self-test   # prove it can fail
 *   node scripts/check-silent-db-errors.js --report      # list everything
 *   node scripts/check-silent-db-errors.js --update-baseline
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'silent-error-baseline.txt');
const CLIENT_NAMES = /(?:supabase|supabaseAdmin|supabaseClient|sb)\s*\./;
// The same set, as a source fragment, so it can be required to appear immediately
// after the `=`. Searching the next 200 characters instead was a false-positive
// generator: a plain `const x = something()` on one line matched a client call in
// the statement *after* it, and every such pair became an R4 finding.
const CLIENT = '(?:supabase|supabaseAdmin|supabaseClient|sb)';

// ── Scrubbing ────────────────────────────────────────────────────────────────
// Blank out comments and the *contents* of strings and regex literals so that
// identifiers and brackets can be trusted, while keeping every offset and
// newline exactly where it was.
//
// Regex literals are handled because their absence broke this scanner outright:
// `word.replace(/[^\p{L}'-]/gu, '')` contains an apostrophe. Treated as a string
// delimiter, it flipped the quote parity for the rest of the file and everything
// after it was blanked — including any violation, which then simply never
// appeared. Ten of the edge functions contain a regex like that, so the scanner
// was silently blind to a good part of the codebase while reporting success.
// Blanking regex bodies also keeps any `{2,3}` quantifier out of the brace
// counting used to find enclosing blocks.
function regexMayStart(out) {
  // The classic regex-vs-division ambiguity, decided by the previous meaningful
  // character (or keyword). Wrong guesses only blank a span, so it errs toward
  // "regex" where a regex is plausible.
  let j = out.length - 1;
  while (j >= 0 && /\s/.test(out[j])) j--;
  if (j < 0) return true;
  if ('(,=:[!&|?{};>'.includes(out[j])) return true;
  return /(?:return|typeof|case|in|of|new|delete|void|instanceof|do|else|yield|await)$/
    .test(out.slice(Math.max(0, j - 11), j + 1));
}

function scrub(src) {
  let out = '';
  let i = 0;
  let mode = 'code';
  let inClass = false;
  // One frame per open `${ ... }` inside a template literal, holding the brace
  // depth of that interpolation so a `}` can be told apart from the one that
  // closes it.
  //
  // Blanking template literals wholesale was a real blind spot: a client call
  // inside `${...}` is executed, and the mutation test found one undetected in
  // every single edge function. Interpolations are code, so they are scanned as
  // code; only the literal text between them is blanked.
  const exprDepth = [];
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === '/' && regexMayStart(out)) { mode = 'regex'; inClass = false; out += '/'; i++; continue; }
      if (c === "'") { mode = 'sq'; out += "'"; i++; continue; }
      if (c === '"') { mode = 'dq'; out += '"'; i++; continue; }
      if (c === '`') { mode = 'tpl'; out += '`'; i++; continue; }
      if (c === '{') {
        if (exprDepth.length) exprDepth[exprDepth.length - 1]++;
        out += c; i++; continue;
      }
      if (c === '}' && exprDepth.length) {
        exprDepth[exprDepth.length - 1]--;
        if (exprDepth[exprDepth.length - 1] === 0) {
          exprDepth.pop();
          mode = 'tpl';
          out += '}'; i++; continue;
        }
        out += c; i++; continue;
      }
      out += c; i++; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += '\n'; } else { out += ' '; }
      i++; continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') { mode = 'code'; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (mode === 'regex') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '[') { inClass = true; out += '['; i++; continue; }
      if (c === ']') { inClass = false; out += ']'; i++; continue; }
      if (c === '/' && !inClass) { mode = 'code'; out += '/'; i++; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (mode === 'tpl') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '$' && d === '{') { exprDepth.push(1); mode = 'code'; out += '${'; i += 2; continue; }
      if (c === '`') { mode = 'code'; out += '`'; i++; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
    if (c === '\\') { out += '  '; i += 2; continue; }
    if (mode === 'sq' && c === "'") { mode = 'code'; out += "'"; i++; continue; }
    if (mode === 'dq' && c === '"') { mode = 'code'; out += '"'; i++; continue; }
    out += c === '\n' ? '\n' : ' ';
    i++;
  }
  return out;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

// End index of the block that encloses `pos`, by bracket matching.
function enclosingBlockEnd(scrubbed, pos) {
  let depth = 0;
  for (let i = 0; i < pos; i++) {
    if (scrubbed[i] === '{') depth++;
    else if (scrubbed[i] === '}') depth--;
  }
  const startDepth = depth;
  let d = depth;
  for (let i = pos; i < scrubbed.length; i++) {
    if (scrubbed[i] === '{') d++;
    else if (scrubbed[i] === '}') {
      d--;
      if (d < startDepth) return i;
    }
  }
  return scrubbed.length;
}

// ── Analysis ─────────────────────────────────────────────────────────────────
function analyse(originalSrc) {
  const src = scrub(originalSrc);
  const found = [];

  // R1 / R2 — destructured client calls.
  const decl = new RegExp('\\b(?:const|let|var)\\s*\\{([^{}]*)\\}\\s*=\\s*(?:await\\s+)?' + CLIENT + '\\s*\\.', 'g');
  let m;
  while ((m = decl.exec(src)) !== null) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const parts = s.split(':').map((x) => x.trim());
        return { key: parts[0], local: (parts[1] || parts[0]).replace(/\s+/g, '') };
      });

    const errEntry = names.find((n) => n.key === 'error');
    const line = lineOf(src, m.index);

    if (!errEntry) {
      found.push({
        rule: 'R1',
        line,
        message: 'database result destructured without `error` — this call cannot fail',
        snippet: originalSrc.split('\n')[line - 1].trim().slice(0, 120),
      });
      continue;
    }

    // R2: is the error variable ever looked at afterwards, in this block?
    const blockEnd = enclosingBlockEnd(src, m.index);
    const tail = src.slice(m.index + m[0].length, blockEnd);
    const used = new RegExp('\\b' + errEntry.local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
    if (!used.test(tail)) {
      found.push({
        rule: 'R2',
        line,
        message: '`' + errEntry.local + '` is destructured but never referenced — the check is decorative',
        snippet: originalSrc.split('\n')[line - 1].trim().slice(0, 120),
      });
    }
  }

  // R4 — the same failure held in a plain variable instead of a destructure.
  // `const res = await supabase.from('t').update(...)` carries its error on
  // `res.error`. Nothing currently in the codebase uses this form, so it is not a
  // present defect — it is the shape a future edit is most likely to take, and it
  // would otherwise go completely unchecked.
  const plain = new RegExp('\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?' + CLIENT + '\\s*\\.', 'g');
  while ((m = plain.exec(src)) !== null) {
    const name = m[1];
    const blockEnd = enclosingBlockEnd(src, m.index);
    const tail = src.slice(m.index + m[0].length, blockEnd);
    const checked = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\??\\.\\s*error\\b');
    if (!checked.test(tail)) {
      const line = lineOf(src, m.index);
      found.push({
        rule: 'R4',
        line,
        message: '`' + name + '` holds a client result but `' + name + '.error` is never read',
        snippet: originalSrc.split('\n')[line - 1].trim().slice(0, 120),
      });
    }
  }

  // R3 — catch blocks that swallow.
  const cat = /\bcatch\s*(?:\([^)]*\))?\s*\{/g;
  while ((m = cat.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    let d = 0;
    let end = open;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') d++;
      else if (src[i] === '}') { d--; if (d === 0) { end = i; break; } }
    }
    const body = originalSrc.slice(open + 1, end);
    // "Handled" is broader than logging or throwing. `return json({ error }, 500)`
    // and `return { ...EMPTY, error: 'fetch failed' }` communicate the failure to
    // the caller just as well — the first version of this rule missed them and
    // reported good error handling as a defect. A catch that returns a bare
    // fallback (`return null`, `return []`) still counts as silent.
    const handled =
      /console\s*\.|throw\b|reportError|Reflect\.apply/.test(body) ||
      /\breturn\b[^;]*\b(error|Error|err|status\s*:\s*[45]\d\d)\b/.test(body);
    // A catch with a written reason is a decision, not an oversight — "an
    // unreadable extraction is an absent one, never a guessed one" is the code
    // choosing a safe default.
    const explained = /\/\*|\/\//.test(body);
    if (!handled && !explained) {
      const line = lineOf(src, m.index);
      found.push({
        rule: 'R3',
        line,
        message: 'catch block neither logs nor rethrows, and gives no reason — the failure disappears here',
        snippet: originalSrc.split('\n')[line - 1].trim().slice(0, 120),
      });
    }
  }

  // R5 — a try/catch wrapped around a client call, which cannot work.
  // The Supabase client returns `{ data, error }`; it does not throw on a database
  // error. So `try { await supabase.from('t').insert(...) } catch { /* may already
  // exist */ }` can never see the duplicate it was written for, nor any other
  // failure. This was found twice in process-ai-reports (an entitlement insert and
  // a deduct_tokens RPC), both looking handled and neither handling anything.
  const tryRe = /\btry\s*\{/g;
  while ((m = tryRe.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    let d = 0;
    let end = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') d++;
      else if (src[i] === '}') { d--; if (d === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const catchMatch = src.slice(end + 1).match(/^\s*catch\s*(?:\([^)]*\))?\s*\{/);
    if (!catchMatch) continue;
    const tryBody = src.slice(open + 1, end);
    if (!new RegExp(CLIENT + '\\s*\\.').test(tryBody)) continue;
    // If the try body inspects an error itself, the catch is merely redundant.
    if (/\berror\b/.test(tryBody)) continue;
    // Only a DEAD GUARD when the catch pretends to handle something silently. A
    // catch that logs is at least partly meaningful (it still catches a thrown
    // network error), so it is not reported here.
    const catchOpen = end + 1 + catchMatch[0].length - 1;
    let cd = 0;
    let catchEnd = -1;
    for (let i = catchOpen; i < src.length; i++) {
      if (src[i] === '{') cd++;
      else if (src[i] === '}') { cd--; if (cd === 0) { catchEnd = i; break; } }
    }
    if (catchEnd < 0) continue;
    const catchBody = originalSrc.slice(catchOpen + 1, catchEnd);
    if (/console\s*\.|throw\b|reportError/.test(catchBody)) continue;
    const line = lineOf(src, m.index);
    found.push({
      rule: 'R5',
      line,
      message: 'try/catch cannot catch a client error — the client returns errors instead of throwing',
      snippet: originalSrc.split('\n')[line - 1].trim().slice(0, 120),
    });
  }

  return found;
}

// ── File discovery ───────────────────────────────────────────────────────────
function targets() {
  const globs = [];
  const fnDir = path.join(ROOT, 'supabase/functions');
  if (fs.existsSync(fnDir)) {
    for (const d of fs.readdirSync(fnDir)) {
      const f = path.join(fnDir, d, 'index.ts');
      if (fs.existsSync(f)) globs.push(f);
    }
  }
  const libDir = path.join(ROOT, 'supabase/functions/_shared');
  if (fs.existsSync(libDir)) {
    for (const f of fs.readdirSync(libDir)) {
      if (/\.ts$/.test(f)) globs.push(path.join(libDir, f));
    }
  }
  return globs;
}

// Baseline key: file + rule, compared by COUNT.
//
// The first version keyed on file + rule + message and the regression test walked
// straight through it: all 39 `ignores-error` findings share one message, so a
// newly added violation produced a key that already existed and the comparison
// passed. Counting per file and rule instead means one more violation in a file
// changes the count and fails, without depending on line numbers that drift.
function key(rel, v) {
  return rel + ' :: ' + v.rule;
}

// ── Self-test: prove the scanner detects what it claims ──────────────────────
function selfTest() {
  const bad = `
async function f() {
  const { data } = await supabase.from('t').select();
  const { data: d2, error: e2 } = await supabase.from('t').insert({});
  const res = await supabase.from('t').update({});
  try { await supabase.rpc('x'); } catch (err) { }
  return data;
}`;
  const good = `
async function g() {
  const { data, error } = await supabase.from('t').select();
  if (error) throw new Error(error.message);
  const res = await supabase.from('t').update({});
  if (res.error) throw new Error(res.error.message);
  try { await supabase.rpc('x'); } catch (e) { console.error('rpc failed', e); }
  return data;
}
async function g2() {
  try { await fetch('u'); } catch (e) { return { error: 'fetch failed: ' + e }; }
}
async function g3() {
  try { await fetch('u'); } catch (e) { return new Response('{}', { status: 500 }); }
}`;
  const badFound = analyse(bad);
  const goodFound = analyse(good);
  const rules = badFound.map((f) => f.rule).sort().join(',');
  const failures = [];
  if (rules !== 'R1,R2,R3,R4,R5') failures.push('bad fixture: expected R1,R2,R3,R4,R5 but detected [' + rules + ']');
  if (goodFound.length !== 0) {
    failures.push('good fixture: expected 0 findings but got ' + goodFound.length +
      ' (' + goodFound.map((f) => f.rule).join(',') + ')');
  }
  // A string that merely looks like the pattern must not trip it.
  const decoy = `
const s = "const { data } = await supabase.from('t')";
// const { data } = await supabase.from('t')
async function h() { const { data, error } = await supabase.from('t').select(); if (error) throw error; }`;
  const decoyFound = analyse(decoy);
  if (decoyFound.length !== 0) failures.push('decoy: comments/strings tripped the scanner (' + decoyFound.length + ')');

  // Regression: a regex literal containing an apostrophe, with a real violation
  // AFTER it. Before regex handling this blanked the rest of the file, so the
  // violation was invisible and the scanner reported success over code it never
  // read. `vocab-lookup` and nine other functions contain exactly this.
  const regexDecoy = `
async function i1() { const w = s.replace(/[^\\p{L}'-]/gu, ''); return w; }
async function i2() { const { data } = await supabase.from('t').select(); return data; }`;
  const regexFound = analyse(regexDecoy);
  if (regexFound.length !== 1 || regexFound[0].rule !== 'R1') {
    failures.push('regex regression: a violation after /[^\\p{L}\'-]/ was not detected (' +
      regexFound.length + ' findings)');
  }

  if (failures.length) {
    console.error('SELF-TEST FAILED — the scanner cannot be trusted:');
    for (const f of failures) console.error('  ' + f);
    return false;
  }
  console.log('self-test ok: R1, R2, R3, R4 and R5 all detected; clean and decoy code left alone');
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────
// Exported so scripts/mutation-test-silent-errors.js can drive the real analyser
// against the real source files. A second copy of the logic would prove nothing:
// the bug being guarded against is the shipped version disagreeing with what
// everyone assumes it does.
module.exports = { analyse, scrub, selfTest, targets, ROOT };

function main() {
const args = process.argv.slice(2);

if (args.includes('--self-test')) process.exit(selfTest() ? 0 : 1);

if (!selfTest()) process.exit(1);

const results = [];
for (const file of targets()) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  for (const v of analyse(src)) results.push({ rel, ...v });
}

if (args.includes('--report')) {
  for (const r of results) console.log(`${r.rel}:${r.line}  ${r.rule}  ${r.message}\n    ${r.snippet}`);
  console.log(`\n${results.length} findings`);
  process.exit(0);
}

function tally(list) {
  const m = new Map();
  for (const r of list) {
    const k = key(r.rel, r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

if (args.includes('--update-baseline')) {
  const counts = tally(results);
  const lines = [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, n]) => k + ' :: ' + n);
  fs.writeFileSync(BASELINE, lines.join('\n') + '\n');
  console.log('baseline written: ' + lines.length + ' file/rule pairs, ' + results.length + ' findings');
  process.exit(0);
}

const known = new Map();
if (fs.existsSync(BASELINE)) {
  for (const line of fs.readFileSync(BASELINE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const idx = line.lastIndexOf(' :: ');
    if (idx < 0) continue;
    known.set(line.slice(0, idx), parseInt(line.slice(idx + 4), 10) || 0);
  }
}

const actual = tally(results);
const grown = [];
const shrank = [];
for (const [k, n] of actual.entries()) {
  const base = known.has(k) ? known.get(k) : 0;
  if (n > base) grown.push({ key: k, added: n - base, now: n, was: base });
  else if (n < base) shrank.push({ key: k, removed: base - n });
}

if (grown.length === 0) {
  const note = shrank.length
    ? ' (' + shrank.reduce((s, x) => s + x.removed, 0) + ' fewer than baseline — consider --update-baseline)'
    : '';
  console.log('ok: ' + results.length + ' known silent-failure sites, none new' + note);
  process.exit(0);
}

console.error('FAIL: ' + grown.length + ' place(s) gained a silent failure:');
for (const g of grown) {
  const [file, rule] = g.key.split(' :: ');
  console.error('  ' + file + '  ' + rule + '  (' + g.was + ' -> ' + g.now + ')');
  for (const r of results.filter((x) => x.rel === file && x.rule === rule).slice(-g.added)) {
    console.error('      line ' + r.line + ': ' + r.message);
    console.error('          ' + r.snippet);
  }
}
console.error('\nHandle the error, or record it in scripts/silent-error-baseline.txt with a reason.');
process.exit(1);
}

if (require.main === module) main();
