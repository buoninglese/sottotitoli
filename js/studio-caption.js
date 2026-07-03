/* ═══ studio-caption.js — Sottotitoli Studio Supreme v3 ═══ */
'use strict';

/* ── State ── */
var recognition = null;
var audioCtx = null;
var analyser = null;
var animFrameId = null;
var sessionActive = false;
var sessionPaused = false;
var sessionStartTime = null;
var sessionInterval = null;
var wordCount = 0;
var totalChars = 0;
var currentLang = 'en';
var fontMode = 'crisp';
var waveMode = 'bars';
var waveBars = [];
var speakerMap = {};
var sessionLines = [];
var lineCount = 0;
var supabaseSessionId = null;
var supabaseRoomId = null;
var dataArray = null;

/* ── DOM refs ── */
var DOM = {
  liveText: document.getElementById('captionInterim'),
  transcript: document.getElementById('captionTranscript'),
  waveViz: document.getElementById('waveViz'),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  stopBtn: document.getElementById('stopBtn'),
  sessionDot: document.getElementById('sessionDot'),
  sessionPillText: document.getElementById('sessionPillText'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  wordCountEl: document.getElementById('liveWordCount'),
  wpmEl: document.getElementById('liveWpm'),
  fillersEl: document.getElementById('liveFillersPerMin'),
  lexDivEl: document.getElementById('liveLexDiv'),
  sentencesEl: document.getElementById('liveSentences'),
  durationEl: document.getElementById('sessionDuration'),
  statWords: document.getElementById('statWords'),
  statLines: document.getElementById('statLines'),
  vocabChips: document.getElementById('vocabChips'),
  wordbankEmpty: document.getElementById('wordbankEmpty'),
  wordbankDefWord: document.getElementById('wordbankDefWord'),
  wordbankDefText: document.getElementById('wordbankDefText'),
  wordbankInput: document.getElementById('wordbankInput'),
  vocabPosStack: document.getElementById('vocabPosStack'),
  analysisPosStack: document.getElementById('analysisPosStack'),
  analysisSelectedText: document.getElementById('analysisSelectedText'),
  capRoomId: document.getElementById('capRoomId'),
  capRoomLink: document.getElementById('capRoomLink'),
  grammarPlaceholder: document.getElementById('grammarPlaceholder'),
  grammarSynMain: document.getElementById('grammarSynMain'),
  synCardsContainer: document.getElementById('synCardsContainer'),
  grammarTranscriptLines: document.getElementById('grammarTranscriptLines'),
  duoSpeakerList: document.getElementById('duoSpeakerList'),
  toast: document.getElementById('toast'),
  qrModal: document.getElementById('qrModal'),
  qrImage: document.getElementById('qrImage'),
  qrUrl: document.getElementById('qrUrl'),
  qrModalClose: document.getElementById('qrModalClose'),
  captionDivider: document.getElementById('captionDivider'),
  captionLiveArea: document.querySelector('.caption-live-area'),
  captionHistory: document.querySelector('.caption-history'),
  mainPanel: document.getElementById('mainPanel'),
  leftBar: document.getElementById('leftBar'),
  modeBadgeLabel: document.getElementById('modeBadgeLabel')
};

/* ── Tab switching (main panel) ── */
function switchTab(tabName) {
  document.querySelectorAll('#mainPanel .tab-link').forEach(function(l) {
    l.classList.toggle('active', l.dataset.tab === tabName);
    l.setAttribute('aria-selected', l.dataset.tab === tabName);
  });
  document.querySelectorAll('#mainPanel .content-panel').forEach(function(p) {
    p.classList.toggle('active', p.id === 'pnl-' + tabName);
  });
}
document.addEventListener('click', function(e) {
  var tab = e.target.closest('#mainPanel .tab-link[data-tab]');
  if (!tab) return;
  e.preventDefault();
  switchTab(tab.dataset.tab);
});

/* ── Left-bar tab switching ── */
function switchLBTab(name) {
  document.querySelectorAll('#leftBar .lb-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.lbtab === name);
  });
  document.querySelectorAll('#leftBar .lb-pane').forEach(function(p) {
    p.classList.toggle('active', p.dataset.lbtab === name);
  });
}
document.querySelectorAll('#leftBar .lb-tab').forEach(function(t) {
  t.addEventListener('click', function() { switchLBTab(t.dataset.lbtab); });
});

/* ── Toast ── */
function showToast(msg) {
  var t = DOM.toast;
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}

