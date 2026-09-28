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
  lastError: null,   // name of the last getUserMedia failure, so the caller can tell
                     // NotReadableError (device held by another app) from NotAllowedError
  _errNotified: null, // last mic/recognition error already shown to the user (one toast each)
  _lastInterim: 0,
  _forceTimer: null
};

/* `label` is optional and only used when the state's default wording would be FALSE. The
 * computer-audio source sets state 'live' like any other capture, but calling it "Mic Live"
 * while the microphone is not being read is exactly the kind of confidently-wrong status text
 * that made the original bug invisible. Every existing caller passes one argument and is
 * unaffected. */
function updateMicUI(state, label) {
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
    status.textContent = label || labels[state] || state;
  }
  if (roomMic) {
    roomMic.textContent = state === 'live' ? '● Live' : (state === 'blocked' ? '● Blocked' : '● Off');
    roomMic.className = 'stat-val ' + (state === 'live' ? 'status-connected' : (state === 'blocked' ? 'status-offline' : 'status-offline'));
  }
  if (_realMic.onStateChange) _realMic.onStateChange(state);
}

/* Tell the USER why the microphone or recognition failed. Every one of these paths used to
 * end at console.log, which is invisible to anyone whose DevTools filter is on Errors -- the
 * exact shape of "no error in the console, but no text either". The error NAME is included
 * because the name is the diagnosis.
 *
 * The lookup and the message table now live in js/mic-core.js, because onboarding.html and
 * learner.js each grew their own copy of this same knowledge and drifted. */
function _realMicT(key, fallback) {
  if (window.MicCore && typeof window.MicCore.t === 'function') return window.MicCore.t(key, fallback);
  // mic-core.js must load BEFORE this file (see the script order in caption-s8t.html). Say so
  // loudly rather than silently losing every message -- an unexplained silence is the exact bug
  // this whole area kept producing.
  console.error('real-mic.js: window.MicCore is missing — check the script order in the page.');
  return fallback;
}

function _notifyMicProblem(name) {
  if (typeof window.showToast !== 'function') return;
  var msg = (window.MicCore && typeof window.MicCore.errorMessage === 'function')
    ? window.MicCore.errorMessage(name)
    : _realMicT('mic_generic_fail', 'Microfono non disponibile.') + (name ? ' (' + name + ')' : '');
  window.showToast(msg, 'error', 9000);
}

/* Bounded getUserMedia — see MicCore.gumWithTimeout for why it must be bounded. Kept as a local
 * name because both call sites in this file read better for it, and because a missing dependency
 * must fail LOUDLY rather than degrading to the unbounded call that caused the original hang. */
function _gumWithTimeout(constraints, ms) {
  if (!(window.MicCore && typeof window.MicCore.gumWithTimeout === 'function')) {
    console.error('real-mic.js: window.MicCore is missing — check the script order in the page.');
    return Promise.reject(new Error('mic-core.js is not loaded'));
  }
  return window.MicCore.gumWithTimeout(constraints, ms);
}

