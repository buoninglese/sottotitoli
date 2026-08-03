// ═══ Real Mic + Speech Recognition Module ═══
// Provides: startRealMic(), stopRealMic(), updateMicUI(state)
// States: "idle" (gray), "requesting" (amber), "live" (green), "blocked" (red), "error" (red)

var _realMic = {
  recognition: null,
  stream: null,
  state: 'idle',
  lang: 'en-US',     // current speech recognition language
  onInterim: null,   // callback(interimText)
  onFinal: null,     // callback(finalText)
  onStateChange: null, // callback(state)
  forceFinalizeMs: 0, // silence before forcing finalization (0 = disabled)
  _lastInterim: 0,
  _forceTimer: null
};

function updateMicUI(state) {
  _realMic.state = state;
  var dot = document.getElementById('micDot');
  var status = document.getElementById('micStatus');
  var roomMic = document.getElementById('recRoomMic') || document.getElementById('roomMicState');
  
  if (dot) {
    dot.classList.remove('live','warn','idle','blocked');
    if (state === 'live') dot.classList.add('live');
    else if (state === 'requesting') dot.classList.add('warn');
    else if (state === 'blocked' || state === 'error') dot.classList.add('blocked');
    else dot.classList.add('idle');
  }
  if (status) {
    var labels = { idle:'Mic Off', requesting:'Requesting…', live:'Mic Live', blocked:'Blocked', error:'Error' };
    status.textContent = labels[state] || state;
  }
  if (roomMic) {
    roomMic.textContent = state === 'live' ? '● Live' : (state === 'blocked' ? '● Blocked' : '● Off');
    roomMic.className = 'stat-val ' + (state === 'live' ? 'status-connected' : (state === 'blocked' ? 'status-offline' : 'status-offline'));
  }
  if (_realMic.onStateChange) _realMic.onStateChange(state);
}

async function startRealMic() {
  if (_realMic.recognition) return true; // already running
  updateMicUI('requesting');
  
  // Always use default mic
  try {
    _realMic.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch(e) {
    console.error('Mic permission denied:', e);
    updateMicUI('blocked');
    return false;
  }
  
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error('SpeechRecognition not available');
    updateMicUI('error');
    return false;
  }
  
  var rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = _realMic.lang || 'en-US';
  
  rec.onresult = function(event) {
    var interim = '';
    var final = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var r = event.results[i];
      if (r.isFinal) {
        final += r[0].transcript;
      } else {
        interim += r[0].transcript;
      }
    }
    // Track last speech time for force-finalize timer
    if (interim || final) _realMic._lastInterim = Date.now();
    if (interim && _realMic.onInterim) _realMic.onInterim(interim);
    if (final && _realMic.onFinal) _realMic.onFinal(final);
  };
  _realMic._onresult = rec.onresult;
  
  rec.onerror = function(event) {
    if (event.error === 'not-allowed') { updateMicUI('blocked'); console.warn('Speech error:', event.error); }
    else if (event.error === 'no-speech' || event.error === 'aborted') { /* normal — silence / stop */ }
    else { console.error('Speech error:', event.error); updateMicUI('error'); }
  };
  _realMic._onerror = rec.onerror;
  
  rec.onend = function() {
    // Auto-restart if still supposed to be live.
    // Chrome may abort recognition on silence — the old instance is dead,
    // so create a fresh one rather than calling rec.start() on it.
    if (_realMic.state === 'live' && _realMic.recognition === rec) {
      _realMic.recognition = null;
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      try {
        var newRec = new SpeechRecognition();
        newRec.continuous = true;
        newRec.interimResults = true;
        newRec.lang = _realMic.lang || 'en-US';
        newRec.onresult = _realMic._onresult;
        newRec.onerror = _realMic._onerror;
        newRec.onend = _realMic._onend;
        newRec.start();
        _realMic.recognition = newRec;
      } catch(e) {
        console.error('Speech auto-restart failed:', e);
        updateMicUI('error');
      }
    }
  };
  _realMic._onend = rec.onend;
  
  try {
    rec.start();
    _realMic.recognition = rec;
    updateMicUI('live');
    _startForceFinalizeTimer();
    return true;
  } catch(e) {
    console.error('Speech start error:', e);
    updateMicUI('error');
    return false;
  }
}

