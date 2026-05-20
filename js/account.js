// js/account.js

// Reuse the global client set up in auth.js
const accountSupabase = window.sottotitoliSupabase;

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('accountEmail');
  const createdEl = document.getElementById('accountCreated');
  const sessionsEl = document.getElementById('sessionsList');

  async function loadAccount() {
    if (!accountSupabase) {
      console.warn('Supabase client not available on account page.');
      if (sessionsEl) sessionsEl.textContent = 'Supabase client not available.';
      return;
    }

    // 1. Get current auth session (shared across tabs)
    const { data: sessionData, error: sessionError } =
      await accountSupabase.auth.getSession();

    if (sessionError || !sessionData || !sessionData.session) {
      if (emailEl) emailEl.textContent = 'Email: — (not signed in)';
      if (createdEl) createdEl.textContent = 'Joined: —';
      if (sessionsEl) sessionsEl.textContent = 'Please sign in to see your sessions.';
      return;
    }

    const user = sessionData.session.user;
    const userId = user.id;

    // 2. Load profile row from `profiles`
    const { data: profiles, error: profileError } = await accountSupabase
      .from('profiles')
      .select('email, created_at')
      .eq('id', userId)
      .limit(1);

    if (!profileError && profiles && profiles.length > 0) {
      const profile = profiles[0];
      if (emailEl) {
        emailEl.textContent = 'Email: ' + (profile.email || user.email);
      }
      if (createdEl) {
        createdEl.textContent = 'Joined: ' + (profile.created_at || '—');
      }
    } else {
      if (emailEl) emailEl.textContent = 'Email: ' + user.email;
      if (createdEl) createdEl.textContent = 'Joined: —';
    }

    // 3. Load recent sessions
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

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.paddingLeft = '0';

    sessions.forEach((s) => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      const when = s.started_at ? new Date(s.started_at).toLocaleString() : '';
      const duration =
        s.duration_seconds != null ? s.duration_seconds + 's' : '—';
      const words =
        s.words_count != null ? s.words_count + ' words' : '—';
      li.textContent =
        `[${s.mode || 'mode'}] Room ${s.room || ''} · ${when} · ${duration} · ${words}`;
      list.appendChild(li);
    });

    if (sessionsEl) {
      sessionsEl.textContent = '';
      sessionsEl.appendChild(list);
    }
  }

  loadAccount();
});