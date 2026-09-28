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

  w.SottotitoliGrammarProfileStore = {
    load: load,
    save: save,
    getMisses: getMisses,
    setMisses: setMisses,
    removeMiss: removeMiss
  };
})(window);
