// js/account.js

// Reuse the global client set up in auth.js
const accountSupabase = window.sottotitoliSupabase;

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('accountEmail');
  const createdEl = document.getElementById('accountCreated');
  const sessionsEl = document.getElementById('sessionsList');
  const downloadCsvBtn = document.getElementById('downloadSessionsCsvBtn');

  const perfMinutesSpokenEl = document.getElementById('perfMinutesSpoken');
  const perfMinutesSpokenBarEl = document.getElementById('perfMinutesSpokenBar');
  const perfAverageWpmEl = document.getElementById('perfAverageWpm');
  const perfAverageWpmBarEl = document.getElementById('perfAverageWpmBar');
  const perfFillersPerMinuteEl = document.getElementById('perfFillersPerMinute');
  const perfFillersPerMinuteBarEl = document.getElementById('perfFillersPerMinuteBar');
  const perfUniqueWordsEl = document.getElementById('perfUniqueWords');
  const perfUniqueWordsBarEl = document.getElementById('perfUniqueWordsBar');
  const perfFunFactEl = document.getElementById('perfFunFact');

  let currentSessions = [];

  async function loadAccount() {
    if (!accountSupabase) {
      console.warn('Supabase client not available on account page.');
      if (sessionsEl) sessionsEl.textContent = 'Supabase client not available.';
      if (perfFunFactEl) perfFunFactEl.textContent = 'Supabase client not available.';
      return;
    }

    const { data: sessionData, error: sessionError } =
      await accountSupabase.auth.getSession();

    if (sessionError || !sessionData || !sessionData.session) {
      if (emailEl) emailEl.textContent = 'Email: — (not signed in)';
      if (createdEl) createdEl.textContent = 'Joined: —';
      if (sessionsEl) sessionsEl.textContent = 'Please sign in to see your sessions.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      if (perfFunFactEl) perfFunFactEl.textContent = 'Accedi e usa Studio per vedere le statistiche del tuo inglese.';
      return;
    }

    const user = sessionData.session.user;
    const userId = user.id;

    // Profile
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

    // Sessions (enough to cover dashboard & list)
    const { data: sessions, error: sessionsError } = await accountSupabase
      .from('sessions')
      .select('id, room, mode, started_at, ended_at, duration_seconds, words_count, wpm, fillers_per_minute, unique_words_count')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(200);

    if (sessionsError) {
      if (sessionsEl) sessionsEl.textContent = 'Could not load sessions yet.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      if (perfFunFactEl) perfFunFactEl.textContent = 'Non riusciamo a caricare le tue sessioni al momento.';
      return;
    }

    currentSessions = sessions || [];

    // Session list
    if (!sessions || sessions.length === 0) {
      if (sessionsEl) sessionsEl.textContent = 'No sessions recorded yet.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
    } else {
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

    // Performance dashboard
    updatePerformanceDashboard(currentSessions);
  }

  function updatePerformanceDashboard(sessions) {
    if (!sessions || sessions.length === 0) {
      if (perfMinutesSpokenEl) perfMinutesSpokenEl.textContent = '0';
      if (perfAverageWpmEl) perfAverageWpmEl.textContent = '–';
      if (perfFillersPerMinuteEl) perfFillersPerMinuteEl.textContent = '–';
      if (perfUniqueWordsEl) perfUniqueWordsEl.textContent = '0';
      if (perfFunFactEl) perfFunFactEl.textContent = 'Inizia a usare Studio per vedere le prime letture del tuo inglese.';
      return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalSecondsWeek = 0;
    let totalWordsWeek = 0;
    let sumWpm = 0;
    let countWpm = 0;
    let sumFillersPerMinute = 0;
    let countFillers = 0;
    let uniqueWordsLast30 = 0;

    sessions.forEach((s) => {
      const started = s.started_at ? new Date(s.started_at) : null;

      if (started && started >= sevenDaysAgo) {
        if (typeof s.duration_seconds === 'number') {
          totalSecondsWeek += s.duration_seconds;
        }
        if (typeof s.words_count === 'number') {
          totalWordsWeek += s.words_count;
        }
        if (typeof s.wpm === 'number') {
          sumWpm += s.wpm;
          countWpm += 1;
        }
        if (typeof s.fillers_per_minute === 'number') {
          sumFillersPerMinute += s.fillers_per_minute;
          countFillers += 1;
        }
      }

      if (started && started >= thirtyDaysAgo) {
        if (typeof s.unique_words_count === 'number') {
          uniqueWordsLast30 += s.unique_words_count;
        }
      }
    });

    const minutesWeek = Math.round(totalSecondsWeek / 60);
    const avgWpm = countWpm > 0 ? sumWpm / countWpm : null;
    const avgFillersPerMin = countFillers > 0 ? sumFillersPerMinute / countFillers : null;

    // Target thresholds (tune these freely)
    const targetMinutesWeek = 120; // 2 hours
    const maxMinutesWeek = 240;    // 4 hours for 100% bar
    const maxWpm = 180;
    const idealMinWpm = 90;
    const idealMaxWpm = 160;
    const maxFillersBad = 10;      // 10+ per minute is "bad"
    const maxUniqueWords = 2000;   // simple scale cap

    // Exposure: minutes spoken
    if (perfMinutesSpokenEl) perfMinutesSpokenEl.textContent = String(minutesWeek);
    if (perfMinutesSpokenBarEl) {
      const ratio = Math.min(minutesWeek / maxMinutesWeek, 1);
      perfMinutesSpokenBarEl.style.width = (ratio * 100).toFixed(0) + '%';
      perfMinutesSpokenBarEl.classList.remove('bad', 'warn', 'good');
      if (minutesWeek === 0) {
        // leave default
      } else if (minutesWeek < targetMinutesWeek / 2) {
        perfMinutesSpokenBarEl.classList.add('warn');
      } else if (minutesWeek >= targetMinutesWeek) {
        perfMinutesSpokenBarEl.classList.add('good');
      }
    }

    // Fluency: average WPM
    if (perfAverageWpmEl) {
      perfAverageWpmEl.textContent = avgWpm != null ? Math.round(avgWpm).toString() : '–';
    }
    if (perfAverageWpmBarEl) {
      if (avgWpm == null) {
        perfAverageWpmBarEl.style.width = '0%';
      } else {
        const clamped = Math.max(0, Math.min(avgWpm, maxWpm));
        perfAverageWpmBarEl.style.width = ((clamped / maxWpm) * 100).toFixed(0) + '%';
        perfAverageWpmBarEl.classList.remove('bad', 'warn', 'good');
        if (avgWpm < idealMinWpm) {
          perfAverageWpmBarEl.classList.add('warn');
        } else if (avgWpm > idealMaxWpm) {
          perfAverageWpmBarEl.classList.add('warn');
        } else {
          perfAverageWpmBarEl.classList.add('good');
        }
      }
    }

    // Fluency: fillers per minute
    if (perfFillersPerMinuteEl) {
      perfFillersPerMinuteEl.textContent =
        avgFillersPerMin != null ? avgFillersPerMin.toFixed(1) : '–';
    }
    if (perfFillersPerMinuteBarEl) {
      if (avgFillersPerMin == null) {
        perfFillersPerMinuteBarEl.style.width = '0%';
      } else {
        const clamped = Math.min(avgFillersPerMin / maxFillersBad, 1);
        perfFillersPerMinuteBarEl.style.width = (clamped * 100).toFixed(0) + '%';
        perfFillersPerMinuteBarEl.classList.remove('bad', 'warn', 'good');
        if (avgFillersPerMin <= 3) {
          perfFillersPerMinuteBarEl.classList.add('good');
        } else if (avgFillersPerMin <= 7) {
          perfFillersPerMinuteBarEl.classList.add('warn');
        } else {
          perfFillersPerMinuteBarEl.classList.add('bad');
        }
      }
    }

    // Vocabulary: unique words (approx)
    if (perfUniqueWordsEl) {
      perfUniqueWordsEl.textContent = String(uniqueWordsLast30);
    }
    if (perfUniqueWordsBarEl) {
      const ratio = Math.min(uniqueWordsLast30 / maxUniqueWords, 1);
      perfUniqueWordsBarEl.style.width = (ratio * 100).toFixed(0) + '%';
      perfUniqueWordsBarEl.classList.remove('bad', 'warn', 'good');
      if (uniqueWordsLast30 === 0) {
        // default
      } else if (ratio < 0.3) {
        perfUniqueWordsBarEl.classList.add('warn');
      } else if (ratio >= 0.5) {
        perfUniqueWordsBarEl.classList.add('good');
      }
    }

    // Fun fact
    if (perfFunFactEl) {
      let fact = '';

      if (minutesWeek >= 60 && avgWpm != null) {
        fact = `Nell’ultima settimana hai parlato per ${minutesWeek} minuti con una velocità media di ${Math.round(avgWpm)} parole al minuto.`;
      } else if (minutesWeek > 0 && uniqueWordsLast30 > 0) {
        fact = `Hai già usato circa ${uniqueWordsLast30} parole diverse negli ultimi 30 giorni di pratica.`;
      } else {
        fact = 'Continua a usare Studio: ogni sessione aggiunge dati al tuo cruscotto di inglese.';
      }

      perfFunFactEl.textContent = fact;
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
      'chars_count',
      'wpm',
      'fillers_per_minute',
      'unique_words_count'
    ];

    const rows = currentSessions.map((s) => [
      s.id || '',
      s.room || '',
      s.mode || '',
      s.started_at || '',
      s.ended_at || '',
      s.duration_seconds != null ? s.duration_seconds : '',
      s.words_count != null ? s.words_count : '',
      s.chars_count != null ? s.chars_count : '',
      s.wpm != null ? s.wpm.toFixed(2) : '',
      s.fillers_per_minute != null ? s.fillers_per_minute.toFixed(2) : '',
      s.unique_words_count != null ? s.unique_words_count : ''
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