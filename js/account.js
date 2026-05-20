// js/account.js

// Reuse the global client set up in auth.js
const accountSupabase = window.sottotitoliSupabase;

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('accountEmail');
  const createdEl = document.getElementById('accountCreated');
  const sessionsEl = document.getElementById('sessionsList');
  const downloadCsvBtn = document.getElementById('downloadSessionsCsvBtn');

  // Keep sessions in memory so we can export them
  let currentSessions = [];

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
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
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
      const joined = profile.created_at || user.created_at || '—';
      if (createdEl) {
        createdEl.textContent = 'Joined: ' + joined;
      }
    } else {
      if (emailEl) emailEl.textContent = 'Email: ' + user.email;
      const joined = user.created_at || '—';
      if (createdEl) {
        createdEl.textContent = 'Joined: ' + joined;
      }
    }

    // 3. Load recent sessions
    const { data: sessions, error: sessionsError } = await accountSupabase
      .from('sessions')
      .select('room, mode, started_at, ended_at, duration_seconds, words_count, chars_count')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (sessionsError) {
      if (sessionsEl) sessionsEl.textContent = 'Could not load sessions yet.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      return;
    }

    currentSessions = sessions || [];

    if (!sessions || sessions.length === 0) {
      if (sessionsEl) sessionsEl.textContent = 'No sessions recorded yet.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      return;
    }

    if (downloadCsvBtn) downloadCsvBtn.disabled = false;

    const list = document.createElement('ul');
    list.className = 'sessions-list';

    sessions.forEach((s) => {
      const li = document.createElement('li');
      const when = s.started_at ? new Date(s.started_at).toLocaleString() : '';
      const duration =
        s.duration_seconds != null ? s.duration_seconds + 's' : '—';
      const words =
        s.words_count != null ? s.words_count + ' words' : '—';

      li.innerHTML =
        `<span class="sessions-room">[${s.mode || 'mode'}]</span> ` +
        `<span class="sessions-meta">Room ${s.room || ''} · ${when} · ${duration} · ${words}</span>`;

      list.appendChild(li);
    });

    if (sessionsEl) {
      sessionsEl.textContent = '';
      sessionsEl.appendChild(list);
    }
  }

  function downloadSessionsCsv() {
    if (!currentSessions || currentSessions.length === 0) {
      alert('Non ci sono sessioni da esportare.');
      return;
    }

    const header = [
      'id',
      'room',
      'mode',
      'started_at',
      'ended_at',
      'duration_seconds',
      'words_count',
      'chars_count'
    ];

    const rows = currentSessions.map((s) => [
      s.id || '',
      s.room || '',
      s.mode || '',
      s.started_at || '',
      s.ended_at || '',
      s.duration_seconds != null ? s.duration_seconds : '',
      s.words_count != null ? s.words_count : '',
      s.chars_count != null ? s.chars_count : ''
    ]);

    const csvLines = [];
    csvLines.push(header.join(','));

    rows.forEach((cols) => {
      const escaped = cols.map((value) => {
        const str = String(value);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(escaped.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const now = new Date().toISOString().slice(0, 10);
    a.download = `sottotitoli-sessions-${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', downloadSessionsCsv);
  }

  loadAccount();
});