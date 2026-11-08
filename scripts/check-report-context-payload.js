#!/usr/bin/env node
/**
 * Assert that the synthesis report payload carries no identity.
 *
 * Why this exists
 * ---------------
 * scripts/check-report-catalogue.sh can prove that grammar-report-context.js
 * does not contain a literal `raw:` passthrough. It cannot prove anything about
 * the *content* of what is built, and content is what leaves the machine.
 *
 * This runs the real builder with a realistic onboarding object — including a
 * name, an employer and a city in the fields a learner actually fills in — and
 * asserts none of it reaches the payload.
 *
 * It also asserts the useful signal SURVIVES. Without that second half, the
 * cheapest way to make this test pass would be to send nothing, which would
 * quietly turn the synthesis report into a generic template with a privacy
 * notice attached.
 *
 * The goal moved out of this file's scope: it is now merged server-side from the
 * extraction, so it is checked by check-synthesis-prose-strip.js instead. That
 * file also asserts the goal still arrives — the "send nothing" protection
 * follows the signal to wherever the signal now lives.
 *
 * Run:  node scripts/check-report-context-payload.js
 * Exits 1 on any leak.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BUILDER = path.join(__dirname, '..', '..', 'sottotitoli', 'js', 'grammar-report-context.js');

if (!fs.existsSync(BUILDER)) {
  console.error(`✗ cannot find the context builder at ${BUILDER}`);
  process.exit(1);
}

// The builder is an IIFE taking `window`; give it one.
global.window = {};
global.window.SottotitoliGrammarPlanner = {
  present: () => ({ treatments: {}, concept_order: [], report_fragments: [] })
};

try {
  // eslint-disable-next-line no-eval
  eval(fs.readFileSync(BUILDER, 'utf8'));
} catch (e) {
  console.error('✗ could not evaluate the context builder: ' + e.message);
  process.exit(1);
}

const build = global.window.SottotitoliGrammarReportContext
  && global.window.SottotitoliGrammarReportContext.build;

if (typeof build !== 'function') {
  console.error('✗ the builder did not export SottotitoliGrammarReportContext.build');
  process.exit(1);
}

// Every place a name, employer or city realistically appears in real onboarding
// data. The free-text transcripts are the ones that matter: they are a spoken
// self-introduction.
const onboarding = {
  native_lang: 'it',
  english_level: 'upper-intermediate',
  short_term_goal: 'Praticare 4 volte a settimana',
  long_term_goal: 'Sono Marco e voglio diventare bilingue',
  intake_transcript: 'Ciao, sono Marco Rossi. Lavoro come ingegnere a Milano per Acme.',
  longterm_transcript: 'Ciao, sono Marco Rossi. Vivo a Milano.',
  shortterm_transcript: 'Marco vuole praticare 4 volte a settimana.',
  difficulties_other: 'A volte mi blocco a metà frase.',
  difficulties: ['speaking_fluently'],
  english_situations: ['Riunioni'],
  why_english: ['work'],
  _ai_report: 'REPORT SEGRETO',
  _last_slide: 12
};

const payload = build(
  { dimensions: {}, context: {}, placement: { missed: [] }, derived: {}, provenance: {} },
  onboarding,
  'grammatica'
);
const serialised = JSON.stringify(payload);

// ── 1. Nothing identifying, nothing that is not the learner's own language data
const FORBIDDEN = [
  'Marco', 'Rossi', 'Milano', 'Acme',      // the identity
  'REPORT SEGRETO',                        // app bookkeeping
  'intake_transcript', 'longterm_transcript', 'shortterm_transcript',
  'difficulties_other', '_last_slide', '_ai_report',
  'long_term_goal',
  // Free text we deliberately drop. `goal` used to be the one free text this
  // payload kept, on the reasoning that the learner wrote it about their
  // learning rather than about themselves. It is still their own words and
  // still a column the eraser deletes, so it no longer travels at all.
  'short_term_goal', 'Praticare 4 volte a settimana',
  '"raw"'                                  // the old passthrough
];
const leaked = FORBIDDEN.filter(f => serialised.includes(f));

// ── 2. The signal that makes the report worth buying must still be there
//
// The goal is deliberately NOT listed here any more, and removing it must not
// read as "the goal stopped mattering". It is now carried as a structured fact
// merged server-side from learner_profile_extractions, and that mapping is
// tested for real — against the shipped source — by
// scripts/check-synthesis-prose-strip.js. This list is only what the *client*
// still sends.
const REQUIRED = {
  'native language': '"it"',
  'self-assessed level': 'B2',
  'mapped difficulty': 'collocation',
  'mapped situation': 'meeting',
  'mapped motivation': 'instrumental'
};
const missing = Object.entries(REQUIRED)
  .filter(([, needle]) => !serialised.includes(needle))
  .map(([label]) => label);

let failed = false;

if (leaked.length) {
  failed = true;
  console.error('✗ the synthesis payload leaks: ' + leaked.join(', '));
  console.error('  onboarding.intake_transcript is a spoken self-introduction — in');
  console.error('  practice a name, a job, an employer and a city. Send an allow-list.');
  console.error('  payload: ' + serialised);
}

if (missing.length) {
  failed = true;
  console.error('✗ the synthesis payload has lost: ' + missing.join(', '));
  console.error('  The report is personalised from these. Do not fix a leak by');
  console.error('  sending nothing — that degrades the product instead.');
}

if (!failed) {
  console.error('✓ synthesis payload carries no identity, and keeps the signal');
}
process.exit(failed ? 1 : 0);