function stopRealMic() {
  _stopForceFinalizeTimer();
  if (_realMic.recognition) {
    try { _realMic.recognition.stop(); } catch(e) {
      console.warn('Speech stop error (may be normal):', e.message);
    }
    _realMic.recognition = null;
  }
  if (_realMic.stream) {
    _realMic.stream.getTracks().forEach(function(t){ t.stop(); });
    _realMic.stream = null;
  }
  updateMicUI('idle');
}

// Hook: connect to Supabase session tracking
function _ensureSupabaseSession(userId, mode, lang) {
  if (!window.sottotitoliSupabase || !userId) return;
  // If a session already exists (e.g. from _createCaptionRoom), reuse it
  var existingSession = localStorage.getItem('sottotitoli-caption-session') || localStorage.getItem('sottotitoli-active-session');
  if (existingSession) return existingSession;
  var langPair = lang || 'en-US';
  var roomId = 'caption-' + langPair.replace('-','').toLowerCase() + '-' + Date.now().toString(36);
  window.sottotitoliSupabase.from('sessions').insert({
    user_id: userId,
    room: roomId,
    mode: mode || 'caption-en',
    started_at: new Date().toISOString(),
    language_pair: langPair,
    session_type: 'solo'
  }).select('id').single().then(function(r) {
    if (r.data) localStorage.setItem('sottotitoli-active-session', r.data.id);
  });
}

function _endSupabaseSession(data) {
  // Check all possible session key patterns
  var sessionId = localStorage.getItem('sottotitoli-active-session')
    || localStorage.getItem('sottotitoli-caption-session')
    || localStorage.getItem('sottotitoli-translate-session');
  
  console.log('💾 _endSupabaseSession called. sessionId:', sessionId, 'lines:', (data.lines||[]).length, 'duration:', data.durationSeconds);
  
  if (!sessionId) {
    console.warn('⚠ No session ID found — session may not have been created. Trying fallback save.');
    _fallbackSaveSession(data);
    return;
  }
  if (!window.sottotitoliSupabase) return;
  
  data = data || {};
  var updateObj = { ended_at: new Date().toISOString() };
  
  // Compute and save transcript + stats if provided
  if (data.lines && data.lines.length > 0) {
    // Join all line texts
    var fullText = data.lines.map(function(l) { return l.en || l.text || l || ''; }).filter(Boolean).join('\n');
    updateObj.transcript_text = fullText;
    
    // Word count
    var allWords = fullText.toLowerCase().match(/[a-zàèéìòù]{2,}/g) || [];
    updateObj.words_count = allWords.length;
    
    // Duration
    if (data.durationSeconds) {
      updateObj.duration_seconds = data.durationSeconds;
      // WPM
      if (data.durationSeconds > 0) {
        updateObj.wpm = Math.round((allWords.length / data.durationSeconds) * 60);
      }
    }
    
    // Lexical diversity (MATTR — Moving Average TTR, window=50)
    if (allWords.length > 0) {
      var uniqueWords = {};
      allWords.forEach(function(w) { uniqueWords[w.toLowerCase()] = true; });
      updateObj.unique_words_count = Object.keys(uniqueWords).length;
      // MATTR: stable across sessions of different lengths
      var wSize = 50;
      if (allWords.length < wSize) {
        updateObj.lexical_diversity = Object.keys(uniqueWords).length / allWords.length;
      } else {
        var mattrTotal = 0, mattrWindows = 0;
        for (var mi = 0; mi <= allWords.length - wSize; mi++) {
          var win = {};
          for (var mj = mi; mj < mi + wSize; mj++) win[allWords[mj]] = true;
          mattrTotal += Object.keys(win).length / wSize;
          mattrWindows++;
        }
        updateObj.lexical_diversity = mattrTotal / mattrWindows;
      }
    }
    
    // Metrics version — v2 = MATTR, v1 = raw TTR (deprecated)
    updateObj.metrics_version = 2;
    
    // POS counts
    var posCounts = data.posCounts || {};
    if (posCounts.NOUN) updateObj.noun_count = posCounts.NOUN;
    if (posCounts.VERB) updateObj.verb_count = posCounts.VERB;
    if (posCounts.ADJ) updateObj.adjective_count = posCounts.ADJ;
    if (posCounts.ADV) updateObj.adverb_count = posCounts.ADV;
    
    // Additional stats — passed pre-computed from studio-caption.html
    if (data.fillersPerMinute != null) updateObj.fillers_per_minute = data.fillersPerMinute;
    if (data.turnCount != null) updateObj.turn_count = data.turnCount;
    if (data.sentenceMetrics && data.sentenceMetrics.length > 0) updateObj.sentence_metrics = data.sentenceMetrics.slice(0, 50);
    if (data.connectors) updateObj.connectors = data.connectors;
    if (data.ngslCoverage != null) updateObj.ngsl_coverage = data.ngslCoverage;
  }
  
  // Store session ID for post-session rewards
  window._lastSessionId = sessionId;
  
  window.sottotitoliSupabase.from('sessions').update(updateObj)
    .eq('id', sessionId).then(function(upd) {
      if (upd.error) {
        console.error('Session save failed:', upd.error.message);
        return;
      }
      console.log('✅ Session saved:', sessionId, '| words:', updateObj.words_count, '| duration:', Math.round((updateObj.duration_seconds || 0) / 60) + 'min');
      
      // Clear all session keys
      localStorage.removeItem('sottotitoli-active-session');
      localStorage.removeItem('sottotitoli-caption-session');
      localStorage.removeItem('sottotitoli-translate-session');
      
      // ── Deduct minutes from user_credits ──
      _deductSessionMinutes(data.durationSeconds || 0);
    }).catch(function(err) {
      console.error('Failed to save session to Supabase:', err);
      // Keep session keys so retry is possible on next session start
    });
}

