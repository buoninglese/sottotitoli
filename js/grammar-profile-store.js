/* ═══ Grammar Profile Store — persist the scored learner profile ═══
 * Reads/writes the grammar planner's learner-profile object.
 *
 *   Primary:  Supabase `learner_grammar_profiles` (one jsonb `profile` row per
 *             user) — see enrichment/SUPABASE-INSTRUCTIONS.md for the contract.
 *   Fallback: localStorage `sottotitoli-grammar-profile` when the visitor is
 *             not authenticated (so the intake still works pre-login), and a
 *             write-through mirror so the UI never blocks on the network.
 *
 * Exposes window.SottotitoliGrammarProfileStore:
 *   .load()                    → Promise<profile|null>
 *   .save(profile)             → Promise<profile>   (upsert + local mirror)
 *   .getMisses() / .setMisses(missed[]) / .removeMiss(conceptId)
 *
 * Auth convention mirrors js/learner.js: `window.sottotitoliSupabase` +
 * `await getSession()` before touching user data.
 */
(function (w) {
  'use strict';

  var LOCAL_KEY = 'sottotitoli-grammar-profile';

  function sb() { return w.sottotitoliSupabase; }

  async function uid() {
    try {
      var c = sb();
      if (!c) return null;
      var r = await c.auth.getSession();
      return (r && r.data && r.data.session) ? r.data.session.user.id : null;
    } catch (e) { return null; }
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function writeLocal(profile) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(profile)); } catch (e) {}
  }

  /* Load the profile: Supabase when authenticated, else localStorage. */
  async function load() {
    var u = await uid();
    if (!u) return readLocal();
    try {
      var r = await sb().from('learner_grammar_profiles')
        .select('profile')
        .eq('user_id', u)
        .maybeSingle();
      if (r.error) return readLocal();
      if (r.data && r.data.profile) { writeLocal(r.data.profile); return r.data.profile; }
      return readLocal();
    } catch (e) { return readLocal(); }
  }

  /* Upsert the full profile. Always mirror locally; write to Supabase when
   * authenticated so the row survives across devices. */
  async function save(profile) {
    writeLocal(profile);
    var u = await uid();
    if (!u) return profile;
    try {
      var r = await sb().from('learner_grammar_profiles').upsert({
        user_id: u,
        profile: profile
      }, { onConflict: 'user_id' });
      if (r.error) console.warn('GrammarProfileStore save:', r.error.message);
    } catch (e) { console.warn('GrammarProfileStore save failed:', e); }
    return profile;
  }

  function getMisses(profile) {
    return (profile && profile.placement && profile.placement.missed) || [];
  }

  function setMisses(profile, missed) {
    profile = profile || {};
    profile.placement = profile.placement || {};
    profile.placement.missed = missed || [];
    return profile;
  }

  /* Drop a missed item by concept id (when a concept is re-practised/mastered)
   * and persist the edited profile. */
  async function removeMiss(profile, conceptId) {
    var missed = getMisses(profile).filter(function (m) {
      return m.concept_id !== conceptId;
    });
    var updated = setMisses(profile, missed);
    await save(updated);
    return updated;
  }

  /* ── To-do list (the learner's self-selected concept queue) ── */
  function getTodo(profile) {
    return (profile && profile.todo) || [];
  }

  function setTodo(profile, todo) {
    profile = profile || {};
    profile.todo = todo || [];
    return profile;
  }

  async function addTodo(profile, conceptId) {
    var todo = getTodo(profile);
    if (todo.indexOf(conceptId) === -1) todo.push(conceptId);
    var updated = setTodo(profile, todo);
    await save(updated);
    return updated;
  }

  async function removeTodo(profile, conceptId) {
    var todo = getTodo(profile).filter(function (c) { return c !== conceptId; });
    var updated = setTodo(profile, todo);
    await save(updated);
    return updated;
  }

  /* ── Exercise log (observed mistakes from actual drills) ──
   * Appends one attempt per drill session, including every mistaken answer, so
   * the profile carries the user's real, observed errors — not just the placement
   * snapshot. This is the continuous "observed beats predicted" signal. */
  function getExercises(profile) {
    return (profile && profile.exercises) || { attempts: [] };
  }

  async function logExercise(profile, result) {
    profile = profile || {};
    if (!result || !result.cid) return profile;
    var ex = getExercises(profile);
    var attempts = ex.attempts || [];
    attempts.push({
      concept_id: result.cid,
      correct: result.correct,
      total: result.total,
      mistakes: result.mistakes || [],
      at: new Date().toISOString()
    });
    if (attempts.length > 200) attempts = attempts.slice(-200);
    profile.exercises = { attempts: attempts };
    await save(profile);
    return profile;
  }

  /* ── Grammar SRS (mastery + next-review per concept) ──
   * The review state that turns "I saw an error" into "here's when it comes back".
   * SM-2-lite: mastery is a blend of the latest result and the running score;
   * next_review_at is a mastery-based interval. Stored on the profile so it
   * travels with the learner across devices. */
  function getGrammarReview(profile) {
    return (profile && profile.grammar_review) || {};
  }

  function nextReviewAt(mastery) {
    var days = mastery >= 90 ? 7 : mastery >= 70 ? 3 : mastery >= 50 ? 2 : 1;
    return new Date(Date.now() + days * 86400000).toISOString();
  }

  async function recordGrammarReview(profile, conceptId, correct, total) {
    profile = profile || {};
    if (!conceptId) return profile;
    var review = profile.grammar_review || {};
    var r = review[conceptId] || { mastery: 0, lapses: 0, reviews: 0 };
    r.reviews = (r.reviews || 0) + 1;
    var ratio = total ? correct / total : 0;
    r.mastery = Math.round(ratio * 100 * 0.6 + (r.mastery || 0) * 0.4);
    if (ratio < 0.8) r.lapses = (r.lapses || 0) + 1;
    r.last_reviewed_at = new Date().toISOString();
    r.next_review_at = nextReviewAt(r.mastery);
    review[conceptId] = r;
    profile.grammar_review = review;
    await save(profile);
    return profile;
  }

  function isDue(review) {
    if (!review || !review.next_review_at) return true;
    return new Date(review.next_review_at).getTime() <= Date.now();
  }

  w.SottotitoliGrammarProfileStore = {
    load: load,
    save: save,
    getMisses: getMisses,
    setMisses: setMisses,
    removeMiss: removeMiss,
    getTodo: getTodo,
    addTodo: addTodo,
    removeTodo: removeTodo,
    getExercises: getExercises,
    logExercise: logExercise,
    getGrammarReview: getGrammarReview,
    recordGrammarReview: recordGrammarReview,
    isDue: isDue
  };
})(window);
