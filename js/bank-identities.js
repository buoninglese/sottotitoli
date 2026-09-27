// js/bank-identities.js — bank IDENTITY strings. NEVER display text. NEVER translate.
//
// WHY THIS FILE EXISTS
// These strings are matched against `user_wordbanks.name` in ~13 places across two pages
// (panoramica.html and caption-s8t.html). They are compared, inserted, and used to EXCLUDE
// system banks from the user's own bank list. They are identifiers, not labels:
// translating one — or "tidying" its casing — silently breaks matching against existing
// rows. The bank then looks missing, or a second copy gets created.
//
// THE RULE: one constant per identity, and the value is copied from what the CREATE path
// actually writes. Verified against the live database on 2026-09-27, not chosen for looks.
// The casing is therefore DELIBERATELY MIXED, because the data is:
//
//   'Saved from sessions'        caption-s8t.html creates it        (lowercase)
//   'Saved for later'            the bookmark flow creates it       (lowercase)
//   'English Vocabulary Builder' created Title Case
//   'Italian Vocabulary Builder' created Title Case
//   'All Looked-Up Words'        created by the DB function
//                                ensure_looked_up_words_bank         (Title Case)
//
// THE BUG THIS FIXES
// The exclusion arrays listed 'Saved For Later' and 'New Words' (Title Case) while the
// create paths wrote 'Saved for later' and 'New words'. Those never matched, so the
// bookmark bank was never excluded from the user's own bank list. Both sides now use
// these constants.
//
// DO NOT "NORMALISE" THE CASING. Six exact strings exist in the data and every one of
// them must keep matching. A blanket lowercase (or Title) pass orphans whichever banks
// use the other form.

window.BANK_ID = Object.freeze({
  SAVED_FROM_SESSIONS:   'Saved from sessions',
  SAVED_FOR_LATER:       'Saved for later',
  NEW_WORDS:             'New words',
  ALL_LOOKED_UP_WORDS:   'All Looked-Up Words',
  ENGLISH_VOCAB_BUILDER: 'English Vocabulary Builder',
  ITALIAN_VOCAB_BUILDER: 'Italian Vocabulary Builder',

  // Legacy: listed in the exclusion arrays, but no data row and no writer found on
  // 2026-09-27. Kept so the arrays stay complete if it is ever written again.
  BUILD_FROM_KNOWN:      'Build From Known'
});