// ═══ Fallback: save session even if no session ID was created ═══
function _fallbackSaveSession(data) {
  if (!window.sottotitoliSupabase) return;
  window.sottotitoliSupabase.auth.getSession().then(function(r) {
    if (!r.data?.session) { console.warn('⚠ Cannot fallback save — not logged in'); return; }
    var userId = r.data.session.user.id;
    var roomId = 'caption-fallback-' + Date.now().toString(36);
    var lines = data.lines || [];
    var fullText = lines.map(function(l) { return l.en || l.text || l || ''; }).filter(Boolean).join('\n');
    var words = (fullText.toLowerCase().match(/[a-zàèéìòù]{2,}/g) || []);
    window.sottotitoliSupabase.from('sessions').insert({
      user_id: userId,
      room: roomId,
      mode: 'caption-en',
      started_at: new Date(Date.now() - (data.durationSeconds || 0) * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      language_pair: 'en-US',
      session_type: 'caption',
      transcript_text: fullText,
      words_count: words.length,
      duration_seconds: data.durationSeconds || 0,
      wpm: data.durationSeconds > 0 ? Math.round((words.length / data.durationSeconds) * 60) : 0
    }).then(function(ins) {
      if (ins.error) { console.error('Fallback save failed:', ins.error.message); }
      else { console.log('✅ Session fallback-saved'); }
    });
  });
}

// ═══ Minutes deduction from user_credits (atomic CAS with retry) ═══
function _deductSessionMinutes(durationSeconds) {
  if (!window.sottotitoliSupabase || durationSeconds <= 0) return;
  
  var totalSeconds = Math.ceil(durationSeconds);
  var minutesUsed = totalSeconds > 0 ? Math.max(1, Math.floor(totalSeconds / 60)) : 0;
  if (!minutesUsed) return;
  
  window.sottotitoliSupabase.auth.getSession().then(function(r) {
    if (!r.data?.session) return;
    var userId = r.data.session.user.id;
    _atomicDeductCredits(userId, minutesUsed, 0);
  });
}

// CAS loop: read balance, subtract, write only if unchanged. Retry on conflict.
function _atomicDeductCredits(userId, minutesUsed, retries) {
  if (retries >= 3) { console.error('❌ Credit deduction failed after 3 CAS retries'); return; }
  var sb = window.sottotitoliSupabase;
  if (!sb) return;

  sb.from('user_credits')
    .select('balance_minutes')
    .eq('user_id', userId)
    .maybeSingle()
    .then(function(cr) {
      if (cr.error) { console.error('Credit read failed:', cr.error.message); return; }

      var currentBalance = cr.data?.balance_minutes;
      if (currentBalance === null || currentBalance === undefined) {
        // No credit row yet — create one with initial 15 min minus this session.
        // Only insert if row still doesn't exist (race-safe for new users).
        var initialBalance = Math.max(0, 15 - minutesUsed);
        sb.from('user_credits')
          .insert({ user_id: userId, balance_minutes: initialBalance, updated_at: new Date().toISOString() })
          .select()
          .then(function(ins) {
            if (ins.error && ins.error.code === '23505') {
              // Row was created between our check and insert — retry
              _atomicDeductCredits(userId, minutesUsed, retries + 1);
              return;
            }
            if (!ins.error) _refreshCreditDisplays(initialBalance);
          });
        return;
      }

      var newBalance = Math.max(0, currentBalance - minutesUsed);

      // CAS: only update if balance hasn't changed since we read it
      sb.from('user_credits')
        .update({ balance_minutes: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('balance_minutes', currentBalance)
        .select()
        .then(function(upd) {
          if (upd.error) { console.error('Deduction update failed:', upd.error.message); return; }
          if (!upd.data || upd.data.length === 0) {
            // CAS conflict — balance was changed by another operation, retry
            console.warn('⚠ Credit CAS conflict (retry ' + (retries + 1) + '/3)');
            _atomicDeductCredits(userId, minutesUsed, retries + 1);
            return;
          }
          console.log('💰 Deducted ' + minutesUsed + ' min — balance: ' + newBalance);
          _refreshCreditDisplays(newBalance);
        });
    }).catch(function(err) {
      console.error('Credit deduction error:', err);
    });
}

// ═══ Refresh credit/minutes displays across the page ═══
function _refreshCreditDisplays(newMinutesBalance) {
  // Hamburger menu
  var hbMin = document.getElementById('hbMinutes');
  if (hbMin) hbMin.textContent = (newMinutesBalance || 0) + ' min';
  
  // Auth section (topbar)
  var udMin = document.getElementById('udMinutes');
  if (udMin) udMin.textContent = (newMinutesBalance || 0) + ' min';
  
  // Panoramica dropdown (ddMinutes / ddTokens)
  var ddMin = document.getElementById('ddMinutes');
  if (ddMin) ddMin.textContent = (newMinutesBalance || 0) + ' min';
  
  // Also try to refresh token/credit display if available
  if (window.sottotitoliSupabase) {
    window.sottotitoliSupabase.auth.getSession().then(function(r) {
      if (!r.data?.session) return;
      var userId = r.data.session.user.id;
      window.sottotitoliSupabase.from('user_tokens')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle()
        .then(function(tr) {
          var tokBal = tr.data?.balance || 0;
          var hbTok = document.getElementById('hbTokens');
          if (hbTok) hbTok.textContent = tokBal;
          var udTok = document.getElementById('udTokens');
          if (udTok) udTok.textContent = tokBal;
          var ddTok = document.getElementById('ddTokens');
          if (ddTok) ddTok.textContent = tokBal;
        });
    });
  }
}

// ═══ Page-unload cleanup — stop mic + save session when user leaves ═══
// beforeunload: fires on tab close / navigation. We use fetch+keepalive
// to save the session AND deduct credits synchronously via Supabase REST API.
// Falls back to localStorage recovery if the fetch can't complete.
window.addEventListener('beforeunload', function() {
  // Stop mic synchronously
  if (_realMic.recognition) {
    try { _realMic.recognition.stop(); } catch(e) {}
    _realMic.recognition = null;
  }
  if (_realMic.stream) {
    try { _realMic.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e) {}
    _realMic.stream = null;
  }

  // Gather session state (may be undefined if toggleSession hasn't run yet)
  var lines = (typeof window !== 'undefined' && window._sessionLines) ? window._sessionLines : [];
  var secs = (typeof sessionSeconds !== 'undefined') ? sessionSeconds : 0;
  var activeSessionId = '';
  try {
    activeSessionId = localStorage.getItem('sottotitoli-caption-session')
      || localStorage.getItem('sottotitoli-active-session')
      || localStorage.getItem('sottotitoli-translate-session')
      || '';
  } catch(e) {}

  // Only save to localStorage if there's actual content (lines or duration > 0).
  // Empty sessions (0 lines, 0 seconds) are noise — skip them.
  var hasContent = (lines && lines.length > 0) || secs > 0;
  try {
    if (hasContent && activeSessionId) {
      var payload = {
        sessionId: activeSessionId,
        lines: lines,
        durationSeconds: secs,
        lang: (typeof currentCaptionLang !== 'undefined') ? currentCaptionLang : 'en-US',
        savedAt: Date.now()
      };
      localStorage.setItem('sottotitoli-pending-session', JSON.stringify(payload));
    } else {
      // Clean up any stale empty pending session
      localStorage.removeItem('sottotitoli-pending-session');
    }
  } catch(e) {}

  // If we have a session ID, try direct Supabase REST save + credit deduction
  if (activeSessionId && window.sottotitoliSupabase) {
    _emergencySaveViaFetch(activeSessionId, lines, secs);
  }
});

// Direct Supabase REST API save — uses fetch+keepalive for beforeunload reliability.
// Saves the SESSION only (ended_at, transcript, duration).
// Credit deduction is NOT attempted here — it's handled by _recoverPendingSession
// on the next page load, which uses the proper CAS+retry path.
function _emergencySaveViaFetch(sessionId, lines, durationSeconds) {
  var SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
  var ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

  // Extract user JWT from Supabase's localStorage (format: sb-<ref>-auth-token)
  var accessToken = '';
  try {
    var authKey = 'sb-qzqmuegbpmvqrjrlfbgk-auth-token';
    var raw = localStorage.getItem(authKey);
    if (raw) {
      var parsed = JSON.parse(raw);
      accessToken = parsed.access_token || '';
    }
  } catch(e) {}

  if (!accessToken) return; // can't auth — will rely on recovery fallback

  var authHeaders = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': 'Bearer ' + accessToken,
    'Prefer': 'return=minimal'
  };

  // Save session with ended_at + transcript + duration
  var fullText = lines.map(function(l) { return l.en || l.text || l || ''; }).filter(Boolean).join('\n');
  var allWords = fullText.toLowerCase().match(/[a-zàèéìòù]{2,}/g) || [];
  var sessionBody = JSON.stringify({
    ended_at: new Date().toISOString(),
    transcript_text: fullText || null,
    words_count: allWords.length || 0,
    duration_seconds: durationSeconds || 0,
    wpm: durationSeconds > 0 ? Math.round((allWords.length / durationSeconds) * 60) : 0
  });

  fetch(SUPABASE_URL + '/rest/v1/sessions?id=eq.' + encodeURIComponent(sessionId), {
    method: 'PATCH',
    headers: authHeaders,
    body: sessionBody,
    keepalive: true
  }).catch(function(){});

  // Credit deduction happens on next page load via _recoverPendingSession →
  // _deductSessionMinutes → _atomicDeductCredits (CAS + retry).
  // We intentionally do NOT deduct here because beforeunload doesn't allow
  // the multiple round-trips needed for a proper CAS loop.
}

// ═══ Recover pending session on page load ═══
// Called by caption-s8t.html and other session pages on init.
function _recoverPendingSession(supabaseClient) {
  try {
    var raw = localStorage.getItem('sottotitoli-pending-session');
    if (!raw) return;
    var payload = JSON.parse(raw);
    console.log('🔄 Recovery: found pending session. lines:', (payload.lines||[]).length, 'duration:', payload.durationSeconds, 'sessionId:', payload.sessionId);
    localStorage.removeItem('sottotitoli-pending-session');

    // Skip recovery if truly empty (no lines AND no duration)
    if (!payload || (!payload.lines || !payload.lines.length) && !(payload.durationSeconds > 0)) {
      console.log('🔄 Recovery: skipping — empty session (no lines, no duration)');
      // Only close orphan if it had actual duration (not 0)
      if (payload && payload.sessionId && (payload.durationSeconds || 0) > 0) {
        console.log('🔄 Recovery: closing orphaned session (no transcript, ' + payload.durationSeconds + 's)');
        _finalizeOrphanedSession(supabaseClient, payload);
      }
      return;
    }

    if (!payload || !payload.lines || !payload.lines.length) {
      // Even with 0 lines, if there was a session ID, close it with the duration
      if (payload && payload.sessionId && (payload.durationSeconds || 0) > 0) {
        console.log('🔄 Recovery: closing orphaned session (no transcript, ' + payload.durationSeconds + 's)');
        _finalizeOrphanedSession(supabaseClient, payload);
      }
      return;
    }

    // Restore session ID
    localStorage.setItem('sottotitoli-caption-session', payload.sessionId);

    // Reconstruct and save
    var fullText = payload.lines.map(function(l) { return l.en || l.text || l || ''; }).filter(Boolean).join('\n');
    var allWords = fullText.toLowerCase().match(/[a-zàèéìòù]{2,}/g) || [];

    var updateObj = {
      ended_at: new Date().toISOString(),
      transcript_text: fullText,
      words_count: allWords.length,
      duration_seconds: payload.durationSeconds || 0
    };
    if (payload.durationSeconds > 0) {
      updateObj.wpm = Math.round((allWords.length / payload.durationSeconds) * 60);
    }
    if (allWords.length > 0) {
      var unique = {};
      allWords.forEach(function(w) { unique[w.toLowerCase()] = true; });
      updateObj.unique_words_count = Object.keys(unique).length;
      updateObj.lexical_diversity = Object.keys(unique).length / allWords.length;
    }
    updateObj.metrics_version = 2;

    // Save via Supabase client, then deduct credits
    if (supabaseClient && typeof supabaseClient === 'object') {
      supabaseClient
        .from('sessions')
        .update(updateObj)
        .eq('id', payload.sessionId)
        .then(function() {
          console.log('🔄 Recovered session:', payload.sessionId);
          // Deduct credits for the recovered session
          _deductSessionMinutes(payload.durationSeconds || 0);
        }).catch(function(e) {
          console.warn('Failed to recover session:', e.message);
        });
    }
  } catch(e) {
    console.warn('Session recovery failed:', e.message);
  }
}

// Finalize an orphaned session that has duration but no transcript lines
function _finalizeOrphanedSession(supabaseClient, payload) {
  if (!supabaseClient || !payload.sessionId) return;
  supabaseClient
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: payload.durationSeconds || 0
    })
    .eq('id', payload.sessionId)
    .then(function() {
      console.log('🔄 Closed orphaned session:', payload.sessionId);
      _deductSessionMinutes(payload.durationSeconds || 0);
    }).catch(function(e) {
      console.warn('Failed to close orphaned session:', e.message);
    });
}

