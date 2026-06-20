// js/account.js

const accountSupabase = window.sottotitoliSupabase;

// Detect V6 sidebar page — don't run old dashboard init on the new layout
const isV6Page = !!document.querySelector('.sidebar');

document.addEventListener('DOMContentLoaded', () => {
  // V6 page handles its own data loading via inline script — skip old init
  if (isV6Page) return;

  const emailEl = document.getElementById('accountEmail');
  const createdEl = document.getElementById('accountCreated');
  const sessionsEl = document.getElementById('sessionsList');
  const downloadCsvBtn = document.getElementById('downloadSessionsCsvBtn');

  const perfMinutesSpokenEl = document.getElementById('perfMinutesSpoken');
  const perfMinutesSpokenBarEl = document.getElementById('perfMinutesSpokenBar');
  const perfMinutesSparklineEl = document.getElementById('perfMinutesSparkline');

  const perfAverageWpmEl = document.getElementById('perfAverageWpm');
  const perfAverageWpmBarEl = document.getElementById('perfAverageWpmBar');
  const perfWpmTrendEl = document.getElementById('perfWpmTrend');

  const perffillers_per_minuteEl = document.getElementById('perffillers_per_minute');
  const perffillers_per_minuteBarEl = document.getElementById('perffillers_per_minuteBar');

  const perfUniqueWordsEl = document.getElementById('perfUniqueWords');
  const perfUniqueWordsBarEl = document.getElementById('perfUniqueWordsBar');

  const perflexical_diversityEl = document.getElementById('perflexical_diversity');
  const perflexical_diversityBarEl = document.getElementById('perflexical_diversityBar');

  const perfquality_scoreEl = document.getElementById('perfquality_score');
  const perfquality_scoreBarEl = document.getElementById('perfquality_scoreBar');

  const perfrepetition_rateEl = document.getElementById('perfrepetition_rate');
  const perfrepetition_rateBarEl = document.getElementById('perfrepetition_rateBar');

  const perfConversationTurnsEl = document.getElementById('perfConversationTurns');
  const perfConversationTurnsBarEl = document.getElementById('perfConversationTurnsBar');

  const perfNgslCoverageEl = document.getElementById('perfNgslCoverage');
  const perfNgslCoverageBarEl = document.getElementById('perfNgslCoverageBar');

  const perfQualityTrendEl = document.getElementById('perfQualityTrend');

  const perfFunFactEl = document.getElementById('perfFunFact');
  const perfStreakBadgeEl = document.getElementById('perfStreakBadge');

  let currentSessions = [];

  function toLocalDayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function loadAccount() {
    if (!accountSupabase) {
      console.warn('Supabase client not available on account page.');
      if (sessionsEl) sessionsEl.textContent = 'Supabase client not available.';
      if (perfFunFactEl) perfFunFactEl.textContent = 'Supabase client not available.';
      return;
    }

    const { data: sessionData, error: sessionError } = await accountSupabase.auth.getSession();
    if (sessionError || !sessionData || !sessionData.session) {
      if (emailEl) emailEl.textContent = 'Email: — (not signed in)';
      if (createdEl) createdEl.textContent = 'Joined: —';
      if (sessionsEl) sessionsEl.textContent = 'Please sign in to see your sessions.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      if (perfFunFactEl) {
        perfFunFactEl.textContent = 'Accedi e usa Studio per vedere le statistiche del tuo inglese.';
      }
      return;
    }

    const user = sessionData.session.user;
    const user_id = user.id;

    const { data: profiles, error: profileError } = await accountSupabase
      .from('profiles')
      .select('email, created_at')
      .eq('id', user_id)
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

const { data: sessions, error: sessionsError } = await accountSupabase
  .from('sessions')
  .select(`
    id,
    room,
    mode,
    started_at,
    ended_at,
    duration_seconds,
    words_count,
    chars_count,
    wpm,
    fillers_per_minute,
    unique_words_count,
    lexical_diversity,
    quality_score,
    ngsl_coverage,
    repetition_rate,
    turn_count,
    ai_status
  `)
  .eq('user_id', user_id)
  .order('started_at', { ascending: false })
  .limit(200);

    if (sessionsError) {
      if (sessionsEl) sessionsEl.textContent = 'Could not load sessions yet.';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
      if (perfFunFactEl) {
        perfFunFactEl.textContent = 'Non riusciamo a caricare le tue sessioni al momento.';
      }
      return;
    }

    currentSessions = sessions || [];

    if (!sessions || sessions.length === 0) {
      if (sessionsEl) sessionsEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px"><div style="font-size:32px;margin-bottom:8px">🎤</div>Nessuna sessione ancora.<br>Apri <a href=\"studio.html\" style=\"color:var(--accent-purple);font-weight:600\">Studio</a>, avvia il microfono e torna qui.</div>';
      if (downloadCsvBtn) downloadCsvBtn.disabled = true;
    } else {
      if (downloadCsvBtn) downloadCsvBtn.disabled = false;
      var h = '<div style="display:flex;flex-direction:column;gap:6px">';
      sessions.forEach(function(s){
        var when = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
        var dur = s.duration_seconds ? Math.round(s.duration_seconds/60)+'m' : '—';
        var words = s.words_count || 0;
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg-btn-subtle);border-radius:10px;font-size:13px;gap:8px;flex-wrap:wrap">';
        h += '<span style="font-weight:600;color:var(--text-primary)">'+(s.mode||'session')+'</span>';
        h += '<span style="color:var(--text-muted);font-size:11px">'+when+' · '+dur+' · '+words+' parole</span>';
        h += '<span style="display:flex;gap:8px;font-size:11px"><a href="transcript.html?session='+s.id+'" style="color:var(--accent-blue);font-weight:500">Trascrizione</a><a href="analysis.html?session='+s.id+'" style="color:var(--accent-purple);font-weight:500">Analysis</a></span>';
        h += '</div>';
      });
      h += '</div>';
      sessionsEl.innerHTML = h;
    }

    updatePerformanceDashboard(currentSessions);
  }

  function setBarState(el, ratio, state) {
    if (!el) return;
    el.style.width = (Math.max(0, Math.min(ratio, 1)) * 100).toFixed(0) + '%';
    el.classList.remove('bad', 'warn', 'good');
    if (state) el.classList.add(state);
  }

  function updatePerformanceDashboard(sessions) {
    if (!sessions || sessions.length === 0) {
      if (perfMinutesSpokenEl) perfMinutesSpokenEl.textContent = '0';
      if (perfAverageWpmEl) perfAverageWpmEl.textContent = '–';
      if (perffillers_per_minuteEl) perffillers_per_minuteEl.textContent = '–';
      if (perfUniqueWordsEl) perfUniqueWordsEl.textContent = '0';
      if (perflexical_diversityEl) perflexical_diversityEl.textContent = '–';
      if (perfquality_scoreEl) perfquality_scoreEl.textContent = '–';
      if (perfrepetition_rateEl) perfrepetition_rateEl.textContent = '–';
      if (perfConversationTurnsEl) perfConversationTurnsEl.textContent = '–';
      if (perfNgslCoverageEl) perfNgslCoverageEl.textContent = '–';

      setBarState(perfMinutesSpokenBarEl, 0, null);
      setBarState(perfAverageWpmBarEl, 0, null);
      setBarState(perffillers_per_minuteBarEl, 0, null);
      setBarState(perfUniqueWordsBarEl, 0, null);
      setBarState(perflexical_diversityBarEl, 0, null);
      setBarState(perfquality_scoreBarEl, 0, null);
      setBarState(perfrepetition_rateBarEl, 0, null);
      setBarState(perfConversationTurnsBarEl, 0, null);
      setBarState(perfNgslCoverageBarEl, 0, null);

      if (perfQualityTrendEl) {
        perfQualityTrendEl.innerHTML = '<span style="font-size:20px;margin-right:6px">📊</span><strong>Dati insufficienti</strong><br><span style="font-size:12px;color:var(--text-muted)">Servono almeno 3 sessioni per calcolare il trend.</span>';
      }

      if (perfFunFactEl) {
        perfFunFactEl.textContent = 'Inizia a usare Studio per vedere le prime letture del tuo inglese.';
      }

      if (perfStreakBadgeEl) {
        perfStreakBadgeEl.textContent = '0-day streak';
        perfStreakBadgeEl.classList.remove('hot', 'cold');
        perfStreakBadgeEl.classList.add('cold');
      }

      if (perfMinutesSparklineEl) perfMinutesSparklineEl.innerHTML = '';
      if (perfWpmTrendEl) perfWpmTrendEl.innerHTML = '';
      return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let totalSecondsWeek = 0;
    let totalWordsWeek = 0;
    let sumWpm = 0;
    let countWpm = 0;
    let sumfillers_per_minute = 0;
    let countFillers = 0;
    let uniqueWordsLast30 = 0;
    let sumlexical_diversity = 0;
    let countlexical_diversity = 0;
    let sumquality_score = 0;
    let countquality_score = 0;
    let sumrepetition_rate = 0;
    let countrepetition_rate = 0;
    let sumTurns = 0;
    let countTurns = 0;
    let sumNgslCoverage = 0;
    let countNgslCoverage = 0;
    let sumWpmPrevWeek = 0;
    let countWpmPrevWeek = 0;
    // For session-over-session trend: collect quality scores chronologically
    let qualitySeries = [];

    const dailyMinutes = new Array(14).fill(0);
    const spokenDates = new Set();

    sessions.forEach((s) => {
      if (!s.started_at) return;
      const started = new Date(s.started_at);
      const dayKey = toLocalDayKey(started);
      const hasSpokenDuration = typeof s.duration_seconds === 'number' && s.duration_seconds > 0;

      if (hasSpokenDuration) {
        spokenDates.add(dayKey);
      }

      if (started >= sevenDaysAgo) {
        if (hasSpokenDuration) {
          totalSecondsWeek += s.duration_seconds;
          if (typeof s.words_count === 'number') {
            totalWordsWeek += s.words_count;
          }
          if (typeof s.wpm === 'number') {
            sumWpm += s.wpm;
            countWpm += 1;
          }
          if (typeof s.fillers_per_minute === 'number') {
            sumfillers_per_minute += s.fillers_per_minute;
            countFillers += 1;
          }
          if (typeof s.lexical_diversity === 'number') {
            sumlexical_diversity += s.lexical_diversity;
            countlexical_diversity += 1;
          }
          if (typeof s.quality_score === 'number') {
            sumquality_score += s.quality_score;
            countquality_score += 1;
          }
          if (typeof s.repetition_rate === 'number') {
            sumrepetition_rate += s.repetition_rate;
            countrepetition_rate += 1;
          }
          if (typeof s.turn_count === 'number') {
            sumTurns += s.turn_count;
            countTurns += 1;
          }
          if (typeof s.ngsl_coverage === 'number') {
            sumNgslCoverage += s.ngsl_coverage;
            countNgslCoverage += 1;
          }
        }
      }

      if (started >= previousWeekStart && started < sevenDaysAgo) {
        if (typeof s.wpm === 'number') {
          sumWpmPrevWeek += s.wpm;
          countWpmPrevWeek += 1;
        }
      }

      if (started >= thirtyDaysAgo) {
        if (typeof s.unique_words_count === 'number') {
          uniqueWordsLast30 += s.unique_words_count;
        }
      }

      if (started >= fourteenDaysAgo) {
        const dayIndex = Math.floor(
          (started.getTime() - fourteenDaysAgo.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (dayIndex >= 0 && dayIndex < 14 && typeof s.duration_seconds === 'number') {
          dailyMinutes[dayIndex] += s.duration_seconds / 60;
        }
      }

      // Collect quality scores for trend computation (all sessions, chronological)
      if (typeof s.quality_score === 'number' && s.started_at) {
        qualitySeries.push({ date: new Date(s.started_at), value: s.quality_score });
      }
    });

    // Sort quality series chronologically for trend computation
    qualitySeries.sort((a, b) => a.date - b.date);

    const minutesWeek = Math.round(totalSecondsWeek / 60);
    const avgWpm = countWpm > 0 ? sumWpm / countWpm : null;
    const avgWpmPrevWeek = countWpmPrevWeek > 0 ? sumWpmPrevWeek / countWpmPrevWeek : null;
    const avgFillersPerMin = countFillers > 0 ? sumfillers_per_minute / countFillers : null;
    const avglexical_diversity =
      countlexical_diversity > 0 ? sumlexical_diversity / countlexical_diversity : null;
    const avgquality_score = countquality_score > 0 ? sumquality_score / countquality_score : null;
    const avgrepetition_rate =
      countrepetition_rate > 0 ? sumrepetition_rate / countrepetition_rate : null;
    const avgTurns = countTurns > 0 ? sumTurns / countTurns : null;
    const avgNgslCoverage = countNgslCoverage > 0 ? sumNgslCoverage / countNgslCoverage : null;
    // Session-over-session quality trend (simple linear regression on last 10)
    const qualitySlope = computeQualityTrend(qualitySeries, 10);

    const targetMinutesWeek = 120;
    const maxMinutesWeek = 240;
    const maxWpm = 180;
    const idealMinWpm = 90;
    const idealMaxWpm = 160;
    const maxFillersBad = 10;
    const maxUniqueWords = 2000;

    if (perfMinutesSpokenEl) perfMinutesSpokenEl.textContent = String(minutesWeek);
    if (perfMinutesSpokenBarEl) {
      const ratio = Math.min(minutesWeek / maxMinutesWeek, 1);
      let state = null;
      if (minutesWeek < targetMinutesWeek / 2 && minutesWeek > 0) {
        state = 'warn';
      } else if (minutesWeek >= targetMinutesWeek) {
        state = 'good';
      }
      setBarState(perfMinutesSpokenBarEl, ratio, state);
    }

    if (perfAverageWpmEl) {
      if (avgWpm != null) {
        const arrow =
          avgWpmPrevWeek != null
            ? avgWpm > avgWpmPrevWeek + 5
              ? ' ↑'
              : avgWpm < avgWpmPrevWeek - 5
              ? ' ↓'
              : ' →'
            : '';
        perfAverageWpmEl.textContent = Math.round(avgWpm).toString() + arrow;
      } else {
        perfAverageWpmEl.textContent = '–';
      }
    }
    if (perfAverageWpmBarEl) {
      if (avgWpm == null) {
        setBarState(perfAverageWpmBarEl, 0, null);
      } else {
        const clamped = Math.max(0, Math.min(avgWpm, maxWpm));
        const state = avgWpm < idealMinWpm || avgWpm > idealMaxWpm ? 'warn' : 'good';
        setBarState(perfAverageWpmBarEl, clamped / maxWpm, state);
      }
    }

    if (perffillers_per_minuteEl) {
      perffillers_per_minuteEl.textContent =
        avgFillersPerMin != null ? avgFillersPerMin.toFixed(1) : '–';
    }
    if (perffillers_per_minuteBarEl) {
      if (avgFillersPerMin == null) {
        setBarState(perffillers_per_minuteBarEl, 0, null);
      } else {
        let state = 'bad';
        if (avgFillersPerMin <= 3) state = 'good';
        else if (avgFillersPerMin <= 7) state = 'warn';
        setBarState(
          perffillers_per_minuteBarEl,
          Math.min(avgFillersPerMin / maxFillersBad, 1),
          state
        );
      }
    }

    if (perfUniqueWordsEl) {
      perfUniqueWordsEl.textContent = String(uniqueWordsLast30);
    }
    if (perfUniqueWordsBarEl) {
      const ratio = Math.min(uniqueWordsLast30 / maxUniqueWords, 1);
      let state = null;
      if (uniqueWordsLast30 > 0 && ratio < 0.3) {
        state = 'warn';
      } else if (ratio >= 0.5) {
        state = 'good';
      }
      setBarState(perfUniqueWordsBarEl, ratio, state);
    }

    if (perflexical_diversityEl) {
      perflexical_diversityEl.textContent =
        avglexical_diversity != null ? avglexical_diversity.toFixed(2) : '–';
    }
    if (perflexical_diversityBarEl) {
      if (avglexical_diversity == null) {
        setBarState(perflexical_diversityBarEl, 0, null);
      } else {
        let state = 'good';
        if (avglexical_diversity < 0.3) state = 'bad';
        else if (avglexical_diversity < 0.45) state = 'warn';
        setBarState(
          perflexical_diversityBarEl,
          Math.min(avglexical_diversity / 0.7, 1),
          state
        );
      }
    }

    if (perfquality_scoreEl) {
      perfquality_scoreEl.textContent =
        avgquality_score != null ? Math.round(avgquality_score).toString() : '–';
    }
    if (perfquality_scoreBarEl) {
      if (avgquality_score == null) {
        setBarState(perfquality_scoreBarEl, 0, null);
      } else {
        let state = 'good';
        if (avgquality_score < 50) state = 'bad';
        else if (avgquality_score < 70) state = 'warn';
        setBarState(
          perfquality_scoreBarEl,
          Math.min(avgquality_score / 100, 1),
          state
        );
      }
    }

    // ── NGSL Coverage (7-day average) ──
    if (perfNgslCoverageEl) {
      perfNgslCoverageEl.textContent =
        avgNgslCoverage != null ? (avgNgslCoverage * 100).toFixed(0) + '%' : '–';
    }
    if (perfNgslCoverageBarEl) {
      if (avgNgslCoverage == null) {
        setBarState(perfNgslCoverageBarEl, 0, null);
      } else {
        let state = 'good';
        if (avgNgslCoverage < 0.4) state = 'bad';
        else if (avgNgslCoverage < 0.6) state = 'warn';
        setBarState(perfNgslCoverageBarEl, Math.min(avgNgslCoverage, 1), state);
      }
    }

    // ── Quality Trend (session-over-session slope) ──
    if (perfQualityTrendEl) {
      if (qualitySlope != null) {
        var trendIcon = qualitySlope > 0.5 ? '📈' : qualitySlope < -0.5 ? '📉' : '📊';
        var trendLabel = qualitySlope > 0.5 ? 'In miglioramento' : qualitySlope < -0.5 ? 'In calo' : 'Stabile';
        var trendDetail = qualitySlope > 0.3
          ? ('+' + qualitySlope.toFixed(1) + ' pts/settimana — continua così!')
          : qualitySlope < -0.3
          ? (qualitySlope.toFixed(1) + ' pts/settimana — prova a variare gli esercizi')
          : 'Andamento stabile. Per sbloccare il prossimo livello, aumenta la frequenza.';
        perfQualityTrendEl.innerHTML = '<span style="font-size:20px;margin-right:6px">' + trendIcon + '</span><strong>' + trendLabel + '</strong><br><span style="font-size:12px;color:var(--text-muted)">' + trendDetail + '</span>';
      } else {
        perfQualityTrendEl.innerHTML = '<span style="font-size:20px;margin-right:6px">📊</span><strong>Dati insufficienti</strong><br><span style="font-size:12px;color:var(--text-muted)">Servono almeno 3 sessioni per calcolare il trend.</span>';
      }
    }

    if (perfrepetition_rateEl) {
      perfrepetition_rateEl.textContent =
        avgrepetition_rate != null ? (avgrepetition_rate * 100).toFixed(0) + '%' : '–';
    }
    if (perfrepetition_rateBarEl) {
      if (avgrepetition_rate == null) {
        setBarState(perfrepetition_rateBarEl, 0, null);
      } else {
        let state = 'good';
        if (avgrepetition_rate > 0.35) state = 'bad';
        else if (avgrepetition_rate > 0.2) state = 'warn';
        setBarState(
          perfrepetition_rateBarEl,
          Math.min(avgrepetition_rate / 0.5, 1),
          state
        );
      }
    }

    if (perfConversationTurnsEl) {
      perfConversationTurnsEl.textContent =
        avgTurns != null ? avgTurns.toFixed(1) : '–';
    }
    if (perfConversationTurnsBarEl) {
      if (avgTurns == null) {
        setBarState(perfConversationTurnsBarEl, 0, null);
      } else {
        let state = 'warn';
        if (avgTurns >= 6) state = 'good';
        else if (avgTurns <= 2) state = 'bad';
        setBarState(
          perfConversationTurnsBarEl,
          Math.min(avgTurns / 12, 1),
          state
        );
      }
    }

    // ── Quality Trend display moved above ──

    if (perfMinutesSparklineEl) {
      perfMinutesSparklineEl.innerHTML = '';
      const maxMinutesDay = dailyMinutes.reduce((m, v) => Math.max(m, v), 0) || 1;
      dailyMinutes.forEach((minutes) => {
        const bar = document.createElement('div');
        bar.className = 'perf-sparkline-bar';
        const heightRatio = Math.min(minutes / maxMinutesDay, 1);
        bar.style.height = Math.max(3, heightRatio * 100) + '%';
        bar.title = `${minutes.toFixed(0)} min`;
        if (minutes > 0) {
          bar.classList.add('active');
        }
        perfMinutesSparklineEl.appendChild(bar);
      });
    }

    if (perfWpmTrendEl) {
      perfWpmTrendEl.innerHTML = '';
      const recentSessionsAsc = [...sessions]
        .filter(s => s.started_at)
        .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
        .slice(-10);
      const trendValues = recentSessionsAsc.map(s =>
        typeof s.wpm === 'number' ? s.wpm : 0
      );
      const maxTrend = trendValues.reduce((m, v) => Math.max(m, v), 0) || 1;
      recentSessionsAsc.forEach((s) => {
        const bar = document.createElement('div');
        bar.className = 'perf-trend-bar';
        const value = typeof s.wpm === 'number' ? s.wpm : 0;
        const ratio = Math.min(value / maxTrend, 1);
        bar.style.height = Math.max(4, ratio * 100) + '%';
        bar.title = s.started_at
          ? `${new Date(s.started_at).toLocaleString()} · ${Math.round(value)} WPM`
          : `${Math.round(value)} WPM`;
        if (value > 0) {
          bar.classList.add('active');
        }
        perfWpmTrendEl.appendChild(bar);
      });
    }

    if (perfStreakBadgeEl) {
      let streak = 0;
      let cursor = new Date(now);
      cursor.setHours(0, 0, 0, 0);
      const todayKey = toLocalDayKey(cursor);
      if (!spokenDates.has(todayKey)) {
        cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
      }
      while (streak < 365) {
        const key = toLocalDayKey(cursor);
        if (spokenDates.has(key)) {
          streak += 1;
          cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
        } else {
          break;
        }
      }
      perfStreakBadgeEl.textContent = streak === 1 ? '1-day streak' : `${streak}-day streak`;
      perfStreakBadgeEl.classList.remove('hot', 'cold');
      if (streak >= 7) {
        perfStreakBadgeEl.classList.add('hot');
      } else if (streak === 0) {
        perfStreakBadgeEl.classList.add('cold');
      }
    }

    if (perfFunFactEl) {
      let fact = '';
      if (avgquality_score != null && avgquality_score >= 70) {
        fact = `La qualità delle tue sessioni recenti è forte: ${Math.round(
          avgquality_score
        )}/100, con un buon equilibrio tra fluidità e varietà lessicale.`;
      } else if (avgNgslCoverage != null && avgNgslCoverage >= 0.6) {
        fact = `Ottimo! Il ${(avgNgslCoverage * 100).toFixed(
          0
        )}% del tuo vocabolario attivo rientra nelle parole NGSL di base.`;
      } else if (minutesWeek >= 60 && avgWpm != null) {
        fact = `Negli ultimi 7 giorni hai parlato per ${minutesWeek} minuti a una velocità media di ${Math.round(
          avgWpm
        )} parole al minuto.`;
      } else if (uniqueWordsLast30 > 0) {
        fact = `Hai prodotto circa ${uniqueWordsLast30} parole uniche negli ultimi 30 giorni.`;
      } else {
        fact = 'Continua a usare Studio: ogni sessione aggiunge dati al tuo profilo linguistico.';
      }
      perfFunFactEl.textContent = fact;
    }
  }

  /**
   * Simple linear regression on the last `windowSize` quality scores.
   * Returns slope in points-per-session (multiplied by 10 for "per 10 sessions" readability).
   * Returns null if fewer than 3 data points.
   */
  function computeQualityTrend(series, windowSize) {
    if (!series || series.length < 3) return null;
    var window = series.slice(-windowSize);
    if (window.length < 3) return null;
    var n = window.length;
    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (var i = 0; i < n; i++) {
      sumX += i;
      sumY += window[i].value;
      sumXY += i * window[i].value;
      sumX2 += i * i;
    }
    var denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;
    var slope = (n * sumXY - sumX * sumY) / denominator;
    // Scale to "per 10 sessions" for readability
    return slope * 10;
  }

  /**
   * Aggregate grammar errors from AI reports.
   * Queries session_ai_reports for grammar-related modules,
   * parses the `issues` array to categorize error types,
   * and returns {total, categories: [{name, count, pct}]}.
   * Categories are detected via Italian keyword matching on issue text.
   */
  async function loadGrammarErrors() {
    if (!accountSupabase) return null;
    var sessionResp = await accountSupabase.auth.getSession();
    if (!sessionResp.data?.session) return null;
    var userId = sessionResp.data.session.user.id;

    // Get module IDs for grammar-related modules
    var modResp = await accountSupabase
      .from('ai_report_modules')
      .select('id, name')
      .or('name.ilike.%grammar%,name.ilike.%accuracy%,name.ilike.%syntax%');

    if (modResp.error || !modResp.data?.length) return null;
    var grammarModuleIds = modResp.data.map(function(m) { return m.id; });

    // Get completed reports for these modules
    var repResp = await accountSupabase
      .from('session_ai_reports')
      .select('issues, overall_score, created_at')
      .eq('user_id', userId)
      .in('module_id', grammarModuleIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (repResp.error || !repResp.data?.length) return null;

    // Categorize issues by keyword matching
    var categories = {
      'Preposizioni': { keywords: ['preposiz', 'preposition', 'in/on/at', 'di/a/da/in/con/su'], count: 0 },
      'Articoli': { keywords: ['articol', 'article', 'il/lo/la/i/gli/le', 'un/uno/una'], count: 0 },
      'Coniugazioni': { keywords: ['coniugaz', 'conjugat', 'verbo', 'verb tense', 'tempo verbal', 'passato', 'presente', 'futuro'], count: 0 },
      'Accordo': { keywords: ['accordo', 'agreement', 'concordanza', 'subject.verb', 'genere', 'numero', 'singolare', 'plurale'], count: 0 },
      'Ordine parole': { keywords: ['ordine delle parole', 'word order', 'sintassi', 'syntax', 'struttura'], count: 0 },
      'Pronomi': { keywords: ['pronom', 'pronoun', 'mi/ti/lo/la/ci/vi', 'gli/le'], count: 0 },
      'Connettivi': { keywords: ['connettiv', 'connect', 'congiunz', 'conjunction', 'linking word'], count: 0 },
      'Ortografia': { keywords: ['ortografia', 'spelling', 'typo', 'accent', 'apostrof'], count: 0 }
    };

    var totalIssues = 0;
    repResp.data.forEach(function(report) {
      if (!Array.isArray(report.issues)) return;
      report.issues.forEach(function(issue) {
        var lower = (issue || '').toLowerCase();
        totalIssues++;
        Object.keys(categories).forEach(function(cat) {
          var kw = categories[cat].keywords;
          for (var i = 0; i < kw.length; i++) {
            if (lower.indexOf(kw[i]) !== -1) {
              categories[cat].count++;
              break;
            }
          }
        });
      });
    });

    if (totalIssues === 0) return null;

    // Build sorted result array
    var result = Object.keys(categories).map(function(name) {
      return { name: name, count: categories[name].count, pct: Math.round(categories[name].count / totalIssues * 100) };
    }).filter(function(c) { return c.count > 0; }).sort(function(a, b) { return b.count - a.count; });

    return { total: totalIssues, categories: result, avgScore: repResp.data.reduce(function(s, r) { return s + (r.overall_score || 0); }, 0) / Math.max(1, repResp.data.length) };
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
      'unique_words_count',
      'lexical_diversity',
      'quality_score',
      'ngsl_coverage',
      'repetition_rate',
      'turn_count',
      'ai_status'
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
      s.wpm != null ? Number(s.wpm).toFixed(2) : '',
      s.fillers_per_minute != null ? Number(s.fillers_per_minute).toFixed(2) : '',
      s.unique_words_count != null ? s.unique_words_count : '',
      s.lexical_diversity != null ? Number(s.lexical_diversity).toFixed(3) : '',
      s.quality_score != null ? Number(s.quality_score).toFixed(1) : '',
      s.ngsl_coverage != null ? Number(s.ngsl_coverage).toFixed(3) : '',
      s.repetition_rate != null ? Number(s.repetition_rate).toFixed(4) : '',
      s.turn_count != null ? s.turn_count : '',
      s.ai_status || ''
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


  // ── User preferences: load & save ──
  const nativeLangEl = document.getElementById('prefNativeLang');
  const targetLang1El = document.getElementById('prefTargetLang1');
  const targetLang2El = document.getElementById('prefTargetLang2');
  const levelEl = document.getElementById('prefLevel');
  const goalEl = document.getElementById('prefGoal');
  const sessionsPerWeekEl = document.getElementById('prefSessionsPerWeek');
  const dailyRemindersEl = document.getElementById('prefDailyReminders');
  const weeklyReportsEl = document.getElementById('prefWeeklyReports');
  const saveBtnEl = document.getElementById('prefSaveBtn');
  const statusEl = document.getElementById('prefStatus');

  function loadPreferences(prefs) {
    if (!prefs) return;
    if (nativeLangEl && prefs.native_lang) nativeLangEl.value = prefs.native_lang;
    if (targetLang1El && prefs.target_lang_1) targetLang1El.value = prefs.target_lang_1;
    if (targetLang2El && prefs.target_lang_2) targetLang2El.value = prefs.target_lang_2 || '';
    if (levelEl && prefs.level) levelEl.value = prefs.level;
    if (goalEl && prefs.goal) goalEl.value = prefs.goal;
    if (sessionsPerWeekEl && prefs.sessions_per_week) sessionsPerWeekEl.value = prefs.sessions_per_week;
    if (dailyRemindersEl) {
      dailyRemindersEl.classList.toggle('on', prefs.daily_reminders !== false);
    }
    if (weeklyReportsEl) {
      weeklyReportsEl.classList.toggle('on', prefs.weekly_reports === true);
    }
  }

  function getPreferences() {
    return {
      native_lang: nativeLangEl ? nativeLangEl.value : 'en',
      target_lang_1: targetLang1El ? targetLang1El.value || null : null,
      target_lang_2: targetLang2El ? targetLang2El.value || null : null,
      level: levelEl ? levelEl.value : 'B1',
      goal: goalEl ? goalEl.value : 'b2_6m',
      sessions_per_week: sessionsPerWeekEl ? parseInt(sessionsPerWeekEl.value) || 4 : 4,
      daily_reminders: dailyRemindersEl ? dailyRemindersEl.classList.contains('on') : true,
      weekly_reports: weeklyReportsEl ? weeklyReportsEl.classList.contains('on') : false
    };
  }

  async function savePreferences() {
    if (!accountSupabase) {
      if (statusEl) { statusEl.textContent = '❌ Supabase non disponibile'; statusEl.className = 'status error'; }
      return;
    }
    const { data: sessionData } = await accountSupabase.auth.getSession();
    if (!sessionData || !sessionData.session) {
      if (statusEl) { statusEl.textContent = '❌ Devi aver effettuato l\u2019accesso'; statusEl.className = 'status error'; }
      return;
    }
    const user_id = sessionData.session.user.id;
    const prefs = getPreferences();

    const { error } = await accountSupabase
      .from('user_preferences')
      .upsert({ user_id: user_id, ...prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) {
      if (statusEl) { statusEl.textContent = '❌ Errore salvataggio: ' + error.message; statusEl.className = 'status error'; }
    } else {
      if (statusEl) { statusEl.textContent = '✓ Impostazioni salvate'; statusEl.className = 'status'; }
      setTimeout(function() { if (statusEl) statusEl.textContent = ''; }, 3000);
    }
  }

  async function loadPreferencesFromDB() {
    if (!accountSupabase) return;
    const { data: sessionData } = await accountSupabase.auth.getSession();
    if (!sessionData || !sessionData.session) return;
    const user_id = sessionData.session.user.id;

    const { data, error } = await accountSupabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user_id)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      loadPreferences(data);
    }
  }

  if (saveBtnEl) {
    saveBtnEl.addEventListener('click', savePreferences);
  }

  // Toggle click handler
  document.querySelectorAll('.toggle').forEach(function(el) {
    el.addEventListener('click', function() {
      el.classList.toggle('on');
      // If this is the dark mode toggle, also apply the theme
      if (el.id === 'accThemeToggle') {
        var html = document.documentElement;
        var isDark = el.classList.contains('on');
        html.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('sottotitoli-theme', isDark ? 'dark' : 'light');
        // Sync the navbar theme button icon
        var navBtn = document.getElementById('themeToggle');
        if (navBtn) navBtn.textContent = isDark ? '☀️' : '🌙';
      }
    });
  });

  // Prevent selecting same language for both targets
  if (targetLang1El && targetLang2El) {
    function enforceUniqueTargets() {
      var v1 = targetLang1El.value;
      var v2 = targetLang2El.value;
      if (v1 && v1 === v2) {
        targetLang2El.value = '';
      }
      // Disable options in target 2 that match target 1
      Array.from(targetLang2El.options).forEach(function(opt) {
        opt.disabled = opt.value && opt.value === v1;
      });
    }
    targetLang1El.addEventListener('change', enforceUniqueTargets);
    targetLang2El.addEventListener('change', function() {
      var v1 = targetLang1El.value;
      var v2 = targetLang2El.value;
      if (v1 && v1 === v2) {
        targetLang1El.value = '';
      }
    });
    // Also prevent native == target
    if (nativeLangEl) {
      nativeLangEl.addEventListener('change', function() {
        var nv = nativeLangEl.value;
        if (targetLang1El.value === nv) targetLang1El.value = '';
        if (targetLang2El.value === nv) targetLang2El.value = '';
      });
    }
  }

  // Load preferences after account data
  // This is called at the end of loadAccount()
  var origLoadAccount = loadAccount;
  loadAccount = function() {
    origLoadAccount();
    loadPreferencesFromDB();
  };

  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', downloadSessionsCsv);
  }

  loadAccount();
});