/* ── Session state ── */
function setSessionState(state) {
  sessionActive = (state === 'active' || state === 'paused');
  sessionPaused = (state === 'paused');
  DOM.startBtn.disabled = sessionActive;
  DOM.pauseBtn.disabled = !sessionActive;
  DOM.stopBtn.disabled = !sessionActive;
  DOM.pauseBtn.classList.toggle('paused', sessionPaused);
  DOM.pauseBtn.textContent = sessionPaused ? '▶ Riprendi' : '⏸ Pausa';
  DOM.sessionDot.className = 'tp-dot' + (state === 'active' ? ' live' : '');
  DOM.sessionPillText.textContent = state === 'active' ? 'In corso' : state === 'paused' ? 'In pausa' : 'Inattivo';
}

/* ── Waveform init ── */
function initWaveViz() {
  DOM.waveViz.innerHTML = '';
  for (var i = 0; i < 32; i++) {
    var b = document.createElement('div');
    b.className = 'c-wave-bar';
    DOM.waveViz.appendChild(b);
  }
  waveBars = DOM.waveViz.querySelectorAll('.c-wave-bar');
}
initWaveViz();

function setWaveMode(mode) {
  waveMode = mode;
  document.querySelectorAll('.wave-tgl').forEach(function(b) {
    b.classList.toggle('active', b.textContent.toLowerCase().indexOf(mode) !== -1 || (mode === 'bars' && b.textContent === 'Barre') || (mode === 'dots' && b.textContent === 'Punti'));
  });
}

function animateWave() {
  if (!analyser || !dataArray) { requestAnimationFrame(animateWave); return; }
  analyser.getByteFrequencyData(dataArray);
  if (!waveBars.length) { requestAnimationFrame(animateWave); return; }
  var step = Math.floor(dataArray.length / waveBars.length);
  for (var i = 0; i < waveBars.length; i++) {
    var val = dataArray[i * step] / 255;
    var h = Math.max(4, val * 44);
    waveBars[i].style.height = h + 'px';
    waveBars[i].style.opacity = 0.35 + val * 0.65;
  }
  requestAnimationFrame(animateWave);
}

/* ── Language ── */
function setLang(btn, lang) {
  currentLang = lang;
  document.querySelectorAll('#leftBar .lang-opt').forEach(function(o) {
    o.classList.toggle('active', o.getAttribute('data-lang') === lang);
  });
}

/* ── Font mode ── */
function setFontMode(mode) {
  fontMode = mode;
  document.body.classList.remove('font-crisp', 'font-anchor');
  if (mode === 'crisp') document.body.classList.add('font-crisp');
  if (mode === 'anchor') document.body.classList.add('font-anchor');
  document.querySelectorAll('#leftBar .lb-btn-sm').forEach(function(b) {
    var t = b.textContent.trim().toLowerCase();
    b.classList.toggle('active', t === mode || (t === 'crisp' && mode === 'crisp'));
  });
}

/* ── Shoji mode ── */
function toggleShojiMode() {
  var el = document.documentElement;
  if (el.getAttribute('data-caption-mode') === 'j7b') {
    el.removeAttribute('data-caption-mode');
  } else {
    el.setAttribute('data-caption-mode', 'j7b');
  }
}

/* ── Mode toggle ── */
var currentMode = 'auto';
function toggleMode() {
  currentMode = (currentMode === 'auto') ? 'solo' : 'auto';
  DOM.modeBadgeLabel.textContent = currentMode === 'auto' ? 'Automatico' : 'SOLO';
}

/* ── Fullscreen ── */
function toggleFullscreen() {
  document.body.classList.toggle('fullscreen-active');
}

/* ── Draggable divider ── */
(function() {
  var divider = DOM.captionDivider;
  var historyArea = DOM.captionHistory;
  if (!divider || !historyArea) return;
  var isDragging = false, startY, startHistH;
  divider.addEventListener('mousedown', function(e) {
    isDragging = true;
    startY = e.clientY;
    startHistH = historyArea.offsetHeight;
    divider.classList.add('dragging');
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var delta = startY - e.clientY;
    var newH = Math.max(40, Math.min(startHistH + delta, window.innerHeight * 0.6));
    historyArea.style.flexBasis = newH + 'px';
  });
  document.addEventListener('mouseup', function() {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.style.userSelect = '';
  });
  divider.addEventListener('touchstart', function(e) {
    isDragging = true;
    startY = e.touches[0].clientY;
    startHistH = historyArea.offsetHeight;
    divider.classList.add('dragging');
  }, { passive: true });
  document.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    var delta = startY - e.touches[0].clientY;
    var newH = Math.max(40, Math.min(startHistH + delta, window.innerHeight * 0.6));
    historyArea.style.flexBasis = newH + 'px';
  }, { passive: true });
  document.addEventListener('touchend', function() {
    isDragging = false;
    divider.classList.remove('dragging');
  });
})();

