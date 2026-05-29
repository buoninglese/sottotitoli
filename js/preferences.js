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
