// js/panoramica/shared/supabase.js — Supabase client singleton
// Backward-compatible: reads from window.sottotitoliSupabase (set by config.js + js/auth.js)

/**
 * Get the Supabase client. Returns null if not yet initialized.
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
export function getSupabase() {
  return window.sottotitoliSupabase || null;
}

/**
 * Wait for Supabase to be ready (polls every 100ms, up to 5 seconds).
 * @returns {Promise<import('@supabase/supabase-js').SupabaseClient|null>}
 */
export function waitForSupabase() {
  return new Promise(function (resolve) {
    if (window.sottotitoliSupabase) { resolve(window.sottotitoliSupabase); return; }
    var tries = 0;
    var interval = setInterval(function () {
      if (window.sottotitoliSupabase) { clearInterval(interval); resolve(window.sottotitoliSupabase); return; }
      if (++tries > 50) { clearInterval(interval); resolve(null); }
    }, 100);
  });
}

/**
 * Get the current auth session.
 * @returns {Promise<Object|null>}
 */
export async function getSession() {
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var resp = await sb.auth.getSession();
    return resp.data.session || null;
  } catch (e) {
    console.warn('getSession failed:', e.message);
    return null;
  }
}

/**
 * Get the current user.
 * @returns {Promise<Object|null>}
 */
export async function getUser() {
  var sb = getSupabase();
  if (!sb) return null;
  try {
    var resp = await sb.auth.getUser();
    return resp.data.user || null;
  } catch (e) {
    console.warn('getUser failed:', e.message);
    return null;
  }
}