/* ── QR modal ── */
function shareQR() {
  var url = encodeURIComponent(window.location.href);
  DOM.qrImage.src = 'https://api.qrserver.com/v1/create-qr-code/?data=' + url + '&size=200x200&color=0e7490&bgcolor=fdfefe';
  DOM.qrUrl.textContent = window.location.href;
  DOM.qrModal.classList.add('open');
}
DOM.qrModal.addEventListener('click', function(e) {
  if (e.target === DOM.qrModal) DOM.qrModal.classList.remove('open');
});

/* ── Share full page ── */
function shareFullPage() {
  window.open(window.location.href, '_blank', 'noopener,noreferrer');
}

/* ── Copy share link ── */
function copyShareLink() {
  var url = window.location.href;
  navigator.clipboard.writeText(url).then(function() {
    var btn = document.querySelector('.share-btn-cap');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = 'Copiato ✓';
      btn.classList.add('copied');
      setTimeout(function() { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
    }
    showToast('Link copiato!');
  });
}

/* ── Info popup ── */
(function() {
  var btn = document.getElementById('infoBtn');
  var popup = document.getElementById('infoPopup');
  if (!btn || !popup) return;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    popup.classList.toggle('show');
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#infoBtn')) popup.classList.remove('show');
  });
})();

/* ═══════════════════════════════════════════
   SPEECH RECOGNITION + SESSION MANAGEMENT
   ═══════════════════════════════════════════ */

function startSession() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { showToast('Riconoscimento vocale non supportato su questo browser'); return; }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = currentLang === 'en' ? 'en-US' : currentLang === 'it' ? 'it-IT' : currentLang === 'nl' ? 'nl-NL' : currentLang === 'es' ? 'es-ES' : currentLang === 'fr' ? 'fr-FR' : 'de-DE';

  // AudioContext for waveform — must be in click handler
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.fftSize);
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      var source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    }).catch(function(e) { console.warn('Mic stream:', e); });
  } catch(e) { console.warn('AudioContext:', e); }

  wordCount = 0; totalChars = 0; sessionLines = []; lineCount = 0;
  sessionStartTime = Date.now();
  sessionActive = true; sessionPaused = false;
  setSessionState('active');
  animateWave();
  createSupabaseSession();

  recognition.onresult = function(event) {
    var interim = '';
    var final = '';
    for (var i = event.resultIndex; i < event.results.length; i++) {
      var t = event.results[i][0].transcript.trim();
      if (event.results[i].isFinal) {
        final += t + ' ';
        processFinalLine(t);
      } else {
        interim += t;
      }
    }
    DOM.liveText.textContent = interim || final || '';
  };

  recognition.onerror = function(e) { console.warn('Speech error:', e.error); };
  recognition.onend = function() {
    if (sessionActive && !sessionPaused) {
      try { recognition.start(); } catch(e) {}
    }
  };

  recognition.start();
  startMetricsInterval();
}

function pauseSession() {
  if (!recognition) return;
  if (sessionPaused) {
    // Resume
    sessionPaused = false;
    setSessionState('active');
    try { recognition.start(); } catch(e) {}
  } else {
    // Pause
    sessionPaused = true;
    setSessionState('paused');
    recognition.stop();
  }
}

function stopSession() {
  sessionActive = false;
  sessionPaused = false;
  if (recognition) { recognition.stop(); recognition = null; }
  if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
  setSessionState('idle');
  updateMetrics(true);
}

function processFinalLine(text) {
  if (!text) return;
  lineCount++;
  sessionLines.push(text);
  var words = text.split(/\s+/).filter(Boolean);
  wordCount += words.length;
  totalChars += text.replace(/\s/g,'').length;

  var now = new Date();
  var ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
  var line = document.createElement('div');
  line.className = 'c-line';
  line.innerHTML = '<span class="ts">' + ts + '</span>' + text;
  DOM.transcript.appendChild(line);
  DOM.transcript.scrollTop = DOM.transcript.scrollHeight;

  // POS classification
  classifyLine(text);
}

/* ── POS classification ── */
var knownWords = {};
function classifyLine(text) {
  var words = text.toLowerCase().replace(/[.,!?;:]/g,'').split(/\s+/).filter(Boolean);
  words.forEach(function(w) {
    if (!knownWords[w]) {
      knownWords[w] = { count: 0, pos: guessPOS(w) };
      addVocabChip(w, knownWords[w].pos);
    }
    knownWords[w].count++;
  });
}

