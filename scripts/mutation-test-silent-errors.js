#!/usr/bin/env node
/**
 * Find out whether the silent-failure scanner is blind anywhere.
 *
 * Why this exists
 * ---------------
 * The scanner passed its own self-test twice while being wrong. First it
 * deduplicated its findings so a new one matched an old key. Then its scrubber did
 * not understand regex literals, and `/[^\p{L}'-]/gu` — present in ten edge
 * functions — flipped its quote handling and blanked the rest of the file. In both
 * cases it printed "ok" over code it had never read, and the self-test did not
 * notice because the self-test used a tidy synthetic string, not real source.
 *
 * A fixture proves the rules exist. It does not prove the scanner can still see by
 * the time it reaches the end of a real file. So this takes every real edge
 * function and appends a known violation to it: if the scanner cannot see a
 * planted bug at the bottom of that specific file, it cannot be trusted on the
 * code that is actually there.
 *
 * It also plants decoys — a violation inside a string, a template literal and a
 * comment — which must NOT be counted, because a scanner that cries wolf on
 * comments gets switched off.
 *
 * Run:  node scripts/mutation-test-silent-errors.js
 * Exit: 0 all mutations behaved, 1 something was missed or miscounted.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { analyse, targets, ROOT } = require('./check-silent-db-errors.js');

const PROBES = {
  violation: '\nasync function __probeA() { const { data } = await supabase.from("t").select(); return data; }\n',
  stringDecoy: '\nconst __probeB = "const { data } = await supabase.from(\'t\').select()";\n',
  templateDecoy: '\nconst __probeC = `const { data } = await supabase.from("t").select()`;\n',
  commentDecoy: '\n// const { data } = await supabase.from("t").select()\n',
  regexThenViolation:
    "\nasync function __probeD() { const r = /[^\\p{L}'-]/gu; const { data } = await supabase.from(\"t\").select(); return [r, data]; }\n",
  // A template interpolation, followed by a real violation. Tests that `${...}`
  // does not corrupt the scanner's state for the rest of the file — the exact
  // failure a wholesale-blanked template literal caused.
  //
  // Note what this does NOT claim: a client call placed directly inside `${}`
  // (e.g. `${await supabase.from('t').select()}`) matches no rule, because it is
  // not assigned to anything. There are zero such calls in the codebase; the
  // pattern is listed in the checker's header as unmodelled rather than pretended
  // to be covered.
  interpolationRecovery:
    '\nasync function __probeE() { const s = `${1 + 2}`; const { data } = await supabase.from("t").select(); return [s, data]; }\n',
  interpolationDecoy: '\nconst __probeF = `${await Promise.resolve(1)} supabase.from("t").select()`;\n',
};

let pass = 0;
const failures = [];

function check(ok, label) {
  if (ok) pass++;
  else failures.push(label);
}

const files = targets();
console.log('mutation-testing ' + files.length + ' real edge-function files\n');

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');
  const base = analyse(src).length;

  const v = analyse(src + PROBES.violation).length;
  check(v === base + 1, rel + ': a violation appended at the end was NOT detected (' + base + ' -> ' + v + ')');

  for (const [name, label] of [
    ['stringDecoy', 'a violation inside a string was counted'],
    ['templateDecoy', 'a violation inside a template literal was counted'],
    ['commentDecoy', 'a violation inside a comment was counted'],
  ]) {
    const n = analyse(src + PROBES[name]).length;
    check(n === base, rel + ': ' + label + ' (' + base + ' -> ' + n + ')');
  }

  const r = analyse(src + PROBES.regexThenViolation).length;
  check(r === base + 1, rel + ': a violation after a regex literal was NOT detected (' + base + ' -> ' + r + ')');

  const i = analyse(src + PROBES.interpolationRecovery).length;
  check(i === base + 1, rel + ': a violation after a ${} interpolation was NOT detected (' + base + ' -> ' + i + ')');

  const f = analyse(src + PROBES.interpolationDecoy).length;
  check(f === base, rel + ': text inside a ${} interpolation was miscounted (' + base + ' -> ' + f + ')');
}

console.log('checks passed: ' + pass);
if (failures.length === 0) {
  console.log('mutation test ok: every real file remains readable to the end, and decoys stay quiet');
  process.exit(0);
}

console.log('checks FAILED:   ' + failures.length + '\n');
for (const f of failures) console.log('  ' + f);
console.log('\nThe scanner cannot see in those files. Fix it before trusting its "ok".');
process.exit(1);
