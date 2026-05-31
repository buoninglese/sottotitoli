// js/preferences.js
// Shared utility to load user preferences across pages.

// Cache so we don't refetch every time
let prefsCache = null;

/**
 * Load preferences from Supabase user_preferences table.
 * Returns a promise that resolves to the preferences object or null.
 */
async function loadUserPreferences() {
  if (prefsCache) return prefsCache;
  
  const supabase = window.sottotitoliSupabase;
  if (!supabase) {
    console.warn('Supabase not available');
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', sessionData.session.user.id)
    .maybeSingle();

  if (error) {
    console.warn('Could not load preferences:', error.message);
    return null;
  }

  prefsCache = data;
  return data;
}

/**
 * Get the preferred display name for a language code.
 */
function langDisplayName(code) {
  const names = {
    it: 'Italiano',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
    nl: 'Nederlands',
    pl: 'Polski'
  };
  return names[code] || code;
}

/**
 * Get the flag emoji for a language code.
 */
function langFlag(code) {
  const flags = {
    it: '🇮🇹', en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷',
    de: '🇩🇪', pt: '🇵🇹', nl: '🇳🇱', pl: '🇵🇱'
  };
  return flags[code] || '';
}

window.loadUserPreferences = loadUserPreferences;
window.langDisplayName = langDisplayName;
window.langFlag = langFlag;

/**
 * Save preferences to Supabase user_preferences table (upsert).
 * Returns true on success.
 */
async function saveUserPreferences(prefs) {
  const supabase = window.sottotitoliSupabase;
  if (!supabase) return false;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) return false;

  const userId = sessionData.session.user.id;

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      native_lang: prefs.native_lang || 'en',
      target_lang_1: prefs.target_lang_1 || null,
      target_lang_2: prefs.target_lang_2 || null,
      level: prefs.level || 'B1',
      goal: prefs.goal || 'b2_6m',
      sessions_per_week: prefs.sessions_per_week || 4,
      daily_reminders: !!prefs.daily_reminders,
      weekly_reports: !!prefs.weekly_reports,
      dark_mode: !!prefs.dark_mode,
      display_name: prefs.display_name || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('Could not save preferences:', error.message);
    return false;
  }

  // Update cache
  prefsCache = { ...prefs, user_id: userId };
  return true;
}

window.saveUserPreferences = saveUserPreferences;