function guessPOS(word) {
  if (word.length <= 2) return 'DET';
  if (/^(the|a|an|il|lo|la|i|gli|le|un|uno|una|dei|degli|delle)$/i.test(word)) return 'DET';
  if (/^(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|can|could|shall|should|may|might|must|è|sono|era|erano|ho|hai|ha|abbiamo|avete|hanno|faccio|fai|fa|stato|stata)$/i.test(word)) return 'VERB';
  if (/^(in|on|at|to|for|with|from|by|about|into|through|during|before|after|above|below|between|under|over|di|a|da|in|con|su|per|tra|fra)$/i.test(word)) return 'PREP';
  if (/^(and|or|but|so|yet|for|nor|e|o|ma|che|se|quando|perché|mentre)$/i.test(word)) return 'CONJ';
  if (/^(he|she|it|they|we|you|I|me|him|her|us|them|io|tu|lui|lei|noi|voi|loro|mi|ti|si|ci|vi|lo|la|li|le)$/i.test(word)) return 'PRON';
  if (/ly$/i.test(word) || /mente$/i.test(word)) return 'ADV';
  if (/^(good|bad|big|small|new|old|great|little|high|low|bello|brutto|grande|piccolo|nuovo|vecchio)$/i.test(word)) return 'ADJ';
  return 'NOUN';
}

function addVocabChip(word, pos) {
  DOM.wordbankEmpty.style.display = 'none';
  var chip = document.createElement('span');
  chip.className = 'q-chip tag-' + pos;
  chip.textContent = word;
  chip.style.fontSize = '12px'; chip.style.padding = '4px 10px';
  chip.style.display = 'inline-flex'; chip.style.alignItems = 'center';
  chip.addEventListener('click', function() {
    DOM.wordbankDefWord.textContent = word;
    DOM.wordbankDefText.textContent = pos + ' · usata ' + (knownWords[word] ? knownWords[word].count : 1) + ' volta/e';
    if (window.nlp) {
      var doc = window.nlp(word);
      var w = doc.verbs().toInfinitive().out() || doc.nouns().toSingular().out() || word;
    }
  });
  DOM.vocabChips.appendChild(chip);
}

/* ── Metrics interval ── */
function startMetricsInterval() {
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(updateMetrics, 500);
}

function updateMetrics(final) {
  var elapsed = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  var min = Math.floor(elapsed / 60);
  var sec = elapsed % 60;
  DOM.durationEl.textContent = String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  DOM.wordCountEl.textContent = wordCount;
  DOM.sentencesEl.textContent = lineCount;
  if (elapsed > 0) {
    var wpm = Math.round(wordCount / (elapsed / 60));
    DOM.wpmEl.textContent = wpm || '—';
    var fillerCount = 0;
    var uniqueWords = Object.keys(knownWords).length;
    var lexDiv = wordCount > 0 ? (uniqueWords / wordCount).toFixed(2) : 0;
    DOM.lexDivEl.textContent = lexDiv;
    DOM.fillersPerMin = '—';
  }
  if (final) {
    DOM.statWords.textContent = wordCount;
    DOM.statLines.textContent = lineCount;
    // POS stack
    var posCounts = {};
    Object.values(knownWords).forEach(function(k) { posCounts[k.pos] = (posCounts[k.pos]||0) + 1; });
    DOM.analysisPosStack.innerHTML = '';
    Object.entries(posCounts).sort(function(a,b){ return b[1]-a[1]; }).slice(0,6).forEach(function(e) {
      var s = document.createElement('span');
      s.className = 'q-chip tag-' + e[0];
      s.style.cssText = 'font-size:11px;padding:3px 8px';
      s.textContent = e[0] + ': ' + e[1];
      DOM.analysisPosStack.appendChild(s);
    });
    DOM.analysisSelectedText.textContent = wordCount + ' parole in ' + lineCount + ' frasi. ' + Object.keys(knownWords).length + ' parole uniche.';
  }
}

/* ── Supabase session creation ── */
async function createSupabaseSession() {
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  var r = await sb.auth.getSession();
  if (!r.data?.session) return;
  var userId = r.data.session.user.id;
  var langCode = currentLang === 'en' ? 'en-US' : currentLang === 'it' ? 'it-IT' : currentLang + '-' + currentLang.toUpperCase();
  var roomId = 'caption-' + langCode.replace('-','').toLowerCase() + '-' + Date.now().toString(36);
  var res = await sb.from('sessions').insert({
    user_id: userId,
    room: roomId,
    mode: 'caption-' + (langCode === 'en-US' ? 'en' : langCode.split('-')[0]),
    started_at: new Date().toISOString(),
    language_pair: langCode,
    session_type: 'caption'
  }).select('id').single();
  if (res.data) {
    supabaseSessionId = res.data.id;
    supabaseRoomId = roomId;
    localStorage.setItem('sottotitoli-caption-session', res.data.id);
    localStorage.setItem('sottotitoli-caption-room-id', roomId);
    DOM.capRoomId.textContent = roomId.substring(0, 14) + '…';
    DOM.capRoomLink.textContent = window.location.origin + '/studio-caption.html?join=1&room=' + roomId;
  }
}

