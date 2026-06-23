// ═══ Real Mic + Speech Recognition Module ═══
// Provides: startRealMic(), stopRealMic(), updateMicUI(state)
// States: "idle" (gray), "requesting" (amber), "live" (green), "blocked" (red), "error" (red)

var _realMic = {
  recognition: null,
  stream: null,
  state: 'idle',
  onInterim: null,   // callback(interimText)
  onFinal: null,     // callback(finalText)
  onStateChange: null // callback(state)
};

function updateMicUI(state) {
  _realMic.state = state;
  var dot = document.getElementById('micDot');
  var status = document.getElementById('micStatus');
  var roomMic = document.getElementById('roomMicState');
  
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
    roomMic.textContent = state === 'live' ? 'Live' : (state === 'blocked' ? 'Blocked' : 'Off');
    roomMic.style.color = state === 'live' ? '' : (state === 'blocked' ? '#f87171' : '');
  }
  if (_realMic.onStateChange) _realMic.onStateChange(state);
}

async function startRealMic() {
  if (_realMic.recognition) return; // already running
  updateMicUI('requesting');
  
  try {
    // Request mic permission
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
    if (_realMic.stream) { _realMic.stream.getTracks().forEach(function(t){t.stop();}); _realMic.stream = null; }
    return false;
  }
  
  var rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  
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
    if (interim && _realMic.onInterim) _realMic.onInterim(interim);
    if (final && _realMic.onFinal) _realMic.onFinal(final);
  };
  
  rec.onerror = function(event) {
    console.error('Speech error:', event.error);
    if (event.error === 'not-allowed') updateMicUI('blocked');
    else if (event.error === 'no-speech') { /* ignore */ }
    else updateMicUI('error');
  };
  
  rec.onend = function() {
    // Auto-restart if still supposed to be live
    if (_realMic.state === 'live' && _realMic.recognition) {
      try { rec.start(); } catch(e) {}
    }
  };
  
  try {
    rec.start();
    _realMic.recognition = rec;
    updateMicUI('live');
    return true;
  } catch(e) {
    console.error('Speech start error:', e);
    updateMicUI('error');
    if (_realMic.stream) { _realMic.stream.getTracks().forEach(function(t){t.stop();}); _realMic.stream = null; }
    return false;
  }
}

function stopRealMic() {
  if (_realMic.recognition) {
    try { _realMic.recognition.stop(); } catch(e) {}
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

function _endSupabaseSession() {
  var sessionId = localStorage.getItem('sottotitoli-active-session');
  if (!sessionId || !window.sottotitoliSupabase) return;
  window.sottotitoliSupabase.from('sessions').update({
    ended_at: new Date().toISOString()
  }).eq('id', sessionId).then(function() {
    localStorage.removeItem('sottotitoli-active-session');
  });
}
