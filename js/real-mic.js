// ═══ Real Mic + Speech Recognition Module ═══
// Provides: startRealMic(), stopRealMic(), updateMicUI(state)
// States: "idle" (gray), "requesting" (amber), "live" (green), "blocked" (red), "error" (red)

var _realMic = {
  recognition: null,
  state: 'idle',
  lang: 'en-US',     // current speech recognition language
  onInterim: null,   // callback(interimText)
  onFinal: null,     // callback(finalText)
  onStateChange: null, // callback(state)
  forceFinalizeMs: 2500, // silence before forcing finalization (0 = disabled)
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
    console.error('Speech error:', event.error);
    if (event.error === 'not-allowed') updateMicUI('blocked');
    else if (event.error === 'no-speech') { /* ignore */ }
    else updateMicUI('error');
  };
  _realMic._onerror = rec.onerror;
  
  rec.onend = function() {
    // Auto-restart if still supposed to be live
    if (_realMic.state === 'live' && _realMic.recognition) {
      try { rec.start(); } catch(e) {}
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
    try { _realMic.recognition.stop(); } catch(e) {}
    _realMic.recognition = null;
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
  if (!sessionId || !window.sottotitoliSupabase) return;
  
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
    
    // Lexical diversity
    if (allWords.length > 0) {
      var uniqueWords = {};
      allWords.forEach(function(w) { uniqueWords[w] = true; });
      updateObj.unique_words_count = Object.keys(uniqueWords).length;
      updateObj.lexical_diversity = (Object.keys(uniqueWords).length / allWords.length);
    }
    
    // POS counts
    var posCounts = data.posCounts || {};
    if (posCounts.NOUN) updateObj.noun_count = posCounts.NOUN;
    if (posCounts.VERB) updateObj.verb_count = posCounts.VERB;
    if (posCounts.ADJ) updateObj.adjective_count = posCounts.ADJ;
    if (posCounts.ADV) updateObj.adverb_count = posCounts.ADV;
    
    // Additional stats
    if (data.fillersPerMinute != null) updateObj.fillers_per_minute = data.fillersPerMinute;
    if (data.turnCount != null) updateObj.turn_count = data.turnCount;
  }
  
  window.sottotitoliSupabase.from('sessions').update(updateObj)
    .eq('id', sessionId).then(function() {
      // Clear all session keys
      localStorage.removeItem('sottotitoli-active-session');
      localStorage.removeItem('sottotitoli-caption-session');
      localStorage.removeItem('sottotitoli-translate-session');
      
      // ── Deduct minutes from user_credits ──
      _deductSessionMinutes(data.durationSeconds || 0);
    });
}

// ═══ Minutes deduction from user_credits ═══
function _deductSessionMinutes(durationSeconds) {
  if (!window.sottotitoliSupabase || durationSeconds <= 0) return;
  
  window.sottotitoliSupabase.auth.getSession().then(function(r) {
    if (!r.data?.session) return;
    var userId = r.data.session.user.id;
    
    // Calculate minutes used (round up to nearest minute, minimum 1)
    var minutesUsed = Math.max(1, Math.ceil(durationSeconds / 60));
    
    // Get current balance
    window.sottotitoliSupabase.from('user_credits')
      .select('balance_minutes')
      .eq('user_id', userId)
      .maybeSingle()
      .then(function(cr) {
        var currentBalance = cr.data?.balance_minutes || 0;
        var newBalance = Math.max(0, currentBalance - minutesUsed);
        
        // Update balance
        window.sottotitoliSupabase.from('user_credits')
          .upsert({ user_id: userId, balance_minutes: newBalance, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .then(function() {
            // Update all credit displays across the UI
            _refreshCreditDisplays(newBalance);
          });
      });
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
        });
    });
  }
}

// ═══ Page-unload cleanup — stop mic when user leaves ═══
// beforeunload: fires on tab close / navigation (sync only — stop mic immediately)
window.addEventListener('beforeunload', function() {
  if (_realMic.recognition) {
    try { _realMic.recognition.stop(); } catch(e) {}
    _realMic.recognition = null;
  }
});

// visibilitychange: fires on tab switch / minimize — stop mic when hidden
document.addEventListener('visibilitychange', function() {
  if (document.hidden && _realMic.recognition) {
    if (_realMic.recognition) {
      try { _realMic.recognition.stop(); } catch(e) {}
      _realMic.recognition = null;
    }
    updateMicUI('idle');
  }
});

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
