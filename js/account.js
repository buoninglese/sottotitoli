// js/account.js

const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

const accountSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('accountEmail');
  const createdEl = document.getElementById('accountCreated');
  const sessionsEl = document.getElementById('sessionsList');

  async function loadAccount() {
    // Get current user; if none, just show a message
    const { data: sessionData, error: sessionError } = await accountSupabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      if (sessionsEl) sessionsEl.textContent = 'Please sign in to see your sessions.';
      return;
    }

    const user = sessionData.session.user;
    const userId = user.id;

    // Load profile row
    const { data: profiles, error: profileError } = await accountSupabase
      .from('profiles')
      .select('email, created_at')
      .eq('id', userId)
      .limit(1);

    if (!profileError && profiles && profiles.length > 0) {
      const profile = profiles[0];
      if (emailEl) emailEl.textContent = 'Email: ' + (profile.email || user.email);
      if (createdEl) createdEl.textContent = 'Joined: ' + (profile.created_at || '—');
    } else {
      if (emailEl) emailEl.textContent = 'Email: ' + user.email;
      if (createdEl) createdEl.textContent = 'Joined: —';
    }

    // Load sessions list (just last few for now)
    const { data: sessions, error: sessionsError } = await accountSupabase
      .from('sessions')
      .select('room, mode, started_at, duration_seconds, words_count')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      if (sessionsEl) sessionsEl.textContent = 'Could not load sessions yet.';
      return;
    }

    if (!sessions || sessions.length === 0) {
      if (sessionsEl) sessionsEl.textContent = 'No sessions recorded yet.';
      return;
    }

    // Render simple list
    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.paddingLeft = '0';

    sessions.forEach(s => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      const when = s.started_at ? new Date(s.started_at).toLocaleString() : '';
      const duration = s.duration_seconds != null ? s.duration_seconds + 's' : '—';
      const words = s.words_count != null ? s.words_count + ' words' : '—';
      li.textContent = `[${s.mode || 'mode'}] Room ${s.room || ''} · ${when} · ${duration} · ${words}`;
      list.appendChild(li);
    });

    if (sessionsEl) {
      sessionsEl.textContent = '';
      sessionsEl.appendChild(list);
    }
  }

  loadAccount();
});