/* ── URL params ── */
(function() {
  var params = new URLSearchParams(window.location.search);
  var lang = params.get('lang');
  if (lang) setLang(null, lang);
})();

/* ═══════════════════════════════════════════
   SUPABASE DATA LOADING (on page load)
   ═══════════════════════════════════════════ */
(async function loadSupabaseData() {
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  var r = await sb.auth.getSession();
  if (!r.data?.session) return;
  var userId = r.data.session.user.id;

  // ── Panoramica: session stats ──
  var sRes = await sb.from('sessions').select('id,words_count,started_at,wpm_avg,lexical_diversity').eq('user_id',userId).order('started_at',{ascending:false});
  if (sRes.data && sRes.data.length) {
    var totalWords = sRes.data.reduce(function(s,r){return s+(r.words_count||0)},0);
    var totalSessions = sRes.data.length;
    var avgWpm = sRes.data.reduce(function(s,r){return s+(r.wpm_avg||0)},0)/totalSessions;
    var elWords = document.getElementById('statWords');
    var elLines = document.getElementById('statLines');
    if (elWords) elWords.textContent = totalWords;
    if (elLines) elLines.textContent = totalSessions;
  }

  // ── Vocabolario: saved words ──
  var vRes = await sb.from('user_vocabulary').select('word,pos,usage_count').eq('user_id',userId).order('usage_count',{ascending:false}).limit(50);
  if (vRes.data && vRes.data.length) {
    var emptyEl = document.getElementById('wordbankEmpty');
    if (emptyEl) emptyEl.style.display = 'none';
    var chipsContainer = document.getElementById('vocabChips');
    vRes.data.forEach(function(w) {
      var chip = document.createElement('span');
      chip.className = 'q-chip tag-' + (w.pos||'NOUN');
      chip.style.cssText = 'font-size:12px;padding:4px 10px;display:inline-flex;align-items:center';
      chip.textContent = w.word;
      chip.addEventListener('click', function() {
        var defWord = document.getElementById('wordbankDefWord');
        var defText = document.getElementById('wordbankDefText');
        if (defWord) defWord.textContent = w.word;
        if (defText) defText.textContent = (w.pos||'') + ' · usata ' + (w.usage_count||0) + ' volta/e';
      });
      if (chipsContainer) chipsContainer.appendChild(chip);
    });
  }

  // ── POS: distribution ──
  if (vRes.data && vRes.data.length) {
    var posCounts = {};
    vRes.data.forEach(function(w) { posCounts[w.pos||'OTHER'] = (posCounts[w.pos||'OTHER']||0)+(w.usage_count||1); });
    var total = Object.values(posCounts).reduce(function(a,b){return a+b},0);
    var posMap = {NOUN:'posNouns',VERB:'posVerbs',ADJ:'posAdjectives',ADV:'posAdverbs'};
    Object.entries(posMap).forEach(function(e) {
      var el = document.getElementById(e[1]);
      if (el) el.textContent = posCounts[e[0]] ? Math.round(posCounts[e[0]]/total*100)+'%' : '—';
    });
    var posStack = document.getElementById('posDistStack');
    if (posStack) {
      posStack.innerHTML = '';
      Object.entries(posCounts).sort(function(a,b){return b[1]-a[1]}).slice(0,8).forEach(function(e) {
        var s = document.createElement('span');
        s.className = 'q-chip tag-' + e[0];
        s.style.cssText = 'font-size:12px;padding:4px 10px';
        s.textContent = e[0] + ': ' + Math.round(e[1]/total*100) + '%';
        posStack.appendChild(s);
      });
    }
  }

  // ── Condividi: restore stored room/session ──
  var storedRoom = localStorage.getItem('sottotitoli-caption-room-id');
  if (storedRoom) {
    var rid = document.getElementById('capRoomId');
    var rlink = document.getElementById('capRoomLink');
    if (rid) rid.textContent = storedRoom.substring(0,14)+'…';
    if (rlink) rlink.textContent = window.location.origin + '/studio-caption.html?join=1&room=' + storedRoom;
  }
})();