async function startRealMic() {
  if (_realMic.recognition) return true; // already running
  updateMicUI('requesting');
  
  // Use the device chosen in the picker when there is one, otherwise the system default.
  // ⚠️ `exact` FAILS if that device no longer exists (Bluetooth out of range, USB unplugged),
  // and a stale preference must never block a session: fall back to the default once and
  // forget the choice, so the next attempt is clean. record-fallback.js mirrors this exactly.
  var constraints = (typeof window.SottotitoliMicConstraints === 'function')
    ? window.SottotitoliMicConstraints()
    : { audio: true };
  try {
    _realMic.stream = await _gumWithTimeout(constraints, 12000);
    _realMic.lastError = null;   // clear, or a stale name mislabels the NEXT failure
    _realMic._errNotified = null; // a new capture may fail differently
  } catch(e) {
    if (e && e.name === 'TimeoutError') {
      console.error('Mic did not respond:', e.message);
      _realMic.lastError = 'TimeoutError';
      updateMicUI('error');
      _notifyMicProblem('TimeoutError');
      return false;
    }
    if (constraints.audio && constraints.audio.deviceId) {
      console.warn('Chosen microphone unavailable, falling back to the system default:', e && e.name);
      if (typeof window.SottotitoliDropMicId === 'function') window.SottotitoliDropMicId();
      try {
        _realMic.stream = await _gumWithTimeout({ audio: true }, 12000);
        _realMic.lastError = null;   // clear, or a stale name mislabels the NEXT failure
        _realMic._errNotified = null; // a new capture may fail differently
      } catch(e2) {
        console.error('Mic unavailable:', e2);
        _realMic.lastError = (e2 && e2.name) || null;
        updateMicUI('blocked');
        _notifyMicProblem(e2 && e2.name);
        return false;
      }
    } else {
      console.error('Mic unavailable:', e);
      _realMic.lastError = (e && e.name) || null;
      updateMicUI('blocked');
      _notifyMicProblem(e && e.name);
      return false;
    }
  }
  // Permission is now granted, so device labels become readable — fill the picker properly.
  if (typeof window.refreshMicList === 'function') window.refreshMicList();
  
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
    if (interim && _realMic.onInterim) { console.log('🎤 interim:', interim); _realMic.onInterim(interim); }
    if (final && _realMic.onFinal) { console.log('🎤 final:', final); _realMic.onFinal(final); }
  };
  _realMic._onresult = rec.onresult;
  
  rec.onerror = function(event) {
    var name = event && event.error;
    // Log ALL errors on mobile for debugging — 'no-speech' is common on Chrome Android
    console.log('🎤 SpeechRecognition error:', name, event.message || '');
    if (name === 'not-allowed') { updateMicUI('blocked'); }
    else if (name === 'no-speech' || name === 'aborted') { /* normal — will auto-restart in onend */ }
    else { updateMicUI('error'); }
    // A recognition failure used to only console.log -- and a log is invisible to a user whose
    // DevTools filter is on Errors, which is exactly how "no error in the console, but no text
    // either" happens. Surface the error NAME, because the name IS the diagnosis:
    //   network              -> the speech service is unreachable (VPN / proxy / offline)
    //   audio-capture        -> the OS handed us nothing: it is the wrong DEFAULT input
    //   not-allowed / service-not-allowed -> permission, not audio
    // 'no-speech'/'aborted' stay silent on purpose: they are the normal silence path and
    // would otherwise toast on every pause in speech. Once per name per capture.
    if (name && name !== 'no-speech' && name !== 'aborted' && _realMic._errNotified !== name) {
      _realMic._errNotified = name;
      _notifyMicProblem('recognition:' + name);
    }
  };
  _realMic._onerror = rec.onerror;
  
  rec.onend = function() {
    // Auto-restart if still supposed to be live.
    // Chrome on Android may abort recognition frequently — delay restart
    // to prevent tight loops that prevent onresult from ever firing.
    if (_realMic.state === 'live' && _realMic.recognition === rec) {
      _realMic.recognition = null;
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      // 400ms delay prevents tight restart loops on mobile Chrome
      setTimeout(function() {
        if (_realMic.state !== 'live') return;
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
      }, 400);
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
      // WPM (column is wpm in Supabase)
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
    
    // POS counts — the live sessions columns are nouns_count / verbs_count /
    // adjectives_count / adverbs_count (there are no pos_* columns).
    var posCounts = data.posCounts || {};
    if (posCounts.NOUN) updateObj.nouns_count = posCounts.NOUN;
    if (posCounts.VERB) updateObj.verbs_count = posCounts.VERB;
    if (posCounts.ADJ) updateObj.adjectives_count = posCounts.ADJ;
    if (posCounts.ADV) updateObj.adverbs_count = posCounts.ADV;
    
    // Additional stats — passed pre-computed from caption-s8t.html
    // ⚠️ The live column is fillers_count (PLURAL). PostgREST rejects the ENTIRE
    // update with a 400 if any single key is unknown — that silently dropped
    // transcript_text / ended_at / words_count on every caption session.
    if (data.fillerCount != null) updateObj.fillers_count = data.fillerCount;
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
        // Safety net: PostgREST 400s the WHOLE update when any single key is
        // unknown, which would silently drop the transcript. Retry with core
        // fields only (all verified live columns) so the session is not lost.
        var core = {
          ended_at: updateObj.ended_at,
          transcript_text: updateObj.transcript_text,
          words_count: updateObj.words_count,
          duration_seconds: updateObj.duration_seconds,
          wpm: updateObj.wpm
        };
        Object.keys(core).forEach(function(k){ if (core[k] === undefined) delete core[k]; });
        if (core.transcript_text !== undefined) {
          console.warn('⚠ Retrying session save with core fields only — check updateObj for unknown columns');
          window.sottotitoliSupabase.from('sessions').update(core)
            .eq('id', sessionId).then(function(retry) {
              if (retry.error) { console.error('Core session save failed:', retry.error.message); return; }
              console.warn('✅ Session saved with core fields only:', sessionId);
              localStorage.removeItem('sottotitoli-active-session');
              localStorage.removeItem('sottotitoli-caption-session');
              localStorage.removeItem('sottotitoli-translate-session');
              localStorage.removeItem('sottotitoli-pending-session');
              _deductSessionMinutes(data.durationSeconds || 0, sessionId);
            });
        }
        return;
      }
      var ds = updateObj.duration_seconds || 0;
      var durLabel = ds < 60 ? ds + 's' : Math.round(ds / 60) + 'min';
      console.log('✅ Session saved:', sessionId, '| words:', updateObj.words_count, '| duration:', durLabel);
      
      // Clear all session keys — including any unload snapshot, so recovery
      // cannot re-save (and re-deduct minutes for) a session that completed.
      localStorage.removeItem('sottotitoli-active-session');
      localStorage.removeItem('sottotitoli-caption-session');
      localStorage.removeItem('sottotitoli-translate-session');
      localStorage.removeItem('sottotitoli-pending-session');
      
      // ── Deduct minutes from user_credits (server-side, session-attributed) ──
      _deductSessionMinutes(data.durationSeconds || 0, sessionId);
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

// ═══ Minutes deduction (server-authoritative, session-attributed) ═══
// sessionId lets the server net off minutes already charged while transcribing,
// so an iOS session is billed once rather than once per chunk AND once at save.
function _deductSessionMinutes(durationSeconds, sessionId) {
  if (!window.sottotitoliSupabase || durationSeconds <= 0) return;
  
  var totalSeconds = Math.ceil(durationSeconds);
  var minutesUsed = totalSeconds > 0 ? Math.max(1, Math.floor(totalSeconds / 60)) : 0;
  if (!minutesUsed) return;
  
  window.sottotitoliSupabase.auth.getSession().then(function(r) {
    if (!r.data?.session) return;
    var userId = r.data.session.user.id;
    _atomicDeductCredits(userId, minutesUsed, 0, sessionId);
  });
}

// No longer a CAS loop against user_credits — the server owns that write now.
// The `retries` argument is kept because the no-credit-row path still races on
// INSERT for a brand-new user.
function _atomicDeductCredits(userId, minutesUsed, retries, sessionId) {
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
        // No credit row yet — create one with the one-time 25 min free allowance
        // minus this session. Only insert if the row still doesn't exist
        // (race-safe for new users).
        var initialBalance = Math.max(0, 25 - minutesUsed);
        sb.from('user_credits')
          .insert({ user_id: userId, balance_minutes: initialBalance, updated_at: new Date().toISOString() })
          .select()
          .then(function(ins) {
            if (ins.error && ins.error.code === '23505') {
              // Row was created between our check and insert — retry
              _atomicDeductCredits(userId, minutesUsed, retries + 1, sessionId);
              return;
            }
            if (!ins.error) _refreshCreditDisplays(initialBalance);
          });
        return;
      }

      // Authoritative deduction: the server owns this number now.
      //
      // This replaces the read-modify-write CAS loop that used to live here. That
      // loop worked for well-behaved clients but was bypassable in principle — a
      // crafted client could simply never call it, and the balance would stay
      // untouched. The RPC is SECURITY DEFINER (so the client cannot choose its
      // own price), atomic (no CAS retry dance needed), and it writes the
      // credit_transactions ledger row that this path never produced.
      var secondsUsed = Math.round(minutesUsed * 60);
      sb.rpc('consume_session_minutes', { p_seconds: secondsUsed, p_session_id: sessionId || null })
        .then(function(res) {
          var row = Array.isArray(res.data) ? res.data[0] : res.data;
          if (res.error || !row || !row.ok) {
            console.error('Deduction RPC failed:', (res.error && res.error.message) || (row && row.reason) || 'unknown');
            return;
          }
          console.log('💰 Deducted ' + minutesUsed + ' min — balance: ' + row.new_balance_minutes);
          _refreshCreditDisplays(row.new_balance_minutes);
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

// ═══ Page-unload cleanup — stop mic + save session when the page goes away ═══
// iOS Safari routinely does NOT fire beforeunload (closing a tab, switching
// apps, the OS killing the PWA) — that is why sessions were still lost on
// iPhone while desktop worked. The same work is therefore bound to three
// events, with deliberately different aggressiveness:
//   • beforeunload / pagehide → real exit: snapshot + keepalive save
//   • visibilitychange(hidden) → iOS fires this on tab close, app switch and
//     screen lock. SNAPSHOT ONLY: hiding is not closing, and ending the session
//     here would truncate one the user intends to resume.
// A snapshot left behind is consumed by _recoverPendingSession() on next load,
// so the transcript survives even when the keepalive request never lands.
function _snapshotSessionState() {
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

  return { sessionId: activeSessionId, lines: lines, durationSeconds: secs };
}

// Real exit — snapshot, then best-effort keepalive save so the session appears
// immediately. A bfcache transition (evt.persisted) is not a real exit.
function _saveSessionOnUnload(evt) {
  var state = _snapshotSessionState();
  if (!state || !state.sessionId || !window.sottotitoliSupabase) return;
  if (evt && evt.persisted) return;
  _emergencySaveViaFetch(state.sessionId, state.lines, state.durationSeconds);
}

window.addEventListener('beforeunload', _saveSessionOnUnload);
window.addEventListener('pagehide', _saveSessionOnUnload);
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') _snapshotSessionState();
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
          // Deduct credits for the recovered session, netting off anything already
          // charged while it was being transcribed.
          _deductSessionMinutes(payload.durationSeconds || 0, payload.sessionId);
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
      _deductSessionMinutes(payload.durationSeconds || 0, payload.sessionId);
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