// ═══ Force-finalize timer — restarts recognition after silence to flush results ═══
function _startForceFinalizeTimer() {
  _stopForceFinalizeTimer();
  _realMic._lastInterim = Date.now();
  _realMic._forceTimer = setInterval(function() {
    var ms = _realMic.forceFinalizeMs;
    if (!ms || ms <= 0) return; // disabled
    if (!_realMic.recognition) return;
    if (_realMic.state !== 'live') return;
    var elapsed = Date.now() - _realMic._lastInterim;
    if (elapsed >= ms) {
      // Force finalize by restarting recognition
      // Null recognition first so onend doesn't auto-restart the old instance
      var oldRec = _realMic.recognition;
      _realMic.recognition = null;
      try { oldRec.stop(); } catch(e) {}
      // Brief delay then restart
      setTimeout(function() {
        if (_realMic.state !== 'live') return;
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        var rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = _realMic.lang || 'en-US';
        rec.onresult = _realMic._onresult;
        rec.onerror = _realMic._onerror;
        rec.onend = _realMic._onend;
        try { rec.start(); _realMic.recognition = rec; _realMic._lastInterim = Date.now(); } catch(e) {}
      }, 150);
    }
  }, 500);
}

function _stopForceFinalizeTimer() {
  if (_realMic._forceTimer) { clearInterval(_realMic._forceTimer); _realMic._forceTimer = null; }
}

// Set the force-finalize timeout in milliseconds (0 = disabled)
function setForceFinalizeMs(ms) {
  _realMic.forceFinalizeMs = ms;
  // Restart timer with new value if mic is live
  _stopForceFinalizeTimer();
  if (ms > 0 && _realMic.state === 'live') _startForceFinalizeTimer();
}
