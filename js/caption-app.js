/* extracted verbatim from caption-s8t.html so it can be loaded
   with defer: a classic external script keeps every top-level
   declaration global, so the inline onclick handlers still resolve,
   and document order is preserved. */


/* Translate a JS-injected string. This page builds its toasts and its button feedback
   in JS, and had hardcoded BOTH an Italian toast ('✓ Sessione salvata') and English
   button feedback ('✓ Saved') -- so each was wrong in one of the two languages.
   Falls back to the Italian source if a key is missing, rather than showing a raw
   key name to the user. */
function S8T(key, fallback) {
  try {
    var v = window.I18n && window.I18n.t ? window.I18n.t(key) : null;
    return (v && v !== key) ? v : fallback;
  } catch (e) { return fallback; }
}

// ═══ Read URL params (from calling page) ═══
(function() {

  // ── Override updateMicUI to use transport bar mic ──
  // ⚠️ `label` MUST be forwarded to both the local write and _origUpdateMicUI. This wrapper
  // originally took only (state) and dropped any second argument, so a caller that passed a
  // truthful label had it silently replaced by the generic one on the way through — the
  // computer-audio source asked for "Audio PC" and the transport bar said "Mic Live" instead.
  var _origUpdateMicUI = window.updateMicUI;
  var _overrideState = null;
  window.updateMicUI = function(state, label) {
    if (_overrideState) state = _overrideState;
    _realMic.state = state;
    var micIcon = document.getElementById('micIcon');
    var micStatus = document.getElementById('micStatus');
    if (micIcon) {
      micIcon.classList.remove('live','warn','idle','blocked');
      if (state === 'live') micIcon.classList.add('live');
      else if (state === 'paused') micIcon.classList.add('warn');
      else if (state === 'requesting') micIcon.classList.add('warn');
      else if (state === 'blocked' || state === 'error') micIcon.classList.add('blocked');
      else micIcon.classList.add('idle');
    }
    if (micStatus) {
      if (label) micStatus.textContent = label;
      else if (state === 'live') micStatus.textContent = 'Live';
      else if (state === 'paused') micStatus.textContent = 'Paused';
      else if (state === 'requesting') micStatus.textContent = 'Conn.';
      else if (state === 'blocked') micStatus.textContent = 'Blocked';
      else if (state === 'error') micStatus.textContent = 'Error';
      else micStatus.textContent = 'Offline';
    }
    if (typeof _origUpdateMicUI === 'function') _origUpdateMicUI(state, label);
  };
  // Expose pause override
  window._setMicOverride = function(s) { _overrideState = s; if (s) updateMicUI(s); };
  var style = document.createElement('style');
  style.textContent = '.status-dot.paused{background:#fbbf24;box-shadow:0 0 6px #fbbf24}';
  document.head.appendChild(style);
})();

// ═══ Read URL params (from calling page) ═══
(function() {
  var params = new URLSearchParams(window.location.search);
  var langParam = params.get('lang');
  var modeParam = params.get('mode');
  var tgtParam = params.get('tgt');
  // Save target language from URL (panoramica translate link)
  if (tgtParam) {
    localStorage.setItem('sottotitoli-translate-target', tgtParam);
  }
  if (langParam) {
    var code = langParam.split('-')[0];
    if (code === 'en') code = 'en-US';
    else code = code + '-' + code.toUpperCase();
    var names = {'en-US':'English','it-IT':'Italiano','fr-FR':'Français','de-DE':'Deutsch','es-ES':'Español','pt-PT':'Português','nl-NL':'Nederlands','pl-PL':'Polski'};
    setTimeout(function() { setCaptionLanguage(code, names[code] || 'English', true); }, 200);
  }
  // Translate mode: don't pass to setCaptionMode (it's not a caption style)
  if (modeParam === 'translate') {
    setTimeout(function(){ applyTranslateModeUI(); }, 250);
  } else if (modeParam && modeParam !== 'undefined' && modeParam !== 'null') {
    setTimeout(function() { setCaptionMode(modeParam); }, 300);
  }
  // Ensure extras bar reflects language capabilities on load
  setTimeout(function() { refreshExtrasBarForLanguage(); }, 400);
})();

// ── Apply translate mode UI (shared between URL init and v20q init) ──
function applyTranslateModeUI(){
  if (typeof v20q !== 'undefined') v20q.translateOn = true;
  var capBtn = document.getElementById('topCapBtn');
  var trBtn = document.getElementById('topTrBtn');
  var trFlag = document.getElementById('topTrFlag');
  var leftExp = document.getElementById('leftExpander');
  var rightExp = document.getElementById('rightExpander');
  var srcFlag = document.getElementById('topSrcFlag');
  if (capBtn) capBtn.classList.remove('active');
  if (trBtn) trBtn.classList.add('active');
  // Only show right flag + source flag, hide left
  if (leftExp) leftExp.style.display = 'none';
  if (rightExp) { rightExp.style.display = ''; rightExp.style.opacity = '1'; rightExp.style.pointerEvents = 'auto'; }
  if (trFlag) trFlag.style.display = '';
  if (srcFlag) srcFlag.style.display = '';
  if (typeof v20q_renderTranslations === 'function') v20q_renderTranslations();
  if (typeof refreshFlagRows === 'function') refreshFlagRows();
  // Ensure placeholder matches source language
  var srcLang = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
  if (typeof updateCaptionPlaceholders === 'function') updateCaptionPlaceholders(srcLang);
  // Hide all slides except transcript — translate mode is single-panel
  ['vocabPanel','grammarPanel','grammarCorrectPanel'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  // Hide slide navigation dots and title overlay
  var dots = document.getElementById('slideDots'); if (dots) dots.style.display = 'none';
  var title = document.getElementById('slideTitleOverlay'); if (title) title.style.display = 'none';

}

// ── Apply caption mode UI ──
function applyCaptionModeUI(){
  if (typeof v20q !== 'undefined') v20q.translateOn = false;
  var capBtn = document.getElementById('topCapBtn');
  var trBtn = document.getElementById('topTrBtn');
  var trFlag = document.getElementById('topTrFlag');
  var leftExp = document.getElementById('leftExpander');
  var rightExp = document.getElementById('rightExpander');
  if (capBtn) capBtn.classList.add('active');
  if (trBtn) trBtn.classList.remove('active');
  // Only show left flag, hide right + source flag
  if (leftExp) leftExp.style.display = '';
  if (rightExp) rightExp.style.display = 'none';
  if (trFlag) trFlag.style.display = 'none';
  var srcFlag = document.getElementById('topSrcFlag');
  if (srcFlag) srcFlag.style.display = 'none';
  if (typeof refreshFlagRows === 'function') refreshFlagRows();
  // Ensure placeholder matches source language
  var srcLang = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
  if (typeof updateCaptionPlaceholders === 'function') updateCaptionPlaceholders(srcLang);
  // Restore slides hidden by translate mode
  ['vocabPanel','grammarPanel','grammarCorrectPanel'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.style.display = '';
  });
  // Restore slide navigation dots and title overlay
  var dots = document.getElementById('slideDots'); if (dots) dots.style.display = 'flex';
  var title = document.getElementById('slideTitleOverlay'); if (title) title.style.display = '';

}

// ═══ Caption Language Dropdown ═══
var currentCaptionLang = 'en-US';
var currentCaptionLangName = 'English';

// ═══ Language Capability Gating (Phase 1 — honest feature matrix) ═══
// Maps language code prefix → available features. English = full, Tiers 2-4 graduated.
var LANGUAGE_CAPABILITIES = {
  en: { translation:true, aiReports:true, pos:true, grammar:true, synonyms:true, definitions:true, cefrMetrics:true },
  it: { translation:true, aiReports:true, pos:true, grammar:false, synonyms:true, definitions:false, cefrMetrics:true },
  nl: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false },
  es: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false },
  fr: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false },
  de: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false },
  pt: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false },
  pl: { translation:true, aiReports:true, pos:false, grammar:false, synonyms:false, definitions:false, cefrMetrics:false }
};

function getLangPrefix() {
  return (currentCaptionLang || 'en-US').split('-')[0];
}

function isCapabilityAvailable(feature) {
  var cap = LANGUAGE_CAPABILITIES[getLangPrefix()] || LANGUAGE_CAPABILITIES['en'];
  return cap[feature] === true;
}

// Refresh extras bar buttons based on current language capabilities
function refreshExtrasBarForLanguage() {
  var bar = document.getElementById('extrasToggleBar');
  if (!bar) return;
  var hasGrammar = isCapabilityAvailable('grammar');
  var hasSynonyms = isCapabilityAvailable('synonyms');

  // Grammar: English + Italian only
  var gramBtn = bar.querySelector('[data-panel="grammar"]');
  if (gramBtn) {
    gramBtn.style.display = hasGrammar ? '' : 'none';
  }

  // Synonyms: English + Italian only
  var synBtn = bar.querySelector('[data-panel="synonyms"]');
  if (synBtn) {
    synBtn.style.display = hasSynonyms ? '' : 'none';
  }

  // Word Bank: always shown for all languages
}

// ═══ Speaker Mode — color-codes transcript lines ═══
var speakerCount = 1; // 1-6 or 'auto'
var speakerColors = ['#5b7fc1','#c1665b','#5b9c6e','#c084fc','#fbbf24','#f472b6'];
var _speakerIdx = 0;

function setSpeakerCount(val) {
  speakerCount = val === 'auto' ? 'auto' : parseInt(val);
  // Recolor existing transcript lines
  recolorTranscriptLines();
  localStorage.setItem('sottotitoli-speaker-count', val);
}

// ═══ Pause sensitivity — controls force-finalize timer ═══
function setPauseSensitivity(val) {
  var ms = parseInt(val) || 0;
  if (typeof setForceFinalizeMs === 'function') setForceFinalizeMs(ms);
  localStorage.setItem('sottotitoli-pause-sensitivity', val);
}
(function(){
  var saved = localStorage.getItem('sottotitoli-pause-sensitivity') || '0';
  var sel = document.getElementById('pauseSensitivity');
  if (sel) sel.value = saved;
  if (typeof setForceFinalizeMs === 'function') setForceFinalizeMs(parseInt(saved) || 0);
})();

// Restore saved speaker count
(function(){
  var saved = localStorage.getItem('sottotitoli-speaker-count');
  if (saved) {
    speakerCount = saved === 'auto' ? 'auto' : parseInt(saved);
  }
})();

// Assign speaker to a line based on heuristics and current speaker index
function assignSpeaker(lineText) {
  if (speakerCount === 1) return -1; // single speaker — no coloring
  var maxSpk = speakerCount === 'auto' ? 6 : speakerCount;
  // Speaker change signals
  var changeSignal = /^(yes|no|okay|right|exactly|sure|thanks|thank|sorry|well|so|but|and|or|because|oh|wow|hey|hi|hello|good|great|nice|interesting|absolutely|definitely|actually|however|anyway|look|listen|wait|hold|hmm|ok|alright|yeah|nope|what|who|where|when|why|how|really|maybe|perhaps)/i.test(lineText.trim());
  if (changeSignal) _speakerIdx = (_speakerIdx + 1) % maxSpk;
  return _speakerIdx;
}

// Re-color existing transcript lines based on speaker assignment
function recolorTranscriptLines() {
  var lines = document.querySelectorAll('#captionTranscript .line');
  if (speakerCount === 1) {
    lines.forEach(function(l){ l.style.borderLeft = ''; });
    return;
  }
  // Re-assign speakers to all lines
  _speakerIdx = 0;
  var prevSpeaker = 0;
  lines.forEach(function(line, i){
    var text = line.textContent.replace(/^\d{2}:\d{2}:\d{2}\s*/,'');
    var spk = assignSpeaker(text);
    var color = speakerColors[spk];
    line.style.borderLeft = '3px solid ' + color;
    line.style.paddingLeft = '8px';
  });
}

// Language buttons in topbar — no dropdown needed
function setCaptionLanguage(code, name, skipConfirm) {
  // If changing language while a room is active, confirm first
  if (!skipConfirm && currentCaptionLang && code !== currentCaptionLang) {
    var langNames = {'en-US':'English','it-IT':'Italiano','fr-FR':'Français','de-DE':'Deutsch','es-ES':'Español','pt-PT':'Português','nl-NL':'Nederlands','pl-PL':'Polski'};
    var newName = langNames[code] || code;
    var oldName = langNames[currentCaptionLang] || currentCaptionLang;
    var lang = localStorage.getItem('sottotitoli-lang') || 'en';
    var title = lang === 'it' ? 'Nuova stanza' : 'New Room';
    var msg = lang === 'it'
      ? 'Aprire una nuova stanza in ' + newName + '? La stanza corrente in ' + oldName + ' sarà sostituita.'
      : 'Open a new room in ' + newName + '? Your current ' + oldName + ' room will be replaced.';
    var btn = lang === 'it' ? 'Apri' : 'Open';
    showConfirmModal(title, msg, btn, function() {
      currentCaptionLang = code;
      localStorage.setItem('sottotitoli-caption-lang', code);
      var isTr = (typeof v20q !== 'undefined' && v20q.translateOn) || (window.location.search.indexOf('mode=translate') !== -1);
      var mode = isTr ? '&mode=translate&tgt='+(localStorage.getItem('sottotitoli-translate-target')||'it') : '';
      window.location.href = window.location.pathname + '?lang=' + code + mode;
    });
    // Revert button active state to current language
    document.querySelectorAll('.tgt-btn[data-clang]').forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-clang') === currentCaptionLang);
    });
    return;
  }
  currentCaptionLang = code;
  currentCaptionLangName = name;
  window._currentCaptionLang = code; // expose for translation providers
  // Clear previous transcript and interim when switching languages
  var transcriptEl = document.getElementById('captionTranscript');
  if (transcriptEl) transcriptEl.innerHTML = '';
  var interimEl = document.getElementById('captionInterim');
  if (interimEl) interimEl.textContent = '';
  // Clear extras panel (grammar/synonyms/analysis)
  var extrasPanel = document.getElementById('extrasPanel');
  if (extrasPanel) extrasPanel.innerHTML = '';
  // Update topbar buttons
  document.querySelectorAll('.tgt-btn[data-clang]').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-clang') === code);
  });
  // Update placeholder text to selected language
  updateCaptionPlaceholders(code);
  // Update speech recognition language
  if (_realMic) {
    _realMic.lang = code;
    if (_realMic.recognition) {
      _realMic.recognition.lang = code;
    }
  }
  localStorage.setItem('sottotitoli-caption-lang', code);
  // Update URL — preserve translate mode and join params
  var isTr = (typeof v20q !== 'undefined' && v20q.translateOn) || (window.location.search.indexOf('mode=translate') !== -1);
  var modeParam;
  if (isTr) {
    var tgt = localStorage.getItem('sottotitoli-translate-target') || 'it';
    modeParam = 'translate&tgt=' + tgt;
  } else {
    modeParam = currentCaptionMode || 'j7b';
  }
  var newUrl = window.location.pathname + '?lang=' + code + '&mode=' + modeParam;
  var params = new URLSearchParams(window.location.search);
  if (params.get('join')) newUrl += '&join=' + params.get('join') + '&room=' + (params.get('room')||'') + '&host=' + encodeURIComponent(params.get('host')||'');
  window.history.replaceState({}, '', newUrl);
  // Refresh extras bar for language capabilities
  refreshExtrasBarForLanguage();
  // If an unsupported panel is open, close it
  if (window._getActivePanel && window._getActivePanel() === 'grammar' && !isCapabilityAvailable('grammar')) toggleExtrasPanel('grammar');
  if (window._getActivePanel && window._getActivePanel() === 'synonyms' && !isCapabilityAvailable('synonyms')) toggleExtrasPanel('synonyms');
}
// Language buttons handle their own state
// Language-specific placeholder texts for empty states
var PLACEHOLDER_TEXTS = {
  'en-US': { interim: 'Speak to see subtitles…', transcript: 'Previous sentences will appear here…' },
  'it-IT': { interim: 'Parla per vedere i sottotitoli…', transcript: 'Le frasi precedenti appariranno qui…' },
  'fr-FR': { interim: 'Parlez pour voir les sous-titres…', transcript: 'Les phrases précédentes apparaîtront ici…' },
  'de-DE': { interim: 'Sprechen Sie, um Untertitel zu sehen…', transcript: 'Vorherige Sätze erscheinen hier…' },
  'es-ES': { interim: 'Habla para ver los subtítulos…', transcript: 'Las frases anteriores aparecerán aquí…' },
  'pt-PT': { interim: 'Fale para ver as legendas…', transcript: 'As frases anteriores aparecerão aqui…' },
  'nl-NL': { interim: 'Spreek om ondertiteling te zien…', transcript: 'Eerdere zinnen verschijnen hier…' },
  'pl-PL': { interim: 'Mów, aby zobaczyć napisy…', transcript: 'Poprzednie zdania pojawią się tutaj…' }
};

function updateCaptionPlaceholders(langCode) {
  var placeholders = PLACEHOLDER_TEXTS[langCode] || PLACEHOLDER_TEXTS['en-US'];
  var interim = document.getElementById('captionInterim');
  var transcript = document.getElementById('captionTranscript');
  if (interim) {
    if (!interim.textContent.trim()) interim.textContent = '';
    interim.setAttribute('data-placeholder', placeholders.interim);
  }
  if (transcript) {
    transcript.setAttribute('data-placeholder', placeholders.transcript);
  }
}



// ═══ Caption room creation ═══
function _createCaptionRoom(langCode) {
  var sb = window.sottotitoliSupabase;
  if (!sb) { console.warn('⚠ _createCaptionRoom: no Supabase client'); return; }
  sb.auth.getSession().then(function(r) {
    if (!r.data?.session) { console.warn('⚠ _createCaptionRoom: no session — not logged in'); return; }
    var userId = r.data.session.user.id;
    var roomId = 'caption-' + langCode.replace('-','').toLowerCase() + '-' + Date.now().toString(36);
    sb.from('sessions').insert({
      user_id: userId,
      room: roomId,
      mode: 'caption-' + (langCode === 'en-US' ? 'en' : langCode.split('-')[0]),
      started_at: new Date().toISOString(),
      language_pair: langCode,
      session_type: 'caption'
    }).select('id').single().then(function(res) {
      if (res.error) { console.error('Session create failed:', res.error.message); return; }
      if (res.data) {
        console.log('📝 Session created:', res.data.id);
        localStorage.setItem('sottotitoli-caption-session', res.data.id);
        localStorage.setItem('sottotitoli-caption-room-id', roomId);
        var el = document.getElementById('capRoomId');
        if (el) el.textContent = roomId.substring(0, 16) + '…';
        var linkEl = document.getElementById('capRoomLink');
        if (linkEl) {
          var shareUrl = window.location.origin + window.location.pathname + '?lang=' + langCode + '&mode=' + (currentCaptionMode || 'j7b') + '&room=' + roomId;
          linkEl.innerHTML = '<a href="' + shareUrl + '" style="color:var(--accent);font-size:12px" onclick="if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(this.href).catch(function(){});return false">📋 copy</a>';
        }
      }
    });
  });
}


// Restore saved lang (only if no URL param overrides it)
(function() {
  var params = new URLSearchParams(window.location.search);
  var urlLang = params.get('lang');
  var saved = urlLang || localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
  // Parse language code from URL param if present
  if (urlLang) {
    var code = urlLang.split('-')[0];
    if (code === 'en') saved = 'en-US';
    else saved = code + '-' + code.toUpperCase();
    // Save the URL preference
    localStorage.setItem('sottotitoli-caption-lang', saved);
  }
  var names = {'en-US':'English','it-IT':'Italiano','fr-FR':'Français','de-DE':'Deutsch','es-ES':'Español','pt-PT':'Português','nl-NL':'Nederlands'};
  setCaptionLanguage(saved, names[saved] || 'English', true);
  // Update placeholders after language is set
  setTimeout(function() { updateCaptionPlaceholders(saved); }, 100);
  // Restore room ID display
  var savedRoom = localStorage.getItem('sottotitoli-caption-room-id');
  if (savedRoom) {
    var el = document.getElementById('capRoomId');
    if (el) el.textContent = savedRoom.substring(0, 16) + '…';
  }
})();


// ═══ Caption language samples ═══
// ═══ Session saved notification ═══
var _sessionSavedShown = false;
function showSessionSaved(durationSeconds) {
  console.log('🔔 showSessionSaved called. duration=', durationSeconds, '_sessionSavedShown=', _sessionSavedShown);
  if (_sessionSavedShown) return;
  _sessionSavedShown = true;
  var durText = '';
  if (durationSeconds && durationSeconds > 0) {
    durText = durationSeconds < 60 ? ' · ' + durationSeconds + 's' : ' · ' + Math.floor(durationSeconds / 60) + 'm';
  }
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 18px;border-radius:100px;background:var(--accent);color:#fff;font-weight:700;font-size:12px;z-index:99999;animation:toastIn .3s ease,toastOut .3s ease 2.5s forwards;pointer-events:none';
  toast.textContent = S8T('toast_session_saved', '✓ Sessione salvata') + durText;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.remove(); _sessionSavedShown = false; }, 3000);

  // Trigger session rewards edge function
  var sb = window.sottotitoliSupabase;
  if (sb) {
    sb.auth.getSession().then(function(res) {
      var user = res?.data?.session?.user;
      if (!user) return;
      var sessionId = window._lastSessionId;
      fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/session-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + res.data.session.access_token
        },
        body: JSON.stringify({ user_id: user.id, session_id: sessionId })
      }).catch(function() { /* silent */ });
    }).catch(function() { /* silent */ });
  }
}

// ── Post-session overlay ──
var _pspTimer = null;
function showPostSessionPanel(wordCount) {
  var panel = document.getElementById('postSessionOverlay');
  var wc = document.getElementById('pspWordCount');
  if (wc) wc.textContent = wordCount ? wordCount + ' parole trascritte' : '';
  if (panel) {
    panel.style.display = 'flex';
    // Auto-dismiss after 10 seconds
    clearTimeout(_pspTimer);
    _pspTimer = setTimeout(function() { panel.style.display = 'none'; }, 10000);
  }
}

async function generateQuickSnapshot() {
  var supabase = window.sottotitoliSupabase;
  if (!supabase) return;
  var r = await supabase.auth.getSession();
  if (!r.data || !r.data.session) { window.location.href = 'panoramica.html'; return; }
  var today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('sottotitoli_last_snapshot_date') === today) {
    showAlertModal('Snapshot gratuito', 'Hai già generato lo Snapshot gratuito oggi. Riprova domani!');
    return;
  }
  var sid = localStorage.getItem('sottotitoli-caption-session');
  if (!sid) { window.location.href = 'panoramica.html'; return; }
  var uid = r.data.session.user.id;
  await supabase.from('session_ai_reports').insert({
    user_id: uid,
    module_id: 0,
    session_id: sid,
    status: 'processing'
  });
  if (XP && XP.award) XP.award('ai_report');
  localStorage.setItem('sottotitoli_last_snapshot_date', today);
  document.getElementById('postSessionOverlay').style.display = 'none';
  showToastMsg('⚡ Snapshot in elaborazione. Controlla I miei report tra qualche minuto.');
}

function showToastMsg(msg) {
  if (typeof window.showToast === 'function') { window.showToast(msg); return; }
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#131316;color:#fff;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:600;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,.4);white-space:nowrap';
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 4000);
}

// ── Live word count in toolbar ──
function updateWordCount(text) {
  var count = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  var el = document.getElementById('liveWordCount');
  if (el) el.textContent = count + ' parole';
  window.currentWordCount = count;
}

// ── Studio profile nudge ──
(async function checkStudioProfileNudge(){
  var supabase = window.sottotitoliSupabase;
  if (!supabase) return;
  var r = await supabase.auth.getSession();
  if (!r.data || !r.data.session) return;
  var uid = r.data.session.user.id;
  var prof = await supabase.from('profiles').select('goal_primary').eq('id', uid).maybeSingle();
  var incomplete = !prof.data || !prof.data.goal_primary;
  var nudge = document.getElementById('studioProfileNudge');
  if (nudge) nudge.style.display = incomplete ? 'block' : 'none';
})();


// ═══ User info from auth ═══
// hamburger.js handles all user greeting/avatar/credits via sottotitoli-user-ready event

// ═══ Mode switching ═══
var currentCaptionMode = 'i1';

function setCaptionMode(mode) {
  currentCaptionMode = mode;
  document.documentElement.setAttribute('data-caption-mode', mode);
  document.querySelectorAll('.mode-toggle-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-mode') === mode);
  });
  // mode badge removed — using change layout label
  localStorage.setItem('sottotitoli-caption-mode', mode);
  // Update URL — preserve join params if present
  var newUrl = window.location.pathname + '?lang=' + currentCaptionLang + '&mode=' + mode;
  var params2 = new URLSearchParams(window.location.search);
  if (params2.get('join')) newUrl += '&join=' + params2.get('join') + '&room=' + (params2.get('room')||'') + '&host=' + encodeURIComponent(params2.get('host')||'');
  window.history.replaceState({}, '', newUrl);
}

// ═══ Rec bar toggle ═══
function toggleRecBar() {
  var wrap = document.getElementById('topbarRecWrap');
  var btn = document.querySelector('.rec-toggle');
  if (!wrap || !btn) return;
  var isOpen = !wrap.classList.contains('collapsed');
  if (isOpen) { wrap.classList.add('collapsed'); document.body.classList.add('rec-collapsed'); btn.classList.remove('open'); btn.innerHTML = '▸ MENU'; }
  else { wrap.classList.remove('collapsed'); document.body.classList.remove('rec-collapsed'); btn.classList.add('open'); btn.innerHTML = '▾ MENU'; }
}

// Right panel: Metrics ↔ SYN (mutually exclusive)
var _rightMode = null;
function toggleRight(mode) {
  var app = document.getElementById('appMain');
  var metBtn = document.getElementById('metricsToggleBtn');
  var synBtn = document.getElementById('synToggleBtn');
  var metContent = document.getElementById('metricsContent');
  var synContent = document.getElementById('synContent');
  var title = document.getElementById('rightPanelTitle');
  if (!app) return;

  if (_rightMode === mode) {
    app.classList.remove('right-open');
    if (metBtn) metBtn.classList.remove('panel-active');
    if (synBtn) synBtn.classList.remove('panel-active');
    if (metContent) metContent.classList.remove('active');
    if (synContent) synContent.classList.remove('active');
    _rightMode = null;
    return;
  }
  _rightMode = mode;
  app.classList.add('right-open');
  if (mode === 'metrics') {
    if (metBtn) metBtn.classList.add('panel-active');
    if (synBtn) synBtn.classList.remove('panel-active');
    if (metContent) metContent.classList.add('active');
    if (synContent) synContent.classList.remove('active');
    if (title) title.textContent = '📊 Metrics';
  } else {
    if (synBtn) synBtn.classList.add('panel-active');
    if (metBtn) metBtn.classList.remove('panel-active');
    if (synContent) synContent.classList.add('active');
    if (metContent) metContent.classList.remove('active');
    if (title) title.textContent = '📖 SYN';
    var words = document.querySelectorAll('#synWords .syn-word');
    var count = document.getElementById('rightPanelCount');
    if (count) count.textContent = words.length;
  }
}

// Click a transcript line → load SYN
function selectLine(lineIdx, el) {
  document.querySelectorAll('.caption-transcript .line').forEach(function(l){l.classList.remove('selected')});
  el.classList.add('selected');
  // Open SYN in right panel
  if (_rightMode !== 'syn') toggleRight('syn');
  // Extract text
  var clone = el.cloneNode(true);
  var tsSpan = clone.querySelector('span');
  if (tsSpan) tsSpan.remove();
  var spkTag = clone.querySelector('.spk-tag');
  var spkName = spkTag ? spkTag.textContent : '';
  var spkColor = spkTag ? (spkTag.style.color || '#5b7fc1') : '#5b7fc1';
  if (spkTag) spkTag.remove();
  var text = (clone.textContent || '').trim();
  var tsText = el.querySelector('span') ? el.querySelector('span').textContent : '';
  // Update right panel preview
  var preview = document.getElementById('synLinePreview');
  if (preview) {
    var labelHtml = spkName ? '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:' + spkColor + ';display:block;margin-bottom:4px;font-style:normal">' + spkName + ' · ' + tsText + '</span>' : '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--accent);display:block;margin-bottom:4px;font-style:normal">' + tsText + '</span>';
    preview.innerHTML = labelHtml + text;
  }
  _buildSynCards(text, spkName, spkColor, tsText);
  var body = document.querySelector('.right-panel-body');
  if (body) body.scrollTop = 0;
}

// Make transcript lines clickable if SYN is open
function _ensureLinesClickable() {
  var lines = document.querySelectorAll('#captionTranscript .line');
  lines.forEach(function(l) {
    if (!l.classList.contains('clickable')) {
      l.classList.add('clickable');
      l.addEventListener('click', function() { selectLine(0, l); });
    }
  });
}

// ── Local dictionaries: NGSL (en) + KELLY/it-lexicon (it). ──

// ── HTML escape utility (shared across all word-definition renders) ──
function _esc(str) {
  var d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Card state helper: skeleton → loaded / error ──
function _updateCardState(cardId, state, detail) {
  var card = document.getElementById(cardId);
  if (!card) return;
  card.classList.remove('skeleton');
  if (state === 'loaded') {
    card.classList.add('loaded');
    // Fallback for empty synonym area
    var relEl = card.querySelector('.syn-rel');
    if (relEl && !relEl.textContent.trim()) {
      relEl.innerHTML = '<span style="font-size:11px;color:var(--muted2);font-style:italic">No synonyms</span>';
    }
  }
  if (state === 'error') { card.classList.add('wc-error'); if (detail) { var defEl = card.querySelector('.syn-def'); if (defEl) defEl.textContent = detail; } }
}

// ── Fetch all data for a word: NGSL → Cache → Datamuse → Free Dictionary ──
function _fetchWordData(word, cardId) {
  var card = document.getElementById(cardId);
  if (!card) return;

  // L1: Local NGSL dictionary (0ms, 2,809 most frequent words)
  var defLower = word.toLowerCase();
  var ngEntry = (window.EN_NGSL || {})[defLower];
  if (ngEntry && ngEntry[3]) {
    var defEl = card.querySelector('.syn-def');
    var posEl = card.querySelector('.syn-pos-tag');
    var ngPosMap = { v:'VERB', n:'NOUN', adj:'ADJ', adv:'ADV' };
    var posLabel = ngPosMap[ngEntry[1]] || '';
    if (defEl) defEl.textContent = ngEntry[3];
    if (posEl && posLabel) posEl.textContent = posLabel;
    _updateCardState(cardId, 'loaded');
    _cacheSet(defLower, { def: ngEntry[3], pos: posLabel });
    return;
  }

  // L2: Check in-memory cache (0ms)
  var cached = _cacheGet(defLower);
  if (cached) {
    var defEl2 = card.querySelector('.syn-def');
    var posEl2 = card.querySelector('.syn-pos-tag');
    if (defEl2) defEl2.textContent = cached.def || cached.definition || '';
    if (posEl2 && cached.pos) posEl2.textContent = cached.pos;
    _updateCardState(cardId, 'loaded');
    // Re-render synonyms from cache if available
    if (cached.synonyms && cached.synonyms.length) {
      var relEl = card.querySelector('.syn-rel');
      if (relEl) {
        relEl.innerHTML = cached.synonyms.map(function(s) {
          return '<span onclick="lookupSynonym(this)" data-word="' + _esc(s) + '" data-context="' + _esc(word) + '" style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 10px;border-radius:100px;border:1px solid rgba(52,211,153,.2);color:#34d399;background:rgba(52,211,153,.06);margin:2px">' + _esc(s) + '</span>';
        }).join('');
      }
    }
    return;
  }

  // L3: Network fetch
  var defEl = card.querySelector('.syn-def');
  var relEl = card.querySelector('.syn-rel');
  var posEl = card.querySelector('.syn-pos-tag');

  S8T_LANG.resolve(S8T_LANG.readRoomConfig()).then(function(ls) {
    if (ls.content_language !== 'en') {
      _fetchWordViaLLM(word, cardId, ls);
      return;
    }
    _fetchWordEnglish(word, cardId, defEl, relEl, posEl);
  }).catch(function(err) {
    console.error('[WordData] Language resolver failed:', err);
    _updateCardState(cardId, 'error', 'Could not load language settings. Try refreshing.');
  });
}

// ── Non-English: vocab-lookup edge function ──
function _fetchWordViaLLM(word, cardId, langSettings) {
  var card = document.getElementById(cardId);
  if (!card) return;
  var defEl = card.querySelector('.syn-def');
  var relEl = card.querySelector('.syn-rel');
  var posEl = card.querySelector('.syn-pos-tag');
  var sb = window.sottotitoliSupabase;
  if (!sb) { _updateCardState(cardId, 'error', 'Sign in required for definitions.'); return; }

  sb.functions.invoke('vocab-lookup', {
    body: { language: langSettings.content_language, explanation_language: langSettings.explanation_language, text: word, model: langSettings.model }
  }).then(function(res) {
    if (res.error || !res.data || !res.data.entry) {
      _updateCardState(cardId, 'error', 'No definition found for "' + word + '".');
      return;
    }
    var entry = res.data.entry;
    if (defEl) { defEl.textContent = entry.definition || 'No definition found.'; _addTTSButton(defEl, entry.definition, langSettings.content_language); }
    if (posEl) posEl.textContent = entry.pos || '—';
    if (relEl && entry.synonyms && entry.synonyms.length) {
      relEl.innerHTML = entry.synonyms.map(function(s) {
        return '<span onclick="lookupSynonym(this)" data-word="' + _esc(s) + '" data-context="' + _esc(word) + '" style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 10px;border-radius:100px;border:1px solid rgba(52,211,153,.2);color:#34d399;background:rgba(52,211,153,.06);margin:2px">' + _esc(s) + '</span>';
      }).join('');
    }
    _updateCardState(cardId, 'loaded');
    // Cache the result
    _cacheSet(word.toLowerCase(), { def: entry.definition, pos: entry.pos, synonyms: entry.synonyms || [] });
    // Add speaker icon to word
    var wordEl = card.querySelector('.wc-word');
    _addTTSButton(wordEl, word, langSettings.content_language);
  }).catch(function(err) {
    _updateCardState(cardId, 'error', 'Error loading definition. Try again.');
    console.error('[WordData] vocab-lookup failed:', err);
  });
}

// ── TTS speaker button helper ──
function _addTTSButton(el, text, lang) {
  if (!el || !text || !window.SpeechIcons) return;
  // Only for English and Italian
  var base = (lang || 'en').split('-')[0].toLowerCase();
  if (base !== 'en' && base !== 'it') return;
  // Don't double-add
  if (el.querySelector('.speech-icon-btn')) return;
  var btn = window.SpeechIcons.createSpeakerButton(text, lang);
  el.appendChild(btn);
}

// ── English: NGSL (local) → Datamuse → Free Dictionary path ──
function _fetchWordEnglish(word, cardId, defEl, relEl, posEl) {
  // 1. Local NGSL first — instant, curated (def + POS), zero network
  var ng = (window.EN_NGSL || {})[word.toLowerCase()];
  if (ng && ng[3]) {
    var ngPosMap = { v:'VERB', n:'NOUN', adj:'ADJ', adv:'ADV' };
    var ngPosLabel = ngPosMap[ng[1]] || '';
    if (defEl) { defEl.textContent = ng[3]; _addTTSButton(defEl, ng[3], 'en'); }
    if (posEl && ngPosLabel) posEl.textContent = ngPosLabel;
    _updateCardState(cardId, 'loaded');
    _cacheSet(word.toLowerCase(), { def: ng[3], pos: ngPosLabel });
    _fetchDatamusePills(word, cardId, ngPosLabel);
    var card0 = document.getElementById(cardId);
    if (card0) { var wEl0 = card0.querySelector('.wc-word') || card0.querySelector('.syn-base-word'); _addTTSButton(wEl0, word, 'en'); }
    return;
  }
  // 2. Try Datamuse (definitions — fast, free, no auth)
  var dmUrl = 'https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&md=d&max=1';
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dmUrl, true);
    xhr.timeout = 4000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data && data.length > 0 && data[0].defs && data[0].defs[0]) {
            var parts = data[0].defs[0].split('\t');
            var definition = parts[1] || data[0].defs[0];
            if (defEl) defEl.textContent = definition;
            _addTTSButton(defEl, definition, 'en');
            var posTag = data[0].tags && data[0].tags[0] ? data[0].tags[0] : '';
            if (posEl && posTag) posEl.textContent = posTag;
            _updateCardState(cardId, 'loaded');
            _cacheSet(word.toLowerCase(), { def: definition, pos: posTag });
            _fetchDatamusePills(word, cardId, posEl ? posEl.textContent : '');
            var card = document.getElementById(cardId);
            if (card) { var wordEl = card.querySelector('.wc-word') || card.querySelector('.syn-base-word'); _addTTSButton(wordEl, word, 'en'); }
            return;
          }
        } catch(e) { console.warn('Datamuse parse error:', e); }
      }
      _fetchNGSLFallback(word, cardId);
    };
    xhr.onerror = function() { _fetchNGSLFallback(word, cardId); };
    xhr.ontimeout = function() { _fetchNGSLFallback(word, cardId); };
    xhr.send();
  } catch(e) { _fetchNGSLFallback(word, cardId); }
}

// ── Local NGSL fallback (instant, offline, curated learner definitions) ──
function _fetchNGSLFallback(word, cardId) {
  var ng = (window.EN_NGSL || {})[word.toLowerCase()];
  if (!ng || !ng[3]) { _fetchFreeDictFallback(word, cardId); return; }
  var card = document.getElementById(cardId);
  if (!card) return;
  var defEl = card.querySelector('.syn-def');
  var posEl = card.querySelector('.syn-pos-tag');
  var ngPosMap = { v:'VERB', n:'NOUN', adj:'ADJ', adv:'ADV' };
  var posLabel = ngPosMap[ng[1]] || '';
  if (defEl) { defEl.textContent = ng[3]; _addTTSButton(defEl, ng[3], 'en'); }
  if (posEl && posLabel) posEl.textContent = posLabel;
  _updateCardState(cardId, 'loaded');
  _cacheSet(word.toLowerCase(), { def: ng[3], pos: posLabel });
  _fetchDatamusePills(word, cardId, posLabel);
  var wordEl = card.querySelector('.wc-word') || card.querySelector('.syn-base-word');
  if (wordEl) _addTTSButton(wordEl, word, 'en');
}

// ── Datamuse POS-aware pills — different endpoints per part of speech ──
function _fetchDatamusePills(word, cardId, pos) {
  var card = document.getElementById(cardId);
  if (!card) return;
  var relEl = card.querySelector('.syn-rel');
  if (!relEl) return;

  // Determine POS and context
  pos = pos || (typeof tagWord === 'function' ? tagWord(word) : 'OTHER');
  pos = pos.toUpperCase();
  var lc = card.getAttribute('data-lc') || '';
  var rc = card.getAttribute('data-rc') || '';
  var ctx = '';
  if (lc) ctx += '&lc=' + encodeURIComponent(lc);
  if (rc) ctx += '&rc=' + encodeURIComponent(rc);

  var baseUrl = 'https://api.datamuse.com/words?';
  var queries = [];

  if (pos === 'NOUN') {
    queries = [
      { q: 'rel_syn=' + encodeURIComponent(word), max: 3 },
      { q: 'rel_spc=' + encodeURIComponent(word), max: 1 },
      { q: 'rel_jjb=' + encodeURIComponent(word), max: 1 }
    ];
  } else if (pos === 'ADJ') {
    queries = [
      { q: 'rel_syn=' + encodeURIComponent(word), max: 3 },
      { q: 'rel_ant=' + encodeURIComponent(word), max: 2 }
    ];
  } else {
    queries = [
      { q: 'rel_syn=' + encodeURIComponent(word), max: 5 }
    ];
  }

  relEl.innerHTML = '<span style="color:var(--muted2);font-size:12px">…</span>';

  // Primary: POS-specific endpoints
  _dmFetch(queries, ctx).then(function(allWords) {
    // Fallback: if too few results, try broader "means like"
    if (allWords.length < 2) {
      return _dmFetch([{ q: 'ml=' + encodeURIComponent(word), max: 8 }], ctx);
    }
    return allWords;
  }).then(function(allWords) {
    // Last resort: word triggers
    if (allWords.length < 2) {
      return _dmFetch([{ q: 'rel_trg=' + encodeURIComponent(word), max: 8 }], ctx);
    }
    return allWords;
  }).then(function(allWords) {
    var seen = {};
    seen[word.toLowerCase()] = true;
    var filtered = [];
    allWords.forEach(function(w) {
      var lw = w.toLowerCase();
      if (!seen[lw] && filtered.length < 8) {
        seen[lw] = true;
        filtered.push(w);
      }
    });
    var html = '';
    if (filtered.length === 0) {
      html = '<span style="color:var(--muted2);font-size:12px">No related words</span>';
    } else {
      filtered.forEach(function(w) {
        html += '<span onclick="lookupSynonym(this)" data-word="' + _esc(w) + '" data-context="' + _esc(word) + '" style="cursor:pointer;font-size:13px;font-weight:600;padding:4px 10px;border-radius:100px;border:1px solid rgba(52,211,153,.2);color:#34d399;background:rgba(52,211,153,.06);margin:2px;display:inline-block">' + _esc(w) + '</span>';
      });
    }
    if (relEl) relEl.innerHTML = html;
  });
}

// Helper: fetch multiple Datamuse queries in parallel, return deduped word list
function _dmFetch(queries, ctx) {
  var baseUrl = 'https://api.datamuse.com/words?';
  var promises = queries.map(function(q) {
    return fetch(baseUrl + q.q + '&max=' + q.max + '&md=p' + (ctx||''))
      .then(function(r) { return r.json(); })
      .then(function(data) { return (data || []).map(function(d) { return d.word; }); })
      .catch(function() { return []; });
  });
  return Promise.all(promises).then(function(results) {
    var all = [];
    results.forEach(function(words) { all = all.concat(words); });
    return all;
  });
}
// ── Free Dictionary direct fallback (18/20 coverage, ~230ms) ──
function _fetchFreeDictFallback(word, cardId) {
  var card = document.getElementById(cardId);
  if (!card) return;
  var defEl = card.querySelector('.syn-def');
  var posEl = card.querySelector('.syn-pos-tag');
  fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word))
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data || !data[0] || !data[0].meanings) return;
      var m = data[0].meanings[0];
      var definition = (m.definitions && m.definitions[0] && m.definitions[0].definition) || '';
      var posTag = m.partOfSpeech || '';
      if (defEl) { defEl.textContent = definition; _addTTSButton(defEl, definition, 'en'); }
      if (posEl && posTag) posEl.textContent = posTag.toUpperCase();
      _updateCardState(cardId, 'loaded');
      _cacheSet(word.toLowerCase(), { def: definition, pos: posTag });
      _fetchDatamusePills(word, cardId, posTag);
      var wordEl = card.querySelector('.wc-word') || card.querySelector('.syn-base-word');
      if (wordEl) _addTTSButton(wordEl, word, 'en');
    })
    .catch(function() {});
}

// ── Final fallback: definition unavailable + local synonyms ──
function _finalFallback(word, cardId) {
  _updateCardState(cardId, 'error', 'No definition found for "' + word + '".');
  _fetchDatamusePills(word, cardId, '');
}

// ── Local synonym dictionary (last resort) ──
// ── Add Word Bank button to synonym row ──
function _addWordBankBtn(word, relEl) {
  if (!relEl) return;
  if (relEl.querySelector('.wb-btn')) return; // already added
  var wb = document.createElement('span');
  wb.className = 'wb-btn';
  wb.title = 'Add to Word Bank';
  wb.textContent = '+ Bank';
  wb.style.cssText = 'cursor:pointer;font-size:10px;font-weight:600;padding:3px 8px;border-radius:100px;border:1px solid rgba(255,255,255,.08);color:var(--muted2);margin-left:auto;flex-shrink:0;transition:all .15s';
  wb.onmouseover = function() { this.style.borderColor='var(--accent)'; this.style.color='var(--accent2)'; };
  wb.onmouseout = function() { this.style.borderColor='rgba(255,255,255,.08)'; this.style.color='var(--muted2)'; };
  wb.onclick = function(e) { e.stopPropagation(); addToWordBank(word); this.textContent = S8T('saved_check', '✓ Saved'); this.style.color = '#34d399'; this.style.borderColor = 'rgba(52,211,153,.3)'; };
  relEl.appendChild(wb);
}

// ── Get POS tag (enhanced — uses Penn Treebank via tagWord) ──
function _getPOS(word) {
  var posMap = { NOUN:'noun', VERB:'verb', ADJ:'adj', ADV:'adv', PREP:'prep', CONJ:'conj', PRON:'pron', FUNC:'func', WORD:'word', OTHER:'other' };
  // Primary: use enhanced tagWord (Penn Treebank + Compromise + suffix patterns)
  if (typeof tagWord === 'function') {
    var t = tagWord(word);
    if (posMap[t]) return posMap[t];
  }
  // Fallback: direct Compromise
  try {
    if (typeof nlp !== 'undefined') {
      var doc = nlp(word);
      var terms = doc.json();
      if (terms[0] && terms[0].terms && terms[0].terms[0]) {
        var tags = terms[0].terms[0].tags || [];
        if (tags.indexOf('Noun') !== -1) return 'noun';
        if (tags.indexOf('Verb') !== -1) return 'verb';
        if (tags.indexOf('Adjective') !== -1) return 'adj';
        if (tags.indexOf('Adverb') !== -1) return 'adv';
      }
    }
  } catch(e) {}
  return '—';
}

// ── Stop words filter (shared across all card builders) ──
var _stopWords = /^(the|and|for|are|was|with|that|this|from|have|were|they|will|what|when|your|about|which|their|there|would|could|should|does|been|being|into|more|some|than|then|also|very|just|like|over|each|said|della|del|dei|degli|delle|una|uno|per|che|con|sono|una|nel|nella|negli|nelle|dal|dallo|dalla|dai|dagli|dalle|non|più|meno|come|così|questa|questo|quella|quello|quelli|quelle)$/i;

// ── Unified word card HTML builder ──
function _buildCardHTML(word, cardId, pos, showActions, contextText) {
  var h = '';
  var posLower = (pos || '').toLowerCase();
  h += '<div class="word-card skeleton" id="' + cardId + '" data-word="' + _esc(word) + '" data-pos="' + _esc(posLower) + '" style="background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;position:relative">';
  if (showActions) {
    h += '<div class="wc-actions">';
    h += '<button class="wc-act-btn" onclick="var c=this.closest(\'.word-card\');var w=c.getAttribute(\'data-word\');var inBank=typeof wordBank!==\'undefined\'&&wordBank.indexOf(w)>=0;if(inBank){if(typeof removeFromWordBank===\'function\')removeFromWordBank(w);this.classList.remove(\'saved\');this.textContent=\'+\'}else{this.classList.add(\'saved\');this.textContent=\'✓\';if(typeof addToWordBank===\'function\')addToWordBank(w)}" title="Add to word bank">+</button>';
    h += '<button class="wc-act-btn" onclick="var c=document.getElementById(\'' + cardId + '\');c.style.opacity=\'0\';c.style.transform=\'scale(.95)\';c.style.transition=\'all .2s\';setTimeout(function(){c.remove()},200)" title="Dismiss" style="font-size:20px">×</button>';
    h += '</div>';
  }
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;' + (showActions ? 'padding-right:56px' : '') + '">';
  h += '<span class="wc-word" data-word="' + _esc(word) + '" data-context="' + _esc(contextText) + '" onclick="event.stopPropagation();lookupSynonym(this)" onmouseenter="event.stopPropagation();if(window._prefetchWordOnHover)window._prefetchWordOnHover(this,this.getAttribute(\'data-word\'))" onmouseleave="event.stopPropagation();if(window._cancelPrefetch)window._cancelPrefetch()" style="font-size:17px;font-weight:700;color:var(--text)">' + _esc(word) + '</span>';
  h += '<span class="syn-pos-tag wc-pos" style="font-size:12px;font-weight:600;text-transform:uppercase;padding:3px 10px;border-radius:100px;background:var(--accent2);color:#fff;letter-spacing:.4px">' + _esc(pos) + '</span>';
  h += '</div>';
  h += '<div style="font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:6px" class="syn-def wc-def"></div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-height:24px" class="syn-rel wc-rel"></div>';
  h += '<div class="wc-err-actions"><button class="wc-err-btn" onclick="var w=this.closest(\'.word-card\').getAttribute(\'data-word\');if(typeof addToWordBank===\'function\')addToWordBank(w);this.textContent=\'✓ Added\'">+ Add to bank anyway</button><button class="wc-err-btn" onclick="var w=this.closest(\'.word-card\').getAttribute(\'data-word\');window.open(\'https://www.google.com/search?q=define+\'+encodeURIComponent(w),\'_blank\')">Search Google</button></div>';
  h += '</div>';
  return h;
}

// ── Build SYN cards from a line's content words (right panel) ──
function _buildSynCards(text, spkName, spkColor, tsText) {
  var container = document.getElementById('synWords');
  if (!container) return;
  var rawWords = text.split(/\s+/);
  var contentWords = [];
  rawWords.forEach(function(w) {
    var clean = w.replace(/[.,;:!?…'"]/g, '').toLowerCase();
    if (clean.length > 2 && !_stopWords.test(clean)) contentWords.push(clean);
  });

  if (contentWords.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted2);font-size:12px">No content words found.<br><strong style="color:var(--accent)">Try a line with more descriptive words.</strong></div>';
    var countEl = document.getElementById('rightPanelCount');
    if (countEl) countEl.textContent = '0';
    return;
  }

  var ts = Date.now();
  var html = '<div class="wc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">';
  contentWords.forEach(function(word, i) {
    var cardId = 'synw-' + ts + '-' + i;
    var pos = (typeof _getPOS === 'function') ? _getPOS(word) : '—';
    html += _buildCardHTML(word, cardId, pos, false, '');
  });
  html += '</div>';
  container.innerHTML = html;
  var countEl = document.getElementById('rightPanelCount');
  if (countEl) countEl.textContent = contentWords.length;

  contentWords.forEach(function(word, i) {
    var cardId = 'synw-' + ts + '-' + i;
    _fetchWordData(word, cardId);
  });
}

// ═══ Grammar slide: recent transcript lines (click to populate SYN) ═══
// Incremental: only processes new lines since last tick. Tracks index to avoid full rebuild.
// POS/Vocab/Verb/Pronoun updates always run — they read from DOM and _gv state.
var _grammarLastLineCount = 0;
function _updateGrammarLines() {
  var box = document.getElementById('grammarTranscriptLines');
  var lines = document.querySelectorAll('#captionTranscript .line');
  
  // ── Always update POS stack + verb/pronoun counts (they read from DOM / _gv) ──
  _updateVocabPosStack();
  var aStack = document.getElementById('analysisPosStack');
  var vStack = document.getElementById('vocabPosStack');
  if (aStack && vStack) aStack.innerHTML = vStack.innerHTML;
  _updateVerbAndPronounCounts();
  
  // ── Grammar sidebar + pills: only rebuild when transcript changes ──
  if (!lines.length) {
    if (box) box.innerHTML = '<div style="color:var(--muted2);font-size:13px;text-align:center;padding:20px">No transcript yet.</div>';
    _grammarLastLineCount = 0;
    return;
  }
  // Reset if transcript was cleared externally
  if (lines.length < _grammarLastLineCount) {
    _grammarLastLineCount = 0;
    if (box) box.innerHTML = '';
    var pills2 = document.getElementById('gvTranscriptPills');
    if (pills2) pills2.innerHTML = '';
  }
  if (lines.length === _grammarLastLineCount) return; // nothing new for sidebar
  var newStart = _grammarLastLineCount;
  _grammarLastLineCount = lines.length;
  
  // ── Sidebar: maintain last 12 lines ──
  if (box) {
    // Clear initial placeholder on first real content
    if (newStart === 0) box.innerHTML = '';
    var MAX_SIDEBAR = 12;
    for (var i = newStart; i < lines.length; i++) {
      var l = lines[i];
      var clone = l.cloneNode(true);
      var tsSpan = clone.querySelector('span'); var tsText = tsSpan ? tsSpan.textContent : '';
      if (tsSpan) tsSpan.remove();
      var spkTag = clone.querySelector('.spk-tag'); if (spkTag) spkTag.remove();
      var text = (clone.textContent || '').trim(); if (!text) continue;
      // De-duplicate
      var lastTline = box.querySelector('.tline:last-child');
      if (lastTline && lastTline.getAttribute('data-text') === text.replace(/"/g, '&quot;')) continue;
      var div = document.createElement('div');
      div.className = 'tline';
      div.setAttribute('onclick', '_slideLineClick(this)');
      div.setAttribute('data-text', text.replace(/"/g, '&quot;'));
      div.innerHTML = '<span class="ts">' + tsText + '</span>' + text;
      box.appendChild(div);
    }
    // Trim excess from top
    var tlines = box.querySelectorAll('.tline');
    while (tlines.length > MAX_SIDEBAR) {
      tlines[0].remove();
      tlines = box.querySelectorAll('.tline');
    }
  }
  // ── Slide 4 right panel: independent transcript lines (grammar correction, was slide 5) ──
  var box5 = document.getElementById('grammarCorrectTranscriptLines');
  if (box5 && lines.length) {
    if (newStart === 0) box5.innerHTML = '';
    var MAX_S5 = 15;
    for (var i = newStart; i < lines.length; i++) {
      var l = lines[i];
      var clone = l.cloneNode(true);
      var tsSpan = clone.querySelector('span'); var tsText2 = tsSpan ? tsSpan.textContent : '';
      if (tsSpan) tsSpan.remove();
      var spkTag = clone.querySelector('.spk-tag'); if (spkTag) spkTag.remove();
      var txt2 = (clone.textContent || '').trim(); if (!txt2) continue;
      var lastTline5 = box5.querySelector('.tline:last-child');
      if (lastTline5 && lastTline5.getAttribute('data-text') === txt2.replace(/\"/g, '&quot;')) continue;
      var div5 = document.createElement('div');
      div5.className = 'tline';
      div5.setAttribute('onclick', '_s5LineClick(this)');
      div5.setAttribute('data-text', txt2.replace(/\"/g, '&quot;'));
      div5.innerHTML = '<span class="ts">' + tsText2 + '</span>' + txt2;
      box5.appendChild(div5);
    }
    var tlines5 = box5.querySelectorAll('.tline');
    while (tlines5.length > MAX_S5) { tlines5[0].remove(); tlines5 = box5.querySelectorAll('.tline'); }
  }
  
  // ── Pill transcript view (Panel 5) — maintain last 15 lines ──
  var pills = document.getElementById('gvTranscriptPills');
  if (pills) {
    if (newStart === 0) pills.innerHTML = '';
    var MAX_PILLS = 15;
    for (var i = newStart; i < lines.length; i++) {
      var l = lines[i];
      var clone = l.cloneNode(true);
      var tsSpan = clone.querySelector('span'); var tsText = tsSpan ? tsSpan.textContent : '';
      if (tsSpan) tsSpan.remove();
      var spkTag = clone.querySelector('.spk-tag'); if (spkTag) spkTag.remove();
      var text = (clone.textContent || '').trim(); if (!text) continue;
      var words = text.split(/\s+/).filter(function(w){return w.length>0});
      var pDiv = document.createElement('div');
      pDiv.style.cssText = 'margin-bottom:clamp(8px,1.2vw,14px);padding-bottom:clamp(6px,1vw,10px);border-bottom:1px solid var(--line)';
      var innerHtml = '<span style="color:var(--muted2);font-size:clamp(9px,1vw,11px);margin-right:8px">' + tsText + '</span>';
      var seen = {};
      words.forEach(function(w){
        var clean = w.replace(/[^a-zA-Z]/g,'').toLowerCase();
        if (seen[clean]) return; // skip duplicates within same line
        seen[clean] = true;
        var pos = 'OTHER';
        // Use enhanced tagWord (Penn Treebank) for English, with suffix fallback
        if (typeof tagWord === 'function') {
          pos = tagWord(clean);
        } else {
          try {
            if (typeof nlp !== 'undefined') {
              var d = nlp(clean); var t = d.json();
              if (t[0] && t[0].terms && t[0].terms[0]) {
                var tags = t[0].terms[0].tags || [];
                if (tags.indexOf('Noun') !== -1) pos = 'NOUN';
                else if (tags.indexOf('Verb') !== -1) pos = 'VERB';
                else if (tags.indexOf('Adjective') !== -1) pos = 'ADJ';
                else if (tags.indexOf('Adverb') !== -1) pos = 'ADV';
                else if (tags.indexOf('Preposition') !== -1) pos = 'PREP';
                else if (tags.indexOf('Conjunction') !== -1) pos = 'CONJ';
                else if (tags.indexOf('Pronoun') !== -1) pos = 'PRON';
                else if (tags.indexOf('Determiner') !== -1) pos = 'DET';
                else if (tags.indexOf('Modal') !== -1 || tags.indexOf('Auxiliary') !== -1) pos = 'AUX';
              }
            }
          } catch(e) {}
        }
        if (pos === 'OTHER' && typeof _gvHeuristicPOS === 'function') pos = _gvHeuristicPOS(clean);
        var colorMap = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa',DET:'#6b7280',PART:'#6b7280',OTHER:'#6b7280'};
        var color = colorMap[pos] || '#6b7280';
        innerHtml += '<span style="display:inline-flex;padding:clamp(2px,.4vw,4px) clamp(6px,1vw,10px);border-radius:5px;font-size:clamp(10px,1.2vw,13px);font-weight:600;background:' + color + '20;color:' + color + ';border:1px solid ' + color + '30;margin:2px">' + w + ' <span style="opacity:.55;font-size:clamp(7px,.8vw,9px);font-weight:500">' + pos + '</span></span>';
      });
      pDiv.innerHTML = innerHtml;
      pills.appendChild(pDiv);
    }
    var pillDivs = pills.querySelectorAll('div');
    while (pillDivs.length > MAX_PILLS) {
      pillDivs[0].remove();
      pillDivs = pills.querySelectorAll('div');
    }
  }
}
// ── Safety net: sync Verb Tenses + Pronouns DOM from grammar-viz.js _gv state ──
// _gvUpdateVerbs/_gvUpdatePronouns fire from the onFinal hook, but this ensures
// the slide 2 sidebar stays in sync even if grammar-viz.js fires before DOM ready.
function _updateVerbAndPronounCounts() {
  if (!window._gv) return;
  var vt = window._gv.verbCounts || {};
  var pc = window._gv.proCounts || {};
  var map = {
    gvVbPres: vt.PRES || 0,
    gvVbPast: vt.PAST || 0,
    gvVbIng: vt.ING || 0,
    gvVbPart: vt.PART || 0,
    gvVbModal: vt.MODAL || 0,
    gvProSubj: pc.SUBJ || 0,
    gvProObj: pc.OBJ || 0,
    gvProPoss: pc.POSS || 0,
    gvProRefl: pc.REFL || 0
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = map[id];
  });
}
// Toggle between tagged and pill transcript views on slide 4 (Live Analysis) — simplified to tags-only now
function _switchAnalysisMode(mode, btn) {
  // Pills removed; only Tags mode exists now
  btn.classList.add('on');
}
// ═══ Metrics panel: toggle between Waffle and POS Tags modes ═══
function _switchMetricsMode(mode, btn) {
  document.querySelectorAll('#metricsModeWaffleBtn,#metricsModePosBtn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  var waffle = document.getElementById('metricsModeWaffle');
  var pos = document.getElementById('metricsModePosTags');
  if (mode === 'waffle') { if (waffle) waffle.style.display = ''; if (pos) pos.style.display = 'none'; }
  else { if (waffle) waffle.style.display = 'none'; if (pos) pos.style.display = ''; }
}
// ── Helper: POS tag (uses enhanced tagWord with Penn Treebank) ──
function _nlpPOS(w) {
  if (typeof tagWord === 'function') {
    var t = tagWord(w);
    if (t && t !== 'WORD' && t !== 'OTHER') return t;
  }
  return 'OTHER';
}
// ═══ Refresh metrics panel data ═══
function _refreshMetricsPanel() {
  // Only update if metrics panel is open (lazy)
  var mc = document.getElementById('metricsContent');
  if (!mc || !mc.classList.contains('active')) return;

  var lines = document.querySelectorAll('#captionTranscript .line');
  var allWords = [];
  lines.forEach(function(l) {
    var clone = l.cloneNode(true);
    var spans = clone.querySelectorAll('span'); spans.forEach(function(s){s.remove()});
    var spks = clone.querySelectorAll('.spk-tag'); spks.forEach(function(s){s.remove()});
    (clone.textContent||'').trim().split(/\s+/).forEach(function(w){
      var c = w.replace(/[^a-zA-Z]/g,'').toLowerCase(); if (c.length > 1) allWords.push(c);
    });
  });

  // ── Waffle Chart ──
  var wf = document.getElementById('metricsWaffleChart');
  if (wf) {
    var wfHtml = ''; var max = Math.min(allWords.length, 49);
    var wfColors = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa',DET:'#9ca3af',OTHER:'#6b7280'};
    for (var i = 0; i < max; i++) {
      var pos = 'OTHER';
      try { pos = _nlpPOS(allWords[i]); } catch(e) {}
      wfHtml += '<div style="width:14px;height:14px;border-radius:3px;background:' + (wfColors[pos]||'#6b7280') + '" title="' + allWords[i] + ' (' + pos + ')"></div>';
    }
    wf.innerHTML = wfHtml || '<div style="color:var(--muted2);font-size:12px;text-align:center;padding:10px">No words yet.</div>';
  }

  // ── POS Tags grouped (Mode 2) ──
  var mps = document.getElementById('metricsPosStack');
  if (mps) {
    var posMap = {}; var posOrder = ['NOUN','VERB','ADJ','ADV','PREP','CONJ','PRON','AUX'];
    var posNames = {NOUN:'Nouns',VERB:'Verbs',ADJ:'Adjectives',ADV:'Adverbs',PREP:'Prepositions',CONJ:'Conjunctions',PRON:'Pronouns',AUX:'Auxiliaries'};
    var posColors = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa'};
    allWords.forEach(function(w){
      var pos = _nlpPOS(w);
      if (!posMap[pos]) posMap[pos] = [];
      if (posMap[pos].indexOf(w) < 0) posMap[pos].push(w);
    });
    var psHtml = '';
    posOrder.forEach(function(pos) {
      var words = posMap[pos] || []; if (words.length === 0) return;
      psHtml += '<div><div class="pos-row-label" style="color:' + (posColors[pos]||'#9ca3af') + '">' + posNames[pos] + ' (' + words.length + ')</div><div class="pos-row-words">';
      words.forEach(function(w) {
        psHtml += '<span class="pos-chip" style="background:' + (posColors[pos]||'#6b7280') + '25;color:' + (posColors[pos]||'#9ca3af') + '">' + w + '</span>';
      });
      psHtml += '</div></div>';
    });
    mps.innerHTML = psHtml || '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Start speaking to see words grouped by POS.</div>';
  }

  // ── POS Distribution Donut (always visible) ──
  var donutSvg = document.getElementById('metricsDonutSvg');
  var donutLegend = document.getElementById('metricsDonutLegend');
  if (donutSvg) {
    var posCounts = {NOUN:0,VERB:0,ADJ:0,ADV:0};
    allWords.forEach(function(w){
      var pos = _nlpPOS(w);
      if (posCounts.hasOwnProperty(pos)) posCounts[pos]++;
    });
    var total = posCounts.NOUN + posCounts.VERB + posCounts.ADJ + posCounts.ADV || 1;
    var items = [
      {v: posCounts.NOUN, c: '#60a5fa'},
      {v: posCounts.VERB, c: '#34d399'},
      {v: posCounts.ADJ, c: '#f472b6'},
      {v: posCounts.ADV, c: '#c084fc'}
    ];
    var circ = 2 * Math.PI * 32;
    var offset = 0;
    var svgHtml = '';
    items.forEach(function(b) {
      if (b.v === 0) return;
      var dash = (b.v / total) * circ;
      svgHtml += '<circle cx="50" cy="50" r="32" fill="none" stroke="' + b.c + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 50 50)"/>';
      offset += dash;
    });
    if (!svgHtml) svgHtml = '<circle cx="50" cy="50" r="32" fill="none" stroke="var(--line)" stroke-width="10" stroke-dasharray="200 200" transform="rotate(-90 50 50)"/>';
    svgHtml += '<text x="50" y="46" text-anchor="middle" font-family="JetBrains Mono" font-size="16" font-weight="900" fill="var(--text)">' + total + '</text><text x="50" y="56" text-anchor="middle" font-size="6" fill="var(--muted2)">words</text>';
    donutSvg.innerHTML = svgHtml;
    if (donutLegend) donutLegend.innerHTML = '<span style="color:#60a5fa">N ' + items[0].v + '</span><span style="color:#34d399">V ' + items[1].v + '</span><span style="color:#f472b6">J ' + items[2].v + '</span><span style="color:#c084fc">D ' + items[3].v + '</span>';
  }
}
// Click a line in slide 3 (grammar) → show word cards
function _slideLineClick(el) {
  document.querySelectorAll('#grammarTranscriptLines .tline').forEach(function(l){l.style.background=''});
  el.style.background = 'rgba(124,58,237,.1)';
  var text = el.getAttribute('data-text') || '';
  var container = document.getElementById('grammarSynCards');
  if (container) {
    var words = text.split(/\s+/).filter(function(w){return w.replace(/[^a-zA-Z]/g,'').length>1});
    if (words.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">No words found in this line.</div>';
      return;
    }
    var ts = Date.now();
    var html = '<div class="wc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">';
    words.forEach(function(w, i) {
      var cardId = 'gsyn-' + ts + '-' + i;
      var pos = (typeof _getPOS === 'function') ? _getPOS(w) : '—';
      html += _buildCardHTML(w, cardId, pos, true, text.slice(0, 30));
    });
    html += '</div>';
    container.innerHTML = html;
    words.forEach(function(w, i) {
      var cardId = 'gsyn-' + ts + '-' + i;
      if (typeof _fetchWordData === 'function') _fetchWordData(w, cardId);
    });
  }
}
// Click a line in slide 4 (live analysis) → show POS pills
// ═══ Slide 5: Grammar correction click handler ═══
async function _s5LineClick(el) {
  var box5 = document.getElementById('grammarCorrectTranscriptLines');
  if (box5) { box5.querySelectorAll('.tline').forEach(function(l){l.style.background=''}); }
  el.style.background = 'rgba(6,182,212,.12)';
  var text = el.getAttribute('data-text') || '';
  if (!text) return;

  // Show original
  var origEl = document.getElementById('grammarOriginalText');
  if (origEl) origEl.textContent = text;

  // Show loading state
  var corrEl = document.getElementById('grammarCorrectedText');
  if (corrEl) corrEl.innerHTML = '<span style="opacity:.5">Checking grammar…</span>';

  var explEl = document.getElementById('grammarExplanation');
  if (explEl) explEl.innerHTML = '<span style="opacity:.5">Analyzing…</span>';

  var saveBtn = document.getElementById('grammarSaveBtn');
  if (saveBtn) saveBtn.disabled = true;

  // Call grammar-segment edge function
  var sb = window.sottotitoliSupabase;
  if (!sb) { if (corrEl) corrEl.textContent = '⚠️ Not signed in'; return; }

  var langSettings;
  try {
    var roomConfig = S8T_LANG.readRoomConfig();
    langSettings = await S8T_LANG.resolve(roomConfig);
  } catch(e) {
    console.error('Grammar: language resolver failed:', e);
    if (corrEl) corrEl.innerHTML = '<span style="color:var(--warn)">⚠️ Language settings unavailable</span>';
    if (explEl) explEl.textContent = 'Could not load language configuration. Try refreshing.';
    return;
  }
  _lastGrammarText = text;
  _lastLangSettings = langSettings;

  // Highlight active model in segmented control
  _highlightGrammarModelBtn(langSettings.model);

  sb.functions.invoke('grammar-segment', {
    body: { text: text, mode: 'fix_grammar', content_language: langSettings.content_language, explanation_language: langSettings.explanation_language, model: langSettings.model }
  }).then(function(res) {
    if (res.error) throw new Error(res.error.message || res.error);
    var data = res.data;
    var result = data.result; // new structured response
    var grammar = data.grammar;
    if (!grammar || grammar.status === 'failed') {
      if (corrEl) corrEl.innerHTML = '<span style="color:var(--warn)">⚠️ Grammar check failed' + (data.error ? ': ' + data.error : '') + '</span>';
      if (explEl) explEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Could not check grammar for this sentence.</div>';
      return;
    }

    var correctedText = result ? result.corrected : grammar.corrected_text;
    var hasChanges = result
      ? (result.changes && result.changes.length > 0)
      : (grammar.corrected_text !== text);
    var hasSilentEdits = result
      ? (result.silent_edits && result.silent_edits.length > 0)
      : false;

    // Detect when model corrected text but failed to provide change details
    var wordsDiffer = false;
    if (!hasChanges && correctedText && correctedText !== text) {
      var norm = function(s) { return (s||'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase(); };
      wordsDiffer = norm(correctedText) !== norm(text);
    }
    var unexplainedFix = !hasChanges && wordsDiffer;

    // Show corrected text
    if (corrEl) {
      if (!hasChanges && !hasSilentEdits && !unexplainedFix) {
        corrEl.innerHTML = '<span style="color:var(--good)">✓ No errors found</span>';
      } else if (unexplainedFix) {
        corrEl.innerHTML = correctedText + ' <span style="font-size:10px;color:var(--amber);margin-left:8px">(corrected, see below)</span>';
      } else if (!hasChanges && hasSilentEdits) {
        corrEl.innerHTML = correctedText + ' <span style="font-size:10px;color:var(--muted2);margin-left:8px">(punctuation only)</span>';
      } else {
        corrEl.textContent = correctedText || text;
      }
    }

    // Show explanation — use structured changes if available, fall back to legacy text
    if (result && result.changes && result.changes.length > 0) {
      _renderGrammarChanges(explEl, result.changes, result.silent_edits || []);
    } else if (explEl && unexplainedFix) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:10px"><span style="color:var(--amber);font-size:18px">⚠️</span><p style="color:var(--amber);font-size:13px;font-weight:600;margin:8px 0 4px">Model corrected the text but didn\'t explain how.</p><p style="color:var(--muted2);font-size:12px;margin:0">Try checking the sentence again to get an explanation.</p></div>';
    } else if (explEl && data.explanation) {
      _renderGrammarErrors(explEl, data.explanation);
    } else if (explEl && !hasChanges && !hasSilentEdits) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--good);font-size:14px;font-weight:500">✓ No grammar issues detected in this sentence.</div>';
    } else if (explEl) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">No specific grammar errors identified.</div>';
    }

    // Enable save button
    if (saveBtn && hasChanges) {
      saveBtn.disabled = false;
      saveBtn.setAttribute('data-original', text);
      saveBtn.setAttribute('data-corrected', correctedText || text);
      saveBtn.setAttribute('data-explanation', data.explanation || '');
      if (result) saveBtn.setAttribute('data-changes', JSON.stringify(result.changes));
    }
  }).catch(function(err) {
    if (corrEl) corrEl.innerHTML = '<span style="color:var(--danger)">⚠️ ' + (err.message || 'Error') + '</span>';
    if (explEl) explEl.textContent = 'Could not reach grammar service.';
  });
}

// ── Render grammar changes from structured result ──
function _renderGrammarChanges(container, changes, silentEdits) {
  if (!container) return;
  var dotColors = ['var(--danger)','var(--warn)','var(--accent)','var(--accent2)','#a78bfa','var(--good)'];
  var html = '<div style="display:flex;flex-direction:column;gap:10px">';

  // Render genuine grammar errors
  if (changes && changes.length > 0) {
    changes.forEach(function(c, i) {
      var dotColor = dotColors[i % dotColors.length];
      var cat = (c.category || 'other').replace(/_/g, ' ').toUpperCase();
      html += '<div class="grammar-change-card" style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;cursor:pointer" data-change-id="' + (c.id || '') + '">';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">';
      html += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor + ';flex-shrink:0"></span>';
      html += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:' + dotColor + '">' + cat + '</span>';
      if (c.confidence) {
        html += '<span style="font-size:9px;color:var(--muted2);margin-left:auto">' + Math.round(c.confidence * 100) + '% confident</span>';
      }
      html += '</div>';
      // Show the correction inline
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
      html += '<span style="font-size:13px;color:var(--danger);text-decoration:line-through;text-decoration-color:rgba(239,68,68,.4)">' + (c.original || '') + '</span>';
      html += '<span style="font-size:10px;color:var(--muted2)">→</span>';
      html += '<span style="font-size:13px;color:var(--good);font-weight:600">' + (c.corrected || '') + '</span>';
      html += '</div>';
      html += '<p style="font-size:13px;color:var(--text);line-height:1.6;margin:0">' + (c.explanation || '') + '</p>';
      html += '</div>';
    });
  }

  // Render silent edits (mechanics only)
  if (silentEdits && silentEdits.length > 0) {
    html += '<div style="margin-top:4px;padding:8px 12px;background:rgba(156,163,175,.06);border-radius:8px">';
    html += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--muted2)">Mechanics only</span>';
    html += '<div style="margin-top:4px;font-size:12px;color:var(--text-soft)">';
    silentEdits.forEach(function(s) {
      html += '<span style="margin-right:12px">' + s.category + ': <span style="text-decoration:line-through;opacity:.6">' + (s.original || '∅') + '</span> → <span style="font-weight:600">' + (s.corrected || '∅') + '</span></span>';
    });
    html += '</div></div>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Render grammar explanation as rich error cards (legacy fallback) ──
function _renderGrammarErrors(container, explanationText) {
  if (!container || !explanationText) return;
  // Split numbered list into individual errors
  var errors = [];
  var parts = explanationText.split('\n');
  parts.forEach(function(part) {
    var cleaned = part.replace(/^\d+\.\s*/, '').trim();
    if (cleaned) errors.push(cleaned);
  });
  if (errors.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">' + explanationText + '</div>';
    return;
  }
  // Infer error category from text
  function inferCategory(text) {
    var t = text.toLowerCase();
    if (t.indexOf('subject-verb')!==-1||t.indexOf('agreement')!==-1) return 'SUBJECT-VERB AGREEMENT';
    if (t.indexOf('article')!==-1||t.indexOf('definite')!==-1||t.indexOf('indefinite')!==-1) return 'ARTICLE USAGE';
    if (t.indexOf('tense')!==-1||t.indexOf('conjugation')!==-1) return 'VERB TENSE';
    if (t.indexOf('preposition')!==-1) return 'PREPOSITION';
    if (t.indexOf('word order')!==-1) return 'WORD ORDER';
    if (t.indexOf('pronoun')!==-1) return 'PRONOUN';
    if (t.indexOf('plural')!==-1||t.indexOf('singular')!==-1||t.indexOf('number')!==-1) return 'NUMBER AGREEMENT';
    if (t.indexOf('spell')!==-1||t.indexOf('typo')!==-1) return 'SPELLING';
    if (t.indexOf('punctuation')!==-1||t.indexOf('comma')!==-1||t.indexOf('period')!==-1) return 'PUNCTUATION';
    return 'GRAMMAR CORRECTION';
  }
  var dotColors = ['var(--danger)','var(--warn)','var(--accent)','var(--accent2)','#a78bfa','var(--good)'];
  var html = '<div style="display:flex;flex-direction:column;gap:10px">';
  errors.forEach(function(err, i) {
    var cat = inferCategory(err);
    var dotColor = dotColors[i % dotColors.length];
    html += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">';
    html += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor + ';flex-shrink:0"></span>';
    html += '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:' + dotColor + '">' + cat + '</span>';
    html += '</div>';
    html += '<p style="font-size:13px;color:var(--text);line-height:1.6;margin:0">' + err + '</p>';
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── Highlight active model in segmented control ──
function _highlightGrammarModelBtn(modelId) {
  var btn31 = document.getElementById('gbBtn31');
  var btn33 = document.getElementById('gbBtn33');
  var btn4 = document.getElementById('gbBtn4');
  var activeBg = 'var(--accent)'; var activeColor = '#fff';
  var inactiveBg = 'transparent'; var inactiveColor = 'var(--muted2)';
  function set(btn, active) {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.style.pointerEvents = 'auto';
    btn.style.background = active ? activeBg : inactiveBg;
    btn.style.color = active ? activeColor : inactiveColor;
  }
  set(btn31, modelId && modelId.includes('3.1') && !modelId.includes('3.3'));
  set(btn33, modelId && modelId.includes('3.3'));
  set(btn4, modelId && modelId.includes('4-'));
}

// ── Save grammar error to error bank ──
window.saveGrammarError = async function() {
  var btn = document.getElementById('grammarSaveBtn');
  if (!btn || btn.disabled) return;
  var original = btn.getAttribute('data-original') || '';
  var corrected = btn.getAttribute('data-corrected') || '';
  var explanation = btn.getAttribute('data-explanation') || '';
  if (!original || !corrected) return;

  var sb = window.sottotitoliSupabase;
  if (!sb) { showAlertModal('Accesso richiesto', 'Sign in to save errors.'); return; }

  var r = await sb.auth.getSession();
  if (!r.data || !r.data.session) { showAlertModal('Accesso richiesto', 'Sign in to save errors.'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  var { error } = await sb.from('grammar_errors').insert({
    user_id: r.data.session.user.id,
    language: 'en',
    original_text: original,
    corrected_text: corrected,
    explanation: explanation || null
  });

  if (error) {
    btn.textContent = '⚠️ Failed';
    btn.disabled = false;
    console.error('saveGrammarError:', error);
    // Show error toast
    var errToast = document.createElement('div');
    errToast.textContent = '⚠️ Could not save error — try again';
    errToast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;color:#dc2626;z-index:300;box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap';
    document.body.appendChild(errToast);
    setTimeout(function(){ errToast.remove(); }, 4000);
  } else {
    btn.textContent = S8T('saved_check', '✓ Saved');
    btn.style.background = 'rgba(34,197,94,.15)';
    btn.style.color = '#22c55e';
    btn.style.borderColor = 'rgba(34,197,94,.3)';
    // Show success toast
    showToastMsg('💾 Grammar error saved to your error bank');
    setTimeout(function() {
      btn.textContent = '💾 Save to Error Bank';
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.disabled = true;
    }, 2000);
  }
};

// ── Inline grammar check from any transcript line (Mode 4) ──
window._checkGrammarInline = async function(icon) {
  var line = icon.closest('.tline');
  if (!line) return;
  var text = line.getAttribute('data-text') || '';
  if (!text) return;

  // Visual feedback
  icon.textContent = '⏳';
  icon.style.opacity = '1';

  var sb = window.sottotitoliSupabase;
  if (!sb) { icon.textContent = '✍️'; return; }

  try {
    var roomConfig = S8T_LANG.readRoomConfig();
    var langSettings = await S8T_LANG.resolve(roomConfig);
    var res = await sb.functions.invoke('grammar-segment', {
      body: { text: text, mode: 'fix_grammar', content_language: langSettings.content_language, explanation_language: langSettings.explanation_language, model: langSettings.model }
    });
    if (res.error) throw new Error(res.error.message || res.error);
    var data = res.data;
    var result = data.result;
    var grammar = data.grammar;
    if (!grammar || grammar.status === 'failed') { icon.textContent = '⚠️'; return; }

    var correctedText = result ? result.corrected : grammar.corrected_text;
    var hasChanges = result
      ? (result.changes && result.changes.length > 0)
      : (grammar.corrected_text && grammar.corrected_text !== text);

    // Remove any existing correction annotation
    var existing = line.querySelector('.tline-correction');
    if (existing) existing.remove();

    if (hasChanges) {
      // Show corrected version below the line
      var corr = document.createElement('div');
      corr.className = 'tline-correction';
      corr.style.cssText = 'font-size:11px;color:var(--accent);padding:2px 0 2px 56px;line-height:1.4;border-bottom:1px solid var(--line);background:rgba(6,182,212,.04)';
      corr.textContent = '→ ' + correctedText;
      line.after(corr);
      icon.classList.add('checked');
      icon.textContent = '✓';
    } else {
      icon.textContent = '✓';
      icon.classList.add('checked');
    }
  } catch(err) {
    icon.textContent = '⚠️';
    console.error('_checkGrammarInline:', err);
  }
};

// ═══ Universal POS Filter — works on ALL word-card containers ═══
function _filterSynByPOS(pos, btn) {
  document.querySelectorAll('#posFilterPills .toggle-pill').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  // Query ALL word-cards, regardless of container
  var cards = document.querySelectorAll('.word-card');
  cards.forEach(function(card) {
    if (pos === 'ALL') { card.style.display = ''; return; }
    var dataPos = card.getAttribute('data-pos') || '';
    var show = false;
    if (pos === 'Nouns' && dataPos.indexOf('noun') !== -1) show = true;
    if (pos === 'Adjectives' && dataPos.indexOf('adj') !== -1) show = true;
    if (pos === 'Verbs' && (dataPos.indexOf('verb') !== -1 || dataPos.indexOf('vb') !== -1)) show = true;
    card.style.display = show ? '' : 'none';
  });
}
// ═══ Popup toggles for settings & metrics icons ═══
function togglePopup(id, btn) {
  var el = document.getElementById(id); if (!el) return;
  var open = el.style.display === 'block';
  // Close ALL popups first (mutual exclusivity)
  document.querySelectorAll('#settingsPopup,#captionSettingsPopup').forEach(function(p) { p.style.display = 'none'; });
  if (!open) { el.style.display = 'block'; }
}
// Click outside to close any open popup
document.addEventListener('click', function(e) {
  var popups = document.querySelectorAll('#settingsPopup,#captionSettingsPopup,#v20qBookmarkPanel');
  popups.forEach(function(p) {
    if (p.style.display === 'block') {
      var btnMap = { settingsPopup:'settingsBtn', captionSettingsPopup:'captionSettingsBtn', v20qBookmarkPanel:'bookmarksBtn' };
      var btn = document.getElementById(btnMap[p.id] || '');
      if (!p.contains(e.target) && (!btn || !btn.contains(e.target))) {
        p.style.display = 'none';
      }
    }
  });
});
// ═══ Robust slide update — polls every 800ms as fallback ═══
var _slidePollInterval = setInterval(function() {
  if (!sessionActive) return;
  var lines = document.querySelectorAll('#captionTranscript .line');
  if (lines.length > 0) {
    try { _updateGrammarLines(); } catch(e) {}
    try { _refreshMetricsPanel(); } catch(e) {}
    try { _updateCEFRBars(); } catch(e) {}
    // Topics has its own gentle interval — not polled here
  }
}, 800);

// ═══ CEFR Level Analysis (GSE-powered) ═══
var _cefrColors={A1:'#22c55e',A2:'#a3e635',B1:'#facc15',B2:'#fb923c',C1:'#f87171',C2:'#c084fc'};
var _cefrWordLists={};
var _sessionWordCache = {};        // word → {level, pos} from API
var _gseHistory = [];              // rolling last 10 GSE scores
var _sessionGSE = null;            // current overall GSE
var _sessionCEFRBand = null;       // current CEFR band string
var _cefrApiUrl = '';
var _cefrApiBusy = false;
var _cefrApiQueue = [];

// Derive CEFR API URL from websocket config
(function(){
  var ws = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.websocketUrl) || '';
  if (ws) {
    _cefrApiUrl = ws.replace('wss://','https://').replace('/ws','') + '/api/cefr';
  }
  // Fallback
  if (!_cefrApiUrl || _cefrApiUrl.indexOf('http') !== 0) {
    _cefrApiUrl = 'https://sottotitoli-websocket.onrender.com/api/cefr';
  }
})();

function _getCEFR(w){
  var c=w.toLowerCase().replace(/[^a-z]/g,'');
  // Italian captions: local IT lexicon chain (KELLY → core → suffix → length)
  var capLang = (typeof currentCaptionLang === 'string') ? currentCaptionLang.split('-')[0] : 'en';
  if (capLang === 'it' && window.S8T_IT_LEXICON) return window.S8T_IT_LEXICON.getCEFR(c, 'it');
  // Live Render batch cache — the authoritative English source (levels are numbers 1-6)
  if (_sessionWordCache[c] && _sessionWordCache[c].level) {
    var lmap = {1:'A1',2:'A2',3:'B1',4:'B2',5:'C1',6:'C2'};
    var lv = lmap[Number(_sessionWordCache[c].level)];
    if (lv) return lv;
  }
  if(window.CEFR_LEVELS&&window.CEFR_LEVELS[c])return window.CEFR_LEVELS[c];
  return '—'; // no length heuristic — unknown words stay honest
}

/** Call CEFR batch API for new words, merge into cache, then re-analyze. */
function _cefrFetchAndAnalyze(text) {
  if (!isCapabilityAvailable('cefrMetrics')) return;
  if (!text || typeof text !== 'string') return;
  
  // Extract unique new words not yet cached
  var tokens = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  var newWords = [];
  var seen = {};
  for (var i = 0; i < tokens.length; i++) {
    var w = tokens[i];
    if (w.length < 2 || _sessionWordCache[w] || seen[w]) continue;
    seen[w] = true;
    newWords.push(w);
  }
  
  if (newWords.length === 0) {
    // All words cached — just re-analyze
    _cefrRunAnalysis(text);
    return;
  }
  
  // Queue API call (debounced — only one in flight at a time)
  _cefrApiQueue.push({ words: newWords, text: text });
  _cefrProcessQueue();
}

function _cefrProcessQueue() {
  if (_cefrApiBusy || _cefrApiQueue.length === 0) return;
  _cefrApiBusy = true;
  var job = _cefrApiQueue.shift();
  
  fetch(_cefrApiUrl + '/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words: job.words })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data && data.results) {
      for (var w in data.results) {
        _sessionWordCache[w] = data.results[w];
      }
    }
    _cefrRunAnalysis(job.text);
  })
  .catch(function() { /* silent — CEFR API unavailable */ })
  .finally(function() {
    _cefrApiBusy = false;
    // Process next queued job after a short debounce
    setTimeout(function() { _cefrProcessQueue(); }, 1500);
  });
}

/** Run GSE analysis on text using cached word levels. */
function _cefrRunAnalysis(text) {
  if (!window.SottotitoliGSE || !window.SottotitoliGSE.analyze) return;
  
  var vocabLookup = {};
  var tokens = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  for (var i = 0; i < tokens.length; i++) {
    var w = tokens[i];
    if (_sessionWordCache[w]) vocabLookup[w] = _sessionWordCache[w];
  }
  
  var result = window.SottotitoliGSE.analyze(text, Object.keys(vocabLookup).length > 0 ? vocabLookup : null);
  if (!result) return;
  
  _sessionGSE = result.overallGSE;
  _sessionCEFRBand = result.cefrBand || 'A1';
  
  // Rolling history (last 10)
  _gseHistory.push(result.overallGSE);
  if (_gseHistory.length > 10) _gseHistory.shift();
  
  // Update all CEFR displays
  _updateCEFRBars();
  _updateGSEBadge();
  _drawGSEsparkline();
}

function _updateGSEBadge() {
  var badge = document.getElementById('gseBadge');
  var infoIcon = document.getElementById('gseInfoIcon');
  if (!badge) return;
  if (!isCapabilityAvailable('cefrMetrics') || _sessionGSE == null) {
    badge.style.display = 'none';
    if (infoIcon) infoIcon.style.display = 'none';
    return;
  }
  badge.style.display = '';
  if (infoIcon) infoIcon.style.display = '';
  var band = window.SottotitoliGSE && window.SottotitoliGSE.cefrBand 
    ? window.SottotitoliGSE.cefrBand(_sessionGSE) 
    : { band: _sessionCEFRBand, color: '#22c55e' };
  badge.innerHTML = '<span style="font-weight:700;color:' + (band && band.color || '#fff') + '">GSE ' + _sessionGSE + '</span> <span style="font-size:11px;color:var(--muted)">(' + (band && band.band || '—') + ')</span>';
}

function _drawGSEsparkline() {
  var container = document.getElementById('gseSparkline');
  if (!container) return;
  if (_gseHistory.length < 2) {
    container.innerHTML = '';
    return;
  }
  var w = container.clientWidth || 120;
  var h = 32;
  var pad = 4;
  var gseMin = 10, gseMax = 90; // Fixed GSE scale
  var range = gseMax - gseMin;
  var points = [];
  for (var i = 0; i < _gseHistory.length; i++) {
    var x = pad + (i / (_gseHistory.length - 1)) * (w - pad * 2);
    var y = h - pad - ((_gseHistory[i] - gseMin) / range) * (h - pad * 2);
    points.push(x + ',' + y);
  }
  var lastVal = _gseHistory[_gseHistory.length - 1];
  container.innerHTML = 
    '<svg width="' + w + '" height="' + (h + 2) + '" style="display:block;overflow:visible">' +
    '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="var(--line)" stroke-width="1" stroke-dasharray="2,3"/>' +
    '<text x="' + (w - pad) + '" y="' + (h - pad - 2) + '" fill="var(--muted2)" font-size="8" text-anchor="end" font-family="JetBrains Mono,monospace">' + gseMax + '</text>' +
    '<text x="' + (w - pad) + '" y="' + (h + 8) + '" fill="var(--muted2)" font-size="8" text-anchor="end" font-family="JetBrains Mono,monospace">' + gseMin + '</text>' +
    '<polyline points="' + points.join(' ') + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="' + points[points.length-1].split(',')[0] + '" cy="' + points[points.length-1].split(',')[1] + '" r="3" fill="var(--accent)"/>' +
    '</svg>';
}

function _updateCEFRBars(){
  var lines=document.querySelectorAll('#captionTranscript .line');
  var counts={A1:0,A2:0,B1:0,B2:0,C1:0,C2:0};_cefrWordLists={A1:[],A2:[],B1:[],B2:[],C1:[],C2:[]};
  var seen=new Set();
  lines.forEach(function(l){
    var clone=l.cloneNode(true);clone.querySelectorAll('span,.spk-tag').forEach(function(s){s.remove()});
    (clone.textContent||'').trim().split(/\s+/).forEach(function(w){
      var clean=w.replace(/[^a-zA-Z]/g,'').toLowerCase();if(clean.length<2)return;
      var lvl=_getCEFR(w);counts[lvl]=(counts[lvl]||0)+1;
      if(!seen.has(clean)){seen.add(clean);_cefrWordLists[lvl].push(clean);}
    });
  });
  var total=Object.values(counts).reduce(function(a,b){return a+b},0)||1;
  var bars=document.getElementById('cefrBars');if(!bars)return;
  // Update total badge
  var badge=document.getElementById('cefrTotalBadge');
  if(badge)badge.textContent='Totale: '+total.toLocaleString()+' parole';
  // Level labels in Italian
  var labels={C2:'C2 · Mastery',C1:'C1 · Advanced',B2:'B2 · Upper Intermediate',B1:'B1 · Intermediate',A2:'A2 · Elementary',A1:'A1 · Beginner'};
  var html='';var order=['C2','C1','B2','B1','A2','A1'];
  order.forEach(function(lvl){
    var c=counts[lvl]||0;var pct=Math.round(c/total*100);
    var color=_cefrColors[lvl]||'#888';
    html+='<div style="display:flex;flex-direction:column;gap:2px">';
    html+='<div style="display:flex;justify-content:space-between;align-items:baseline">';
    html+='<span style="font-size:11px;font-weight:700;color:'+color+'">'+labels[lvl]+'</span>';
    html+='<span style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace">'+pct+'% ('+c+' parole)</span>';
    html+='</div>';
    html+='<div style="height:10px;background:var(--bg);border-radius:5px;overflow:hidden">';
    html+='<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:5px;box-shadow:0 0 8px '+color+'44;transition:width .4s"></div>';
    html+='</div></div>';
  });
  bars.innerHTML=html||'<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Start speaking to see CEFR breakdown.</div>';
}

// ═══ Topic Explorer — donut chart + word list ═══
var _topicCache = null;
var _topicWordMap = {};  // word → {level, topics[]} from /analyze wordData
var _topicColorMap = {}; // topic → color from donut chart
var _topicLastFetch = 0;
var _topicSelected = null;
var _topicRefreshInterval = null;

// Gentle auto-refresh only while the Topics slide is visible (every 20s)
function _startTopicInterval() {
  _stopTopicInterval();
  _topicRefreshInterval = setInterval(function() {
    if (!sessionActive) return;
    try { _fetchTopics(); } catch(e) {}
  }, 20000);
}

function _stopTopicInterval() {
  if (_topicRefreshInterval) {
    clearInterval(_topicRefreshInterval);
    _topicRefreshInterval = null;
  }
}

function _fetchTopics() {
  var container = document.getElementById('topicDonut');
  if (!container) return;

  // Show spinner on refresh button
  var refreshBtn = document.getElementById('topicRefreshBtn');
  if (refreshBtn) {
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    refreshBtn.style.pointerEvents = 'none';
  }

  if (!isCapabilityAvailable('cefrMetrics')) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Topics available for English only.<br><span style="font-size:11px">Switch caption language to English.</span></div>';
    _resetTopicRefreshBtn();
    return;
  }
  
  var now = Date.now();
  if (_topicCache && (now - _topicLastFetch) < 15000) {
    _renderTopicDonut(_topicCache);
    _resetTopicRefreshBtn();
    return;
  }
  
  var lines = document.querySelectorAll('#captionTranscript .line');
  if (lines.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Start speaking to see topic distribution.<br><span style="font-size:11px">Topics appear after ~30 words of transcript.</span></div>';
    _resetTopicRefreshBtn();
    return;
  }
  
  var fullText = '';
  lines.forEach(function(l) {
    var clone = l.cloneNode(true);
    clone.querySelectorAll('span,.spk-tag').forEach(function(s) { s.remove(); });
    fullText += (clone.textContent || '') + ' ';
  });
  fullText = fullText.trim();
  
  if (fullText.length < 30) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Need more text for topic analysis.<br><span style="font-size:11px">Keep speaking — topics appear after ~30 words.</span></div>';
    _resetTopicRefreshBtn();
    return;
  }
  
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px"><i class="fas fa-spinner fa-spin"></i> Analyzing topics…</div>';
  
  fetch(_cefrApiUrl + '/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fullText, lang: (currentCaptionLang || 'en-US').split('-')[0] })
  })
  .then(function(r) {
    if (!r.ok) throw new Error('API returned ' + r.status);
    return r.json();
  })
  .then(function(data) {
    if (data && data.topicDistribution && Object.keys(data.topicDistribution).length > 0) {
      _topicCache = data.topicDistribution;
      _topicLastFetch = Date.now();
      // Store word→topic mappings for the right panel
      if (data.wordData) {
        _topicWordMap = {};
        for (var w in data.wordData) {
          _topicWordMap[w] = {
            level: data.wordData[w].level,
            topics: data.wordData[w].topics || []
          };
        }
      }
      _renderTopicDonut(data.topicDistribution);
    } else {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">No topics detected yet.<br><span style="font-size:11px">Try speaking for longer — topics need diverse vocabulary.</span></div>';
    }
    _resetTopicRefreshBtn();
  })
  .catch(function(err) {
    console.warn('Topic API unavailable:', err.message || err);
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Topic analysis unavailable.<br><span style="font-size:11px">The CEFR service may be starting up (free tier cold start). Try again in 30s.</span></div>';
    _resetTopicRefreshBtn();
  });
}

function _resetTopicRefreshBtn() {
  var btn = document.getElementById('topicRefreshBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    btn.style.pointerEvents = '';
  }
}

function _renderTopicDonut(topics) {
  var container = document.getElementById('topicDonut');
  if (!container) return;
  var total = 0;
  for (var k in topics) { total += topics[k]; }
  if (total === 0) return;
  
  var colors = ['#a855f7','#3b82f6','#22c55e','#eab308','#f97316','#ef4444',
                '#8b5cf6','#06b6d4','#84cc16','#f59e0b','#f43f5e'];
  var cx = 100, cy = 100, r = 65, strokeWidth = 28;
  var circumference = 2 * Math.PI * r;
  var offset = 0;
  var paths = '';
  var legendHtml = '';
  var i = 0;
  var sorted = [];
  for (var k in topics) { sorted.push([k, topics[k]]); }
  sorted.sort(function(a, b) { return b[1] - a[1]; });
  
  sorted.forEach(function(entry) {
    var topic = entry[0], count = entry[1];
    var pct = count / total;
    var dash = pct * circumference;
    var color = colors[i % colors.length];
    _topicColorMap[topic] = color;
    paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
      '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth +
      '" stroke-dasharray="' + dash + ' ' + (circumference - dash) +
      '" stroke-dashoffset="' + (-offset) + '" style="cursor:pointer" ' +
      'onclick="_selectTopic(\'' + topic.replace(/'/g,"\\'") + '\')"/>';
    legendHtml += '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;cursor:pointer;font-size:12px" onclick="_selectTopic(\'' + topic.replace(/'/g,"\\'") + '\')">' +
      '<span style="width:10px;height:10px;border-radius:3px;background:' + color + ';flex-shrink:0"></span>' +
      '<span style="flex:1;color:var(--text)">' + topic + '</span>' +
      '<span style="font-weight:600;color:var(--muted);min-width:24px;text-align:right">' + count + '</span>' +
      '<span style="color:var(--muted2);min-width:32px;text-align:right;font-size:10px">' + Math.round(pct * 100) + '%</span></div>';
    offset += dash;
    i++;
  });
  
  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center">' +
    '<svg width="200" height="200" viewBox="0 0 200 200">' + paths + '</svg>' +
    '<div style="flex:1;min-width:140px;max-height:200px;overflow-y:auto">' + legendHtml + '</div>' +
    '</div>';
  
  // Always show all-topics overview by default — user clicks a topic to filter
  _renderTopicWords();
}

function _selectTopic(topic) {
  _topicSelected = topic;
  _renderTopicWords();
}

function _renderTopicWords() {
  var container = document.getElementById('topicWordList');
  if (!container) return;
  
  // Build word→topics from _topicWordMap (CEFR /analyze wordData with topics)
  var topicGroups = {}; // topic → [{word, level}]
  var hasTopicData = false;
  
  for (var w in _topicWordMap) {
    var info = _topicWordMap[w];
    var topics = info.topics || [];
    if (topics.length === 0) continue;
    hasTopicData = true;
    for (var t = 0; t < topics.length; t++) {
      var topic = topics[t];
      if (_topicSelected && topic !== _topicSelected) continue;
      if (!topicGroups[topic]) topicGroups[topic] = [];
      topicGroups[topic].push({ word: w, level: info.level || 1 });
    }
  }
  
  // Fallback: use _sessionWordCache (no topic data) — flat list
  if (!hasTopicData) {
    var words = [];
    var seen = {};
    for (var w2 in _sessionWordCache) {
      if (seen[w2]) continue; seen[w2] = true;
      var inf = _sessionWordCache[w2];
      words.push({ word: w2, level: inf.level || 1 });
    }
    if (words.length === 0) {
      // Transcript fallback
      var lines = document.querySelectorAll('#captionTranscript .line');
      lines.forEach(function(l) {
        var clone = l.cloneNode(true);
        clone.querySelectorAll('span,.spk-tag').forEach(function(s) { s.remove(); });
        (clone.textContent || '').trim().split(/\s+/).forEach(function(w3) {
          var clean = w3.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
          if (clean.length < 2 || seen[clean]) return;
          seen[clean] = true;
          words.push({ word: clean, level: 1 });
        });
      });
    }
    if (words.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">No words yet. Start speaking to see them here.</div>';
      return;
    }
    // Flat list fallback
    var sortBy = (document.getElementById('topicSortSel') || {}).value || 'freq';
    words.sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
    var html2 = '<div style="font-size:12px;color:var(--muted2);margin-bottom:8px;font-weight:600">' + words.length + ' parole</div>';
    html2 += '<div style="display:flex;flex-wrap:wrap;gap:5px">';
    var levelColors = {1:'#22c55e',2:'#a3e635',3:'#facc15',4:'#fb923c',5:'#f87171',6:'#c084fc'};
    words.forEach(function(w) {
      var lvl = Math.min(6, Math.max(1, Math.round(w.level) || 1));
      var color = levelColors[lvl] || '#888';
      html2 += '<span style="padding:4px 10px;border-radius:99px;font-size:12px;font-weight:500;background:' + color + '18;color:' + color + ';border:1px solid ' + color + '30;cursor:default">' + w.word + '</span>';
    });
    html2 += '</div>';
    container.innerHTML = html2;
    return;
  }
  
  // Sort topics by word count descending
  var sortedTopics = Object.keys(topicGroups).sort(function(a, b) {
    return topicGroups[b].length - topicGroups[a].length;
  });
  
  // Sort words within each topic by level
  for (var t2 = 0; t2 < sortedTopics.length; t2++) {
    topicGroups[sortedTopics[t2]].sort(function(a, b) { return (b.level || 0) - (a.level || 0); });
  }
  
  var html = '';
  // If a specific topic is selected, show a back link
  if (_topicSelected && sortedTopics.length === 1) {
    html += '<div style="margin-bottom:10px"><span onclick="_topicSelected=null;_renderTopicWords()" style="cursor:pointer;font-size:12px;color:var(--accent);font-weight:600">← All topics</span></div>';
  }
  // Total word count
  var totalWords = 0;
  sortedTopics.forEach(function(t) { totalWords += topicGroups[t].length; });
  html += '<div style="font-size:12px;color:var(--muted2);margin-bottom:10px;font-weight:600">' + totalWords + ' parole in ' + sortedTopics.length + ' temi</div>';
  
  sortedTopics.forEach(function(topic) {
    var color = _topicColorMap[topic] || '#888';
    var words = topicGroups[topic];
    html += '<div style="margin-bottom:12px">';
    html += '<div style="font-weight:700;font-size:13px;color:' + color + ';margin-bottom:6px;display:flex;align-items:center;gap:6px">';
    html += '<span style="width:8px;height:8px;border-radius:2px;background:' + color + ';flex-shrink:0"></span>';
    html += topic + ' <span style="font-weight:400;font-size:11px;color:var(--muted2)">(' + words.length + ')</span>';
    html += '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    words.forEach(function(w) {
      html += '<span style="padding:3px 9px;border-radius:99px;font-size:11px;font-weight:500;background:' + color + '14;color:' + color + ';border:1px solid ' + color + '28;cursor:default">' + w.word + '</span>';
    });
    html += '</div></div>';
  });
  
  container.innerHTML = html;
}

// ═══ Rarity indicator — highlight rare words in transcript ═══
var _rareWordsSpotted = {};
function _checkRareWords(text) {
  if (!isCapabilityAvailable('cefrMetrics')) return;
  var tokens = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  tokens.forEach(function(w) {
    if (_rareWordsSpotted[w]) return;
    var info = _sessionWordCache[w];
    if (info && info.frequency_count != null && info.frequency_count < 1000) {
      _rareWordsSpotted[w] = true;
      _highlightRareWord(w);
    }
  });
}
function _highlightRareWord(word) {
  var container = document.getElementById('v20qContent') || document.getElementById('captionTranscript');
  if (!container) return;
  var spans = container.querySelectorAll('.v20q-w');
  spans.forEach(function(span) {
    if (span.textContent.trim().toLowerCase().replace(/[^a-z]/g, '') === word) {
      span.classList.add('word-rare');
      setTimeout(function() { span.classList.remove('word-rare'); }, 1600);
    }
  });
}

function downloadCEFRPDF(){
  var lines=document.querySelectorAll('#captionTranscript .line');
  var posWords={NOUN:[],VERB:[],ADJ:[],ADV:[]};var seen=new Set();
  lines.forEach(function(l){
    var clone=l.cloneNode(true);clone.querySelectorAll('span,.spk-tag').forEach(function(s){s.remove()});
    (clone.textContent||'').trim().split(/\s+/).forEach(function(w){
      var clean=w.replace(/[^a-zA-Z]/g,'').toLowerCase();if(clean.length<2||seen.has(clean))return;
      seen.add(clean);
      var pos = (typeof tagWord === 'function') ? tagWord(clean) : 'WORD';
      if(posWords[pos])posWords[pos].push(clean);
    });
  });
  var h='<!DOCTYPE html><html><head><meta charset="utf-8">';
  h+='<meta name="google" content="notranslate" /><title>CEFR Report</title><style>body{font-family:sans-serif;font-size:12px;padding:20px;max-width:700px;margin:0 auto}h1{font-size:18px}h2{font-size:14px;color:#555;margin-top:20px}.bar-wrap{display:flex;align-items:center;gap:8px;margin:4px 0}.bar-wrap span{font-size:11px}.bar{flex:1;height:16px;background:#eee;border-radius:4px}.bar-fill{height:100%;border-radius:4px}.words{columns:3;font-size:10px;color:#333;line-height:1.6;margin-top:8px}</style></head><body>';
  h+='<h1>📊 CEFR Report</h1><p>'+new Date().toLocaleDateString()+'</p><h2>CEFR Levels</h2>';
  ['C2','C1','B2','B1','A2','A1'].forEach(function(lvl){
    var words=_cefrWordLists[lvl]||[];h+='<div class="bar-wrap"><span style="font-weight:700;color:'+(_cefrColors[lvl]||'#888')+'">'+lvl+'</span><div class="bar"><div class="bar-fill" style="width:'+Math.min(100,words.length*5)+'%;background:'+(_cefrColors[lvl]||'#888')+'"></div></div><span>'+words.length+' words</span></div><div class="words">'+words.join(', ')+'</div>';
  });
  h+='<h2>Vocabulary by POS</h2>';
  [{k:'NOUN',n:'Nouns'},{k:'VERB',n:'Verbs'},{k:'ADJ',n:'Adjectives'},{k:'ADV',n:'Adverbs'}].forEach(function(p){
    var words=posWords[p.k]||[];if(!words.length)return;
    h+='<h3>'+p.n+' ('+words.length+')</h3><div class="words">'+words.join(', ')+'</div>';
  });
  h+='</body></html>';
  _openPrintableHtml(h, 'sottotitoli-cefr-report.html');
}

// ── Printable-report helper: iOS Safari has no window.print() → blob download ──
function _openPrintableHtml(h, filename){
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    try {
      var blob = new Blob([h], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename || 'sottotitoli-report.html';
      document.body.appendChild(a); a.click();
      setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    } catch(e) { console.warn('blob download failed:', e); }
    return;
  }
  var w = window.open('', '_blank', 'width=800,height=600');
  if (w) { w.document.write(h); w.document.close(); setTimeout(function(){ w.print(); }, 500); }
}

// ── Vocab POS Stack ──
function _updateVocabPosStack() {
  var stack = document.getElementById('vocabPosStack'); if (!stack) return;
  var lines = document.querySelectorAll('#captionTranscript .line');
  var posMap = {}; var posOrder = ['NOUN','VERB','ADJ','ADV','PREP','CONJ','PRON','AUX'];
  var posNames = {NOUN:'Sostantivi',VERB:'Verbi',ADJ:'Aggettivi',ADV:'Avverbi',PREP:'Preposizioni',CONJ:'Congiunzioni',PRON:'Pronomi',AUX:'Ausiliari'};
  var posColors = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa'};
  lines.forEach(function(l){
    var clone=l.cloneNode(true);var spans=clone.querySelectorAll('span');spans.forEach(function(s){s.remove()});
    var spks=clone.querySelectorAll('.spk-tag');spks.forEach(function(s){s.remove()});
    var lineText = (clone.textContent||'').trim();
    lineText.split(/\s+/).forEach(function(w){
      var clean=w.replace(/[^a-zA-Z'-]/g,'').toLowerCase();if(clean.length<2)return;
      // Use enhanced tagWord with full sentence context for Penn Treebank accuracy
      var pos = (typeof tagWord === 'function') ? tagWord(clean, lineText) : 'WORD';
      if (pos === 'FUNC' || pos === 'WORD' || pos === 'OTHER') pos = (typeof tagWord === 'function') ? tagWord(clean) : 'WORD';
      if(!posMap[pos])posMap[pos]=[];if(posMap[pos].indexOf(clean)<0)posMap[pos].push(clean);
    });
  });
  var html='';posOrder.forEach(function(pos){
    var words=posMap[pos]||[];if(words.length===0)return;
    var color=posColors[pos]||'#9ca3af';
    html+='<div>';
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    html+='<span style="width:8px;height:8px;border-radius:50%;background:'+color+';flex-shrink:0"></span>';
    html+='<span style="font-size:13px;font-weight:700;color:'+color+'">'+posNames[pos]+'</span>';
    html+='<span style="font-size:11px;color:var(--muted);font-family:JetBrains Mono,monospace">('+words.length+')</span>';
    html+='</div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    words.forEach(function(w){
      html+='<span style="padding:4px 12px;background:'+color+'15;border:1px solid '+color+'40;color:'+color+';border-radius:99px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s" onmouseover="this.style.background=\''+color+'25\'" onmouseout="this.style.background=\''+color+'15\'">'+w+'</span>';
    });
    html+='</div></div>';
  });
  stack.innerHTML=html||'<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">Start speaking to see words grouped by part of speech.</div>';
}
function _grammarLineClick(el) {
  document.querySelectorAll('.grammar-line').forEach(function(l){l.style.background=''});
  el.style.background = 'rgba(124,58,237,.08)';
  var text = el.getAttribute('data-text') || '';
  // Hide placeholder
  var placeholder = document.getElementById('grammarPlaceholder');
  if (placeholder) placeholder.style.display = 'none';
  // Show selected line box with the clicked text
  var selBox = document.getElementById('grammarSelectedBox');
  var selText = document.getElementById('grammarSelectedText');
  if (selBox) selBox.style.display = 'block';
  if (selText) selText.textContent = text;
  // Populate SYN cards
  var container = document.getElementById('grammarSynCards');
  if (!container) return;
  _buildSynCardsInPanel(text, container);
}
function _buildSynCardsInPanel(text, container) {
  var rawWords = text.split(/\s+/);
  var contentWords = [];
  rawWords.forEach(function(w) {
    var clean = w.replace(/[.,;:!?…'"]/g, '').toLowerCase();
    if (clean.length > 2 && !_stopWords.test(clean)) contentWords.push(clean);
  });
  if (contentWords.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:12px">No content words in this line.</div>';
    return;
  }
  var ts = Date.now();
  var html = '<div class="wc-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">';
  contentWords.forEach(function(word, i) {
    var cardId = 'synwg-' + ts + '-' + i;
    var pos = (typeof _getPOS === 'function') ? _getPOS(word) : '—';
    html += _buildCardHTML(word, cardId, pos, false, '');
  });
  html += '</div>';
  container.innerHTML = html;
  contentWords.forEach(function(word, i) {
    var cardId = 'synwg-' + ts + '-' + i;
    _fetchWordData(word, cardId);
  });
}

// ═══ Analysis slide: click handler (same pattern as grammar) ═══
function _analysisLineClick(el) {
  document.querySelectorAll('.analysis-line').forEach(function(l){l.style.background=''});
  el.style.background = 'rgba(124,58,237,.08)';
  var text = el.getAttribute('data-text') || '';
  // Show selected line box
  var selBox = document.getElementById('analysisSelectedBox');
  var selText = document.getElementById('analysisSelectedText');
  if (selBox) selBox.style.display = 'block';
  if (selText) selText.textContent = text;
  // Populate SYN cards
  var container = document.getElementById('analysisSynCards');
  if (!container) return;
  _buildSynCardsInPanel(text, container);
}

// ═══ Speaker mode (SOLO / DUO+) ═══
function setSpeakerMode(mode) {
  var soloBtn = document.getElementById('modeSoloBtn');
  var duoBtn = document.getElementById('modeDuoBtn');
  if (mode === 'solo') {
    if (soloBtn) { soloBtn.className = 'btn-sm active'; }
    if (duoBtn) { duoBtn.className = 'btn-sm'; }
    setSpeakerCount('1');
    // Close speaker panel fully
    var app = document.getElementById('appMain');
    var sidebar = document.getElementById('duoSpeakerSidebar');
    var toggle = document.getElementById('duoToggleBtn');
    var spkBtn = document.getElementById('speakersToggleBtn');
    if (app) app.classList.remove('speakers-open');
    if (sidebar) sidebar.classList.remove('open');
    if (toggle) { toggle.classList.remove('open'); toggle.innerHTML = '▸'; toggle.style.display = 'none'; }
    if (spkBtn) { spkBtn.classList.remove('panel-active'); spkBtn.style.opacity = '0.4'; spkBtn.style.pointerEvents = 'none'; }
    // Disconnect WebSocket
    if (window._duoWs) { try { window._duoWs.close(); } catch(e){} window._duoWs = null; }
    window._duoMode = false;
  } else {
    if (soloBtn) { soloBtn.className = 'btn-sm'; }
    if (duoBtn) { duoBtn.className = 'btn-sm active'; }
    setSpeakerCount('2');
    // Open speaker panel
    var app = document.getElementById('appMain');
    var sidebar = document.getElementById('duoSpeakerSidebar');
    var toggle = document.getElementById('duoToggleBtn');
    var spkBtn = document.getElementById('speakersToggleBtn');
    if (app) app.classList.add('speakers-open');
    if (sidebar) sidebar.classList.add('open');
    if (toggle) { toggle.style.display = 'block'; toggle.classList.add('open'); toggle.innerHTML = '◂'; }
    if (spkBtn) { spkBtn.style.opacity = ''; spkBtn.style.pointerEvents = ''; spkBtn.classList.add('panel-active'); }
    // Show host section, hide invitee section
    var hostSec = document.getElementById('duoHostSection');
    var invSec = document.getElementById('duoInviteeSection');
    var mgmtBtn = sidebar ? sidebar.querySelector('.duo-speaker-sidebar-head button') : null;
    if (hostSec) hostSec.style.display = 'block';
    if (invSec) invSec.style.display = 'none';
    if (mgmtBtn) mgmtBtn.style.display = 'flex';
    window._duoMode = true;
    window._duoIsHost = true;
    window._duoHostName = window._duoSpeakerName; // host is self
    // Create room + connect
    if (!window._duoRoomId) {
      window._duoRoomId = 'cap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2,6);
      window._duoSpeakerLang = (window._currentCaptionLang || 'en-US').split('-')[0];
      window._duoSpeakerName = 'Host';
      // Store host identity so they can re-enter without join screen
      localStorage.setItem('sottotitoli-duo-is-host-' + window._duoRoomId, '1');
      var sb = window.sottotitoliSupabase;
      if (sb) {
        sb.auth.getSession().then(function(r){
          if (r.data?.session) {
            var uid = r.data.session.user.id;
            localStorage.setItem('sottotitoli-duo-host-' + window._duoRoomId, uid);
            var n = r.data.session.user.user_metadata?.full_name || r.data.session.user.email?.split('@')[0] || 'Host';
            window._duoSpeakerName = n;
            window.duoRenderSpeakers();
            if (window._duoWs && window._duoWs.readyState === WebSocket.OPEN) {
              window._duoWs.send(JSON.stringify({ type:'duo-join', name:n, lang:window._duoSpeakerLang }));
            }
          }
        });
      }
    }
    duoConnectWebSocket();
    duoUpdateInviteUrl();
    // Host appears in speaker list via exposed init
    if (typeof window.duoInitHost === 'function') window.duoInitHost();
  }
  localStorage.setItem('sottotitoli-speaker-mode', mode);
}

// Restore saved speaker mode — always SOLO by default, DUO+ only for invite links
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var sm;
  if (urlParams.get('join') === '1') {
    // Invite link — must be DUO+
    sm = 'duo';
  } else {
    // Every other entry: force SOLO
    sm = 'solo';
    localStorage.setItem('sottotitoli-speaker-mode', 'solo');
  }
  if (sm === 'duo') window._duoMode = true;
  setTimeout(function() { setSpeakerMode(sm); }, 100);
})();

// Restore saved mode — sanitize: only allow known caption styles
// If URL already has mode=translate, don't overwrite it with caption mode
var saved = localStorage.getItem('sottotitoli-caption-mode') || 'j7b';
var VALID_MODES = ['j7b','i1'];
if (VALID_MODES.indexOf(saved) === -1) { saved = 'j7b'; localStorage.removeItem('sottotitoli-caption-mode'); }
var isTranslateUrl = window.location.search.indexOf('mode=translate') !== -1;
if (isTranslateUrl) {
  // Apply caption style without URL change — translate mode owns the URL
  currentCaptionMode = saved;
  document.documentElement.setAttribute('data-caption-mode', saved);
  localStorage.setItem('sottotitoli-caption-mode', saved);
} else {
  setCaptionMode(saved);
}

// ═══ Theme handled by theme-2.js ═══

// ═══ Slide dots nav (4 slides: Captions, Vocabulary, Word Meaning, Grammar Fix) ═══
(function() {
  var panels=document.querySelectorAll('.h-panel');
  var scrollEl=document.getElementById('modeScroll');
  var total=panels.length,idx=0;
  var visibleIndices = [0,1,2,3,4]; // panel indices (5 slides: Cap, Vocab, Words, Grammar, Topics)

  function goTo(i){
    if(i<0||i>=visibleIndices.length)return;
    var realIdx = visibleIndices[i];
    panels.forEach(function(p){p.style.opacity='0';p.style.transition='opacity .12s'});
    setTimeout(function(){
      idx=i;scrollEl.scrollLeft=realIdx*scrollEl.clientWidth;updateDots();
      
      // Topics slide: auto-refresh on entry + gentle interval while visible
      if (realIdx === 4) {
        try { _fetchTopics(); } catch(e) {}
        _startTopicInterval();
      } else {
        _stopTopicInterval();
      }
      
      setTimeout(function(){panels.forEach(function(p){p.style.opacity='1'})},30);
    },130);
  }

  function updateDots(){
    var allDots = document.querySelectorAll('.slide-dot');
    var titles = ['Captions','Vocabulary','Word Meaning','Grammar Fix','Topics'];

    allDots.forEach(function(d,i){
      var realI = parseInt(d.getAttribute('data-slide'));
      d.style.display = visibleIndices.includes(realI) ? '' : 'none';
    });

    var visibleDots = document.querySelectorAll('.slide-dot:not([style*=\"display: none\"])');
    visibleDots.forEach(function(d,i){d.classList.toggle('active',i===idx)});

    var realIdx = visibleIndices[idx] !== undefined ? visibleIndices[idx] : 0;
    var el=document.getElementById('slideTitleOverlay');
    if(el)el.textContent=titles[realIdx]||'';
  }

  // Apply language-specific visibility (4 slides: 0=Cap, 1=Vocab, 2=WordMeaning, 3=GrammarFix)
  S8T_LANG.resolve(S8T_LANG.readRoomConfig()).then(function(ls){
    if (ls.content_language && ls.content_language !== 'en') {
      // Non-English: hide Vocabulary (slide 1) and Topics (slide 4) — keep Captions, Word Meaning, Grammar Fix
      visibleIndices = [0,2,3];
    }
    // View POS mode: English only (requires Penn Treebank tagger)
    var posBtn = document.getElementById('posModeBtn');
    if (posBtn) posBtn.style.display = (ls.content_language === 'en') ? '' : 'none';
    document.querySelectorAll('.slide-dot').forEach(function(d){
      var realI = parseInt(d.getAttribute('data-slide'));
      d.style.display = visibleIndices.includes(realI) ? '' : 'none';
    });
    updateDots();
    goTo(0);
  }).catch(function(){
    updateDots();
    goTo(0);
  });

  document.querySelectorAll('.slide-dot').forEach(function(dot){
    dot.addEventListener('click',function(){
      var realSlide = parseInt(this.getAttribute('data-slide'));
      var visIdx = visibleIndices.indexOf(realSlide);
      if (visIdx >= 0) goTo(visIdx);
    });
  });

  var scrollTicking=false;
  scrollEl.addEventListener('scroll',function(){
    if(!scrollTicking){requestAnimationFrame(function(){
      var rawIdx = Math.round(scrollEl.scrollLeft/scrollEl.clientWidth);
      var visIdx = visibleIndices.indexOf(rawIdx);
      if(visIdx!==idx&&visIdx>=0){idx=visIdx;updateDots();}
      scrollTicking=false;
    });scrollTicking=true;}
  },{passive:true});

  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();goTo(idx+1)}
    if(e.key==='ArrowLeft'){e.preventDefault();goTo(idx-1)}
  });

  panels.forEach(function(p){p.style.transition='opacity .12s'});
  scrollEl.style.scrollBehavior='auto';

  // Fix: restore scroll position on resize
  window.addEventListener('resize',function(){
    var realIdx = visibleIndices[idx] !== undefined ? visibleIndices[idx] : 0;
    scrollEl.scrollLeft=realIdx*scrollEl.clientWidth;
  });
})();

// ═══ Grammar font size toggle ═══
var _grammarFontSize=15;
function adjustGrammarFont(delta){
  _grammarFontSize=Math.max(8,Math.min(24,_grammarFontSize+delta));
  var box=document.getElementById('grammarTranscriptLines');
  if(box)box.style.setProperty('--grammar-fs',_grammarFontSize+'px');
  var box5=document.getElementById('grammarCorrectTranscriptLines');
  if(box5)box5.style.setProperty('--grammar-fs',_grammarFontSize+'px');
  var label=document.getElementById('grammarFontSize');
  if(label)label.textContent=_grammarFontSize+'px';
  var label3=document.getElementById('grammarFontSize3');
  if(label3)label3.textContent=_grammarFontSize+'px';
}

// ═══ Grammar engine: auto-selected per language ═══
var _lastGrammarText = '';
var _lastLangSettings = null;

// Retry with a different model
window.retryGrammarCheck = function(modelId) {
  var corrEl = document.getElementById('grammarCorrectedText');
  var explEl = document.getElementById('grammarExplanation');
  if (corrEl) corrEl.innerHTML = '<span style="opacity:.5">Checking with ' + S8T_LANG.getModelLabel(modelId) + '…</span>';
  _highlightGrammarModelBtn(modelId);
  if (!_lastLangSettings || !_lastGrammarText) return;

  var sb = window.sottotitoliSupabase;
  if (!sb) return;

  sb.functions.invoke('grammar-segment', {
    body: { text: _lastGrammarText, mode: 'fix_grammar', provider: _lastLangSettings.provider, content_language: _lastLangSettings.content_language, explanation_language: _lastLangSettings.explanation_language, model: modelId }
  }).then(function(res) {
    if (res.error) throw new Error(res.error.message || res.error);
    var data = res.data;
    var result = data.result;
    var grammar = data.grammar;
    if (!grammar || grammar.status === 'failed') {
      if (corrEl) corrEl.innerHTML = '<span style="color:var(--warn)">⚠️ ' + (data.error || 'Failed') + '</span>';
      return;
    }

    var correctedText = result ? result.corrected : grammar.corrected_text;
    var hasChanges = result
      ? (result.changes && result.changes.length > 0)
      : (grammar.corrected_text !== _lastGrammarText);
    var hasSilentEdits = result
      ? (result.silent_edits && result.silent_edits.length > 0)
      : false;

    // Detect when model corrected text but failed to provide change details
    var wordsDiffer = false;
    if (!hasChanges && correctedText && correctedText !== _lastGrammarText) {
      var norm = function(s) { return (s||'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase(); };
      wordsDiffer = norm(correctedText) !== norm(_lastGrammarText);
    }
    var unexplainedFix = !hasChanges && wordsDiffer;

    if (corrEl) {
      if (!hasChanges && !hasSilentEdits && !unexplainedFix) {
        corrEl.innerHTML = '<span style="color:var(--good)">✓ No errors found</span>';
      } else if (unexplainedFix) {
        corrEl.innerHTML = correctedText + ' <span style="font-size:10px;color:var(--amber);margin-left:8px">(corrected, see below)</span>';
      } else if (!hasChanges && hasSilentEdits) {
        corrEl.innerHTML = correctedText + ' <span style="font-size:10px;color:var(--muted2);margin-left:8px">(punctuation only)</span>';
      } else {
        corrEl.textContent = correctedText || _lastGrammarText;
      }
    }

    if (result && result.changes && result.changes.length > 0) {
      _renderGrammarChanges(explEl, result.changes, result.silent_edits || []);
    } else if (explEl && unexplainedFix) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:10px"><span style="color:var(--amber);font-size:18px">⚠️</span><p style="color:var(--amber);font-size:13px;font-weight:600;margin:8px 0 4px">Model corrected the text but didn\'t explain how.</p><p style="color:var(--muted2);font-size:12px;margin:0">Try checking the sentence again to get an explanation.</p></div>';
    } else if (explEl && data.explanation) {
      _renderGrammarErrors(explEl, data.explanation);
    } else if (explEl && !hasChanges && !hasSilentEdits) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--good);font-size:14px;font-weight:500">✓ No grammar issues detected.</div>';
    } else if (explEl) {
      explEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted2);font-size:13px">No specific grammar errors identified.</div>';
    }

    _highlightGrammarModelBtn(modelId);

    // Update save button for the new model's results
    var saveBtn = document.getElementById('grammarSaveBtn');
    if (saveBtn && hasChanges) {
      saveBtn.disabled = false;
      saveBtn.setAttribute('data-original', _lastGrammarText);
      saveBtn.setAttribute('data-corrected', correctedText || _lastGrammarText);
      saveBtn.setAttribute('data-explanation', data.explanation || '');
      if (result) saveBtn.setAttribute('data-changes', JSON.stringify(result.changes));
    } else if (saveBtn && !hasChanges) {
      saveBtn.disabled = true;
    }
  }).catch(function(err) {
    if (corrEl) corrEl.innerHTML = '<span style="color:var(--danger)">⚠️ ' + (err.message || 'Error') + '</span>';
  });
};

// ═══ Mode 5: Corrected-feed view ═══
var _correctedFeedMode = false;
window.toggleCorrectedFeed = function(force) {
  if (typeof force === 'boolean') _correctedFeedMode = force;
  else _correctedFeedMode = !_correctedFeedMode;
  var btn = document.getElementById('correctedFeedBtn');
  if (btn) {
    btn.textContent = _correctedFeedMode ? '👁 Raw' : '👁 Corrected';
    btn.style.borderColor = _correctedFeedMode ? 'var(--accent)' : 'var(--line)';
    btn.style.color = _correctedFeedMode ? 'var(--accent)' : 'var(--muted)';
    btn.style.background = _correctedFeedMode ? 'rgba(6,182,212,.08)' : 'var(--card)';
  }
  // Re-render all transcript boxes
  _grammarLastLineCount = 0;
  _updateGrammarLines();
};

// Keyboard shortcut: Ctrl+Shift+G
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'G') {
    e.preventDefault();
    toggleCorrectedFeed();
  }
});
var sessionActive = false;
var timerInterval = null;
var sessionSeconds = 0;
var paused = false;
var pauseBtn = null;

// Connect real mic callbacks
// Continuity tracking: when live box overflows, mark continuation
var _isContinuation = false;

_realMic.onInterim = function(text) {
  var interim = document.getElementById('captionInterim');
  if (!interim) return;
  interim.textContent = formatCaptionText(text, 50, 2);
  
  // If the box is full (overflowing 2 lines), force-finalize immediately
  if (interim.scrollHeight > interim.clientHeight && text.trim().length > 0) {
    _isContinuation = true;
    if (_realMic.onFinal) _realMic.onFinal(text + '…');
    interim.textContent = '';
    if (_realMic.recognition) {
      try { _realMic.recognition.stop(); } catch(e) {}
    }
  }
};

// ── Subtitle formatting: max 2 lines, max 50 chars per line ──
// Breaks at word boundaries. Shows the most recent 2 lines of content.
function formatCaptionText(text, maxChars, maxLines) {
  maxChars = maxChars || 50;
  maxLines = maxLines || 2;
  if (!text) return '';
  var words = text.trim().split(/\s+/);
  var lines = [];
  var current = '';
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    var test = current ? current + ' ' + w : w;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      // If a single word exceeds maxChars, force it onto its own line
      current = w.length > maxChars ? w.substring(0, maxChars) : w;
    }
  }
  if (current) lines.push(current);
  // Keep only the last N lines
  while (lines.length > maxLines) lines.shift();
  return lines.join('\n');
}

// Also add a subtle pulse to the extras panel when it refreshes
(function() {
  var _origRefresh = window.refreshExtrasPanel;
  if (typeof _origRefresh === 'function') {
    window.refreshExtrasPanel = function() {
      _origRefresh();
      var panel = document.getElementById('extrasPanel');
      if (panel && panel.classList.contains('show')) {
        panel.classList.add('pulse');
        setTimeout(function() { panel.classList.remove('pulse'); }, 500);
      }
    };
  }
})();

// ═══ Filler word detection (multi-language) — must be defined before onFinal ──
var FILLERS_BY_LANG = {
  en: ['uh','um','eh','you know','like','i mean','sort of','kind of','actually','basically','literally','right','okay','so'],
  it: ['allora','cioè','tipo','quindi','ehm','beh','insomma','praticamente','diciamo','ecco','mah','boh','comunque','alla fine','nel senso'],
  nl: ['dus','nou','uh','euhm','zeg maar','eigenlijk','gewoon','weet je','ofzo','nou ja','kijk','luister','inderdaad','misschien'],
  fr: ['euh','donc','alors','quoi','hein','voilà','genre','tu vois','en fait','quand même','du coup','bref'],
  de: ['äh','ähm','also','quasi','halt','sozusagen','eigentlich','irgendwie','so','ja','ne','oder so'],
  es: ['eh','este','o sea','bueno','pues','entonces','vale','¿no?','digamos','como que','realmente'],
  pt: ['tipo','é','tá','né','então','assim','bem','tipo assim','quer dizer','sabe']
};

function computeFillersCount(text) {
  if (!text) return 0;
  var sourceLang = (typeof currentCaptionLang === 'string') ? currentCaptionLang.split('-')[0] : 'en';
  var fillers = FILLERS_BY_LANG[sourceLang] || FILLERS_BY_LANG['en'];
  var lower = text.toLowerCase();
  var count = 0;
  fillers.forEach(function(f) {
    var re = new RegExp('\\b' + f.replace(/\s+/g, '\\s+') + '\\b', 'gi');
    var matches = lower.match(re);
    if (matches) count += matches.length;
  });
  return count;
}

// ═══ Contraction Fix — Web Speech API strips apostrophes, restore them ═══
var _contractionFix = {
  // Negatives
  cant:"can't", dont:"don't", wont:"won't", doesnt:"doesn't", didnt:"didn't",
  isnt:"isn't", arent:"aren't", wasnt:"wasn't", werent:"weren't",
  hasnt:"hasn't", havent:"haven't", hadnt:"hadn't",
  shouldnt:"shouldn't", couldnt:"couldn't", wouldnt:"wouldn't",
  mightnt:"mightn't", mustnt:"mustn't", neednt:"needn't",
  // Subject + have/has
  ive:"I've", youve:"you've", weve:"we've", theyve:"they've",
  // Subject + will
  ill:"I'll", youll:"you'll", hell:"he'll", shell:"she'll",
  itll:"it'll", theyll:"they'll",
  // NOTE: "well" intentionally NOT in this map — it's a valid adverb
  // "we'll" (contraction) comes through as "well" from Web Speech API
  // but we cannot blindly replace it without breaking the adverb "well"
  // Subject + would/had
  id:"I'd", youd:"you'd", hed:"he'd", shed:"she'd",
  itd:"it'd", wed:"we'd", theyd:"they'd",
  // Subject + are
  youre:"you're", theyre:"they're",
  // Subject + is/has
  hes:"he's", shes:"she's", its:"it's", thats:"that's",
  whats:"what's", whos:"who's", theres:"there's", heres:"here's",
  // Subject + am
  im:"I'm",
  // Let us
  lets:"let's",
  // Misc — informal contractions (usually transcribed as full forms by speech API)
  gonna:"gonna", wanna:"wanna", gotta:"gotta",
  // Possessive 's forms (common)
  ones:"one's", everyones:"everyone's", someones:"someone's"
};
function _fixContractions(text) {
  if (!text) return text;
  var words = text.split(' ');
  for (var i = 0; i < words.length; i++) {
    var clean = words[i].replace(/[^a-zA-Z']/g, '').toLowerCase();
    if (_contractionFix[clean]) {
      // Preserve any trailing punctuation
      var punct = words[i].match(/[^a-zA-Z']+$/) || [''];
      words[i] = _contractionFix[clean] + punct[0];
    }
  }
  return words.join(' ');
}

_realMic.onFinal = function(text) {
  var transcript = document.getElementById('captionTranscript');
  var interim = document.getElementById('captionInterim');
  if (!transcript) return;
  
  // Handle continuation: prepend "…" if previous line was cut off mid-speech
  if (_isContinuation) {
    text = '…' + text;
    _isContinuation = false;
  }
  
  var now = new Date();
  var tsStr = now.toTimeString().substring(0,8);
  var div = document.createElement('div');
  div.className = 'line';
  var fixedText = _fixContractions(text);
  div.setAttribute('data-raw', fixedText);
  div.innerHTML = '<span style="color:var(--muted2);font-size:.75em;font-family:JetBrains Mono,monospace;margin-right:6px">'+tsStr+'</span>' + fixedText;
  // Append — newest line appears at bottom, just above live sentence
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
  
  // ── Speaker mode: color-code line by speaker ──
  if (speakerCount !== 1) {
    var spk = assignSpeaker(text);
    var spkColor = speakerColors[spk];
    div.style.borderLeft = '3px solid ' + spkColor;
    div.style.paddingLeft = '8px';
  }

  // ── Save line to session buffer for Supabase persistence ──
  window._sessionLines = window._sessionLines || [];
  window._sessionLines.push({ en: text, ts: tsStr });

  // Make lines clickable for SYN panel
  if (typeof _ensureLinesClickable === 'function') _ensureLinesClickable();
  
  // Clear interim after final
  if (interim) interim.textContent = '';
  
  // Update stats — all null-safe
  var lineCount = transcript.querySelectorAll('.line').length;
  var allWords = (transcript.textContent || '').match(/[a-z']+/gi) || [];
  try { var el = document.getElementById('statLines'); if (el) el.textContent = lineCount; } catch(e) {}
  try { var el = document.getElementById('statWords'); if (el) el.textContent = allWords.length; } catch(e) {}
  try { var el = document.getElementById('liveSentences'); if (el) el.textContent = lineCount; } catch(e) {}
  var wpm = sessionSeconds > 0 ? Math.round(allWords.length / (sessionSeconds / 60)) : 0;
  try { var el = document.getElementById('liveWpm'); if (el) el.textContent = wpm; } catch(e) {}
  // Live word count in toolbar
  updateWordCount(transcript.textContent || '');

  // ── Live metrics: lexical diversity (MATTR — Moving Average TTR, window=50) ──
  // MATTR is stable across sessions of different lengths, unlike raw TTR.
  if (allWords.length > 0) {
    var uniqueMap = {};
    allWords.forEach(function(w){ uniqueMap[w.toLowerCase()] = true; });
    var uniqueCount = Object.keys(uniqueMap).length;

    function computeMATTR(words, w) {
      w = w || 50;
      if (words.length < w) return words.length > 0 ? new Set(words).size / words.length : 0;
      var total = 0;
      for (var i = 0; i <= words.length - w; i++) {
        var win = words.slice(i, i + w);
        var u = {}; win.forEach(function(t){ u[t] = true; });
        total += Object.keys(u).length / w;
      }
      return total / (words.length - w + 1);
    }
    var lexDiv = computeMATTR(allWords);
    try { var el = document.getElementById('liveLexDiv'); if (el) el.textContent = lexDiv > 0 ? (lexDiv * 100).toFixed(0) + '%' : '—'; } catch(e) {}
    var fillersPerMinute = sessionSeconds > 0 ? (computeFillersCount(transcript.textContent || '') / (sessionSeconds / 60)) : 0;
    try { var el = document.getElementById('liveFillersPerMin'); if (el) el.textContent = fillersPerMinute > 0 ? fillersPerMinute.toFixed(1) : '—'; } catch(e) {}
  }
  
  // ── Word Bank: auto-add content words ──
  if (isCapabilityAvailable('wordbank')) {
  var words = text.toLowerCase().match(/[a-z']+/g) || [];
  var posColors={VERB:'#34d399',NOUN:'#60a5fa',ADJ:'#f472b6',ADV:'#c084fc',FUNC:'#6b7280',WORD:'#a78bfa'};
  var posBg={VERB:'rgba(52,211,153,.12)',NOUN:'rgba(96,165,250,.12)',ADJ:'rgba(244,114,182,.12)',ADV:'rgba(192,132,252,.12)',FUNC:'rgba(107,114,128,.08)',WORD:'rgba(167,139,250,.08)'};
  var seen={};
  words.forEach(function(w){
    if (seen[w] || w.length<2) return;
    seen[w]=true;
    var pos=tagWord(w);
    // Only auto-add content words (not function words)
    if (pos==='FUNC'||pos==='OTHER') return;
    if (wordBank.indexOf(w)>=0) return; // already in bank
    wordBank.push(w);
  });
  saveWordBank();
  }
  
  // Render live chips in vocabChips if present
  var chipsEl = document.getElementById('vocabChips');
  if (chipsEl) {
    chipsEl.innerHTML = wordBank.map(function(w) {
      var pos=tagWord(w);
      var c=posColors[pos]||'#a78bfa';
      var bg=posBg[pos]||'rgba(167,139,250,.08)';
      return '<span class="live-wb-chip" data-word="'+w.replace(/"/g,'&quot;')+'" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;font-size:9px;font-weight:600;background:'+bg+';color:'+c+';border:1px solid '+c+'30;cursor:pointer;transition:all .15s" title="Click: definition | Double-click: remove | POS: '+pos+'">'+w+'<span style="font-size:7px;opacity:.5;margin-left:2px">'+pos+'</span><span class="live-wb-x" data-word="'+w.replace(/"/g,'&quot;')+'" style="margin-left:3px;width:12px;height:12px;border-radius:50%;background:rgba(248,113,113,.15);color:#f87171;display:inline-flex;align-items:center;justify-content:center;font-size:7px;cursor:pointer" title="Remove">×</span></span>';
    }).join('');
    // Delegate events
    chipsEl.querySelectorAll('.live-wb-chip').forEach(function(chip){
      chip.addEventListener('click', function(e){
        if (e.target.classList.contains('live-wb-x')) return;
        showWordDefinition(this.dataset.word);
      });
      chip.addEventListener('dblclick', function(e){
        e.preventDefault();
        removeFromWordBank(this.dataset.word);
      });
    });
    chipsEl.querySelectorAll('.live-wb-x').forEach(function(x){
      x.addEventListener('click', function(e){
        e.stopPropagation();
        removeFromWordBank(this.dataset.word);
      });
    });
  }
  // ── Refresh active extras panel with new data ──
  if (typeof window.refreshExtrasPanel === 'function') {
    window.refreshExtrasPanel();
  }

  // ── Always update word bank extras panel DOM (even when tab not active) ──
  if (typeof renderWordBank === 'function') {
    renderWordBank();
  }

  // ── Update listening bar immediately ──
  if (typeof updateListenBar === 'function') {
    updateListenBar();
  }

  // ── Update slide panels with live data ──
  try { _updateGrammarLines(); } catch(e) { console.error('_updateGrammarLines error:', e); }
  try { _refreshMetricsPanel(); } catch(e) {}
  try { _updateCEFRBars(); } catch(e) {}
  // ── CEFR GSE analysis (async, non-blocking) ──
  try { _cefrFetchAndAnalyze(text); } catch(e) {}
};

// Hook grammar-viz into speech pipeline
(function() {
  if (typeof _gvProcessFinal === 'function') {
    var _gvOrigOnFinal = _realMic.onFinal;
    _realMic.onFinal = function(text) {
      if (_gvOrigOnFinal) _gvOrigOnFinal(text);
      try { _gvProcessFinal(_fixContractions(text)); } catch(e) { console.error('grammar-viz error:', e); }
      try { _updateGrammarLines(); } catch(e) { console.error('_updateGrammarLines error:', e); }
      try { _refreshMetricsPanel(); } catch(e) {}
      try { _updateCEFRBars(); } catch(e) {}
      try { _cefrFetchAndAnalyze(text); } catch(e) {}
    };
  }
})();

// Reset mic to idle on load
updateMicUI('idle');
// Clean up any stale pending session from before the fix (0 lines, 0 duration)
(function(){
  try {
    var raw = localStorage.getItem('sottotitoli-pending-session');
    if (raw) {
      var p = JSON.parse(raw);
      if (!p.lines || !p.lines.length) {
        console.log('🧹 Cleaned up stale pending session (0 lines)');
        localStorage.removeItem('sottotitoli-pending-session');
      }
    }
  } catch(e) {}
})();

async function toggleSession() {
  // In DUO+ mode, only the host can start/stop the session
  if (window._duoMode && !window._duoIsHost) {
    // Invitee: just toggle their own mic
    if (!sessionActive) {
      startRealMic().then(function(ok){
        if (!ok) { showAlertModal('Microfono', '⚠ Mic access denied'); return; }
        sessionActive = true;
        var startBtn = document.getElementById('startBtn');
        if (startBtn) { startBtn.innerHTML = '<i class="fas fa-stop"></i><span>Leave</span>'; startBtn.classList.add('danger'); }
      });
    } else {
      stopRealMic();
      sessionActive = false;
      var startBtn = document.getElementById('startBtn');
      if (startBtn) { startBtn.innerHTML = '<i class="fas fa-play"></i><span>Join</span>'; startBtn.classList.remove('danger'); }
    }
    return;
  }
  sessionActive = !sessionActive;
  var startBtn = document.getElementById('startBtn');
  var stopBtn = document.getElementById('stopBtn');
  pauseBtn = document.getElementById('pauseBtn');
  
  if (sessionActive) {
    _sessionSavedShown = false; // reset for new session — allow toast
    paused = false;
    // Disable + loading state during async startup (prevents double-clicks)
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.classList.add('loading');
      startBtn.innerHTML = '<i class="fas fa-spinner"></i> <span data-i18n="starting">Avvio…</span>';
    }
    // Create Supabase room ONLY when user presses Start (not on page load)
    try { _createCaptionRoom(currentCaptionLang || 'en-US'); } catch(e) { console.error('_createCaptionRoom error:', e); }
    /* ── Capture stack, chosen by SOURCE ──────────────────────────────
     * 'system' — the computer's own audio. SpeechRecognition can never be used here: it only
     *            reads the microphone and there is no way to hand it a shared tab. This source
     *            therefore always goes through the recorder + Whisper.
     * 'mic'    — unchanged: free live SpeechRecognition on desktop, the recorder on iOS. */
    var useSystem = !!(window.S8tSource && window.S8tSource.isSystem()
      && window.S8tSystemAudio && window.S8tSystemAudio.isSupported());
    var useFallback = !!(window.RecordFallback && window.RecordFallback.isNeeded());
    var micOk = false, sysReason = null;
    if (useSystem) {
      var sysRes = await window.S8tSystemAudio.start();
      micOk = !!(sysRes && sysRes.ok);
      sysReason = (sysRes && sysRes.reason) || null;
    } else {
      micOk = useFallback ? await window.RecordFallback.start() : await startRealMic();
    }
    if (!micOk) {
      sessionActive = false;
      if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('loading'); startBtn.innerHTML = '<i class="fas fa-play"></i><span data-i18n="listen">Start</span>'; }
      startBtn.style.display = '';
      stopBtn.style.display = 'none';
      var micFailMsg = null;
      /* The computer-audio source fails for reasons that have NOTHING to do with the microphone,
       * so it gets its own messages. NotAllowedError here means the user closed the picker — that
       * is a decision, and the wording must not imply the app broke. */
      if (useSystem) {
        micFailMsg = (sysReason === 'NotAllowedError')
          ? S8T('src_system_cancelled', 'Condivisione annullata. Per trascrivere l\'audio del computer devi scegliere una scheda e attivare la condivisione dell\'audio.')
          : (sysReason === 'no-audio')
            ? S8T('src_system_no_audio', 'La condivisione scelta non ha audio. In Chrome scegli una SCHEDA e attiva «Condividi l\'audio della scheda».')
            : S8T('src_system_failed', 'Impossibile avviare l\'audio del computer. Riprova.');
      }
      else if (_realMic.state === 'blocked') {
        // A BUSY device is not a denied permission, and the old copy sent people to the wrong
        // fix during a Zoom/Meet call. AbortError is deliberately NOT here: it also fires when
        // the user dismisses the prompt, where "grant access" is the correct advice.
        micFailMsg = (_realMic.lastError === 'NotReadableError' || _realMic.lastError === 'TrackStartError')
          ? 'Il microfono è occupato da un\'altra app (Zoom, Teams…). Chiudi la chiamata, oppure scegli un altro microfono dal menu accanto alla spia del microfono.'
          : 'Microfono bloccato: consenti l\'accesso e riprova.';
      }
      /* A microphone that never ANSWERS is not an unsupported browser. startRealMic reports a
       * timeout as state 'error' (not 'blocked'), so without this branch it fell through to the
       * `!useFallback` line below and told a Chrome user to "use Chrome/Edge". Caught by
       * tests/caption-harness.html row F9, which asserts the ADVICE, not just that a toast exists. */
      else if (_realMic.lastError === 'TimeoutError') {
        micFailMsg = S8T('mic_gum_timeout', 'Il microfono non ha risposto. Controlla che non sia occupato da un\'altra app e riprova.');
      }
      else if (!useFallback) micFailMsg = 'Live captions are not supported in this browser. Use Chrome/Edge (desktop or Android).';
      else micFailMsg = 'Impossibile avviare la registrazione. Riprova.';
      if (micFailMsg) { if (typeof showToast === 'function') showToast(micFailMsg, 'warning'); else showAlertModal('Microfono', micFailMsg); }
    } else {
      // ── Credit check (mic already running — will stop if no credits) ──
      _checkCreditsBeforeStart().then(function(hasCredits) {
        if (!hasCredits) {
          stopRealMic();
          sessionActive = false;
          if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('loading'); startBtn.innerHTML = '<i class="fas fa-play"></i><span data-i18n="listen">Start</span>'; }
          startBtn.style.display = '';
          stopBtn.style.display = 'none';
          if (pauseBtn) pauseBtn.style.display = 'none';
          startBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
          showAlertModal('Crediti esauriti', '⏰ Nessun credito. Acquista su Purchase.', function(){ window.location.href = 'purchase.html'; });
          return;
        }
        // ✅ Mic running + credits OK — restore button (gets hidden by _applySessionLiveUI)
        if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('loading'); startBtn.innerHTML = '<i class="fas fa-play"></i><span data-i18n="listen">Start</span>'; }
        _applySessionLiveUI(startBtn, stopBtn);
      }).catch(function(err) {
        console.error('Credit check failed:', err);
        if (startBtn) { startBtn.disabled = false; startBtn.classList.remove('loading'); startBtn.innerHTML = '<i class="fas fa-play"></i><span data-i18n="listen">Start</span>'; }
      });
    }
  } else {
    if (window.RecordFallback && window.RecordFallback._recorder) {
      // iOS fallback: final flush — segments already streamed in during recording
      if (stopBtn) { stopBtn.disabled = true; stopBtn.innerHTML = '<i class="fas fa-spinner"></i> <span>Transcribing…</span>'; }
      try { await window.RecordFallback.stop(); } catch(e) { console.error('fallback stop error:', e); }
      if (stopBtn) stopBtn.disabled = false;
    } else {
      stopRealMic();
    }
    // Save session with transcript + stats
    var transcriptEl = document.getElementById('captionTranscript');
    var fullText = transcriptEl ? (transcriptEl.textContent || '') : '';
    var sessionData = {
      lines: window._sessionLines || [],
      durationSeconds: sessionSeconds,
      fillerCount: (typeof computeFillersCount === 'function') ? computeFillersCount(fullText) : 0,
      sentenceMetrics: (typeof buildSentenceMetrics === 'function') ? buildSentenceMetrics() : [],
      connectors: (typeof computeConnectors === 'function') ? computeConnectors(fullText) : null
    };
    _endSupabaseSession(sessionData);
    // Show saved toast only if there was actual content
    if (sessionData.lines && sessionData.lines.length > 0) {
      showSessionSaved(sessionSeconds);
      // Show post-session panel with word count
      var wc = fullText ? fullText.trim().split(/\s+/).filter(Boolean).length : 0;
      if (XP && XP.award) XP.award('word_spoken', wc);
      showPostSessionPanel(wc);
      // Mark bookmarked sentences in transcript as end-of-session favorites
      if (typeof v20q_markFinalFavorites === 'function') v20q_markFinalFavorites();
    }
    window._sessionLines = [];
    startBtn.style.display = '';
    stopBtn.style.display = 'none';
    stopBtn.onclick = null; // clear handler — only set when button is shown
    if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.classList.remove('paused'); }
    paused = false;
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    sessionSeconds = 0;
    var rt = document.getElementById('recTimer'); if (rt) rt.textContent = '00:00';
    updateRecDash('idle');
    document.body.classList.remove('session-active');
    // Don't clear transcript — user may want to scroll through it after session
    updateListenBar();
  }
}

// ── Credit pre-check before session start ──
/* ── Microphone picker ───────────────────────────────────────────────────────
 * Lists the real audio inputs and records which one to use.
 *
 * WHY: getUserMedia({audio:true}) takes whatever the OS default input is AT THAT MOMENT. In a
 * Zoom call that can be Zoom's own virtual device, or a Bluetooth headset that switched into
 * call mode — the browser reports a working microphone and transcribes nothing, which is
 * unfalsifiable from the UI. Choosing the device explicitly is the fix.
 *
 * ⚠️ SCOPE — WHICH PATH THIS ACTUALLY FIXES. This can only help the WHISPER path
 * (record-fallback.js, used when the browser has no SpeechRecognition: iOS/Safari), where the
 * recorder is ours and obeys the constraint. On the WEB SPEECH path (desktop Chrome/Edge) the
 * engine is SpeechRecognition, which has NO device-selection API and ALWAYS listens to the OS
 * default input. There the picker changes only the stream behind the LEVEL METER, so the meter
 * can move while transcription stays silent — which is how "I tried several microphones and
 * nothing is transcribed" survived v319, whose comment claimed this was the fix. On that path
 * only the operating system's default input can change what is transcribed, so the UI now says
 * so (mic_engine_default) and the 30s watchdog (_warnIfNoWords) names the device to change.
 *
 * ⚠️ Device LABELS are blank until the page has been granted mic permission once — a browser
 * privacy rule, not a bug. So we enumerate on load (labels may be blank) and again after the
 * first successful capture, when they appear (BOTH capture paths call refreshMicList).
 * ⚠️ A saved device can vanish (Bluetooth out of range, USB unplugged). The saved id is a
 * PREFERENCE, never a requirement: BOTH capture paths drop it and retry the system default. */
var MIC_KEY = 'sottotitoli-mic-device';

window.SottotitoliMicId = function () {
  try { return localStorage.getItem(MIC_KEY) || null; } catch (e) { return null; }
};

window.SottotitoliDropMicId = function () {
  try { localStorage.removeItem(MIC_KEY); } catch (e) {}
  var sel = document.getElementById('micSelect');
  if (sel) sel.value = '';
};

/* ── Which audio the session listens to ──────────────────────────────
 * 'mic'    — the microphone (default). Desktop then uses free, live SpeechRecognition.
 * 'system' — what the COMPUTER is playing: a tab, a window or the whole screen. Chromium hands
 *            the page that audio through getDisplayMedia, so there is nothing to install and no
 *            driver to ask a user for. Because SpeechRecognition can only ever read the
 *            microphone, this source always uses the MediaRecorder → Whisper path and therefore
 *            spends server minutes — the one real cost of the feature.
 * Persisted: it describes what the user is doing, not one session. */
var SOURCE_KEY = 'sottotitoli-caption-source';
window.S8tSource = {
  get: function () {
    try {
      if (localStorage.getItem(SOURCE_KEY) !== 'system') return 'mic';
      /* A source that can no longer be OFFERED must not be silently KEPT. Parking the feature
         hides the menu entry — but if this still returned 'system' the picker would show the
         chevron while toggleSession kept reaching for getDisplayMedia, leaving the user in a mode
         they can neither see nor leave, and skipping the loopback warning on the way. Coerce the
         STORED value, not just the returned one, so the persisted state is clean too. */
      if (window.S8tSource.canSystem()) return 'system';
      try { localStorage.setItem(SOURCE_KEY, 'mic'); } catch (e2) {}
      return 'mic';
    } catch (e) { return 'mic'; }
  },
  isSystem: function () { return window.S8tSource.get() === 'system'; },
  canSystem: function () { return !!(window.S8tSystemAudio && window.S8tSystemAudio.isSupported()); },
  set: function (v) {
    var next = (v === 'system' && window.S8tSource.canSystem()) ? 'system' : 'mic';
    try { localStorage.setItem(SOURCE_KEY, next); } catch (e) {}
    window.S8tSource._reflect();
    return next;
  },
  /* ONE control answers "what should I listen to?", so its icon has to say which KIND of source
     is active — otherwise the microphone list looks like it is in charge when it is not. */
  _reflect: function () {
    var system = window.S8tSource.isSystem();
    var btn = document.getElementById('micPickBtn');
    if (btn) {
      var i = btn.querySelector('i');
      if (i) i.className = system ? 'fas fa-headphones' : 'fas fa-chevron-down';
      btn.title = system
        ? S8T('src_picker_title_system', 'Sorgente: audio del computer — cambia')
        : (btn.dataset.namesHint || S8T('src_picker_title_mic', 'Sorgente: microfono — cambia'));
      btn.setAttribute('aria-label', btn.title);
    }
    _renderMicMenu();
  }
};

/* Constraints used by EVERY capture on this page — real-mic.js (desktop/Android) and
 * record-fallback.js (iOS) — instead of each hardcoding audio:true. */
window.SottotitoliMicConstraints = function () {
  var id = window.SottotitoliMicId();
  return id ? { audio: { deviceId: { exact: id } } } : { audio: true };
};

/* The menu is only a compact VIEW of #micSelect's options. The select stays the single source of
 * truth (and the accessible control), so choosing an item just sets the select and fires its
 * change event — persistence and the mid-session swap below run exactly as before, once. */
function _renderMicMenu() {
  var sel = document.getElementById('micSelect');
  var menu = document.getElementById('micMenu');
  var pick = document.getElementById('micPicker');
  if (!sel || !menu) return;
  var canSys = !!(window.S8tSource && window.S8tSource.canSystem());
  var isSys = canSys && window.S8tSource.isSystem();
  /* The picker is worth showing when there is a CHOICE to make. It used to be hidden whenever no
     device was selectable, which would now hide the only route to the computer-audio source. */
  if (!sel.options.length && !canSys) { if (pick) pick.style.display = 'none'; return; }
  if (pick) pick.style.display = '';
  var cur = sel.value || '';
  var html = '<div class="mic-menu-hd">'
    + (canSys ? S8T('src_audio_title', 'Sorgente audio') : S8T('src_mic', 'Microfono'))
    + '</div>';
  /* On the WEB SPEECH path this control cannot change what is TRANSCRIBED: SpeechRecognition
     has no device API and listens to the OS default. Saying this only AFTER a change is too
     late -- the user has already cycled through devices that all look fine on the level
     meter, which is exactly the report that produced v319's wrong fix. Say it up front.
     Shown only for the MICROPHONE source: on computer audio nothing reads the default input,
     so the note would be actively misleading. */
  if (!isSys && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    html += '<div style="padding:6px 10px 8px;font-size:11px;line-height:1.5;color:var(--text-faint);max-width:270px">'
         +  S8T('mic_picker_scope', 'Nota: la trascrizione su questo browser usa il «Predefinito del sistema», non il dispositivo selezionato qui. Per cambiarlo: Impostazioni di Sistema → Suono → Ingresso.')
         +  '</div>';
  }
  var _srEngine = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  [].forEach.call(sel.options, function (o, oIdx) {
    // No device counts as selected while the source is the computer's audio — the tick belongs
    // to the source item below, and leaving one here would show two active choices at once.
    var isSel = !isSys && (o.value || '') === cur;
    /* Mark the option that recognition ACTUALLY listens to. Tagged by POSITION, not by an
       empty value: a device whose deviceId is blank also has value="", and tagging on that
       labelled "Microfono 1" as the recognition device too. Option 0 IS the system default
       by construction (it is the first option built in refreshMicList). */
    var tag = (_srEngine && !isSys && oIdx === 0)
      ? ' <span style="opacity:.65">· ' + S8T('mic_device_recognition', 'usata dalla trascrizione') + '</span>'
      : '';
    html += '<button type="button" class="mic-item' + (isSel ? ' sel' : '') + '"'
         +  ' role="option" aria-selected="' + (isSel ? 'true' : 'false') + '"'
         +  ' data-mic-id="' + String(o.value).replace(/"/g, '&quot;') + '">'
         +  '<span class="mic-item-tick">' + (isSel ? '<i class="fas fa-check"></i>' : '') + '</span>'
         +  '<span class="mic-item-lbl">' + o.textContent.replace(/</g, '&lt;') + tag + '</span>'
         +  '</button>';
  });
  /* The second source. Rendered from the SAME list so the two choices look like what they are:
     one question with two answers, not a microphone list with a feature bolted on. */
  if (canSys) {
    html += '<div style="height:1px;background:var(--line);margin:6px 10px"></div>'
         +  '<button type="button" class="mic-item' + (isSys ? ' sel' : '') + '"'
         +  ' role="option" aria-selected="' + (isSys ? 'true' : 'false') + '"'
         +  ' data-src="system">'
         +  '<span class="mic-item-tick">' + (isSys ? '<i class="fas fa-check"></i>' : '') + '</span>'
         +  '<span class="mic-item-lbl">' + S8T('src_system', 'Audio del computer')
         +  ' <span style="opacity:.65">· ' + S8T('src_system_hint', 'scheda o schermo') + '</span></span>'
         +  '</button>';
  }
  menu.innerHTML = html;
}

function _setMicMenuOpen(on) {
  var menu = document.getElementById('micMenu');
  var btn = document.getElementById('micPickBtn');
  if (!menu || !btn) return;
  if (on) _renderMicMenu();   // the device list may have changed since it was last opened
  menu.hidden = !on;
  btn.classList.toggle('open', !!on);
  btn.setAttribute('aria-expanded', on ? 'true' : 'false');
}

function toggleMicMenu(e) {
  if (e && e.stopPropagation) e.stopPropagation();   // don't let the outside-click handler eat it
  var menu = document.getElementById('micMenu');
  _setMicMenuOpen(!!(menu && menu.hidden));
}

function closeMicMenu() { _setMicMenuOpen(false); }

/* ── "The system default input is a LOOPBACK, not a microphone" ─────────────────
 * Diagnosed from a real report: the macOS Input level meter moved with the LAPTOP's own audio
 * and NOT with the user's voice. That is the signature of a virtual/loopback device selected as
 * the system input (BlackHole, Loopback, Soundflower, ZoomAudioDevice, Krisp, VB-Cable, an
 * Aggregate or Multi-Output device): it carries system audio instead of the microphone.
 *
 * On the WEB SPEECH path this failure is FATAL and completely INVISIBLE: SpeechRecognition
 * listens to the system default whatever the picker says, the device is perfectly healthy as
 * far as the browser is concerned, so the page shows "Mic Live", emits no error, and never
 * transcribes. Nothing in the API can detect that the input is a loopback -- only the NAME can,
 * which is why this is worth guessing at. Whisper path (iOS/Safari) is exempt: it obeys the
 * picked device, so a loopback default does not matter there.
 *
 * The predicate itself now lives in js/mic-core.js. The audit found this detector — the only thing
 * that CAN explain the BlackHole report — present on ONE of the four capture stacks, so the other
 * three fail silently in exactly the same way. Kept as a page-level alias because the call sites
 * and tests/mic-harness.html address it by this name. */
window._s8tLooksVirtualMic = function (label) {
  if (window.MicCore && typeof window.MicCore.looksVirtual === 'function') {
    return window.MicCore.looksVirtual(label);
  }
  /* Deliberately NOT a silent `false`: that would disable the only warning this app has for a dead
   * input, and the page would look healthy while transcribing nothing. mic-core.js must load before
   * this block; the harness turns red if it does not. */
  console.error('caption-s8t: window.MicCore is missing — check the script order in this page.');
  return false;
};

var _virtualMicChecked = false;
async function _checkDefaultMic() {
  if (_virtualMicChecked) return;
  /* Not the microphone: on the computer-audio source nothing reads the default input, so a
   * loopback default is irrelevant here and warning about it would be pure noise. */
  if (window.S8tSource && window.S8tSource.isSystem()) return;
  // Require an existing capture: getUserMedia({audio:true}) PROMPTS for permission when it is
  // not yet granted, and prompting on page load would be worse than the bug it detects.
  if (!(window._realMic && window._realMic.stream)) return;
  if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  _virtualMicChecked = true;
  var label = '';
  try {
    var s = await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      new Promise(function (_, reject) {
        setTimeout(function () { var e = new Error('timeout'); e.name = 'TimeoutError'; reject(e); }, 5000);
      })
    ]);
    var tr = s.getAudioTracks()[0];
    label = (tr && tr.label) || '';
    s.getTracks().forEach(function (t) { t.stop(); });
  } catch (e) { return; }
  if (!window._s8tLooksVirtualMic(label)) return;
  if (typeof showToast === 'function') {
    // macOS default being *correct* was measured on a machine where it was: the OS said MacBook Air
    // Microphone while Chrome still handed out BlackHole, because Chrome remembers its own choice
    // in the `media.audio_input.user_preference_ranking` profile pref and that OVERRIDES the OS.
    // So name Chrome first -- sending someone to Sound → Input would have changed nothing.
    showToast(
      '«' + label + '» ' + S8T('mic_virtual_what', 'è un dispositivo virtuale (loopback): riceve l\'audio del computer, non la tua voce.')
      + ' ' + S8T('mic_virtual_fix', 'Chrome ricorda il microfono scelto: apri chrome://settings/content/microphone e seleziona quello vero (oppure Impostazioni di Sistema → Suono → Ingresso).'),
      'error', 15000);
  }
}

/* ── Choosing the audio SOURCE ──────────────────────────────────────────────────
 * One control, two answers: 'mic' (the microphone) and 'system' (what the computer is playing).
 * Switching mid-session is deliberately NOT supported. The two sources run on completely
 * different capture stacks — SpeechRecognition versus a screen share feeding the recorder — and
 * swapping them live would mean tearing the session's audio out from under a running transcript,
 * mid-sentence. "Takes effect next session" is honest; half-doing it is not. */
function _applySourceChoice(src) {
  if (!window.S8tSource) return;
  var now = window.S8tSource.get();
  if (src === now) return;
  var applied = window.S8tSource.set(src);
  if (typeof showToast !== 'function') return;
  if (sessionActive) {
    showToast(applied === 'system'
      ? S8T('src_switch_system', 'Sorgente: audio del computer — avrà effetto dalla prossima sessione')
      : S8T('src_switch_mic', 'Sorgente: microfono — avrà effetto dalla prossima sessione'),
      'warning', 6500);
  } else if (applied === 'system') {
    showToast(S8T('src_system_ready', 'Sorgente: audio del computer — premi Start e scegli la scheda da condividere'), 'info', 7000);
  }
}

/* The user pressed the browser's own "Stop sharing" control. Nothing else tells the page, so
 * without this the session would keep recording silence and still look live — the exact failure
 * shape this whole area has been fighting. Run the ordinary Stop path, so the last segment is
 * flushed and the session is saved like any other. */
window.onSystemAudioEnded = function () {
  if (!sessionActive) return;
  if (typeof showToast === 'function') {
    showToast(S8T('src_share_ended', 'Condivisione terminata — sessione salvata'), 'info', 5000);
  }
  try { toggleSession(); } catch (e) { console.error('share-ended stop failed:', e); }
};

async function refreshMicList() {
  var sel = document.getElementById('micSelect');
  if (!sel) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    // Cannot list inputs (older Safari) — stay out of the way entirely, UNLESS the computer-audio
    // source exists, in which case this button is the only way to reach it.
    if (window.S8tSource && window.S8tSource.canSystem()) {
      var keepPick = document.getElementById('micPicker');
      if (keepPick) keepPick.style.display = '';
      window.S8tSource._reflect();
      return;
    }
    var noPick = document.getElementById('micPicker');
    if (noPick) noPick.style.display = 'none';
    return;
  }
  try {
    var devices = await navigator.mediaDevices.enumerateDevices();
    var mics = devices.filter(function (d) { return d.kind === 'audioinput'; });
    // Runs on load (no stream yet -> no-op, so no permission prompt) and again after the first
    // successful capture, which is the earliest moment the default device is knowable.
    try { _checkDefaultMic(); } catch (e) {}
    if (!mics.length) {
      // Nothing to choose between — hide the button rather than offer an empty menu. The
      // computer-audio source is still a real choice, so keep the picker when it exists.
      if (window.S8tSource && window.S8tSource.canSystem()) {
        var keepForSys = document.getElementById('micPicker');
        if (keepForSys) keepForSys.style.display = '';
        window.S8tSource._reflect();
        return;
      }
      var noMics = document.getElementById('micPicker');
      if (noMics) noMics.style.display = 'none';
      return;
    }
    var saved = window.SottotitoliMicId();
    var named = 0, selectable = 0;
    var html = '<option value="">Predefinito del sistema</option>';
    mics.forEach(function (m, i) {
      /* An EMPTY deviceId cannot be chosen: it collides with the system-default sentinel
         (value=""), so picking it would store "" and silently mean "default". The browser
         returns blank ids until this origin has been granted mic permission once -- the same
         privacy rule that blanks the LABELS. Skip them (and do not offer an empty menu): this
         runs again after the first successful capture, when the real ids appear. */
      if (!m.deviceId) return;
      selectable++;
      if (m.label) named++;
      var label = m.label || ('Microfono ' + (i + 1));
      html += '<option value="' + m.deviceId + '">' + label.replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</option>';
    });
    if (!selectable) {
      // Nothing identifiable to pick between -- just the default. Stay out of the way, unless
      // the computer-audio source needs this button to stay reachable.
      if (window.S8tSource && window.S8tSource.canSystem()) {
        var keepForSys2 = document.getElementById('micPicker');
        if (keepForSys2) keepForSys2.style.display = '';
        sel.innerHTML = html;
        window.S8tSource._reflect();
        return;
      }
      var noPick = document.getElementById('micPicker');
      if (noPick) noPick.style.display = 'none';
      return;
    }
    sel.innerHTML = html;
    var stillThere = saved && mics.some(function (m) { return m.deviceId === saved; });
    sel.value = stillThere ? saved : '';
    if (saved && !stillThere) window.SottotitoliDropMicId();   // it is gone — fall back explicitly
    var pickBtn = document.getElementById('micPickBtn');
    if (pickBtn) {
      /* Keep the "names are hidden until access is granted" nuance as DATA, and let _reflect()
       * compose the final title: the title also has to name the active SOURCE, and two places
       * writing the same attribute is exactly how one of them silently loses. */
      pickBtn.dataset.namesHint = named
        ? ''
        : S8T('mic_picker_names_hint', 'Concedi l\'accesso al microfono per vedere i nomi dei dispositivi');
    }
    window.S8tSource._reflect();
  } catch (e) { console.warn('mic list:', e); }
}

function _initMicPicker() {
  var sel = document.getElementById('micSelect');
  if (!sel) return;
  // Guard against a second #micSelect ever existing: two listeners would double-apply a change.
  if (sel.dataset && sel.dataset.micInit === '1') return;
  if (sel.dataset) sel.dataset.micInit = '1';
  sel.addEventListener('change', function () {
    var v = sel.value;
    try { if (v) localStorage.setItem(MIC_KEY, v); else localStorage.removeItem(MIC_KEY); } catch (e) {}
    _renderMicMenu();   // move the tick to the newly chosen device
    /* The device list only applies to the MICROPHONE source. While the computer's audio is being
     * captured, the swap below would tear the microphone stack down underneath a running
     * screen-share recording — and the microphone is not even what is being transcribed. Record
     * the preference, say it takes effect next time, and touch nothing. */
    if (window.S8tSource.isSystem()) {
      if (sessionActive && typeof showToast === 'function') {
        showToast(S8T('src_switch_mic', 'Sorgente: microfono — avrà effetto dalla prossima sessione'), 'warning', 6500);
      }
      return;
    }
    if (sessionActive && !paused) {
      var isFallback = !!(window.RecordFallback && window.RecordFallback.isNeeded && window.RecordFallback.isNeeded());
      if (isFallback) {
        // The iOS recorder is not swappable mid-session; be honest instead of pretending.
        if (typeof showToast === 'function') showToast('Microfono cambiato: avrà effetto dalla prossima sessione', 'warning');
      } else {
        /* Swap the capture DIRECTLY instead of pause→resume. Pause is user-facing state — it
         * flips the buttons and marks the session paused — and this must not touch it. It also
         * avoids depending on togglePause()'s `if (!sessionActive) return` guard staying
         * permissive, which is exactly what would silently break this. stopRealMic() nulls both
         * recognition and stream, so startRealMic() re-opens on the newly chosen device. */
        /* Announce the swap and ALWAYS resolve it. toast.js treats 'loading' as STICKY — it
         * skips the auto-hide timer for that type — so the spinner has to be REPLACED to go
         * away; there is no fallback dismissal. The timeout matters as much as the result:
         * a Bluetooth handoff can leave getUserMedia pending indefinitely, which is how this
         * ended up spinning forever with nothing telling the user either way. */
        if (typeof showToast === 'function') showToast('Microfono cambiato — riavvio la cattura…', 'loading');
        var _swapSettled = false;
        var _swapDone = function (ok, why) {
          if (_swapSettled) return;
          _swapSettled = true;
          if (typeof showToast !== 'function') return;
          if (ok) {
            /* On the Web Speech path the ENGINE cannot use the chosen device (SpeechRecognition
             * has no device-selection API), so say so rather than implying the picker changed
             * what is transcribed. On the Whisper path the choice is honoured — plain success. */
            var srEngine = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            if (srEngine) showToast(S8T('mic_engine_default', 'Il riconoscimento usa il microfono predefinito di sistema'), 'warning', 6500);
            else showToast(S8T('mic_switch_ok', 'Microfono cambiato'), 'success', 2200);
          } else {
            showToast((why === 'timeout'
              ? S8T('mic_switch_timeout', 'Cambio microfono: nessuna risposta dal dispositivo')
              : S8T('mic_switch_failed', 'Cambio microfono non riuscito')), 'error', 6500);
          }
        };
        var _swapGuard = setTimeout(function () { _swapDone(false, 'timeout'); }, 8000);
        Promise.resolve()
          .then(function () { stopRealMic(); return startRealMic(); })
          .then(function (ok) { clearTimeout(_swapGuard); _swapDone(ok !== false); })
          .catch(function (e) { clearTimeout(_swapGuard); _swapDone(false, (e && e.name) || 'error'); });
      }
    }
  });
  // Choosing an item drives the select, so the single change handler above stays the ONLY path.
  var menu = document.getElementById('micMenu');
  if (menu) {
    menu.addEventListener('click', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('.mic-item') : null;
      if (!item) return;
      // Close FIRST: _applySourceChoice re-renders the menu, and doing that while it is still
      // open would rebuild it under the pointer.
      closeMicMenu();
      var src = item.getAttribute('data-src');
      if (src) { _applySourceChoice(src); return; }
      // Picking a DEVICE means "use the microphone", otherwise the source item stays ticked and
      // the click would look like it had been ignored.
      if (window.S8tSource.isSystem()) window.S8tSource.set('mic');
      sel.value = item.getAttribute('data-mic-id') || '';
      sel.dispatchEvent(new Event('change'));
    });
  }
  document.addEventListener('click', function (e) {
    var pick = document.getElementById('micPicker');
    if (pick && e.target && !pick.contains(e.target)) closeMicMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMicMenu();
  });
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', refreshMicList);
  }
  refreshMicList();
}

async function _checkCreditsBeforeStart() {
  try {
    var sb = window.sottotitoliSupabase;
    if (!sb) { _setCreditBudget(null); return true; } // not logged in — allow free use
    var resp = await sb.auth.getSession();
    var userId = resp.data?.session?.user?.id;
    if (!userId) { _setCreditBudget(null); return true; } // not logged in
    var cr = await sb.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
    var balance = cr.data?.balance_minutes;
    if (balance == null) {
      // No credit row — new user. Ensure initUserCredits creates the row.
      if (typeof initUserCredits === 'function') {
        initUserCredits(userId);
        // Wait for the insert to complete (brief delay, then re-check)
        await new Promise(function(resolve) { setTimeout(resolve, 800); });
        var cr2 = await sb.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
        var balance2 = cr2.data?.balance_minutes;
        // If row still doesn't exist, allow once (fail-safe)
        if (balance2 == null) { _setCreditBudget(null); return true; }
        _setCreditBudget(balance2);
        return balance2 > 0;
      }
      _setCreditBudget(null);
      return true; // fail-safe — allow if initUserCredits not available
    }
    _setCreditBudget(balance);
    return balance > 0;
  } catch(e) { _setCreditBudget(null); return true; } // error — allow on fail-safe
}

/* Minutes left, snapshotted at start as SECONDS. null = unknown (not signed in / unreadable)
 * → no local enforcement, matching the start guard's fail-safe permissiveness. */
function _setCreditBudget(minutes) {
  window._creditBudgetSeconds = (typeof minutes === 'number' && isFinite(minutes))
    ? Math.max(0, Math.round(minutes * 60))
    : null;
}

/* One automatic end per session, however many triggers fire (credits spent, or the silence
 * failsafe). Without a SHARED guard both could fire in the same tick, and the second
 * toggleSession() would toggle back ON and start a fresh session. Re-armed by
 * _startSessionTimer(). */
var _autoEndDone = false;

/* End the session when the credits are spent.
 * The balance cannot be relied on to stop this by itself: on the iOS/Whisper path it falls as
 * each segment is charged, and on the Web Speech path it does not move at all until the session
 * is saved — so a 1-minute balance could record for an hour and then clamp to zero at save.
 * Compare elapsed session seconds against the start snapshot, and drive the SAME path the Stop
 * button uses, so the session is SAVED and the UI goes back to the stopped state; the start
 * guard (balance > 0) then blocks a restart until minutes are bought. */
function _endSessionForCredits() {
  if (_autoEndDone) return;  // one end per session, however many triggers fire
  _autoEndDone = true;
  if (!sessionActive) return;
  try { toggleSession(); } catch (e) { console.error('credit stop failed:', e); }
  showAlertModal(
    'Crediti esauriti',
    '⏰ I tuoi minuti sono finiti: la sessione è stata salvata. Acquista minuti per continuare.',
    function () { window.location.href = 'purchase.html'; }
  );
}

function _enforceCreditBudget() {
  if (!sessionActive || paused) return;
  var budget = window._creditBudgetSeconds;
  if (typeof budget !== 'number') return;  // unreadable balance → nothing enforced
  if (sessionSeconds >= budget) _endSessionForCredits();
}

/* One timer for both start and resume. The two copies it replaces were identical except that
 * the resume copy dereferenced #recTimer without a null check — and both now need the budget
 * check, which is why it lives here rather than in two places. */
function _startSessionTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  _autoEndDone = false;
  // Silence is measured from the START of the session, not from the first word, so a mic
  // that never works is caught too. _lastWordAt is refreshed every time a sentence lands.
  _silenceLineCount = (window._sessionLines || []).length;
  _lastWordAt = Date.now();
  _noWordWarned = false;
  _loadAutoStopPref();
  timerInterval = setInterval(function () {
    sessionSeconds++;
    var m = Math.floor(sessionSeconds / 60);
    var s = sessionSeconds % 60;
    var rt = document.getElementById('recTimer');
    if (rt) rt.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    _enforceCreditBudget();
    _enforceSilenceStop();
    _warnIfNoWords();
  }, 1000);
}

/* ── Silence failsafe ──────────────────────────────────────────────────────────
 * End the session when nothing has been transcribed for 5 minutes.
 *
 * Charging is per SEGMENT, so a session that hears nothing — muted mic, silent room,
 * recognition stalled — spends minutes and produces nothing at all. The Settings switch
 * (Impostazioni → Sessione → "Interrompi la sessione in silenzio", default ON) turns it off.
 *
 * The window is ROLLING: it counts since the last committed sentence, so it also catches a
 * session that goes quiet half-way through, not just one that never starts. The signal is
 * _sessionLines, the same list the save uses — both mic paths append to it (native
 * recognition directly, the Whisper fallback via feedSentences → _realMic.onFinal). */
var SILENCE_STOP_MS = 5 * 60 * 1000;
var _autoStopSilent = true;   // fail-safe default until the stored preference loads
var _silenceLineCount = 0;
var _lastWordAt = 0;

/* Default ON; the local mirror first (instant, and it is what Settings writes), then the
 * server row, which wins because it is what the panel saved last. Any failure keeps the
 * current value rather than switching a failsafe off by accident. */
async function _loadAutoStopPref() {
  try {
    var ls = JSON.parse(localStorage.getItem('sottotitoli-settings') || 'null');
    if (ls && typeof ls.auto_stop_silent === 'boolean') _autoStopSilent = ls.auto_stop_silent;
  } catch (e) {}
  try {
    var sb = window.sottotitoliSupabase;
    if (!sb) return;
    var resp = await sb.auth.getSession();
    var uid = resp.data?.session?.user?.id;
    if (!uid) return;
    var q = await sb.from('user_preferences').select('auto_stop_silent').eq('user_id', uid).maybeSingle();
    if (q && !q.error && q.data && typeof q.data.auto_stop_silent === 'boolean') {
      _autoStopSilent = q.data.auto_stop_silent;
    }
  } catch (e) {}
}

/* ── "Mic is live but hears nothing" — the DIAGNOSIS, 30s in ────────────────────
 * The 5-minute silence failsafe below is the safety net; this is what tells the user WHY
 * while it is still happening. On desktop the engine is the browser's SpeechRecognition,
 * which has NO device-selection API — it always listens to the OS DEFAULT input. The
 * microphone picker therefore changes the stream the LEVEL METER uses, not what the
 * recogniser hears, so picking another device can leave the meter moving while recognition
 * stays silent. That is exactly the shape of "I tried several microphones, nothing is
 * transcribed", so the message names the device the user actually has to change.
 * Interim results count as evidence of audio (via _realMic._lastInterim), otherwise someone
 * mid-sentence with no committed sentence yet would be told their microphone is dead. */
var NOVOICE_WARN_MS = 30 * 1000;
var _noWordWarned = false;

function _warnIfNoWords() {
  if (_noWordWarned) return;
  if (!sessionActive || paused) return;   // paused time is not billed, so it must not fire
  var lastHeard = Math.max(_lastWordAt || 0, (window._realMic && _realMic._lastInterim) || 0);
  if (!lastHeard || (Date.now() - lastHeard) < NOVOICE_WARN_MS) return;
  _noWordWarned = true;
  if (typeof showToast === 'function') {
    showToast(S8T('mic_no_audio', 'Il microfono è attivo ma non arriva audio al riconoscimento: cambia il microfono PREDEFINITO di sistema.'), 'warning', 9000);
  }
}

function _enforceSilenceStop() {
  if (!sessionActive || paused) return;   // paused time is not billed, so it must not fire
  if (_autoStopSilent === false) return;  // the user turned the failsafe off
  var lines = (window._sessionLines || []).length;
  if (lines > _silenceLineCount) {
    _silenceLineCount = lines;   // a sentence was committed on one of the two mic paths
    _lastWordAt = Date.now();
    return;
  }
  if (_lastWordAt && (Date.now() - _lastWordAt) >= SILENCE_STOP_MS) _endSessionForSilence();
}

function _endSessionForSilence() {
  if (_autoEndDone) return;
  _autoEndDone = true;
  if (!sessionActive) return;
  try { toggleSession(); } catch (e) { console.error('silence stop failed:', e); }
  showAlertModal(
    'Nessuna trascrizione',
    '🔇 Nessuna parola trascritta per 5 minuti: la sessione è stata salvata per non consumare minuti inutilmente. Controlla il microfono, oppure disattiva questa protezione da Impostazioni → Sessione.',
    function () {}
  );
}

// record-fallback.js calls this when the server refuses a segment with 402.
window.onTranscriptionCreditsExhausted = _endSessionForCredits;

// Load the failsafe preference at page load; _startSessionTimer() refreshes it per session.
_loadAutoStopPref();
// Populate the microphone list (labels appear after the first permission grant).
_initMicPicker();

// ── Session UI setup (mic already running — called after credit check passes) ──
function _applySessionLiveUI(startBtn, stopBtn) {
    // Guard: user may have stopped while credit check was in flight
    if (!sessionActive) { stopRealMic(); return; }
    // Fallback (iOS record) has no pause — keep it hidden
    if (window.RecordFallback && window.RecordFallback._recorder && pauseBtn) pauseBtn.style.display = 'none';
    // Guard: user paused while credit check was in flight — mic was already
    // stopped by togglePause(), just keep the paused UI state
    if (paused) {
      if (pauseBtn) { pauseBtn.style.display = ''; pauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>'; pauseBtn.classList.add('paused'); }
      updateRecDash('paused');
      return;
    }
    // Guard: user already resumed (pause→play before credit check resolved) —
    // timer is already running from togglePause, just sync buttons
    if (_realMic.state === 'live' && !paused && timerInterval !== null) {
      startBtn.style.display = 'none';
      // Defer showing stop button — attach onclick only when visible
      setTimeout(function() { if (sessionActive) { stopBtn.style.display = ''; stopBtn.onclick = toggleSession; } }, 150);
      if (pauseBtn) { pauseBtn.style.display = ''; pauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>'; pauseBtn.classList.remove('paused'); }
      updateRecDash('live');
      document.body.classList.add('session-active');
      return;
    }
    // Fresh start — mic just started, set up everything
    startBtn.style.display = 'none';
    // Defer showing stop button — attach onclick only when visible
    setTimeout(function() { if (sessionActive) { stopBtn.style.display = ''; stopBtn.onclick = toggleSession; } }, 150);
    if (pauseBtn) { pauseBtn.style.display = ''; pauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>'; pauseBtn.classList.remove('paused'); }
    sessionSeconds = 0;
    wordBank = [];
    saveWordBank();
    renderWordBank();
    // Clear grammar panel placeholders
    var gp = document.getElementById('grammarPlaceholder');
    if (gp) gp.remove();
    if (typeof _gvReset === 'function') _gvReset();
    if (typeof clearSynonymSession === 'function') clearSynonymSession();
    var interim = document.getElementById('captionInterim');
    var transcript = document.getElementById('captionTranscript');
    if (interim) interim.innerHTML = '';
    if (transcript) transcript.innerHTML = '';
    updateRecDash('live');
    document.body.classList.add('session-active');
    sessionSeconds = 0;   // defensive: a stale value would trip the new budget check instantly
    _startSessionTimer();
}

// ═══ Update rec dashboard cells ═══
function updateRecDash(state) {
  var micDot = document.getElementById('recMicDot');
  var micLabel = document.getElementById('recMicLabel');
  var idleDot = document.getElementById('recIdleDot');
  var idleLabel = document.getElementById('recIdleLabel');
  var rt = document.getElementById('recTimer');
  if (state === 'live') {
    if (micDot) { micDot.className = 'status-dot live'; }
    if (micLabel) micLabel.textContent = 'Live';
    if (idleDot) { idleDot.className = 'status-dot live'; }
    if (idleLabel) idleLabel.textContent = 'Live';
  } else if (state === 'paused') {
    if (micDot) { micDot.className = 'status-dot'; micDot.style.background = 'var(--warn)'; }
    if (micLabel) micLabel.textContent = 'Paused';
    if (idleDot) { idleDot.className = 'status-dot'; idleDot.style.background = 'var(--warn)'; }
    if (idleLabel) idleLabel.textContent = 'Paused';
  } else {
    if (micDot) { micDot.className = 'status-dot off'; micDot.style.background = ''; }
    if (micLabel) micLabel.textContent = 'Mic';
    if (idleDot) { idleDot.className = 'status-dot idle'; idleDot.style.background = ''; }
    if (idleLabel) idleLabel.textContent = 'Idle';
    if (rt) rt.textContent = '00:00';
  }
}

// ═══ Pause / Resume ═══
async function togglePause() {
  if (!sessionActive) return;
  paused = !paused;
  var btn = document.getElementById('pauseBtn');
  if (!btn) return;
  if (paused) {
    // ── Pause ──
    stopRealMic();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    btn.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
    btn.classList.add('paused');
    updateRecDash('paused');
    if (typeof window._setMicOverride === 'function') window._setMicOverride('paused');
    document.body.classList.remove('session-active');
  } else {
    // ── Resume ──
    if (typeof window._setMicOverride === 'function') window._setMicOverride(null);
    var ok = await startRealMic();
    if (!ok) { paused = true; if (typeof window._setMicOverride === 'function') window._setMicOverride('paused'); return; }
    btn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
    btn.classList.remove('paused');
    updateRecDash('live');
    document.body.classList.add('session-active');
    _startSessionTimer();
  }
}

// ═══ Fullscreen toggle ═══
var _isFullscreen = false;
var _iconSize = 2; // 0=small, 1=medium, 2=large (default: largest)
function applyIconSize() {
  var sizes = ['12px','15px','19px'];
  var fs = sizes[_iconSize];
  var btns = document.querySelectorAll('#appMain .icon-btn, #appMain .slide-dot');
  btns.forEach(function(b){ b.style.fontSize = fs; });
}
function toggleIconSize() {
  _iconSize = (_iconSize + 1) % 3;
  applyIconSize();
  var toggle = document.getElementById('iconSizeToggle');
  if (toggle) toggle.textContent = ['⊙','⊡','◉'][_iconSize];
}
// Apply largest size on load
setTimeout(applyIconSize, 100);

function toggleFullscreen() {
  _isFullscreen = !_isFullscreen;
  if (_isFullscreen) {
    document.body.classList.add('fullscreen-active');
  } else {
    document.body.classList.remove('fullscreen-active');
    var t = document.getElementById('captionTranscript');
    if (t) t.querySelectorAll('.line').forEach(function(l){l.style.display='';});
  }
}
// Escape key to exit fullscreen
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _isFullscreen) { toggleFullscreen(); }
});

// ═══ Font toggle — Crisp only (single font mode) ═══
function toggleCaptionFont() {
  // Only Crisp remains — all other font modes removed.
  updateFontToggleUI('crisp');
  localStorage.setItem('sottotitoli-caption-font', 'crisp');
}
function updateFontToggleUI(mode) {
  var btn = document.getElementById('fontToggleBtn');
  if (!btn) return;
  btn.textContent = 'Crisp';
  btn.style.fontFamily = '';
  btn.style.fontSize = '';
  btn.style.fontWeight = '';
  btn.style.color = '';
  btn.style.background = '';
  btn.style.fontStyle = '';
  btn.title = 'Font: Inter (Crisp)';
}

// Restore saved font preference (only Crisp remains)
(function(){
  var html = document.documentElement;
  html.classList.add('font-crisp');
  setTimeout(function(){ updateFontToggleUI('crisp'); }, 50);
})();

// ═══ Font size slider ═══
// ── Font size: 3-preset cycle (45, 55, 65) ──
var _fontSizes = [45, 55, 65];
var _fontIdx = 1; // default 55
function cycleFontSize() {
  _fontIdx = (_fontIdx + 1) % _fontSizes.length;
  var px = _fontSizes[_fontIdx];
  document.documentElement.style.setProperty('--font-size-override', px + 'px');
  var label = document.getElementById('fontSizeLabel');
  if (label) label.textContent = px;
  localStorage.setItem('sottotitoli-font-size', px);
}
// Restore saved font size
(function(){
  var saved = localStorage.getItem('sottotitoli-font-size');
  if (saved) {
    var px = parseInt(saved);
    var idx = _fontSizes.indexOf(px);
    if (idx >= 0) { _fontIdx = idx; document.documentElement.style.setProperty('--font-size-override', px + 'px'); }
    var label = document.getElementById('fontSizeLabel');
    if (label) label.textContent = px;
  }
})();

// ── Live style cycle (caption background variants) ──
var _liveStyles = ['6','7','5'];
var _liveStyleIdx = 0;
function cycleLiveStyle(){
  _liveStyleIdx = (_liveStyleIdx + 1) % _liveStyles.length;
  var val = _liveStyles[_liveStyleIdx];
  switchCaptionVar(val);
}
// Restore saved live style
(function(){
  var saved = localStorage.getItem('sottotitoli-caption-var') || '0';
  var idx = _liveStyles.indexOf(saved);
  if (idx >= 0) _liveStyleIdx = idx;
})();

// ── Magic Fix toggle ──
function toggleMagicFix(on) {
  var liveBtn = document.getElementById('magicFixLiveBtn');
  var liveLabel = document.getElementById('magicFixLiveLabel');
  if (on) {
    if (liveBtn) { liveBtn.style.color = 'var(--accent)'; liveBtn.style.borderColor = 'var(--accent)'; }
    if (liveLabel) { liveLabel.textContent = 'On'; liveLabel.style.color = 'var(--accent)'; }
    toggleCorrectedFeed(true);
    setTimeout(function(){ _updateGrammarLines(); }, 300);
  } else {
    if (liveBtn) { liveBtn.style.color = ''; liveBtn.style.borderColor = ''; }
    if (liveLabel) { liveLabel.textContent = 'Fix'; liveLabel.style.color = ''; }
    toggleCorrectedFeed(false);
    var lines = document.querySelectorAll('#captionTranscript .line');
    lines.forEach(function(l){
      var corr = l.querySelector('.grammar-corrected');
      if (corr) corr.remove();
      var orig = l.querySelector('.grammar-original-hidden');
      if (orig) { orig.classList.remove('grammar-original-hidden'); orig.style.display = ''; }
    });
  }
  localStorage.setItem('sottotitoli-magic-fix', on ? '1' : '0');
}
(function(){
  if (localStorage.getItem('sottotitoli-magic-fix') === '1') {
    toggleMagicFix(true);
  }
})();

// ── Flag expander logic (brutalist horizontal row) ──
(function(){
  var leftOpen = false, rightOpen = false;
  var leftFlagRow = document.getElementById('leftFlagRow');
  var rightFlagRow = document.getElementById('rightFlagRow');
  var btnLeftFlag = document.getElementById('topCapFlag');
  var btnRightFlag = document.getElementById('topTrFlag');

  function closeAll(except){
    if (except !== 'left') { if (leftFlagRow) leftFlagRow.classList.remove('open'); leftOpen = false; if (btnLeftFlag) btnLeftFlag.classList.remove('active'); }
    if (except !== 'right') { if (rightFlagRow) rightFlagRow.classList.remove('open'); rightOpen = false; if (btnRightFlag) btnRightFlag.classList.remove('active'); }
  }

  // Hide currently-selected flag from its own row
  window.refreshFlagRows = function(){
    var savedCap = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
    var savedTrg = localStorage.getItem('sottotitoli-translate-target') || 'it';
    if (leftFlagRow) {
      leftFlagRow.querySelectorAll('.top-mode-flag').forEach(function(b){
        b.style.display = (b.getAttribute('data-cap-lang') === savedCap) ? 'none' : '';
      });
    }
    if (rightFlagRow) {
      rightFlagRow.querySelectorAll('.top-mode-flag').forEach(function(b){
        b.style.display = (b.getAttribute('data-trg-lang') === savedTrg) ? 'none' : '';
      });
    }
  };

  // LEFT flag click — expand source languages
  if (btnLeftFlag) {
    btnLeftFlag.addEventListener('click', function(e){
      e.stopPropagation();
      closeAll('left');
      if (leftOpen) { closeAll(null); return; }
      if (leftFlagRow) { leftFlagRow.classList.add('open'); leftOpen = true; }
      btnLeftFlag.classList.add('active');
      window.refreshFlagRows();
    });
  }

  // RIGHT flag click — expand target languages (translate mode only)
  if (btnRightFlag) {
    btnRightFlag.addEventListener('click', function(e){
      e.stopPropagation();
      if (btnRightFlag.style.display === 'none') return;
      closeAll('right');
      if (rightOpen) { closeAll(null); return; }
      if (rightFlagRow) { rightFlagRow.classList.add('open'); rightOpen = true; }
      btnRightFlag.classList.add('active');
      window.refreshFlagRows();
    });
  }

  // Pick a source language from the left row
  if (leftFlagRow) {
    leftFlagRow.addEventListener('click', function(e){
      var btn = e.target.closest('.top-mode-flag');
      if (!btn) return;
      var code = btn.getAttribute('data-cap-lang');
      var flag = btn.getAttribute('data-cap-flag');
      if (!code) return;
      e.stopPropagation();
      // Use existing selectCaptionLang (handles confirm + redirect)
      if (typeof selectCaptionLang === 'function') selectCaptionLang(code, flag);
    });
  }

  // Pick a target language from the right row
  if (rightFlagRow) {
    rightFlagRow.addEventListener('click', function(e){
      var btn = e.target.closest('.top-mode-flag');
      if (!btn) return;
      var code = btn.getAttribute('data-trg-lang');
      var flag = btn.getAttribute('data-trg-flag');
      if (!code) return;
      e.stopPropagation();
      if (typeof selectTargetLang === 'function') selectTargetLang(code, flag);
    });
  }

  // Click outside closes
  document.addEventListener('click', function(e){
    if (!e.target.closest('.flag-expander')) closeAll(null);
  });

  // Init
  window.refreshFlagRows();
})();

// ── Dashboard link language ──
(function(){
  var label = document.getElementById('dashBackLabel');
  // data-i18n handles this now — remove manual override
  if (label) label.setAttribute('data-i18n', 'back_to_dash');
})();

// ── Right bar: cycle caption transcript style (cap1 ↔ cap5) ──
function cycleCaptionStyle(){
  var current = localStorage.getItem('sottotitoli-caption-style') || 'cap1';
  var next = current === 'cap1' ? 'cap5' : 'cap1';
  localStorage.setItem('sottotitoli-caption-style', next);
  if (typeof v20q_setStyle === 'function') v20q_setStyle(next);
  // Brief flash on the palette button
  var btn = document.getElementById('styleCycleBtn');
  if (btn) { btn.style.boxShadow = '0 0 12px var(--accent)'; setTimeout(function(){ btn.style.boxShadow = ''; }, 400); }
}
// Restore saved style
(function(){
  var saved = localStorage.getItem('sottotitoli-caption-style');
  if (saved && typeof v20q_setStyle === 'function') v20q_setStyle(saved);
})();

// ── Styled confirm modal (replaces browser confirm()) ──
var _confirmCallback = null;
var _confirmKeyHandler = null;
function showConfirmModal(title, msg, confirmLabel, onConfirm) {
  _confirmCallback = onConfirm;
  var modal = document.getElementById('confirmModal');
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMsg').textContent = msg;
  document.getElementById('confirmModalBtn').textContent = confirmLabel;
  document.getElementById('confirmModalBtn').onclick = function() {
    modal.style.display = 'none';
    if (_confirmCallback) { var cb = _confirmCallback; _confirmCallback = null; cb(); }
    if (_confirmKeyHandler) { document.removeEventListener('keydown', _confirmKeyHandler); _confirmKeyHandler = null; }
  };
  modal.style.display = 'flex';
  // Keyboard: Enter to confirm, Escape to cancel
  if (_confirmKeyHandler) document.removeEventListener('keydown', _confirmKeyHandler);
  _confirmKeyHandler = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('confirmModalBtn').click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeConfirmModal();
    }
  };
  document.addEventListener('keydown', _confirmKeyHandler);
  // Focus the confirm button so Enter works immediately
  setTimeout(function() { document.getElementById('confirmModalBtn').focus(); }, 100);
}
function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
  _confirmCallback = null;
  if (_confirmKeyHandler) { document.removeEventListener('keydown', _confirmKeyHandler); _confirmKeyHandler = null; }
  var _cancelBtn = document.getElementById('confirmModalCancel');
  if (_cancelBtn) _cancelBtn.style.display = '';
}

// ── Styled alert modal (single OK button, reuses the confirm modal chrome) ──
function showAlertModal(title, msg, onOk) {
  var cancelBtn = document.getElementById('confirmModalCancel');
  if (cancelBtn) cancelBtn.style.display = 'none';
  showConfirmModal(title, msg, 'OK', function() {
    if (cancelBtn) cancelBtn.style.display = '';
    if (onOk) onOk();
  });
}

// ═══ Audio source: always default mic ═══
// (BlackHole system-audio capture removed — mic only)
window._getAudioSourceConfig = function() { return true; };

// ── Select caption language → styled confirm then reload ──
window.selectCaptionLang = function(code, flag) {
  var lang = localStorage.getItem('sottotitoli-lang') || 'en';
  var title = lang === 'it' ? 'Cambiare lingua sottotitoli' : 'Change Caption Language';
  var msg = lang === 'it'
    ? 'Passare a ' + flag + '?\nLascerai questa stanza. La trascrizione non salvata andrà persa.'
    : 'Switch to ' + flag + '?\nYou will leave this room. Unsaved transcript will be lost.';
  var btn = lang === 'it' ? 'Cambia' : 'Switch';
  showConfirmModal(title, msg, btn, function() {
    localStorage.setItem('sottotitoli-caption-lang', code);
    var isTr = (typeof v20q !== 'undefined' && v20q.translateOn) || (window.location.search.indexOf('mode=translate') !== -1);
    var mode = isTr ? '&mode=translate&tgt='+(localStorage.getItem('sottotitoli-translate-target')||'it') : '';
    window.location.href = window.location.pathname + '?lang=' + code + mode;
  });
};

// ── Select target language → styled confirm then reload ──
window.selectTargetLang = function(code, flag) {
  var lang = localStorage.getItem('sottotitoli-lang') || 'en';
  var title = lang === 'it' ? 'Cambiare lingua traduzione' : 'Change Translation Language';
  var msg = lang === 'it'
    ? 'Passare a ' + flag + '?\nLascerai questa stanza. La trascrizione non salvata andrà persa.'
    : 'Switch to ' + flag + '?\nYou will leave this room. Unsaved transcript will be lost.';
  var btn = lang === 'it' ? 'Cambia' : 'Switch';
  showConfirmModal(title, msg, btn, function() {
    localStorage.setItem('sottotitoli-translate-target', code);
    var src = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
    window.location.href = window.location.pathname + '?lang=' + src + '&mode=translate&tgt=' + code;
  });
};

// ── Source language selector (translate mode) ──
window.toggleSrcLangPopup = function() {
  var popup = document.getElementById('srcLangPopup');
  if (!popup) return;
  popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
};

window.selectSourceLang = function(code, flag) {
  var lang = localStorage.getItem('sottotitoli-lang') || 'en';
  var title = lang === 'it' ? 'Cambiare lingua sorgente' : 'Change Source Language';
  var msg = lang === 'it'
    ? 'Impostare ' + flag + ' come lingua sorgente?\nSarai reindirizzato a una nuova stanza.'
    : 'Set ' + flag + ' as source language?\nYou will be redirected to a new room.';
  var btn = lang === 'it' ? 'Cambia' : 'Switch';
  showConfirmModal(title, msg, btn, function() {
    localStorage.setItem('sottotitoli-caption-lang', code);
    var tgt = localStorage.getItem('sottotitoli-translate-target') || 'it';
    window.location.href = window.location.pathname + '?lang=' + code + '&mode=translate&tgt=' + tgt;
  });
};

// Close source popup on outside click
document.addEventListener('click', function(e) {
  var popup = document.getElementById('srcLangPopup');
  if (!popup || popup.style.display !== 'block') return;
  if (!e.target.closest('#srcLangPopup') && !e.target.closest('#topSrcFlag')) {
    popup.style.display = 'none';
  }
});

// ── Init flag displays ──
(function(){
  var savedCap = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
  var flagMap = {'en-US':'🇬🇧','it-IT':'🇮🇹','nl-NL':'🇳🇱','fr-FR':'🇫🇷','de-DE':'🇩🇪','es-ES':'🇪🇸','pl-PL':'🇵🇱','pt-PT':'🇵🇹'};
  var flagEl = document.getElementById('topCapFlagEmoji');
  if (flagEl) flagEl.textContent = flagMap[savedCap] || '🇬🇧';
  var savedTrg = localStorage.getItem('sottotitoli-translate-target') || 'it';
  var trgMap = {'en':'🇬🇧','it':'🇮🇹','nl':'🇳🇱','fr':'🇫🇷','de':'🇩🇪','es':'🇪🇸','pl':'🇵🇱','pt':'🇵🇹'};
  var trgEl = document.getElementById('topTrFlagEmoji');
  if (trgEl) trgEl.textContent = trgMap[savedTrg] || '🇮🇹';
  // Source language flag (translate mode) — uses caption-lang as source
  var srcFlagEl = document.getElementById('topSrcFlagEmoji');
  if (srcFlagEl) srcFlagEl.textContent = flagMap[savedCap] || '🇬🇧';
})();

// ── Word bank panel toggle ──
function toggleWordBankPanel() {
  // Open the word bank slide (slide 3 - Word Meaning)
  window.duoGoSlide ? window.duoGoSlide(3) : (function(){
    var dots = document.querySelectorAll('#slideDots .slide-dot');
    if (dots[2]) dots[2].click();
  })();
}

function updateFontSize(val) { /* kept for compatibility, unused */ }
function resetFontSize() { /* kept for compatibility, unused */ }
function switchCaptionVar(val) {
  var html = document.documentElement;
  [5,6,7].forEach(function(i){ html.classList.remove('cap-var' + i); });
  if (val && val !== '0') {
    html.classList.add('cap-var' + val);
    localStorage.setItem('sottotitoli-caption-var', val);
  } else {
    localStorage.removeItem('sottotitoli-caption-var');
  }
  var sel = document.getElementById('varSelect'); if (sel) sel.value = val;
  updateLiveVarBtns();
}
function updateLiveVarBtns() {
  var current = localStorage.getItem('sottotitoli-caption-var') || '0';
  document.querySelectorAll('.live-var-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-val') === current);
  });
}
// Restore saved VAR preference
(function(){
  var stored = localStorage.getItem('sottotitoli-caption-var');
  if (stored) {
    switchCaptionVar(stored);
  }
})();


// LIVE dot reflects real mic state (no manual toggle needed)

// ═══ #34 Word Bank — persistent vocabulary collection ═══
// Unified key shared across caption + traduzione + account pages
var WORD_BANK_KEY = 'sottotitoli_wordbank';
// Migrate from old language-specific key if present
(function migrateWordBank() {
  var oldKey = 'sottotitoli_wordbank_' + (currentCaptionLang || 'en-US');
  var old = localStorage.getItem(oldKey);
  var current = localStorage.getItem(WORD_BANK_KEY);
  if (old && !current) {
    localStorage.setItem(WORD_BANK_KEY, old);
    localStorage.removeItem(oldKey);
  } else if (old && current) {
    try {
      var oldArr = JSON.parse(old);
      var curArr = JSON.parse(current);
      var merged = curArr.slice();
      oldArr.forEach(function(w) { if (merged.indexOf(w) < 0) merged.push(w); });
      localStorage.setItem(WORD_BANK_KEY, JSON.stringify(merged));
      localStorage.removeItem(oldKey);
    } catch(e) {}
  }
})();
var wordBank = JSON.parse(localStorage.getItem(WORD_BANK_KEY) || '[]');

function addToWordBank(optionalWord) {
  var word = optionalWord || '';
  if (!word) {
    var input = document.getElementById('wordbankInput');
    if (!input) return;
    word = input.value.trim().toLowerCase();
    if (input) input.value = '';
  }
  word = word.trim().toLowerCase();
  if (!word || word.length < 2) return;
  if (wordBank.indexOf(word) >= 0) return;
  wordBank.push(word);
  saveWordBank();
  renderWordBank();

  // Show toast feedback
  showToastMsg('\u2714 ' + word + ' added to word bank');

  // If translation mode is on, also save translation pair
  if (v20q.translateOn) {
    var tgtLang = localStorage.getItem('sottotitoli-translate-target') || 'it';
    var srcLang = (window._currentCaptionLang || 'en-US').split('-')[0];
    if (srcLang !== tgtLang) {
      var T = window.SottotitoliTranslationProviders;
      if (T) {
        T.translateText({ provider: 'auto' }, word, srcLang, tgtLang).then(function(r){
          _saveTranslationWord(word, r.translatedText, srcLang, tgtLang);
        }).catch(function(){});
      }
    }
  }

  if (!optionalWord) {
    var input = document.getElementById('wordbankInput');
    if (input) input.focus();
  }
}

// ── Translation word bank ──
var TR_WORD_KEY = 'sottotitoli_translation_words';
function _saveTranslationWord(source, target, srcLang, tgtLang) {
  // Save translation pair
  var words = [];
  try { words = JSON.parse(localStorage.getItem(TR_WORD_KEY) || '[]'); } catch(e) {}
  if (!words.some(function(w){ return w.source === source && w.tgtLang === tgtLang; })) {
    words.push({ source: source, target: target, srcLang: srcLang, tgtLang: tgtLang, savedAt: new Date().toISOString() });
    localStorage.setItem(TR_WORD_KEY, JSON.stringify(words));
  }
  // Also save target word to language-specific bank (e.g. sottotitoli_wb_nl)
  if (tgtLang && target && target.trim()) {
    var bankKey = 'sottotitoli_wb_' + tgtLang;
    var bank = [];
    try { bank = JSON.parse(localStorage.getItem(bankKey) || '[]'); } catch(e) {}
    var tw = target.trim().toLowerCase();
    if (bank.indexOf(tw) === -1) {
      bank.push(tw);
      localStorage.setItem(bankKey, JSON.stringify(bank));
    }
  }
}

function removeFromWordBank(word) {
  wordBank = wordBank.filter(function(w) { return w !== word; });
  saveWordBank();
  renderWordBank();
}

// ── Toggle word in/out of bank (used by synonym cards) ──
function toggleSynonymWord(btn, word) {
  var inBank = wordBank.indexOf(word) >= 0;
  if (inBank) {
    wordBank = wordBank.filter(function(w) { return w !== word; });
    btn.textContent = '+';
    btn.title = 'Add to Word Bank';
    btn.style.background = 'var(--card2)';
    btn.style.color = 'var(--muted2)';
  } else {
    wordBank.push(word);
    btn.textContent = '−';
    btn.title = 'Remove from Word Bank';
    btn.style.background = 'rgba(167,139,250,.1)';
    btn.style.color = 'var(--accent)';
  }
  saveWordBank();
  renderWordBank();
}

function clearWordBank() {
  showConfirmModal('Word Bank', 'Clear all ' + wordBank.length + ' saved words?', 'Clear', function(){
    wordBank = [];
    saveWordBank();
    renderWordBank();
  });
}

// Clear session-scoped synonyms tracking
function clearSynonymSession() {
  // Reset the synonym word set for a fresh session
  if (typeof window._synSessionWords !== 'undefined') {
    window._synSessionWords = [];
  }
  // Clear any visible synonym cards if panel is open
  var container = document.getElementById('synCardsContainer');
  if (container) container.innerHTML = '<div style="grid-column:1/-1;color:var(--muted);text-align:center;padding:20px;font-size:13px">New session — start speaking to see contextual synonyms</div>';
}

function saveWordBank() {
  localStorage.setItem(WORD_BANK_KEY, JSON.stringify(wordBank));
  var countEl = document.getElementById('wordbankCount');
  if (countEl) countEl.textContent = wordBank.length;
  // Sync to Supabase user_wordbank_words via "Saved from sessions" bank
  syncWordBankToSupabase();
}

// ── Supabase word bank sync ──
var _wbSyncTimer = null;
function syncWordBankToSupabase() {
  clearTimeout(_wbSyncTimer);
  _wbSyncTimer = setTimeout(_doWbSync, 600); // debounce
}
async function _doWbSync() {
  try {
    if (!window.sottotitoliSupabase) return;
    var sb = window.sottotitoliSupabase;
    var r = await sb.auth.getSession();
    if (!r.data?.session) return;
    var userId = r.data.session.user.id;
    var lang = 'en'; // caption language — saved words are from English speech
    // 1. Find or create "Saved from sessions" wordbank
    var wbRes = await sb.from('user_wordbanks').select('id').eq('user_id', userId).eq('name', BANK_ID.SAVED_FROM_SESSIONS).maybeSingle();
    var wbId;
    if (wbRes.data) {
      wbId = wbRes.data.id;
    } else {
      var createRes = await sb.from('user_wordbanks').insert({ user_id: userId, name: BANK_ID.SAVED_FROM_SESSIONS, lang: lang }).select('id').single();
      if (createRes.error) { console.warn('wb create:', createRes.error.message); return; }
      wbId = createRes.data.id;
    }
    // 2. Upsert all current words with POS detection (uses existing tagWord)
    for (var i = 0; i < wordBank.length; i++) {
      var w = wordBank[i];
      var pos = typeof tagWord === 'function' ? tagWord(w) : null;
      if (pos === 'OTHER' || pos === 'FUNC' || pos === 'WORD') pos = null;
      // Check if word already exists in this bank
      var exRes = await sb.from('user_wordbank_words').select('id,usage_count').eq('wordbank_id', wbId).eq('word', w).maybeSingle();
      if (exRes.data) {
        // Increment usage, update POS if we have one and DB doesn't
        var update = { usage_count: (exRes.data.usage_count || 0) + 1 };
        if (pos) update.pos = pos;
        await sb.from('user_wordbank_words').update(update).eq('id', exRes.data.id);
      } else {
        await sb.from('user_wordbank_words').insert({ wordbank_id: wbId, word: w, pos: pos || null, usage_count: 1 });
      }
      // ═══ Also upsert to review_words (feeds pinned banks) ═══
      try {
        var clean = w.replace(/[^a-zA-Z0-9 '-]/g, '').trim();
        if (clean && clean.length >= 2) {
          var norm = clean.toLowerCase();
          var rwRes = await sb.from('review_words').select('id,personal_frequency,is_new').eq('user_id', userId).eq('lemma', clean).maybeSingle();
          if (rwRes.data) {
            var rwUpdate = { personal_frequency: (rwRes.data.personal_frequency || 0) + 1 };
            if (pos) rwUpdate.pos = pos;
            await sb.from('review_words').update(rwUpdate).eq('id', rwRes.data.id);
          } else {
            await sb.from('review_words').insert({
              user_id: userId, lemma: clean, normalized: norm,
              pos: pos || null, is_new: true, first_seen_at: new Date().toISOString(),
              source_type: 'session', review_state: 'new',
              personal_frequency: 1
            });
          }
        }
      } catch(rwErr) { /* review_words table might not exist yet */ }
    }
  } catch(e) { /* silent */ }
}

// ── POS detection using enhanced tagWord (Penn Treebank) ──
function _detectPOS(word) {
  if (typeof tagWord === 'function') {
    var pos = tagWord(word);
    return (pos === 'OTHER' || pos === 'FUNC' || pos === 'WORD') ? null : pos;
  }
  return null;
}

function renderWordBank() {
  var chips = document.getElementById('wordbankChips');
  var empty = document.getElementById('wordbankEmpty');
  var countEl = document.getElementById('wordbankCount');
  if (!chips) return;
  if (countEl) countEl.textContent = wordBank.length;
  // POS color mapping
  var posColors={VERB:'#34d399',NOUN:'#60a5fa',ADJ:'#f472b6',ADV:'#c084fc',FUNC:'#6b7280',WORD:'#a78bfa'};
  var posBg={VERB:'rgba(52,211,153,.1)',NOUN:'rgba(96,165,250,.1)',ADJ:'rgba(244,114,182,.1)',ADV:'rgba(192,132,252,.1)',FUNC:'rgba(107,114,128,.06)',WORD:'rgba(167,139,250,.1)'};
  if (wordBank.length === 0) {
    chips.innerHTML = '';
    if (empty) empty.classList.add('show');
  } else {
    if (empty) empty.classList.remove('show');
    chips.innerHTML = wordBank.map(function(w) {
      var d = (typeof window.tagWordDetail === 'function') ? window.tagWordDetail(w) : { pos: tagWord(w), detail: tagWord(w), penn: null };
      var pos = d.pos;
      var detail = (d.detail && d.detail !== pos) ? d.detail : pos;
      var c=posColors[pos]||'#c4b5fd';
      var bg=posBg[pos]||'rgba(167,139,250,.1)';
      return '<span class="wordbank-chip" style="background:'+bg+';color:'+c+';border-color:'+c+'30" onclick="showWordDefinition(\'' + w.replace(/'/g, "\\'") + '\')" title="'+detail+'">' + w + '<span style="font-size:7px;opacity:.5;margin:0 2px">'+detail+'</span><span class="wb-chip-x" onclick="event.stopPropagation();removeFromWordBank(\'' + w.replace(/'/g, "\\'") + '\')" title="Remove from Word Bank">×</span></span>';
    }).join('');
  }
}

// ═══ WORD_DEFS removed — NGSL (js/en-ngsl.js) supersedes it everywhere ═══

// ═══ Word Cache — LRU, in-memory, session-scoped ═══
var WORD_CACHE = {};
var WORD_CACHE_KEYS = [];
var WORD_CACHE_MAX = 200;

function _cacheGet(key) {
  return WORD_CACHE[key] || null;
}
function _cacheSet(key, value) {
  if (WORD_CACHE[key]) return; // already cached
  WORD_CACHE[key] = value;
  WORD_CACHE_KEYS.push(key);
  while (WORD_CACHE_KEYS.length > WORD_CACHE_MAX) {
    var old = WORD_CACHE_KEYS.shift();
    delete WORD_CACHE[old];
  }
}

// ═══ Hover prefetch: start fetch on 200ms hover, cancel on leave ═══
var _hoverTimer = null;
window._prefetchWordOnHover = function(el, word) {
  if (_hoverTimer) clearTimeout(_hoverTimer);
  _hoverTimer = setTimeout(function() {
    // Check cache first — no network if cached
    var cacheKey = word.toLowerCase();
    if (!_cacheGet(cacheKey)) {
      // Silent background fetch via the primary pipeline
      // Create a hidden temp card so _fetchWordData can populate the cache
      var tmpId = 'prefetch-' + Date.now();
      var tmpDiv = document.createElement('div');
      tmpDiv.id = tmpId;
      tmpDiv.className = 'syn-card';
      tmpDiv.style.display = 'none';
      tmpDiv.innerHTML = '<span class="syn-def"></span><span class="syn-rel"></span><span class="syn-pos-tag"></span>';
      document.body.appendChild(tmpDiv);
      _fetchWordData(word, tmpId);
      // Clean up after 5 seconds
      setTimeout(function() { var el = document.getElementById(tmpId); if (el) el.remove(); }, 5000);
    }
  }, 200);
};
window._cancelPrefetch = function() {
  if (_hoverTimer) { clearTimeout(_hoverTimer); _hoverTimer = null; }
};

// ═══ Word definition popup — stays open, Add to Bank changes state ═══
var _wordDefPopupWord = '';
function showWordDefinition(word) {
  _wordDefPopupWord = word;
  var popup = document.getElementById('wordDefPopup');
  var wEl = document.getElementById('wordDefPopupWord');
  var pEl = document.getElementById('wordDefPopupPOS');
  var tEl = document.getElementById('wordDefPopupText');
  var btn = document.getElementById('wordDefPopupAddBtn');
  if (!popup || !wEl || !tEl) return;
  
  wEl.textContent = word;
  // POS detection
  var pos = typeof tagWord === 'function' ? tagWord(word) : '';
  if (pos === 'OTHER' || pos === 'FUNC' || pos === 'WORD') pos = '';
  pEl.textContent = pos || '';
  
  // Definition lookup — NGSL first (instant, offline, curated)
  var ngEntry = (window.EN_NGSL || {})[word.toLowerCase()];
  if (ngEntry && ngEntry[3]) {
    tEl.textContent = ngEntry[3];
    if (!pos && ngEntry[1]) {
      var ngPosMap = { v:'VERB', n:'NOUN', adj:'ADJ', adv:'ADV' };
      pEl.textContent = ngPosMap[ngEntry[1]] || '';
    }
  } else {
    tEl.innerHTML = '<em style="opacity:.6">Definition not in dictionary</em>';
    // Try Free Dictionary API — skip proper noun entries
    try {
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data[0] && data[0].meanings) {
            var meanings = data[0].meanings;
            var bestDef = null, bestPos = '';
            // Find first non-proper-noun definition
            for (var mi = 0; mi < meanings.length && !bestDef; mi++) {
              var m = meanings[mi];
              var isProper = m.partOfSpeech === 'proper noun' || m.partOfSpeech === 'proper-noun';
              if (!isProper && m.definitions) {
                for (var di = 0; di < m.definitions.length && !bestDef; di++) {
                  var txt = m.definitions[di].definition || '';
                  // Skip obvious proper noun definitions
                  if (/^(A|The)\s/.test(txt) && /(song|album|film|movie|record|band|artist|actor|actress|novel|book|poem|city|town|country|company|brand|product|software|app|game|website|platform|character)/i.test(txt)) continue;
                  bestDef = txt;
                  bestPos = m.partOfSpeech;
                }
              }
            }
            // Fallback: accept first definition if all were proper nouns
            if (!bestDef && data[0].meanings[0] && data[0].meanings[0].definitions && data[0].meanings[0].definitions[0]) {
              bestDef = data[0].meanings[0].definitions[0].definition;
              bestPos = data[0].meanings[0].partOfSpeech;
            }
            if (bestDef) tEl.textContent = bestDef;
            if (!pos && bestPos) pEl.textContent = bestPos.toUpperCase();
          }
        }).catch(function(){});
    } catch(e) {}
  }
  // Update Add button state
  var inBank = wordBank.indexOf(word) >= 0;
  if (inBank) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
    btn.classList.add('added');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Bank';
    btn.classList.remove('added');
  }
  
  popup.style.display = 'block';
}

window.addWordFromDefPopup = function() {
  var word = _wordDefPopupWord;
  if (!word) return;
  if (wordBank.indexOf(word) >= 0) return; // already in bank
  addToWordBank(word);
  // Update button to "Added" state — popup stays open
  var btn = document.getElementById('wordDefPopupAddBtn');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
    btn.classList.add('added');
  }
  // Show toast
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:var(--teal);color:#fff;font-size:13px;font-weight:700;padding:8px 20px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
  t.innerHTML = '<i class="fa-solid fa-check"></i> ' + word + ' added to bank';
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = '1'; });
  setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 2000);
};

// Simple language detection for Word Bank lookups
function detectWordLanguage(word) {
  // Dutch patterns: 'ij', 'aa', 'ee', 'oo', 'uu', 'sch', 'lijk', 'tje', 'ing', 'en' endings
  if (/(ij|aa|ee|oo|uu|sch|lijk|tje|heid|ing)\b/i.test(word)) return 'nl';
  // Italian patterns: vowels ending, 'zione', 'mente', 'gli', 'sci', 'cia'
  if (/(zione|mente|gli|sci|cia|gio|che|chi)\b/i.test(word) || /[aeiou]$/i.test(word)) return 'it';
  // Spanish patterns
  if (/(ción|dad|mente|ando|iendo|illo|illa)\b/i.test(word)) return 'es';
  // French patterns
  if (/(eau|eur|ment|tion|sion|ique|able)\b/i.test(word)) return 'fr';
  // Default to English
  return 'en';
}
function lookupOnline(word) {
  var lang = detectWordLanguage(word);
  var urls = {
    en: 'https://www.merriam-webster.com/dictionary/',
    nl: 'https://www.vandale.nl/gratis-woordenboek/nederlands/betekenis/',
    it: 'https://dizionario.internazionale.it/parola/',
    es: 'https://dle.rae.es/',
    fr: 'https://www.larousse.fr/dictionnaires/francais/'
  };
  var url = (urls[lang] || 'https://www.google.com/search?q=define+') + encodeURIComponent(word);
  window.open(url, '_blank');
}

// Restore word bank from Supabase on load (silent fail — falls back to localStorage)
(function() {
  // Try to cache native language from Supabase profile
  if (window.sottotitoliSupabase) {
    window.sottotitoliSupabase.auth.getSession().then(function(r) {
      if (r.data?.session) {
        window.sottotitoliSupabase.from('user_preferences')
          .select('native_lang,updated_at').eq('user_id', r.data.session.user.id).maybeSingle()
          .then(function(res) {
            if (res.data && res.data.native_lang) {
              localStorage.setItem('sottotitoli-native-lang', res.data.native_lang);
            }
          }).catch(function(){});
      }
    }).catch(function(){});
  }
  // Also try profiles table as fallback (some users have it there)
  if (window.sottotitoliSupabase) {
    window.sottotitoliSupabase.auth.getSession().then(function(r) {
      if (r.data?.session) {
        window.sottotitoliSupabase.from('profiles')
          .select('native_lang').eq('id', r.data.session.user.id).maybeSingle()
          .then(function(res) {
            if (res.data && res.data.native_lang && !localStorage.getItem('sottotitoli-native-lang')) {
              localStorage.setItem('sottotitoli-native-lang', res.data.native_lang);
            }
          }).catch(function(){});
      }
    }).catch(function(){});
  }
  // If no native lang cached yet, try reading from panoramica settings
  if (!localStorage.getItem('sottotitoli-native-lang')) {
    var settingsStr = localStorage.getItem('sottotitoli-settings');
    if (settingsStr) {
      try {
        var settings = JSON.parse(settingsStr);
        if (settings.native_lang) {
          localStorage.setItem('sottotitoli-native-lang', settings.native_lang);
        }
      } catch(e) {}
    }
  }
  renderWordBank();
})();

// ═══ Recover pending session (e.g. if user closed window during recording) ═══
(function() {
  if (window.sottotitoliSupabase && typeof _recoverPendingSession === 'function') {
    // Delay a bit so Supabase session is ready
    setTimeout(function() {
      _recoverPendingSession(window.sottotitoliSupabase);
    }, 1500);
  }
})();


// ═══ Vocab definition display ═══
window.showVocabDefinition = function(word){
  var panel = document.getElementById('vocabDefPanel');
  var wEl = document.getElementById('vocabDefWord');
  var tEl = document.getElementById('vocabDefText');
  if(!panel||!wEl||!tEl) return;
  panel.style.display='block';
  wEl.textContent = word + ': ';
  // NGSL local definition (instant, offline)
  var ngE = (window.EN_NGSL || {})[word.toLowerCase()];
  tEl.textContent = (ngE && ngE[3]) ? ngE[3] : '(definition not available)';
};

window.removeFromVocabBank = function(word){
  var key = WORD_BANK_KEY;
  var bank = JSON.parse(localStorage.getItem(key)||'[]');
  bank = bank.filter(function(w){return w!==word;});
  localStorage.setItem(key,JSON.stringify(bank));
  if(typeof window.refreshExtrasPanel === 'function'){
    window.refreshExtrasPanel();
  }
  // Also refresh main wordbank panel if open
  var wbPanel = document.getElementById('wordbankPanel');
  if(wbPanel && wbPanel.style.display==='block'){
    if(typeof renderWordBank === 'function') renderWordBank();
  }
};

// ═══ Auto-collect unique content words into Word Bank from finalized sentences ═══
var STOP_WORDS = {
  the:1,a:1,an:1,is:1,are:1,was:1,were:1,be:1,been:1,being:1,
  have:1,has:1,had:1,do:1,does:1,did:1,will:1,would:1,can:1,could:1,
  shall:1,should:1,may:1,might:1,must:1,not:1,to:1,
  of:1,in:1,for:1,on:1,with:1,at:1,by:1,from:1,into:1,about:1,
  and:1,or:1,but:1,so:1,if:1,because:1,when:1,where:1,how:1,that:1,than:1,
  we:1,us:1,our:1,you:1,your:1,he:1,him:1,his:1,she:1,her:1,
  it:1,its:1,they:1,them:1,their:1,this:1,these:1,those:1,
  i:1,me:1,my:1,no:1,yes:1,just:1,very:1,also:1,now:1,then:1,
  here:1,there:1,all:1,some:1,any:1,each:1,every:1,both:1,few:1,more:1,
  most:1,other:1,up:1,out:1,as:1,too:1,well:1,only:1,still:1,even:1,
  what:1,which:1,who:1,whom:1,whose:1,why:1,again:1,over:1,under:1,
  between:1,through:1,during:1,before:1,after:1,above:1,below:1,
  off:1,down:1,back:1,get:1,got:1,make:1,made:1,go:1,going:1,went:1,
  come:1,came:1,take:1,took:1,see:1,saw:1,know:1,knew:1,think:1,thought:1,
  say:1,said:1,tell:1,told:1,like:1,look:1,use:1,used:1,using:1,
  much:1,many:1,really:1,quite:1,rather:1,almost:1,always:1,never:1,
  let:1,put:1,set:1,keep:1,find:1,found:1,give:1,gave:1,need:1,want:1,
  try:1,trying:1,ask:1,asked:1,seem:1,seems:1,mean:1,means:1,meant:1,
  way:1,thing:1,things:1,people:1,day:1,time:1,lot:1,kind:1,sort:1,
  bit:1,part:1,place:1,man:1,men:1,woman:1,women:1,child:1,children:1,
  world:1,life:1,hand:1,eye:1,eyes:1,fact:1,right:1,left:1,good:1,great:1,
  new:1,old:1,big:1,small:1,large:1,little:1,long:1,short:1,high:1,low:1,
  different:1,important:1,able:1,same:1,sure:1,true:1,real:1,bad:1,
  work:1,home:1,house:1,room:1,door:1,one:1,two:1,three:1,first:1,last:1,
  next:1,another:1,however:1,therefore:1,though:1,although:1,while:1,
  without:1,within:1,along:1,around:1,toward:1,towards:1,until:1
};

function autoCollectWordBank(text) {
  if (!text) return;
  var words = text.toLowerCase().match(/[a-z]{3,}/g) || [];
  var added = false;
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    // Skip stop words, numbers, and very short words
    if (STOP_WORDS[w]) continue;
    if (/^\d+$/.test(w)) continue;
    if (w.length < 4) continue; // skip 3-letter words (mostly noise)
    // Skip words already in bank
    if (wordBank.indexOf(w) >= 0) continue;
    // Add it — first time this word appears
    wordBank.push(w);
    added = true;
  }
  if (added) {
    saveWordBank();
    // If word bank panel is open, refresh it
    var panel = document.getElementById('wordbankPanel');
    if (panel && panel.style.display === 'block') {
      renderWordBank();
    }
  }
}

// ═══ #30 Listening Mode — update from session ═══
function updateListenBar() {
  var micDot = document.getElementById('recMicDot');
  var micLabel = document.getElementById('recMicLabel');
  var idleDot = document.getElementById('recIdleDot');
  var idleLabel = document.getElementById('recIdleLabel');
  var timer = document.getElementById('recTimer');

  var isActive = (typeof sessionActive !== 'undefined') && sessionActive;

  if (isActive) {
    if (micDot) micDot.className = 'status-dot live';
    if (micLabel) micLabel.textContent = 'Mic';
    if (idleDot) idleDot.className = 'status-dot live';
    if (idleLabel) idleLabel.textContent = 'Live';
  } else {
    if (micDot) micDot.className = 'status-dot off';
    if (micLabel) micLabel.textContent = 'Mic';
    if (idleDot) idleDot.className = 'status-dot idle';
    if (idleLabel) idleLabel.textContent = 'Idle';
    if (timer) timer.textContent = '00:00';
  }
}

// Update listen bar every 2 seconds during session
var _listenBarInterval = setInterval(updateListenBar, 2000);

// ═══ PDF Download for Grammar Report (#37) ═══
function downloadGrammarPDF() {
  var report = window._grammarReport;
  if (!report) { showAlertModal('Report Grammatica', 'No grammar data yet. Start a session first.'); return; }
  var w = window.open('', '_blank', 'width=800,height=600');
  var totalWords = report.totalWords || 0;
  var totalTime = report.totalTime || 0;
  var min = Math.floor(totalTime/60), sec = totalTime%60;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Grammar Report</title>';
  h += '<style>body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#111;padding:40px;max-width:700px;margin:0 auto}';
  h += 'h1{font-size:24px;font-weight:900;margin-bottom:4px}h2{font-size:14px;color:#666;margin-bottom:24px}';
  h += '.summary{display:flex;gap:20px;margin-bottom:30px;flex-wrap:wrap}';
  h += '.summary-box{padding:14px 20px;border-radius:10px;background:#f5f5f5;text-align:center;min-width:100px}';
  h += '.summary-box .val{font-family:JetBrains Mono,monospace;font-size:22px;font-weight:900}';
  h += '.summary-box .lbl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.1em}';
  h += '.rings{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:30px}';
  h += '.ring{text-align:center;padding:10px}.ring .label{font-size:10px;font-weight:600;margin-top:4px}.ring .sub{font-size:7px;color:#999}';
  h += '.footer{text-align:center;font-size:9px;color:#bbb;margin-top:30px;border-top:1px solid #eee;padding-top:15px}';
  h += '@media print{body{padding:20px}}</style></head><body>';
  h += '<h1>📋 Report Sessione</h1><h2>Sottotitoli · ' + report.date + ' · ' + (report.language||'English') + '</h2>';
  h += '<div class="summary">';
  h += '<div class="summary-box"><div class="val">' + totalWords + '</div><div class="lbl">Parole Totali</div></div>';
  h += '<div class="summary-box"><div class="val">' + min + 'm ' + sec + 's</div><div class="lbl">Tempo Parlato</div></div>';
  h += '<div class="summary-box"><div class="val">' + (report.wpm||0) + '</div><div class="lbl">WPM</div></div>';
  h += '<div class="summary-box"><div class="val">' + report.date + '</div><div class="lbl">Data</div></div>';
  if (report.lexical_diversity) {
    h += '<div class="summary-box"><div class="val">' + (report.lexical_diversity * 100).toFixed(0) + '%</div><div class="lbl">Varietà Lessicale</div></div>';
  }
  if (report.fillers_per_minute != null && report.fillers_per_minute > 0) {
    h += '<div class="summary-box"><div class="val">' + report.fillers_per_minute.toFixed(1) + '</div><div class="lbl">Riempitivi/min</div></div>';
  }
  h += '</div><h3 style="margin-bottom:12px">Grammar Accuracy</h3><div class="rings">';
  report.rings.forEach(function(r){
    var c = r.color.startsWith('url') ? '#a78bfa' : r.color;
    var circ = 2*Math.PI*38, dash = (r.pct/100)*circ;
    h += '<div class="ring"><svg viewBox="0 0 100 100" style="width:70px;height:70px">';
    h += '<circle cx="50" cy="50" r="38" fill="none" stroke="#eee" stroke-width="6"/>';
    h += '<circle cx="50" cy="50" r="38" fill="none" stroke="'+c+'" stroke-width="6" stroke-dasharray="'+circ+'" stroke-dashoffset="'+(circ-dash)+'" stroke-linecap="round" transform="rotate(-90 50 50)"/>';
    h += '<text x="50" y="48" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="16" font-weight="900" fill="'+c+'">'+r.pct+'%</text></svg>';
    h += '<div class="label">'+r.n+'</div><div class="sub">'+r.sub+'</div></div>';
  });
  h += '</div><div class="footer">Generato da Sottotitoli · '+new Date().toISOString().split('T')[0]+'</div>';
  h += '</body></html>';
  _openPrintableHtml(h, 'sottotitoli-grammar-report.html');
}

// ═══ Extras Panel — Live Vocabulary / Grammar / Metrics (fully functional) ═══
(function(){
  var activePanel = null;
  window._getActivePanel = function() { return activePanel; };
  window._setActivePanel = function(v) { activePanel = v; };
  var _synCache = {};
  var _posCache = {};

  // ── POS Dictionary (top 500 English words + pattern fallback) ──
  var POS_DICT = {
    the:'DET',a:'DET',an:'DET',is:'VERB',are:'VERB',was:'VERB',were:'VERB',be:'VERB',been:'VERB',being:'VERB',
    have:'VERB',has:'VERB',had:'VERB',do:'VERB',does:'VERB',did:'VERB',will:'AUX',would:'AUX',can:'AUX',could:'AUX',
    shall:'AUX',should:'AUX',may:'AUX',might:'AUX',must:'AUX',not:'PART',to:'PART',
    of:'PREP',in:'PREP',for:'PREP',on:'PREP',with:'PREP',at:'PREP',by:'PREP',from:'PREP',into:'PREP',about:'PREP',
    and:'CONJ',or:'CONJ',but:'CONJ',so:'CONJ',if:'CONJ',because:'CONJ',when:'CONJ',where:'CONJ',how:'CONJ',that:'CONJ',
    we:'PRON',us:'PRON',our:'PRON',you:'PRON',your:'PRON',he:'PRON',him:'PRON',his:'PRON',she:'PRON',her:'PRON',
    it:'PRON',its:'PRON',they:'PRON',them:'PRON',their:'PRON',this:'DET',these:'DET',those:'DET',
    i:'PRON',me:'PRON',my:'PRON',
    future:'NOUN',translation:'NOUN',meetings:'NOUN',system:'NOUN',systems:'NOUN',language:'NOUN',languages:'NOUN',
    barrier:'NOUN',barriers:'NOUN',deployment:'NOUN',scale:'NOUN',challenge:'NOUN',year:'NOUN',
    real:'ADJ',international:'ADJ',biggest:'ADJ',new:'ADJ',good:'ADJ',great:'ADJ',important:'ADJ',
    discuss:'VERB',discussing:'VERB',bridge:'VERB',remain:'VERB',remains:'VERB',use:'VERB',used:'VERB',using:'VERB',
    realtime:'ADJ','real-time':'ADJ',
    // ── Dutch common words ──
    ik:'PRON',je:'PRON',jij:'PRON',hij:'PRON',zij:'PRON',we:'PRON',wij:'PRON',jullie:'PRON',u:'PRON',
    me:'PRON',mij:'PRON',hem:'PRON',haar:'PRON',ons:'PRON',hen:'PRON',hun:'PRON',
    de:'DET',het:'DET',een:'DET',
    zijn:'VERB',is:'VERB',ben:'VERB',bent:'VERB',was:'VERB',waren:'VERB',geweest:'VERB',
    hebben:'VERB',heb:'VERB',hebt:'VERB',heeft:'VERB',had:'VERB',hadden:'VERB',
    worden:'VERB',word:'VERB',wordt:'VERB',werd:'VERB',werden:'VERB',geworden:'VERB',
    kunnen:'VERB',kan:'VERB',kunt:'VERB',kon:'VERB',konden:'VERB',
    moeten:'VERB',moet:'VERB',mogen:'VERB',mag:'VERB',zullen:'VERB',zal:'VERB',
    doen:'VERB',doe:'VERB',doet:'VERB',deed:'VERB',deden:'VERB',gedaan:'VERB',
    maken:'VERB',maak:'VERB',maakt:'VERB',maakte:'VERB',gemaakt:'VERB',
    gaan:'VERB',ga:'VERB',gaat:'VERB',ging:'VERB',gingen:'VERB',gegaan:'VERB',
    komen:'VERB',kom:'VERB',komt:'VERB',kwam:'VERB',kwamen:'VERB',gekomen:'VERB',
    zeggen:'VERB',zeg:'VERB',zegt:'VERB',zei:'VERB',zeiden:'VERB',gezegd:'VERB',
    niet:'ADV',wel:'ADV',ook:'ADV',nog:'ADV',hier:'ADV',daar:'ADV',dan:'ADV',nu:'ADV',
    erg:'ADV',zeer:'ADV',heel:'ADJ',goed:'ADJ',groot:'ADJ',klein:'ADJ',mooi:'ADJ',nieuw:'ADJ',oud:'ADJ',jong:'ADJ',
    en:'CONJ',of:'CONJ',maar:'CONJ',want:'CONJ',dus:'CONJ',
    in:'PREP',op:'PREP',aan:'PREP',uit:'PREP',van:'PREP',voor:'PREP',naar:'PREP',over:'PREP',met:'PREP',tot:'PREP',door:'PREP',bij:'PREP',zonder:'PREP',tussen:'PREP',tijdens:'PREP',
    // ── Italian common words ──
    io:'PRON',tu:'PRON',lui:'PRON',lei:'PRON',noi:'PRON',voi:'PRON',loro:'PRON',
    il:'DET',la:'DET',lo:'DET',gli:'DET',le:'DET',un:'DET',una:'DET',"un'":'DET',
    essere:'VERB',sono:'VERB',sei:'VERB',è:'VERB',siamo:'VERB',siete:'VERB',era:'VERB',erano:'VERB',stato:'VERB',
    avere:'VERB',ho:'VERB',hai:'VERB',ha:'VERB',hanno:'VERB',aveva:'VERB',avevano:'VERB',
    fare:'VERB',faccio:'VERB',fai:'VERB',fa:'VERB',fanno:'VERB',faceva:'VERB',fatto:'VERB',
    andare:'VERB',vado:'VERB',vai:'VERB',va:'VERB',vanno:'VERB',andato:'VERB',
    venire:'VERB',vengo:'VERB',vieni:'VERB',viene:'VERB',venuto:'VERB',
    potere:'VERB',posso:'VERB',puoi:'VERB',può:'VERB',possono:'VERB',
    volere:'VERB',voglio:'VERB',vuoi:'VERB',vuole:'VERB',vogliono:'VERB',
    non:'ADV',anche:'ADV',solo:'ADV',sempre:'ADV',mai:'ADV',già:'ADV',poi:'ADV',ora:'ADV',
    bene:'ADV',molto:'ADJ',bello:'ADJ',buono:'ADJ',grande:'ADJ',piccolo:'ADJ',
    e:'CONJ',ma:'CONJ',o:'CONJ',che:'CONJ',se:'CONJ',quando:'CONJ',dove:'CONJ',come:'CONJ',perché:'CONJ',
    di:'PREP',a:'PREP',da:'PREP',in:'PREP',con:'PREP',su:'PREP',per:'PREP',tra:'PREP',fra:'PREP',
    cosa:'NOUN',tempo:'NOUN',anno:'NOUN',giorno:'NOUN',uomo:'NOUN',donna:'NOUN',vita:'NOUN',mondo:'NOUN'
  };

  // ── Penn Treebank tag → { broad category, readable detail } ──
  var PENN_MAP = {
    // Nouns
    NN:  { pos:'NOUN', detail:'Noun (singular)' },
    NNS: { pos:'NOUN', detail:'Noun (plural)' },
    NNP: { pos:'NOUN', detail:'Proper noun (singular)' },
    NNPS:{ pos:'NOUN', detail:'Proper noun (plural)' },
    // Verbs
    VB:  { pos:'VERB', detail:'Verb (base)' },
    VBD: { pos:'VERB', detail:'Past tense' },
    VBG: { pos:'VERB', detail:'Gerund / present participle' },
    VBN: { pos:'VERB', detail:'Past participle' },
    VBP: { pos:'VERB', detail:'Present tense (non-3sg)' },
    VBZ: { pos:'VERB', detail:'Present tense (3sg)' },
    MD:  { pos:'VERB', detail:'Modal verb' },
    // Adjectives
    JJ:  { pos:'ADJ',  detail:'Adjective' },
    JJR: { pos:'ADJ',  detail:'Comparative adjective' },
    JJS: { pos:'ADJ',  detail:'Superlative adjective' },
    // Adverbs
    RB:  { pos:'ADV',  detail:'Adverb' },
    RBR: { pos:'ADV',  detail:'Comparative adverb' },
    RBS: { pos:'ADV',  detail:'Superlative adverb' },
    // Prepositions & particles
    IN:  { pos:'PREP', detail:'Preposition / subordinating conjunction' },
    RP:  { pos:'PREP', detail:'Phrasal verb particle' },
    TO:  { pos:'PREP', detail:'to' },
    // Determiners
    DT:  { pos:'FUNC', detail:'Determiner' },
    PDT: { pos:'FUNC', detail:'Predeterminer' },
    // Pronouns
    PRP: { pos:'PRON', detail:'Personal pronoun' },
    PRP$:{ pos:'PRON', detail:'Possessive pronoun' },
    WP:  { pos:'PRON', detail:'Wh-pronoun' },
    WP$: { pos:'PRON', detail:'Possessive wh-pronoun' },
    // Conjunctions
    CC:  { pos:'CONJ', detail:'Coordinating conjunction' },
    // Existential there
    EX:  { pos:'FUNC', detail:'Existential there' },
    // Cardinal numbers
    CD:  { pos:'WORD', detail:'Cardinal number' },
    // Foreign words
    FW:  { pos:'WORD', detail:'Foreign word' },
    // Possessive
    POS: { pos:'FUNC', detail:'Possessive ending' },
    // Symbols / interjections
    SYM: { pos:'WORD', detail:'Symbol' },
    UH:  { pos:'WORD', detail:'Interjection' },
    // Wh-words
    WDT: { pos:'FUNC', detail:'Wh-determiner' },
    WRB: { pos:'ADV',  detail:'Wh-adverb' }
  };

  // ── Enhanced POS tagging using Compromise Penn Treebank ──
  function _getPennTag(word, sentenceContext) {
    if (typeof nlp === 'undefined') return null;
    try {
      // Use sentence context when available for better accuracy
      var text = sentenceContext || word;
      var doc = nlp(text).compute('penn');
      var json = doc.json();
      if (json[0] && json[0].terms) {
        // Find the matching term
        var cleanWord = word.toLowerCase().replace(/[^a-z0-9'-]/g, '');
        for (var i = 0; i < json[0].terms.length; i++) {
          var term = json[0].terms[i];
          var termClean = (term.text || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
          if (termClean === cleanWord || term.text.toLowerCase() === word.toLowerCase()) {
            if (term.penn) return term.penn;
          }
        }
        // If no exact match, try the first term (for single-word lookups)
        if (json[0].terms[0] && json[0].terms[0].penn) {
          return json[0].terms[0].penn;
        }
      }
    } catch(e) {}
    return null;
  }

  function tagWord(w, sentenceContext){
    w = (w || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (!w || w.length < 2) return 'OTHER';

    // ── Italian captions: KELLY wordlist is the primary POS source ──
    var capLang = (typeof currentCaptionLang === 'string') ? currentCaptionLang.split('-')[0] : 'en';
    if (capLang === 'it' && window.S8T_IT_LEXICON) {
      var itPos = window.S8T_IT_LEXICON.getPOS(w, 'it');
      if (itPos && itPos !== '—') return itPos;
    }

    // ── Try Penn Treebank tags first (Compromise with context) ──
    if (typeof nlp !== 'undefined') {
      try {
        var penn = _getPennTag(w, sentenceContext);
        if (penn && PENN_MAP[penn]) return PENN_MAP[penn].pos;
        // Fallback to basic Compromise methods
        var doc = nlp(w);
        if (doc.adjectives().found) return 'ADJ';
        if (doc.verbs().found) return 'VERB';
        if (doc.nouns().found) return 'NOUN';
        if (doc.adverbs().found) return 'ADV';
        if (doc.prepositions().found) return 'PREP';
        if (doc.conjunctions().found) return 'CONJ';
        if (doc.pronouns().found) return 'PRON';
      } catch(e) {}
    }
    // ── NGSL curated POS (English, 2,800 most frequent words) ──
    var ng = (window.EN_NGSL || {})[w];
    if (ng && ng[1]) {
      var ngMap = { v:'VERB', n:'NOUN', adj:'ADJ', adv:'ADV' };
      if (ngMap[ng[1]]) return ngMap[ng[1]];
    }
    // ── Fallback suffix patterns (English + Dutch + Italian) ──
    if (w.endsWith('ing')) return 'VERB';
    if (w.endsWith('ed') && w.length>4) return 'VERB';
    if (w.endsWith('en') && w.length>4 && !w.endsWith('een') && !w.endsWith('ien')) return 'VERB';
    // Italian verbs — infinitive + gerund (check before noun suffixes)
    if (w.endsWith('are')||w.endsWith('ere')||w.endsWith('ire')) return 'VERB';
    if (w.endsWith('ando')||w.endsWith('endo')) return 'VERB';
    if (w.endsWith('zione')||w.endsWith('zioni')||w.endsWith('mento')||w.endsWith('menti')||w.endsWith('ezza')||w.endsWith('anza')||w.endsWith('enza')) return 'NOUN';
    if (w.endsWith('tion')||w.endsWith('sion')||w.endsWith('ment')||w.endsWith('ness')||w.endsWith('ity')||w.endsWith('ance')||w.endsWith('ence')) return 'NOUN';
    if (w.endsWith('heid')||w.endsWith('tà')||w.endsWith('tù')) return 'NOUN';
    if (w.endsWith('ly')||w.endsWith('mente')||w.endsWith('lijk')) return 'ADV';
    if (w.endsWith('ous')||w.endsWith('ful')||w.endsWith('less')||w.endsWith('able')||w.endsWith('ible')||w.endsWith('ive')||w.endsWith('al')||w.endsWith('ic')||w.endsWith('ish')) return 'ADJ';
    if (w.endsWith('er')||w.endsWith('est')) return 'ADJ';
    if (w.endsWith('y') && w.length>3 && !w.endsWith('ly')) return 'ADJ';
    if (w.endsWith('oso')||w.endsWith('ale')||w.endsWith('ico')||w.endsWith('isch')||w.endsWith('baar')) return 'ADJ';
    // Italian participles / adjectival suffixes
    if (w.endsWith('ato')||w.endsWith('uta')||w.endsWith('uto')||w.endsWith('ito')||w.endsWith('ita')) return 'ADJ';
    if (w.endsWith('abile')||w.endsWith('ibile')||w.endsWith('evole')||w.endsWith('istica')) return 'ADJ';
    if (w.endsWith('je')||w.endsWith('tje')) return 'NOUN';
    if (/^(the|a|an|de|het|een|il|la|lo|gli|le|un|una|in|on|at|op|aan|to|for|of|di|da|con|su|per|tra|fra|with|met|by|door|from|van|into|about|over|under|tussen|between|through|during|before|after|above|below|up|down|out|off|or|and|but|en|e|o|so|if|als|where|how|why|who|this|that|these|those|my|your|his|her|its|our|their|i|we|you|he|she|it|they|me|us|him|them|not|non|no|yes|very|just|only|also|even|still|yet|more|most|some|any|all|each|every|both|few|many|much|such|than|too|as|like|here|there|now|then|well)$/.test(w)) return 'FUNC';
    if (w.endsWith('s') && w.length>4) return 'NOUN';
    return 'WORD';
  }
  // Export to global scope
  window.tagWord = tagWord;
  // ── Detailed tag info (returns {pos, detail, penn} or null) ──
  window.tagWordDetail = function(w, sentenceContext) {
    var pos = tagWord(w, sentenceContext);
    w = (w || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (typeof nlp !== 'undefined') {
      try {
        var penn = _getPennTag(w, sentenceContext);
        if (penn && PENN_MAP[penn]) {
          return { pos: PENN_MAP[penn].pos, detail: PENN_MAP[penn].detail, penn: penn };
        }
      } catch(e) {}
    }
    return { pos: pos, detail: pos, penn: null };
  };

  // ── Extract words from TRANSCRIPT ONLY (no interim — only finalized sentences) ──
  function getTranscriptWords(){
    var t = document.getElementById('captionTranscript');
    if (!t) return [];
    var text = t.textContent || '';
    // DO NOT include interim — only analyze finalized lines
    var words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    var seen = {};
    var unique = [];
    for (var i=0;i<words.length;i++){
      var w=words[i];if(!seen[w]){seen[w]=true;unique.push({w:w,pos:tagWord(w),count:1})}
      else {for(var j=0;j<unique.length;j++){if(unique[j].w===w){unique[j].count++;break}}}
    }
    return unique;
  }

  // ── High-quality local synonym dictionary (400+ common English words) ──
  var SYN_DICT = {
    abandon:'leave, desert, forsake, quit',
    able:'capable, skilled, competent, talented',
    about:'regarding, concerning, approximately, around',
    accept:'receive, take, embrace, approve',
    achieve:'accomplish, attain, reach, complete',
    act:'perform, behave, operate, function',
    add:'include, attach, combine, join',
    advance:'progress, move forward, proceed, develop',
    agree:'concur, consent, approve, accept',
    allow:'permit, let, authorize, enable',
    amazing:'incredible, astonishing, remarkable, stunning',
    answer:'reply, respond, react, retort',
    appear:'seem, look, emerge, show',
    approach:'method, strategy, way, technique',
    argue:'debate, dispute, contend, discuss',
    ask:'inquire, request, question, demand',
    avoid:'prevent, evade, escape, dodge',
    bad:'poor, terrible, awful, negative',
    basic:'fundamental, essential, simple, primary',
    beautiful:'gorgeous, stunning, lovely, attractive',
    become:'turn into, transform, develop into, grow',
    begin:'start, commence, initiate, launch',
    believe:'trust, accept, think, consider',
    benefit:'advantage, gain, profit, value',
    best:'finest, greatest, optimal, top',
    better:'superior, improved, enhanced, preferable',
    big:'large, huge, enormous, massive',
    break:'shatter, crack, split, destroy',
    bring:'carry, deliver, transport, convey',
    build:'construct, create, develop, establish',
    business:'enterprise, company, firm, organization',
    call:'name, contact, phone, summon',
    care:'concern, attention, worry, caution',
    cause:'reason, source, origin, trigger',
    certain:'sure, definite, specific, particular',
    challenge:'difficulty, obstacle, test, problem',
    chance:'opportunity, possibility, likelihood, prospect',
    change:'alter, modify, transform, adjust',
    check:'examine, inspect, verify, review',
    choice:'option, selection, alternative, preference',
    choose:'select, pick, decide, opt',
    clear:'obvious, evident, plain, transparent',
    close:'near, shut, end, conclude',
    common:'frequent, usual, ordinary, typical',
    community:'society, group, population, neighborhood',
    company:'business, firm, corporation, enterprise',
    complete:'finish, conclude, finalize, accomplish',
    concern:'worry, anxiety, issue, matter',
    consider:'think, contemplate, examine, reflect',
    continue:'persist, proceed, maintain, sustain',
    control:'manage, direct, regulate, govern',
    correct:'right, accurate, proper, exact',
    cost:'price, expense, fee, charge',
    create:'make, produce, generate, design',
    culture:'civilization, society, customs, traditions',
    current:'present, existing, ongoing, contemporary',
    decide:'choose, determine, resolve, settle',
    deep:'profound, intense, serious, thoughtful',
    describe:'explain, depict, portray, illustrate',
    design:'plan, create, develop, craft',
    develop:'grow, evolve, progress, expand',
    different:'distinct, diverse, various, dissimilar',
    difficult:'hard, challenging, tough, complex',
    discover:'find, uncover, detect, reveal',
    discuss:'debate, examine, explore, talk about',
    drive:'push, propel, motivate, compel',
    easy:'simple, effortless, straightforward, basic',
    economic:'financial, monetary, commercial, fiscal',
    education:'learning, teaching, schooling, instruction',
    effect:'impact, influence, result, consequence',
    effort:'attempt, endeavor, struggle, exertion',
    end:'finish, conclude, stop, terminate',
    energy:'power, strength, vitality, force',
    enough:'sufficient, adequate, ample, plenty',
    environment:'surroundings, setting, atmosphere, habitat',
    especially:'particularly, specifically, notably, above all',
    essential:'necessary, vital, crucial, fundamental',
    establish:'create, found, set up, institute',
    event:'occurrence, incident, happening, occasion',
    evidence:'proof, confirmation, indication, sign',
    example:'instance, illustration, sample, model',
    exist:'live, survive, be, occur',
    experience:'undergo, encounter, face, feel',
    explain:'clarify, describe, illustrate, interpret',
    face:'confront, encounter, meet, deal with',
    fact:'truth, reality, certainty, actuality',
    fail:'lose, fall short, collapse, flop',
    family:'relatives, household, clan, kin',
    fast:'quick, rapid, swift, speedy',
    feel:'sense, experience, perceive, touch',
    field:'area, domain, sphere, sector',
    fight:'battle, struggle, combat, conflict',
    figure:'number, statistic, shape, form',
    final:'last, ultimate, conclusive, definitive',
    find:'discover, locate, uncover, detect',
    fine:'good, acceptable, satisfactory, okay',
    finish:'complete, conclude, end, finalize',
    follow:'pursue, track, trail, obey',
    force:'power, strength, energy, pressure',
    form:'shape, structure, type, variety',
    free:'liberated, independent, unrestricted, available',
    friend:'companion, ally, partner, associate',
    full:'complete, entire, total, whole',
    future:'tomorrow, prospect, destiny, outlook',
    general:'broad, overall, universal, common',
    give:'provide, offer, supply, donate',
    goal:'aim, objective, target, purpose',
    good:'excellent, fine, great, positive',
    great:'wonderful, excellent, fantastic, outstanding',
    group:'team, collection, organization, cluster',
    grow:'expand, increase, develop, rise',
    happen:'occur, take place, arise, transpire',
    happy:'joyful, pleased, delighted, content',
    hard:'difficult, tough, challenging, solid',
    health:'wellness, fitness, condition, wellbeing',
    help:'assist, support, aid, benefit',
    high:'tall, elevated, superior, advanced',
    history:'past, background, record, story',
    hold:'grasp, grip, keep, retain',
    hope:'wish, desire, expect, anticipate',
    hot:'warm, heated, burning, intense',
    huge:'enormous, massive, immense, vast',
    human:'person, individual, mortal, being',
    idea:'concept, notion, thought, plan',
    identify:'recognize, determine, pinpoint, name',
    imagine:'envision, picture, conceive, visualize',
    important:'significant, crucial, essential, vital',
    include:'contain, incorporate, involve, cover',
    increase:'grow, rise, expand, boost',
    indicate:'show, suggest, point to, signal',
    individual:'person, single, particular, unique',
    industry:'sector, business, trade, field',
    information:'data, facts, details, knowledge',
    interest:'curiosity, attention, concern, hobby',
    international:'global, worldwide, universal, cross-border',
    involve:'include, engage, entail, require',
    issue:'problem, matter, concern, topic',
    job:'work, career, position, occupation',
    join:'connect, unite, combine, link',
    just:'fair, right, exactly, merely',
    keep:'maintain, retain, hold, preserve',
    key:'essential, crucial, main, primary',
    kind:'type, sort, variety, gentle',
    knowledge:'understanding, wisdom, awareness, insight',
    language:'tongue, speech, communication, dialect',
    large:'big, huge, enormous, substantial',
    last:'final, endure, persist, continue',
    late:'delayed, overdue, tardy, recent',
    lead:'guide, direct, head, command',
    learn:'study, understand, master, absorb',
    leave:'depart, exit, abandon, quit',
    level:'grade, rank, degree, standard',
    life:'existence, living, being, vitality',
    light:'bright, illuminate, ignite, pale',
    like:'enjoy, prefer, appreciate, similar',
    likely:'probable, expected, plausible, possible',
    limit:'restrict, bound, confine, cap',
    line:'row, queue, border, route',
    list:'catalog, register, record, inventory',
    little:'small, slight, minor, brief',
    live:'reside, dwell, exist, survive',
    long:'lengthy, extended, prolonged, elongated',
    look:'see, watch, observe, appear',
    lose:'misplace, forfeit, fail, drop',
    love:'adore, cherish, treasure, worship',
    main:'primary, chief, principal, central',
    major:'significant, important, large, substantial',
    make:'create, build, produce, construct',
    manage:'handle, direct, control, supervise',
    market:'bazaar, exchange, trade, commerce',
    matter:'issue, subject, topic, substance',
    mean:'signify, indicate, intend, imply',
    measure:'gauge, assess, evaluate, calculate',
    meet:'encounter, gather, convene, satisfy',
    member:'participant, associate, affiliate, part',
    method:'approach, technique, process, system',
    mind:'brain, intellect, thought, attention',
    minute:'moment, instant, tiny, detailed',
    miss:'overlook, skip, long for, fail',
    model:'example, prototype, pattern, template',
    modern:'contemporary, current, new, recent',
    moment:'instant, second, time, point',
    money:'cash, funds, currency, wealth',
    move:'shift, transfer, relocate, proceed',
    much:'many, a lot, greatly, considerably',
    music:'melody, song, tune, harmony',
    must:'need to, have to, should, required',
    name:'title, label, designation, identify',
    nation:'country, state, land, people',
    natural:'organic, innate, instinctive, normal',
    near:'close, nearby, adjacent, approaching',
    necessary:'essential, required, vital, needed',
    need:'require, want, necessity, demand',
    never:'not ever, at no time, nevermore',
    new:'fresh, novel, recent, original',
    next:'following, subsequent, upcoming, adjacent',
    nice:'pleasant, enjoyable, kind, agreeable',
    note:'notice, observe, record, remark',
    notice:'see, observe, detect, announcement',
    number:'figure, digit, amount, count',
    offer:'propose, present, provide, suggest',
    often:'frequently, regularly, repeatedly, commonly',
    old:'ancient, aged, former, antique',
    open:'unlock, begin, start, accessible',
    order:'command, sequence, arrangement, request',
    other:'different, alternative, additional, else',
    paper:'document, article, essay, sheet',
    part:'section, portion, piece, component',
    party:'group, celebration, faction, gathering',
    pass:'go by, overtake, succeed, transfer',
    past:'previous, former, history, beyond',
    pay:'compensate, remunerate, settle, salary',
    people:'individuals, persons, public, population',
    perhaps:'maybe, possibly, potentially, conceivably',
    period:'era, age, time, duration',
    person:'individual, human, being, character',
    pick:'choose, select, gather, collect',
    place:'location, spot, position, put',
    plan:'scheme, strategy, design, intend',
    play:'perform, act, engage, recreation',
    point:'dot, location, moment, argument',
    policy:'rule, guideline, strategy, protocol',
    political:'governmental, civic, public, state',
    poor:'impoverished, inadequate, weak, bad',
    popular:'well-liked, famous, common, prevalent',
    position:'location, role, stance, job',
    possible:'feasible, achievable, potential, likely',
    power:'strength, authority, energy, control',
    practice:'exercise, training, drill, custom',
    prepare:'ready, arrange, plan, organize',
    present:'current, existing, gift, introduce',
    president:'leader, head, chief, director',
    pressure:'stress, tension, force, strain',
    pretty:'beautiful, attractive, lovely, fairly',
    prevent:'stop, block, hinder, avoid',
    price:'cost, value, fee, charge',
    private:'personal, confidential, secret, individual',
    probably:'likely, presumably, possibly, seemingly',
    problem:'issue, difficulty, challenge, trouble',
    process:'procedure, method, operation, system',
    produce:'create, make, generate, manufacture',
    product:'item, good, commodity, output',
    program:'plan, scheme, schedule, software',
    project:'plan, undertaking, assignment, task',
    provide:'supply, give, offer, furnish',
    public:'open, communal, civic, general',
    purpose:'aim, goal, intention, objective',
    quality:'standard, grade, caliber, attribute',
    question:'query, inquiry, issue, doubt',
    quickly:'rapidly, swiftly, fast, promptly',
    quite:'fairly, rather, pretty, completely',
    race:'competition, contest, ethnicity, sprint',
    raise:'lift, elevate, increase, nurture',
    range:'scope, spectrum, variety, extent',
    rate:'speed, pace, ratio, price',
    rather:'quite, fairly, somewhat, instead',
    reach:'arrive, attain, achieve, extend',
    read:'peruse, study, scan, interpret',
    ready:'prepared, set, willing, available',
    real:'actual, genuine, true, authentic',
    reality:'actuality, truth, fact, existence',
    realize:'understand, recognize, grasp, achieve',
    really:'truly, actually, genuinely, indeed',
    reason:'cause, motive, rationale, logic',
    receive:'get, obtain, accept, acquire',
    recent:'new, latest, current, modern',
    recognize:'identify, acknowledge, know, realize',
    record:'document, log, register, achievement',
    reduce:'decrease, lower, cut, diminish',
    reflect:'mirror, show, indicate, contemplate',
    region:'area, zone, district, territory',
    relate:'connect, link, associate, tell',
    relationship:'connection, bond, association, link',
    remain:'stay, continue, persist, endure',
    remember:'recall, recollect, retain, memorize',
    remove:'delete, eliminate, extract, take away',
    report:'account, statement, article, inform',
    represent:'symbolize, stand for, depict, portray',
    require:'need, demand, necessitate, oblige',
    research:'study, investigate, explore, examine',
    resource:'asset, supply, reserve, material',
    respond:'answer, reply, react, retort',
    response:'answer, reply, reaction, feedback',
    rest:'relax, pause, remainder, sleep',
    result:'outcome, consequence, effect, product',
    return:'come back, restore, yield, give back',
    reveal:'disclose, expose, uncover, show',
    right:'correct, proper, just, appropriate',
    rise:'increase, climb, ascend, grow',
    risk:'danger, hazard, threat, gamble',
    role:'function, part, position, duty',
    room:'space, chamber, area, place',
    rule:'regulation, law, principle, govern',
    run:'operate, manage, sprint, function',
    safe:'secure, protected, harmless, reliable',
    same:'identical, equal, similar, unchanged',
    save:'rescue, preserve, keep, store',
    say:'speak, tell, state, declare',
    scene:'setting, location, sight, view',
    school:'academy, institution, college, educate',
    science:'knowledge, study, discipline, research',
    second:'moment, instant, next, additional',
    section:'part, segment, portion, division',
    security:'safety, protection, defense, stability',
    seek:'search, look for, pursue, strive',
    seem:'appear, look, sound, feel',
    sense:'feeling, perception, meaning, detect',
    serious:'grave, severe, important, earnest',
    serve:'help, assist, provide, work',
    service:'assistance, help, utility, ceremony',
    set:'group, collection, establish, place',
    several:'many, various, multiple, numerous',
    share:'divide, distribute, split, communicate',
    short:'brief, concise, small, abrupt',
    should:'ought to, must, need to, have to',
    show:'display, exhibit, demonstrate, reveal',
    side:'edge, flank, aspect, party',
    sign:'symbol, indication, signal, gesture',
    significant:'important, notable, substantial, major',
    similar:'alike, comparable, resembling, analogous',
    simple:'easy, basic, plain, straightforward',
    simply:'just, merely, only, plainly',
    since:'because, as, after, from',
    single:'one, individual, sole, unique',
    site:'location, place, spot, venue',
    situation:'circumstance, condition, scenario, context',
    size:'dimension, magnitude, extent, proportion',
    skill:'ability, talent, expertise, proficiency',
    small:'little, tiny, minor, slight',
    social:'communal, public, collective, interpersonal',
    society:'community, culture, civilization, public',
    sometimes:'occasionally, at times, now and then, periodically',
    soon:'shortly, quickly, promptly, before long',
    sort:'type, kind, variety, classify',
    source:'origin, cause, root, supply',
    space:'area, room, gap, universe',
    speak:'talk, communicate, say, express',
    special:'particular, specific, unique, exceptional',
    spend:'use, consume, expend, pass',
    staff:'team, personnel, crew, employees',
    stage:'phase, step, platform, level',
    stand:'rise, endure, position, tolerate',
    standard:'norm, benchmark, criterion, usual',
    start:'begin, commence, initiate, launch',
    state:'condition, situation, declare, nation',
    statement:'declaration, assertion, account, remark',
    still:'yet, even now, calm, motionless',
    stock:'supply, inventory, share,储备',
    stop:'halt, cease, end, prevent',
    store:'shop, outlet, keep, warehouse',
    story:'tale, narrative, account, article',
    strategy:'plan, approach, tactic, scheme',
    street:'road, avenue, lane, boulevard',
    strong:'powerful, sturdy, robust, intense',
    structure:'framework, building, organization, form',
    student:'pupil, learner, scholar, trainee',
    study:'learn, examine, research, analyze',
    subject:'topic, theme, matter, participant',
    success:'achievement, victory, triumph, accomplishment',
    suggest:'propose, recommend, advise, hint',
    support:'help, assist, back, endorse',
    sure:'certain, confident, positive, definite',
    system:'method, process, framework, structure',
    table:'chart, list, desk, schedule',
    take:'grab, seize, accept, require',
    talk:'speak, discuss, converse, communicate',
    task:'job, assignment, duty, mission',
    teach:'instruct, educate, train, guide',
    team:'group, squad, crew, staff',
    technology:'tech, innovation, engineering, machinery',
    tell:'inform, notify, say, recount',
    term:'period, word, condition, phrase',
    test:'exam, trial, assessment, check',
    thing:'object, item, matter, entity',
    think:'believe, consider, reflect, ponder',
    thought:'idea, notion, concept, reflection',
    time:'moment, period, duration, era',
    today:'now, currently, nowadays, present',
    together:'jointly, collectively, combined, united',
    told:'said, informed, related, narrated',
    top:'peak, summit, best, highest',
    total:'entire, complete, whole, sum',
    tough:'hard, difficult, strong, resilient',
    trade:'commerce, exchange, business, deal',
    traditional:'conventional, customary, classic, established',
    training:'education, instruction, practice, preparation',
    travel:'journey, trip, tour, movement',
    treat:'handle, manage, deal with, care for',
    trial:'test, experiment, hearing, attempt',
    trouble:'problem, difficulty, worry, distress',
    true:'real, genuine, accurate, correct',
    truth:'fact, reality, honesty, accuracy',
    turn:'rotate, change, shift, become',
    type:'kind, sort, category, variety',
    understand:'comprehend, grasp, perceive, know',
    unit:'component, module, element, section',
    until:'till, before, up to, pending',
    upon:'on, onto, after, following',
    use:'utilize, employ, apply, operate',
    usually:'normally, generally, typically, commonly',
    value:'worth, importance, merit, price',
    various:'different, diverse, several, many',
    view:'sight, opinion, perspective, scene',
    visit:'call on, see, tour, stay',
    voice:'speech, sound, tone, expression',
    wait:'await, pause, delay, stay',
    walk:'stroll, march, step, hike',
    wall:'barrier, partition, fence, side',
    want:'desire, wish, need, crave',
    war:'conflict, battle, fight, struggle',
    watch:'observe, view, monitor, look at',
    water:'liquid, moisture, aqua, irrigate',
    way:'method, path, manner, route',
    week:'seven days, period, fortnight half',
    weight:'mass, heaviness, load, burden',
    whole:'entire, complete, total, full',
    whose:'of whom, belonging to, which person',
    wife:'spouse, partner, mate, bride',
    will:'shall, going to, determination, testament',
    win:'triumph, victory, succeed, gain',
    wish:'desire, want, hope, long for',
    woman:'female, lady, girl, individual',
    word:'term, expression, phrase, statement',
    work:'labor, job, task, function',
    world:'earth, globe, planet, realm',
    worry:'anxiety, concern, fear, fret',
    write:'compose, record, pen, draft',
    wrong:'incorrect, false, mistaken, improper',
    year:'twelve months, annual period, age',
    young:'youthful, juvenile, new, fresh',
    account:'report, story, narrative, record',
    act:'perform, behave, operate, deed',
    action:'deed, move, operation, activity',
    activity:'action, movement, pursuit, undertaking',
    address:'location, speech, talk, tackle',
    affect:'influence, impact, change, touch',
    agreement:'contract, deal, understanding, accord',
    analysis:'examination, study, review, evaluation',
    apply:'use, utilize, request, relate',
    approach:'method, strategy, way, near',
    argue:'debate, dispute, contend, reason',
    attention:'focus, notice, awareness, care',
    authority:'power, control, expert, official',
    available:'accessible, obtainable, free, ready',
    avoid:'prevent, evade, escape, shun',
    behavior:'conduct, actions, manner, performance',
    beyond:'past, above, exceeding, outside',
    billion:'thousand million, milliard, vast number',
    candidate:'applicant, nominee, contender, runner',
    career:'profession, occupation, job, vocation',
    cell:'unit, room, battery, compartment',
    center:'middle, core, heart, hub',
    central:'main, core, principal, key',
    century:'hundred years, age, era, period',
    character:'personality, nature, figure, role',
    choice:'option, selection, preference, pick',
    church:'place of worship, congregation, religion, temple',
    citizen:'resident, national, subject, inhabitant',
    civil:'civic, public, polite, domestic',
    claim:'assert, declare, demand, allege',
    class:'category, group, lesson, rank',
    coach:'trainer, instructor, mentor, bus',
    cold:'chill, freezing, icy, distant',
    collection:'group, set, assortment, gathering',
    college:'university, school, academy, institution',
    commercial:'business, trade, advertisement, mercantile',
    commit:'pledge, promise, dedicate, perpetrate',
    communication:'message, exchange, dialogue, contact',
    compare:'contrast, match, relate, liken',
    competition:'contest, rivalry, tournament, race',
    condition:'state, situation, circumstance, requirement',
    conference:'meeting, convention, symposium, discussion',
    Congress:'parliament, legislature, assembly, senate',
    consider:'think, contemplate, reflect, regard',
    consumer:'buyer, customer, purchaser, user',
    contain:'hold, include, comprise, restrain',
    continue:'persist, proceed, maintain, carry on',
    contribute:'donate, give, provide, add',
    cost:'price, expense, charge, fee',
    could:'might, may, would, can',
    country:'nation, state, land, territory',
    couple:'pair, duo, two, connect',
    course:'path, route, class, direction',
    court:'tribunal, arena, yard, woo',
    cover:'protect, conceal, wrap, include',
    crime:'offense, felony, wrongdoing, violation',
    cultural:'ethnic, artistic, social, traditional',
    customer:'client, buyer, patron, consumer',
    data:'information, facts, statistics, figures',
    daughter:'child, girl, offspring, descendant',
    deal:'agreement, bargain, handle, transaction',
    death:'demise, end, passing, fatality',
    debate:'discussion, argument, dispute, deliberation',
    decade:'ten years, period, era, generation',
    decision:'choice, ruling, verdict, resolution',
    defense:'protection, guard, shield, justification',
    degree:'level, extent, qualification, grade',
    Democrat:'progressive, liberal, leftist, party member',
    describe:'explain, depict, portray, characterize',
    detail:'particular, specific, element, elaborate',
    determine:'decide, establish, ascertain, resolve',
    development:'growth, progress, evolution, advancement',
    difference:'distinction, contrast, disparity, variation',
    dinner:'supper, meal, feast, banquet',
    direction:'path, course, guidance, instruction',
    director:'manager, leader, head, supervisor',
    discover:'find, uncover, detect, reveal',
    discuss:'debate, talk about, examine, explore',
    doctor:'physician, medic, surgeon, practitioner',
    door:'gate, entrance, portal, exit',
    draw:'sketch, pull, attract, depict',
    dream:'vision, aspiration, fantasy, ambition',
    drop:'fall, decline, decrease, release',
    drug:'medicine, medication, narcotic, substance',
    east:'orient, eastern, sunrise direction, right',
    edge:'border, rim, margin, advantage',
    effect:'impact, result, influence, consequence',
    effort:'attempt, endeavor, struggle, exertion',
    either:'one or the other, both, any, each',
    election:'vote, poll, ballot, selection',
    else:'otherwise, other, different, besides',
    employee:'worker, staff, personnel, laborer',
    entire:'whole, complete, total, full',
    especially:'particularly, specifically, notably, above all',
    evening:'nightfall, dusk, twilight, sunset',
    everybody:'everyone, all, each person, the whole group',
    executive:'manager, director, administrator, leader',
    expect:'anticipate, await, predict, assume',
    experience:'undergo, encounter, knowledge, event',
    expert:'specialist, authority, professional, skilled',
    factor:'element, component, cause, variable',
    fall:'drop, decline, descend, tumble',
    family:'relatives, household, kin, clan',
    father:'dad, parent, sire, originator',
    fear:'dread, terror, anxiety, fright',
    federal:'national, central, union, governmental',
    feeling:'emotion, sensation, sentiment, impression',
    fill:'load, pack, stuff, occupy',
    final:'last, ultimate, conclusive, end',
    financial:'monetary, fiscal, economic, commercial',
    finger:'digit, appendage, pointer, touch',
    firm:'company, solid, strict, business',
    fish:'aquatic animal, catch, angle, seafood',
    floor:'ground, level, storey, surface',
    focus:'concentrate, center, emphasis, attention',
    food:'nourishment, cuisine, sustenance, meal',
    foreign:'alien, external, overseas, unfamiliar',
    forget:'overlook, neglect, omit, disregard',
    former:'previous, past, earlier, ex',
    forward:'ahead, onward, advance, progressive',
    four:'quad, quartet, quadruple, fourfold',
    front:'fore, face, forefront, anterior',
    full:'complete, entire, total, packed',
    fund:'money, capital, finance, resource',
    game:'match, sport, contest, play',
    garden:'yard, park, plot, cultivate',
    gas:'fuel, petrol, vapor, fume',
    generation:'age group, era, production, creation',
    girl:'female child, daughter, young woman, lass',
    glass:'cup, tumbler, mirror, pane',
    government:'administration, regime, authority, state',
    green:'emerald, verdant, environmental, inexperienced',
    ground:'earth, soil, land, basis',
    growth:'expansion, increase, development, progress',
    guess:'estimate, suppose, speculate, conjecture',
    gun:'firearm, weapon, pistol, rifle',
    hair:'fur, locks, mane, strand',
    half:'fifty percent, moiety, partial, semi',
    hand:'palm, fist, give, pass',
    hang:'suspend, dangle, drape, execute',
    happen:'occur, take place, arise, befall',
    head:'leader, skull, top, chief',
    hear:'listen, perceive, detect, learn',
    heart:'core, center, soul, cardiac organ',
    heavy:'weighty, massive, dense, serious',
    himself:'him, his own self, personally, that man',
    hit:'strike, punch, impact, success',
    hotel:'inn, motel, lodge, accommodation',
    hour:'sixty minutes, time, moment, period',
    house:'home, dwelling, residence, building',
    however:'but, nevertheless, yet, nonetheless',
    hundred:'century, centennial, ten tens, many',
    husband:'spouse, partner, mate, groom',
    image:'picture, likeness, representation, photo',
    impact:'effect, influence, collision, shock',
    indeed:'truly, really, certainly, absolutely',
    indicate:'show, suggest, point, signal',
    individual:'person, single, unique, particular',
    investment:'stake, contribution, funding, asset',
    item:'object, article, element, entry',
    kitchen:'cookhouse, galley, cuisine, pantry',
    know:'understand, recognize, realize, comprehend',
    land:'earth, ground, terrain, arrive',
    law:'rule, regulation, statute, principle',
    lay:'place, put, set, arrange',
    leader:'chief, head, guide, commander',
    leg:'limb, support, stage, portion',
    less:'fewer, reduced, diminished, minus',
    letter:'message, note, character, correspondence',
    lie:'recline, deceive, falsehood, rest',
    likely:'probable, expected, plausible, apt',
    listen:'hear, attend, heed, pay attention',
    loss:'defeat, damage, deprivation, decrease',
    lot:'much, many, plenty, batch',
    machine:'device, apparatus, engine, mechanism',
    magazine:'journal, periodical, publication, store',
    maintain:'keep, preserve, sustain, uphold',
    majority:'most, bulk, greater part, plurality',
    manage:'handle, direct, control, cope',
    material:'substance, matter, fabric, relevant',
    maybe:'perhaps, possibly, potentially, conceivably',
    media:'press, news, communication, broadcasting',
    medical:'clinical, health, therapeutic, medicinal',
    meet:'encounter, gather, satisfy, convene',
    memory:'recollection, remembrance, recall, storage',
    mention:'cite, refer, note, bring up',
    message:'communication, note, meaning, dispatch',
    middle:'center, core, midst, halfway',
    might:'may, could, strength, power',
    military:'armed forces, army, defense, martial',
    million:'mega, ten hundred thousand, vast number',
    mission:'task, assignment, goal, purpose',
    month:'thirty days, lunar period, calendar unit',
    morning:'dawn, daybreak, forenoon, sunrise',
    mother:'mom, parent, source, origin',
    mouth:'oral cavity, opening, entrance, speak',
    movement:'motion, action, campaign, shift',
    movie:'film, cinema, picture, flick',
    Mr:'Mister, sir, gentleman, man',
    Mrs:'Missus, madam, lady, wife',
    myself:'me, personally, I, my own self',
    nation:'country, state, land, people',
    newspaper:'paper, journal, daily, publication',
    none:'nothing, zero, not any, nobody',
    north:'northern, arctic, up, polar',
    occur:'happen, take place, arise, exist',
    officer:'official, executive, agent, policeman',
    oil:'petroleum, grease, lubricant, crude',
    operation:'procedure, action, surgery, mission',
    opportunity:'chance, opening, prospect, possibility',
    option:'choice, alternative, selection, preference',
    organization:'group, institution, company, structure',
    others:'rest, remainder, additional people, alternatives',
    outside:'exterior, outdoors, external, beyond',
    owner:'proprietor, possessor, landlord, holder',
    page:'sheet, leaf, paper, attendant',
    painting:'picture, artwork, portrait, canvas',
    parent:'mother, father, guardian, progenitor',
    participant:'member, contender, entrant, player',
    particular:'specific, special, certain, exact',
    partner:'associate, companion, ally, spouse',
    pattern:'design, model, template, trend',
    peace:'harmony, tranquility, calm, serenity',
    perform:'execute, do, act, carry out',
    performance:'show, execution, presentation, achievement',
    personal:'individual, private, intimate, own',
    phone:'telephone, call, mobile, ring',
    physical:'bodily, material, tangible, corporeal',
    picture:'image, photo, painting, scene',
    piece:'part, portion, fragment, item',
    plant:'factory, vegetation, flora, sow',
    player:'athlete, participant, performer, actor',
    police:'law enforcement, officers, constabulary, cops',
    population:'inhabitants, people, residents, populace',
    positive:'good, optimistic, certain, affirmative',
    possible:'feasible, achievable, potential, doable',
    practice:'exercise, drill, training, custom',
    prepare:'ready, arrange, plan, make ready',
    president:'leader, head, chief executive, chair',
    pressure:'stress, tension, force, compression',
    professional:'expert, skilled, qualified, career',
    professor:'teacher, academic, lecturer, scholar',
    protect:'defend, guard, shield, preserve',
    prove:'demonstrate, verify, confirm, establish',
    provide:'supply, give, furnish, offer',
    purpose:'aim, goal, intention, objective',
    push:'shove, thrust, press, promote',
    quality:'standard, grade, attribute, trait',
    question:'query, inquiry, doubt, interrogate',
    quickly:'rapidly, swiftly, fast, speedily',
    radio:'wireless, broadcast, receiver, transmission',
    rather:'quite, fairly, somewhat, instead',
    recently:'lately, newly, of late, just',
    recognize:'identify, acknowledge, know, accept',
    record:'document, register, log, best performance',
    red:'crimson, scarlet, ruby, communist',
    reflect:'mirror, show, think, ponder',
    relationship:'connection, bond, link, association',
    religious:'spiritual, devout, sacred, faithful',
    remain:'stay, continue, persist, endure',
    Republican:'conservative, right-wing, GOP, rightist',
    require:'need, demand, necessitate, call for',
    responsibility:'duty, obligation, accountability, blame',
    road:'street, path, route, highway',
    rock:'stone, boulder, music genre, sway',
    room:'chamber, space, area, apartment',
    rule:'regulation, law, govern, principle',
    scene:'setting, location, spectacle, view',
    science:'knowledge, discipline, study, research',
    scientist:'researcher, scholar, expert, investigator',
    season:'period, time, quarter, flavor',
    seat:'chair, place, bench, position',
    security:'safety, protection, guarantee, collateral',
    seek:'search, look for, pursue, attempt',
    senior:'elder, older, superior, higher-ranking',
    series:'sequence, chain, succession, string',
    service:'help, assistance, utility, ceremony',
    seven:'septet, heptad, seventh, lucky number',
    shake:'tremble, vibrate, quiver, agitate',
    shoulder:'bear, carry, accept, body part',
    sign:'symbol, indication, signal, omen',
    significant:'important, meaningful, notable, substantial',
    sing:'chant, croon, vocalize, carol',
    sister:'sibling, nun, female relative, companion',
    six:'half-dozen, sextet, hexad, sixth',
    skin:'epidermis, hide, peel, surface',
    smile:'grin, beam, smirk, expression',
    soldier:'warrior, fighter, trooper, serviceman',
    son:'boy, male child, descendant, offspring',
    song:'melody, tune, ballad, anthem',
    sort:'type, kind, variety, classify',
    sound:'noise, tone, audio, healthy',
    south:'southern, down, below, austral',
    space:'area, room, cosmos, gap',
    spring:'jump, leap, season, coil',
    staff:'team, personnel, crew, rod',
    star:'celebrity, sun, asterisk, performer',
    station:'depot, terminal, stop, channel',
    step:'pace, stride, stage, measure',
    store:'shop, market, keep, reserve',
    suffer:'endure, experience, undergo, tolerate',
    summer:'warm season, solstice, vacation, heat',
    support:'help, assist, back, uphold',
    surface:'exterior, face, top, emerge',
    table:'desk, chart, list, postpone',
    teacher:'instructor, educator, mentor, tutor',
    television:'TV, screen, broadcast, telecast',
    tend:'lean, incline, care for, trend',
    themselves:'themself, personally, alone, on their own',
    thousand:'grand, myriad, kilo, many',
    threat:'danger, risk, menace, warning',
    three:'trio, triad, triplet, third',
    throw:'toss, hurl, cast, pitch',
    today:'now, presently, current, this day',
    tonight:'this evening, after dark,夜, nocturnal',
    toward:'towards, to, approaching, near',
    town:'city, village, settlement, municipality',
    treatment:'care, therapy, handling, management',
    tree:'plant, timber, sapling, arboreal',
    trip:'journey, excursion, voyage, stumble',
    trouble:'problem, difficulty, worry, bother',
    truth:'fact, reality, veracity, honesty',
    TV:'television, screen, broadcast, telly',
    two:'pair, couple, duo, double',
    under:'below, beneath, underneath, subordinate',
    usually:'normally, generally, commonly, typically',
    various:'different, diverse, several, assorted',
    very:'extremely, highly, greatly, truly',
    victim:'sufferer, casualty, target, prey',
    violence:'force, brutality, aggression, intensity',
    visit:'call on, see, tour, sojourn',
    wait:'await, pause, linger, stay',
    walk:'stroll, hike, march, tread',
    wear:'don, sport, have on, erode',
    week:'seven days, period, hebdomad, workweek',
    white:'pale, snowy, ivory, caucasian',
    wide:'broad, extensive, vast, spacious',
    wife:'spouse, partner, bride, mate',
    wind:'breeze, gust, air, twist',
    window:'pane, opening, casement, aperture',
    wish:'desire, want, hope, long for',
    within:'inside, in, during, internally',
    woman:'female, lady, girl, madam',
    wonder:'marvel, amazement, question, awe',
    worker:'employee, laborer, staff, operator',
    writer:'author, scribe, journalist, novelist',
    yard:'garden, court, enclosure, three feet'
  };

  // ── Italian synonym dictionary ──
  var IT_SYN_DICT = {
    grande:'vasto, ampio, enorme, imponente, notevole',
    piccolo:'minuscolo, ridotto, esiguo, minuto, breve',
    bello:'splendido, magnifico, attraente, grazioso, incantevole',
    brutto:'sgradevole, orrendo, deforme, sgraziato, ripugnante',
    buono:'ottimo, eccellente, valido, gradevole, benefico',
    cattivo:'malvagio, pessimo, dannoso, crudele, ostile',
    importante:'rilevante, fondamentale, essenziale, significativo, cruciale',
    facile:'semplice, agevole, elementare, accessibile, comprensibile',
    difficile:'complesso, arduo, complicato, impegnativo, ostico',
    veloce:'rapido, svelto, celere, pronto, immediato',
    lento:'pigro, tardo, fiacco, rilassato, graduale',
    felice:'contento, lieto, gioioso, soddisfatto, allegro',
    triste:'malinconico, infelice, depresso, mesto, cupo',
    intelligente:'brillante, sveglio, acuto, perspicace, astuto',
    stupido:'sciocco, ottuso, insensato, idiota, ignorante',
    ricco:'abbiente, facoltoso, opulento, prospero, generoso',
    povero:'indigente, misero, bisognoso, scarso, umile',
    forte:'potente, robusto, energico, intenso, resistente',
    debole:'fragile, delicato, fiacco, tenue, vulnerabile',
    nuovo:'recente, fresco, moderno, originale, inedito',
    vecchio:'antico, anziano, superato, obsoleto, stagionato',
    parlare:'discutere, conversare, esprimere, comunicare, dichiarare',
    vedere:'osservare, guardare, notare, scorgere, individuare',
    pensare:'riflettere, meditare, ragionare, credere, ritenere',
    fare:'realizzare, compiere, eseguire, produrre, agire',
    dire:'affermare, dichiarare, pronunciare, raccontare, comunicare',
    andare:'procedere, dirigersi, avanzare, spostarsi, recarsi',
    problema:'difficoltà, questione, inconveniente, ostacolo, sfida',
    sistema:'metodo, struttura, organizzazione, apparato, meccanismo',
    lavoro:'occupazione, impiego, attività, compito, mestiere',
    tempo:'periodo, epoca, momento, durata, stagione',
    cosa:'oggetto, elemento, entità, faccenda, questione',
    persona:'individuo, soggetto, essere, carattere, figura',
    casa:'abitazione, residenza, dimora, alloggio, edificio',
    mondo:'universo, pianeta, terra, realtà, ambiente',
    amore:'affetto, passione, devozione, tenerezza, adorazione',
    luce:'chiarore, splendore, luminosità, bagliore, illuminazione',
    acqua:'liquido, bevanda, pioggia, fonte, sorgente',
    aiutare:'soccorrere, assistere, sostenere, favorire, supportare',
    capire:'comprendere, afferrare, intuire, realizzare, intendere',
    cambiare:'modificare, trasformare, mutare, alterare, variare',
    creare:'generare, produrre, ideare, inventare, fondare',
  };

  // ── Fetch synonyms (local dictionary — instant, always accurate) ──
  function fetchSynonyms(word, callback) {
    var lang = (currentCaptionLang || 'en-US').split('-')[0];
    word = word.toLowerCase().replace(/[^a-zà-ù-]/g, '');
    if (!word) { callback('—'); return; }
    var dict = (lang === 'it') ? IT_SYN_DICT : SYN_DICT;
    // Check exact match
    if (dict[word]) { callback(dict[word]); return; }
    // Check base form (strip -ing, -ed, -s, -ly for English; -are/-ere/-ire for Italian)
    if (lang === 'it') {
      var baseIt = word.replace(/(ato|uto|ito|ando|endo|ante|ente|one|oni|mente)$/, '');
      if (baseIt !== word && dict[baseIt]) { callback(dict[baseIt]); return; }
    } else {
      var base = word.replace(/(ing|ed|s|ly)$/, '');
      if (base !== word && dict[base]) { callback(dict[base]); return; }
      base = word.replace(/(.)\1(ing|ed)$/, '$1');
      if (base !== word && dict[base]) { callback(dict[base]); return; }
    }
    callback('—');
  }

  // ── Grammar check via LanguageTool public API (language-aware) ──
  function checkGrammar(text,callback){
    try{
      var lang = (currentCaptionLang || 'en-US').split('-')[0];
      var ltLang = lang === 'en' ? 'en-US' : lang; // LT uses 'it','fr','de','es','pt','nl'
      var xhr=new XMLHttpRequest();
      xhr.open('POST','https://api.languagetool.org/v2/check',true);
      xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
      xhr.timeout=5000;
      xhr.onload=function(){
        if(xhr.status===200){
          try{var data=JSON.parse(xhr.responseText);callback(data)}
          catch(e){callback(null)}
        }else{callback(null)}
      };
      xhr.onerror=function(){callback(null)};
      xhr.ontimeout=function(){callback(null)};
      xhr.send('text='+encodeURIComponent(text)+'&language='+ltLang);
    }catch(e){callback(null)}
  }

  // ── Get real session metrics ──
  function getSessionMetrics(){
    var t = document.getElementById('captionTranscript');
    var lines = t ? t.querySelectorAll('.line').length : 0;
    var text = t ? (t.textContent||'') : '';
    var wordCount = (text.match(/\b\w+\b/g)||[]).length;
    var fillers = computeFillersCount(text);
    var sec = (typeof sessionSeconds !== 'undefined') ? sessionSeconds : 0;
    var wpm = sec > 30 ? Math.round(wordCount/(sec/60)) : 0;
    // Pace: 0-80 slow, 80-120 ideal, 120-160 fast, >160 too fast
    var pacePct = {slow:Math.min(30,wpm*0.35),ideal:Math.min(40,Math.max(0,(wpm-80)*0.8)),fast:Math.min(20,Math.max(0,(wpm-120)*0.5)),toofast:Math.max(0,(wpm-160)*0.3)};
    var totalPace = pacePct.slow+pacePct.ideal+pacePct.fast+pacePct.toofast;
    if(totalPace>0){var s=100/totalPace;pacePct.slow=Math.round(pacePct.slow*s);pacePct.ideal=Math.round(pacePct.ideal*s);pacePct.fast=Math.round(pacePct.fast*s);pacePct.toofast=100-pacePct.slow-pacePct.ideal-pacePct.fast}
    var silenceAvg = sec > 0 ? (0.8).toFixed(1) : '0.0';
    return {lines:lines,words:wordCount,fillers:fillers,sec:sec,wpm:wpm,pacePct:pacePct,silenceAvg:silenceAvg};
  }

  // ── Build sentence-level metrics for the session payload ──
  // Captures per-sentence data: length, POS ratios, passives, perfects, subordinates.
  // Stops at 50 sentences to keep payload light.
  function buildSentenceMetrics() {
    var t = document.getElementById('captionTranscript');
    if (!t) return [];
    var lineEls = t.querySelectorAll('.line');
    var metrics = [];
    var maxSentences = 50;
    var subordinateWords = ['because','although','though','if','when','while','which','that','who','whom','whose','where','after','before','since','until','unless','whereas','whether','so that','in order to','even though','as soon as','as long as','provided that'];
    lineEls.forEach(function(el) {
      if (metrics.length >= maxSentences) return;
      var text = (el.textContent || '').trim();
      if (!text) return;
      var words = text.toLowerCase().match(/[a-z']+/g) || [];
      if (words.length < 2) return;
      // POS counts per sentence via nlp
      var posCounts = {NOUN:0,VERB:0,ADJ:0,ADV:0};
      words.forEach(function(w) {
        try {
          if (typeof nlp !== 'undefined') {
            var d = nlp(w); var j = d.json();
            if (j[0] && j[0].terms && j[0].terms[0]) {
              var tags = j[0].terms[0].tags || [];
              if (tags.indexOf('Noun') !== -1) posCounts.NOUN++;
              else if (tags.indexOf('Verb') !== -1) posCounts.VERB++;
              else if (tags.indexOf('Adjective') !== -1) posCounts.ADJ++;
              else if (tags.indexOf('Adverb') !== -1) posCounts.ADV++;
            }
          }
        } catch(e) {}
      });
      // Detect passives: "is/was/were/been + past participle" pattern
      var hasPassive = false;
      for (var i = 0; i < words.length - 1; i++) {
        if (['is','was','were','been','are','being'].indexOf(words[i]) !== -1 && (words[i+1].endsWith('ed') || words[i+1].endsWith('en') || words[i+1].endsWith('t'))) {
          hasPassive = true; break;
        }
      }
      // Detect perfects
      var hasPerfect = words.some(function(w) { return ['has','have','had'].indexOf(w) !== -1; });
      // Detect subordinates
      var hasSubordinate = words.some(function(w) { return subordinateWords.indexOf(w) !== -1; });
      metrics.push({
        len: words.length,
        pos_ratio: {
          N: posCounts.NOUN, V: posCounts.VERB,
          J: posCounts.ADJ, D: posCounts.ADV
        },
        has_passive: hasPassive,
        has_perfect: hasPerfect,
        has_subordinate: hasSubordinate
      });
    });
    return metrics;
  }

  // ── Cohesion markers: detect logical connectors in text ──
  // Maps common English connectors to CEFR coherence/cohesion categories.
  var CONNECTORS = {
    causal: ['therefore','thus','consequently','as a result','so','hence','because','since','due to','owing to'],
    contrastive: ['however','but','although','though','nevertheless','nonetheless','yet','despite','whereas','while','on the other hand','in contrast','instead','rather'],
    additive: ['and','also','in addition','furthermore','moreover','besides','not only','as well as','too','plus','additionally'],
    temporal: ['first','second','third','finally','then','next','after','before','meanwhile','subsequently','previously','eventually','later','when','while','as soon as']
  };

  function computeConnectors(text) {
    if (!text) return { connectors_used:[], connector_types:{causal:0,contrastive:0,additive:0,temporal:0} };
    var lower = text.toLowerCase();
    var used = [];
    var types = {causal:0,contrastive:0,additive:0,temporal:0};
    Object.keys(CONNECTORS).forEach(function(cat) {
      CONNECTORS[cat].forEach(function(conn) {
        var re = new RegExp('\\b' + conn.replace(/\s+/g, '\\s+') + '\\b', 'gi');
        var matches = lower.match(re);
        if (matches) {
          types[cat] += matches.length;
          if (used.indexOf(conn) < 0) used.push(conn);
        }
      });
    });
    return { connectors_used: used, connector_types: types };
  }

  var panels = {
    // ═══ Word Bank — moved into extras (Datamuse-powered definitions) ═══
    // ═══ Grammar — Compromise.js NLP-powered rings ═══
    grammar: function(cb){
      var h='';
      // Feature gate: grammar only available for English + Italian
      if (!isCapabilityAvailable('grammar')) {
        h+='<div style="text-align:center;padding:40px 20px;color:var(--muted2)">';
        h+='<div style="font-size:36px;margin-bottom:12px">📋</div>';
        h+='<div style="font-size:14px;font-weight:600;color:var(--muted);margin-bottom:6px">Grammar Analysis</div>';
        h+='<div style="font-size:11px;line-height:1.6">Disponibile prima in inglese e italiano.<br><span style="color:var(--accent)">In arrivo</span> per altre lingue.</div>';
        h+='</div>';
        cb(h); return;
      }
      var text=(document.getElementById('captionTranscript')?.textContent||'');
      var noData=!text.trim();
      var m=getSessionMetrics();
      var noSession=m.sec<5;

      h+='<div class="ec-title" style="margin-bottom:10px">📋 Grammar Analysis <span class="ec-badge" style="background:rgba(52,211,153,.15);color:#34d399">NLP</span></div>';

      if(noData||noSession){
        h+='<div style="color:var(--muted);text-align:center;padding:30px;font-size:13px;line-height:1.6">Start speaking for at least 5 seconds to see grammar analysis</div>';
      } else {
        // ── Compromise.js NLP analysis ──
        var doc=null;
        try {
          if(typeof nlp!=='undefined') doc=nlp(text);
        } catch(e){}

        var totalWords=m.words||1;
        var ringData=[];

        if(doc){
          // 1. POS Balance (real NLP counts)
          var nounCount=doc.nouns().length;
          var verbCount=doc.verbs().length;
          var adjCount=doc.adjectives().length;
          var advCount=doc.adverbs().length;
          var prepCount=doc.prepositions().length;
          var conjCount=doc.conjunctions().length;
          var pronCount=doc.pronouns().length;
          var posTotal=Math.max(1,nounCount+verbCount+adjCount+advCount);

          ringData.push({n:'Nouns',sub:Math.round(nounCount/posTotal*100)+'% of vocab',pct:Math.min(98,Math.round(nounCount/posTotal*100)),color:'#60a5fa'});
          ringData.push({n:'Verbs',sub:Math.round(verbCount/posTotal*100)+'% of vocab',pct:Math.min(98,Math.round(verbCount/posTotal*100)),color:'#34d399'});
          ringData.push({n:'Adjectives',sub:Math.round(adjCount/posTotal*100)+'% of vocab',pct:Math.min(98,Math.round(adjCount/posTotal*100)),color:'#f472b6'});
          ringData.push({n:'Adverbs',sub:Math.round(advCount/posTotal*100)+'% of vocab',pct:Math.min(98,Math.round(advCount/posTotal*100)),color:'#c084fc'});
          ringData.push({n:'Prepositions',sub:prepCount+' used',pct:Math.min(98,Math.round(prepCount/Math.max(1,totalWords/5)*100)),color:'#a78bfa'});
          ringData.push({n:'Conjunctions',sub:conjCount+' links',pct:Math.min(98,Math.round(conjCount/Math.max(1,totalWords/10)*100)),color:'#fb923c'});
          ringData.push({n:'Pronouns',sub:pronCount+' refs',pct:Math.min(98,Math.round(pronCount/Math.max(1,totalWords/8)*100)),color:'#22d3ee'});

          // S-V Agreement: check if verb subjects match in number
          var verbs=doc.verbs();
          var svMatch=0,svTotal=0;
          try {
            verbs.forEach(function(v){
              var subjs=v.subjects();
              if(subjs && subjs.length>0){
                svTotal++;
                var subjPlural=subjs.nouns().isPlural().found;
                var verbPlural=v.isPlural();
                if(subjPlural===verbPlural) svMatch++;
              }
            });
          } catch(e){}
          var svPct=svTotal>0?Math.round(svMatch/svTotal*100):75;
          ringData.push({n:'S-V Agreement',sub:svTotal>0?svMatch+'/'+svTotal+' match':'low data',pct:Math.min(98,svPct),color:'#fbbf24'});
        } else {
          // Fallback: basic regex-based if Compromise not available
          ringData=[
            {n:'Words',sub:totalWords+' total',pct:Math.min(98,Math.round(totalWords*2)),color:'#60a5fa'},
            {n:'Sentences',sub:m.lines+' lines',pct:Math.min(98,m.lines*15),color:'#34d399'},
            {n:'WPM',sub:m.wpm+' wpm',pct:Math.min(98,m.wpm),color:'#f472b6'},
            {n:'Duration',sub:m.sec+'s',pct:Math.min(98,Math.round(m.sec/3)),color:'#c084fc'}
          ];
        }

        // ── Render rings ──
        h+='<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:16px">';
        ringData.forEach(function(r){
          var circumference=2*Math.PI*38;
          var dashOffset=circumference*(1-r.pct/100);
          h+='<div style="text-align:center;width:100px">';
          h+='<svg width="86" height="86" viewBox="0 0 86 86"><circle cx="43" cy="43" r="38" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="43" cy="43" r="38" fill="none" stroke="'+r.color+'" stroke-width="6" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+dashOffset+'" stroke-linecap="round" transform="rotate(-90 43 43)" style="transition:stroke-dashoffset .8s ease"/><text x="43" y="40" text-anchor="middle" fill="var(--text)" font-size="14" font-weight="700" font-family="JetBrains Mono,monospace">'+r.pct+'</text><text x="43" y="54" text-anchor="middle" fill="var(--muted2)" font-size="7" font-family="JetBrains Mono,monospace">%</text></svg>';
          h+='<div style="font-size:10px;font-weight:600;color:var(--text);margin-top:2px">'+r.n+'</div>';
          h+='<div style="font-size:8px;color:var(--muted2)">'+r.sub+'</div>';
          h+='</div>';
        });
        h+='</div>';

        // Store for PDF download — includes MATTR, fillers, connectors
        var wordsArr = (text.match(/[a-z']+/gi) || []);
        var mattrVal = 0;
        if (wordsArr.length > 0) {
          var uMap = {}; wordsArr.forEach(function(w){ uMap[w.toLowerCase()] = true; });
          if (wordsArr.length < 50) { mattrVal = Object.keys(uMap).length / wordsArr.length; }
          else {
            var t = 0;
            for (var i = 0; i <= wordsArr.length - 50; i++) {
              var uw = {}; for (var j = i; j < i+50; j++) uw[wordsArr[j]] = true;
              t += Object.keys(uw).length / 50;
            }
            mattrVal = t / (wordsArr.length - 49);
          }
        }
        window._grammarReport={
          rings:ringData, totalWords:totalWords, totalTime:m.sec, wpm:m.wpm,
          date:new Date().toLocaleDateString('it-IT'), text:text, language:'en',
          lexical_diversity: mattrVal, fillers_per_minute: m.sec > 30 ? (m.fillers / (m.sec/60)) : 0,
          connectors: (typeof computeConnectors === 'function') ? computeConnectors(text) : null
        };
      }
      cb(h);
    },

    // ═══ Metrics — trimmed (no Hesitation, no Active Vocab) ═══
    // ═══ Synonyms — Datamuse API-powered ═══
    synonyms: function(cb){
      var h='<div class="extras-grid">';
      // Feature gate: synonyms only for English + Dutch (Datamuse)
      if (!isCapabilityAvailable('synonyms')) {
        h+='<div class="extras-card" style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--muted2)">';
        h+='<div style="font-size:36px;margin-bottom:12px">📖</div>';
        h+='<div style="font-size:14px;font-weight:600;color:var(--muted);margin-bottom:6px">Live Synonyms</div>';
        h+='<div style="font-size:11px;line-height:1.6">Disponibile in inglese e italiano.<br><span style="color:var(--accent)">In arrivo</span> per altre lingue.</div>';
        h+='</div></div>';
        cb(h); return;
      }
      var words=getTranscriptWords();
      var text=(document.getElementById('captionTranscript')?.textContent||'');

      h+='<div class="extras-card" style="grid-column:1/-1"><div class="ec-title">📖 Live Synonyms <span class="ec-badge" style="background:rgba(96,165,250,.15);color:#60a5fa">Datamuse API</span></div>';

      var contentWords=words.filter(function(w){return w.pos==='NOUN'||w.pos==='VERB'||w.pos==='ADJ'}).slice(0,8);

      if(contentWords.length===0){
        h+='<div style="color:var(--muted);text-align:center;padding:20px;font-size:13px;line-height:1.6">Start speaking — synonyms for your nouns, verbs &amp; adjectives will appear here</div>';
      } else {
        h+='<div id="synCardsContainer" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">';
        contentWords.forEach(function(item){
          var safeWord=item.w.replace(/'/g,"\\'");
          var inBank = wordBank.indexOf(item.w) >= 0;
          var btnSymbol = inBank ? '−' : '+';
          var btnTitle = inBank ? 'Remove from Word Bank' : 'Add to Word Bank';
          h+='<div class="syn-card" data-word="'+safeWord+'" style="background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;transition:all .25s;position:relative">';
          h+='<button onclick="event.stopPropagation();removeSynonymCard(this)" title="Dismiss" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:transparent;color:var(--muted2);cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:3;opacity:.4" onmouseover="this.style.opacity=\'1\';this.style.color=\'#f87171\'" onmouseout="this.style.opacity=\'.4\';this.style.color=\'var(--muted2)\'">✕</button>';
          h+='<button onclick="event.stopPropagation();toggleSynonymWord(this,\''+safeWord+'\')" title="'+btnTitle+'" style="position:absolute;top:8px;right:28px;width:26px;height:26px;border-radius:50%;border:1px solid var(--line);background:'+(inBank?'rgba(167,139,250,.1)':'var(--card2)')+';color:'+(inBank?'var(--accent)':'var(--muted2)')+';cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:2">'+btnSymbol+'</button>';
          h+='<div class="syn-base-word" data-word="'+safeWord+'" data-context="'+safeWord+'" style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px;cursor:pointer;transition:color .15s" onclick="event.stopPropagation();lookupSynonym(this)" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text)\'">'+item.w+'</div>';
          h+='<div style="font-size:9px;color:var(--muted2);margin-bottom:10px">'+item.pos+' · '+(item.count||1)+'×</div>';
          h+='<div class="syn-list-'+item.w.replace(/[^a-zA-Z]/g,'')+'" style="display:flex;gap:4px;flex-wrap:wrap"><span style="font-size:9px;color:var(--muted2)">loading…</span></div>';
          h+='</div>';
        });
        h+='</div>';
      }
      h+='</div></div>';

      cb(h, function(){
        contentWords.forEach(function(item){
          var listEl=document.querySelector('.syn-list-'+item.w.replace(/[^a-zA-Z]/g,''));
          if(!listEl) return;
          fetch('https://api.datamuse.com/words?ml='+encodeURIComponent(item.w)+'&max=5')
            .then(function(r){return r.json()})
            .then(function(data){
              listEl.innerHTML='';
              if(!data||data.length===0){
                listEl.innerHTML='<span style="font-size:9px;color:var(--muted2)">no synonyms</span>';
                return;
              }
              data.forEach(function(s){
                listEl.innerHTML+='<span class="syn-word-chip" data-word="'+s.word+'" data-context="'+item.w+'" style="padding:3px 8px;border-radius:100px;font-size:9px;font-weight:500;background:var(--card2);color:var(--muted);border:1px solid var(--line);cursor:pointer;transition:all .15s" onclick="event.stopPropagation();lookupSynonym(this)" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--text)\'" onmouseout="this.style.borderColor=\'var(--line)\';this.style.color=\'var(--muted)\'">'+s.word+'</span>';
              });
            })
            .catch(function(){
              listEl.innerHTML='<span style="font-size:9px;color:var(--muted2)">unavailable</span>';
            });
        });
      });
    },
  };

window.addToWordBank = function(word){
  if (!word) {
    var input = document.getElementById('wordbankInput');
    if (!input) return;
    word = input.value.trim().toLowerCase();
    if (!word || word.length < 2) return;
    input.value = '';
    input.focus();
  }
  word = word.trim().toLowerCase();
  if (wordBank.indexOf(word) >= 0) return;
  wordBank.push(word);
  saveWordBank();
  renderWordBank();
  // Update vocab chips in Panel 3
  var chipsEl = document.getElementById('vocabChips');
  if (chipsEl) {
    chipsEl.innerHTML = wordBank.map(function(w) {
      return '<span class="live-wb-chip">' + w + '</span>';
    }).join('');
  }
  // Update wordbank count badge
  var countEl = document.getElementById('wordbankCount');
  if (countEl) countEl.textContent = wordBank.length;

  // Also save to Supabase "All Looked-Up Words" bank
  var sb = window.sottotitoliSupabase;
  if (sb) {
    sb.rpc('save_looked_up_word', { p_word: word, p_pos: null, p_language: 'en' }).then(function(r) {
      if (r.error) console.warn('save_looked_up_word RPC:', r.error);
    });
  }
};



// Helper: add word from Synonyms panel — no toast, quick inline confirmation
window.addSynonymWord = function(word){
  if (!word) return;
  addToWordBank(word);
};

// ═══ Toggle synonym word — add/remove from word bank with button flip ═══
window.toggleSynonymWord = function(btn, word) {
  if (!word) return;
  if (wordBank.indexOf(word) >= 0) {
    // Remove from bank
    removeFromWordBank(word);
    btn.textContent = '+';
    btn.title = 'Add to Word Bank';
    btn.style.background = 'var(--card2)';
    btn.style.color = 'var(--muted2)';
  } else {
    // Add to bank — brief inline confirmation, no toast
    addToWordBank(word);
    btn.textContent = '−';
    btn.title = 'Remove from Word Bank';
    btn.style.background = 'rgba(167,139,250,.1)';
    btn.style.color = 'var(--accent)';
    // Brief flash confirmation on the button itself
    var origBg = btn.style.background;
    btn.style.background = '#34d399';
    btn.style.color = '#000';
    btn.style.transition = 'all .15s';
    setTimeout(function() {
      btn.style.background = origBg;
      btn.style.color = 'var(--accent)';
    }, 600);
  }
};

// ═══ Remove synonym card with animation (grid auto-fills) ═══
window.removeSynonymCard = function(btn) {
  var card = btn.closest('.syn-card');
  if (!card) return;
  card.style.transition = 'all .3s ease';
  card.style.opacity = '0';
  card.style.transform = 'scale(.9)';
  card.style.maxHeight = card.offsetHeight + 'px';
  card.style.overflow = 'hidden';
  requestAnimationFrame(function() {
    card.style.maxHeight = '0px';
    card.style.padding = '0px';
    card.style.margin = '0px';
    card.style.borderWidth = '0px';
  });
  setTimeout(function() {
    card.remove();
  }, 350);
};

// ═══ Live Synonym Lookup — click any synonym for definition + examples ═══
window.lookupSynonym = function(el) {
  var word = el.dataset.word;
  var context = el.dataset.context || '';
  if (!word) return;
  
  // Remove any existing popup
  var existing = document.querySelector('.syn-popup');
  if (existing) existing.remove();
  
  var popup = document.createElement('div');
  popup.className = 'syn-popup';
  popup.style.cssText = 'position:absolute;z-index:9999;background:var(--card);border:1px solid #a78bfa;border-radius:12px;padding:16px;min-width:240px;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,.3);font-size:12px;line-height:1.5';
  
  var html = '<div style="font-weight:800;font-size:16px;color:var(--text);margin-bottom:4px">' + word + '</div>';
  html += '<div style="font-size:10px;color:var(--muted);margin-bottom:10px">Related to: ' + context + '</div>';
  html += '<div id="synDefContent" style="color:var(--muted);font-size:11px">Loading definition…</div>';
  html += '<div style="margin-top:10px;display:flex;gap:6px">';
  html += '<button onclick="addSynonymWord(\'' + word + '\');var p=this.closest(\'.syn-popup\');if(p)p.remove()" style="font-family:inherit;font-size:10px;font-weight:600;padding:5px 12px;border-radius:100px;border:1px solid #a78bfa;background:transparent;color:#a78bfa;cursor:pointer">+ Add to Bank</button>';
  html += '<button onclick="this.closest(\'.syn-popup\').remove()" style="font-family:inherit;font-size:10px;font-weight:600;padding:5px 12px;border-radius:100px;border:1px solid var(--line);background:transparent;color:var(--muted);cursor:pointer">✕ Close</button>';
  html += '</div>';
  
  popup.innerHTML = html;
  
  // Position near the clicked element
  var rect = el.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = Math.min(rect.bottom + 8, window.innerHeight - 280) + 'px';
  popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 310)) + 'px';
  
  document.body.appendChild(popup);
  
  // Click outside to close
  setTimeout(function() {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target) && e.target !== el) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
  
  // Fetch definition via Supabase dictionary proxy (cached, more reliable).
  // The endpoint requires a signed-in caller now, so the access token is attached;
  // without one this resolves to null and the direct-API fallback below runs.
  window.sottotitoliSupabase.auth.getSession().then(function(sess) {
    var tk = sess && sess.data && sess.data.session ? sess.data.session.access_token : null;
    if (!tk) return null;
    return fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/dictionary-proxy?word=' + encodeURIComponent(word),
      { headers: { 'Authorization': 'Bearer ' + tk } });
  })
    .then(function(r) { return r ? r.json() : null; })
    .then(function(data) {
      var defEl = document.getElementById('synDefContent');
      if (!defEl) return;
      if (data && data.definition) {
        defEl.innerHTML = data.definition;
        if (data.ipa) {
          defEl.innerHTML = '<span style="font-size:10px;color:var(--muted);margin-right:8px">/' + data.ipa + '/</span>' + defEl.innerHTML;
        }
      } else if (data && data.notFound) {
        defEl.innerHTML = 'No definition found for "' + word + '".';
      } else {
        // Try direct Free Dictionary API as fallback
        var lang = (currentCaptionLang || 'en-US').split('-')[0];
        return fetch('https://api.dictionaryapi.dev/api/v2/entries/' + lang + '/' + encodeURIComponent(word))
          .then(function(r2) { return r2.json(); })
          .then(function(raw) {
            if (raw && raw[0] && raw[0].meanings) {
              var defHtml = '';
              raw[0].meanings.forEach(function(m) {
                defHtml += '<div style="margin-bottom:8px"><span style="font-size:9px;font-weight:700;color:var(--accent);text-transform:uppercase">' + m.partOfSpeech + '</span>';
                if (m.definitions && m.definitions[0]) {
                  defHtml += '<div style="margin-top:2px">' + m.definitions[0].definition + '</div>';
                }
                defHtml += '</div>';
              });
              defEl.innerHTML = defHtml || 'No definition found.';
            } else {
              defEl.innerHTML = 'No definition found for "' + word + '".';
            }
          });
      }
    })
    .catch(function() {
      var defEl = document.getElementById('synDefContent');
      if (defEl) defEl.innerHTML = 'Definition unavailable (offline or API error).';
    });
};

// ═══ AI Diarization — calls Supabase Edge Function ═══
window.runDiarization = function(){
  var lines = window._diarizeLines;
  if(!lines || lines.length===0){showAlertModal('Diarizzazione', 'No transcript lines to analyze. Start a session first.');return;}
  var btn=document.getElementById('btnDiarize');
  var status=document.getElementById('diarizeStatus');
  var output=document.getElementById('diarizeOutput');
  if(btn){btn.disabled=true;btn.textContent='⏳ Analyzing...';}
  if(status)status.style.display='inline';
  
  var supabaseUrl = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';

  // Send the signed-in user's token — the edge function now requires auth.
  window.sottotitoliSupabase.auth.getSession().then(function(sess){
    var _tok = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if(!_tok){ throw new Error('NO_SESSION'); }
    return fetch(supabaseUrl+'/functions/v1/diarize-speakers',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok},
      body:JSON.stringify({lines:lines.slice(-12)})
    });
  })
  .then(function(r){return r.json()})
  .then(function(data){
    if(btn){btn.disabled=false;btn.textContent='🔮 Diarize with AI';}
    if(status)status.style.display='none';
    if(data.error){showAlertModal('Errore diarizzazione', 'Diarization error: '+data.error);return;}
    if(!data.lines){showAlertModal('Diarizzazione', 'No speaker data returned');return;}
    
    // Re-render with AI-assigned speakers
    var speakerColors=['#5b7fc1','#c1665b','#5b9c6e','#c084fc','#fbbf24','#f472b6'];
    var speakerNames=['SPK A','SPK B','SPK C','SPK D','SPK E','SPK F'];
    var spkCounts={};
    var h='';
    data.lines.forEach(function(l,i){
      var si=l.speakerIndex||0;
      spkCounts[si]=(spkCounts[si]||0)+1;
      var color=speakerColors[si%6];
      var isLatest=i===data.lines.length-1;
      h+='<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border-radius:8px;background:'+(isLatest?color+'0D':'transparent')+';transition:all .3s">';
      h+='<div style="width:44px;flex-shrink:0;text-align:center;padding-top:1px">';
      h+='<span style="font-family:JetBrains Mono,monospace;font-size:8px;font-weight:600;color:'+color+';background:'+color+'15;padding:2px 6px;border-radius:4px;letter-spacing:.5px">'+l.speaker+'</span>';
      h+='</div>';
      h+='<div style="flex:1;min-width:0">';
      h+='<div style="font-size:15px;color:var(--text);line-height:1.55;border-left:2px solid '+color+';padding-left:10px;opacity:'+(isLatest?'.9':'.6')+'">'+l.text+'</div>';
      h+='</div>';
      h+='</div>';
    });
    if(output)output.innerHTML=h;
    
    // Update stats sidebar
    var statsEl=output?output.parentElement.querySelector('div:last-child'):null;
    if(statsEl){
      var totalLines=data.lines.length;
      var sh='<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:10px">AI Speaker Stats</div>';
      for(var s=0;s<6;s++){
        var count=spkCounts[s]||0;if(count===0)continue;
        var pct=Math.round(count/totalLines*100);
        var color=speakerColors[s];
        sh+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px"><span style="font-size:10px;font-weight:600;color:'+color+'">'+speakerNames[s]+'</span><span style="font-family:JetBrains Mono,monospace;font-size:16px;font-weight:900;color:'+color+'">'+count+'</span></div><div style="height:3px;background:var(--line);border-radius:2px;overflow:hidden"><div style="height:100%;border-radius:2px;background:'+color+';width:'+pct+'%"></div></div><div style="font-size:7px;color:var(--muted2);margin-top:1px">'+pct+'%</div></div>';
      }
      sh+='<div style="border-top:1px solid var(--line);padding-top:6px;margin-top:4px;display:flex;justify-content:space-between;font-size:8px;color:var(--muted2)"><span>Total lines</span><span style="font-family:JetBrains Mono,monospace">'+totalLines+'</span></div>';
      statsEl.innerHTML=sh;
    }
  })
  .catch(function(err){
    if(btn){btn.disabled=false;btn.textContent='🔮 Diarize with AI';}
    if(status)status.style.display='none';
    // Fallback: show message about needing API key
    if(output)output.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted2);font-size:11px;line-height:1.6">⚠️ Could not reach diarization service.<br><br>To enable AI diarization:<br>1. Deploy the Supabase Edge Function<br>2. Set OPENAI_API_KEY in Supabase secrets<br><br><code style="font-size:9px;opacity:.5">Error: '+err.message+'</code></div>';
  });
};


// ═══ Theme-aware panel color fixer ═══
window.fixExtrasPanelColors = function(){
  var panel = document.getElementById('extrasPanel');
  if(!panel) return;
  var isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if(!isLight) return;
  
  // Walk all elements and swap rgba(255,255,255 → rgba(0,0,0 in inline styles
  var all = panel.querySelectorAll('*');
  all.forEach(function(el){
    var st = el.getAttribute('style');
    if(!st) return;
    // Replace white-alpha colors with dark-alpha equivalents
    // This handles color, background, border-color, etc.
    var changed = false;
    var newSt = st.replace(/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/g, function(match, alpha){
      changed = true;
      // Map the alpha to a darker equivalent (white at low alpha ≈ black at low alpha on light bg)
      var a = parseFloat(alpha);
      // Keep the alpha but swap white to black
      return 'rgba(0,0,0,' + a + ')';
    });
    // Also fix hardcoded near-white colors
    newSt = newSt.replace(/color:\s*#e8eaed/g, 'color:#1a1a1a');
    // Fix dark table backgrounds
    newSt = newSt.replace(/background:\s*rgba\(15,\s*18,\s*30/g, 'background:rgba(255,255,255');
    if(changed || newSt !== st){
      el.setAttribute('style', newSt);
    }
  });
  
  // Also fix SVG text fills
  var texts = panel.querySelectorAll('text');
  texts.forEach(function(t){
    var f = t.getAttribute('fill');
    if(f && f.indexOf('rgba(255,255,255') >= 0){
      t.setAttribute('fill', f.replace(/rgba\(255,\s*255,\s*255/g, 'rgba(0,0,0'));
    }
  });
  
  // Fix SVG circle strokes
  var circles = panel.querySelectorAll('circle');
  circles.forEach(function(c){
    var s = c.getAttribute('stroke');
    if(s && s.indexOf('rgba(255,255,255') >= 0){
      c.setAttribute('stroke', s.replace(/rgba\(255,\s*255,\s*255/g, 'rgba(0,0,0'));
    }
  });
}

// ── Render helper ──
  function renderPanel(name,btn){
    try {
      var panel=document.getElementById('extrasPanel');
      if(!panel) return;
      panel.innerHTML='<div class="extras-loading">Caricamento...</div>';
      panel.classList.add('show');
      panel.classList.add('fetching');
      var fn=panels[name];
      if(!fn) { panel.innerHTML='<div class="extras-loading">Panel "'+name+'" non disponibile</div>'; return; }
      fn(function(html,afterRender){
        panel.innerHTML=html;
        panel.classList.remove('fetching');
        if(typeof window.fixExtrasPanelColors === 'function') {
          window.fixExtrasPanelColors();
        }
        if(afterRender) afterRender();
      });
    } catch(e) {
      console.error('renderPanel error:', e);
      var panel=document.getElementById('extrasPanel');
      if(panel) panel.innerHTML='<div class="extras-loading">Errore: '+e.message+'</div>';
    }
  }

  // ── Toggle panel ──
  window.toggleExtrasPanel = function(name, btn){
    try {
      var panel=document.getElementById('extrasPanel');
      if(!panel) { console.warn('extrasPanel not found'); return; }
      var btns=document.querySelectorAll('.extras-toggle-btn');
      if(activePanel===name){
        panel.classList.remove('show');panel.innerHTML='';activePanel=null;
        btns.forEach(function(b){b.classList.remove('active')});
      } else {
        btns.forEach(function(b){b.classList.remove('active')});
        if(btn) btn.classList.add('active');
        activePanel=name;
        renderPanel(name,btn);
      }
    } catch(e) {
      console.error('toggleExtrasPanel error:', e);
    }
  };

  // ── Refresh active panel (called on every onFinal) ──
  window.refreshExtrasPanel = function(){
    if (!activePanel) return;
    var panel=document.getElementById('extrasPanel');
    if (!panel || !panel.classList.contains('show')) return;
    // Don't show loading spinner on refresh — just update content inline
    var fn=panels[activePanel];
    if(!fn) return;
    fn(function(html,afterRender){
      panel.innerHTML=html;
      window.fixExtrasPanelColors();
      if(afterRender) afterRender();
    });
  };
})();

// ═══ DUO+ MODULE — invite-based multi-speaker via WebSocket ═══
(function(){
  // Only attach if not already set
  if (window._duoModuleLoaded) return;
  window._duoModuleLoaded = true;

  // Only initialize _duoMode if not already set by restore code
  if (typeof window._duoMode === 'undefined') window._duoMode = false;
  window._duoRoomId = '';
  window._duoSpeakerName = '';
  window._duoSpeakerLang = '';
  window._duoWs = null;
  window._duoReconnectTimer = null;
  window._duoSpeakerMap = {};
  var DUO_LABELS = ['A','B','C','D','E','F'];
  var DUO_COLORS = {A:'#6b9dff',B:'#f87171',C:'#34d399',D:'#fbbf24',E:'#a78bfa',F:'#fb923c'};
  var DUO_FLAGS = {en:'🇬🇧',it:'🇮🇹',fr:'🇫🇷',de:'🇩🇪',es:'🇪🇸',pt:'🇵🇹',nl:'🇳🇱'};
  window.DUO_FLAGS = DUO_FLAGS;

  // Check if joining a room via invite link
  var params = new URLSearchParams(window.location.search);
  if (params.get('join') === '1') {
    // Start waking the relay NOW, while the invitee is still choosing language and name.
    // The free-tier service cold-starts in ~25s; anything we overlap is time they never wait for.
    duoPrewarm();
    window._duoRoomId = params.get('room') || '';
    var host = params.get('host') || 'the host';

    // Check if this user is the host — if so, skip join screen and enter room directly
    function proceedAsHost() {
      window._duoMode = true;
      window._duoIsHost = true;
      window._duoHostName = window._duoSpeakerName;
      window._duoSpeakerLang = (window._currentCaptionLang || 'en-US').split('-')[0];
      var sb = window.sottotitoliSupabase;
      if (sb) {
        sb.auth.getSession().then(function(r){
          if (r.data?.session) {
            window._duoSpeakerName = r.data.session.user.user_metadata?.full_name || r.data.session.user.email?.split('@')[0] || 'Host';
          } else { window._duoSpeakerName = 'Host'; }
          enterDuoRoom();
        });
      } else { window._duoSpeakerName = 'Host'; enterDuoRoom(); }
    }
    function enterDuoRoom() {
      document.getElementById('duoJoinScreen').style.display = 'none';
      document.getElementById('modeScroll').style.display = '';
      document.getElementById('themeToggle').style.display = '';
      document.getElementById('topbarSub').style.display = 'flex';
      document.getElementById('topbarRecWrap').style.display = '';
      var sidebar = document.getElementById('duoSpeakerSidebar');
      var toggle = document.getElementById('duoToggleBtn');
      if (sidebar) { sidebar.style.display = 'flex'; sidebar.classList.add('open'); }
      if (toggle) { toggle.style.display = 'block'; toggle.classList.add('open'); }
      // Show host section
      var hostSec = document.getElementById('duoHostSection');
      var invSec = document.getElementById('duoInviteeSection');
      if (hostSec) hostSec.style.display = 'block';
      if (invSec) invSec.style.display = 'none';
      window._duoIsHost = true;
      window._duoHostName = window._duoSpeakerName;
      var soloBtn = document.getElementById('modeSoloBtn');
      var duoBtn = document.getElementById('modeDuoBtn');
      if (soloBtn) soloBtn.className = 'btn-sm';
      if (duoBtn) duoBtn.className = 'mode-badge';
      setSpeakerCount('2');
      duoAssignLabel(window._duoSpeakerName, window._duoSpeakerLang);
      duoConnectWebSocket();
      duoUpdateInviteUrl();
      duoRenderSpeakers();
    }

    // Check if user is the host (same Supabase user who created the room)
    var sb = window.sottotitoliSupabase;
    if (sb) {
      sb.auth.getSession().then(function(r){
        if (r.data?.session) {
          var uid = r.data.session.user.id;
          var storedHostId = localStorage.getItem('sottotitoli-duo-host-' + window._duoRoomId);
          if (uid === storedHostId) {
            // This is the host — skip join screen
            proceedAsHost();
            return;
          }
        }
        // Not the host — show join screen
        showJoinScreen(host);
      });
    } else {
      // No Supabase yet — check simple localStorage flag
      if (localStorage.getItem('sottotitoli-duo-is-host-' + window._duoRoomId) === '1') {
        proceedAsHost();
        return;
      }
      showJoinScreen(host);
    }

    function showJoinScreen(hostName) {
      document.getElementById('duoJoinHostName').textContent = decodeURIComponent(hostName);
      document.getElementById('modeScroll').style.display = 'none';
      document.getElementById('themeToggle').style.display = 'none';
      document.getElementById('topbarSub').style.display = 'none';
      document.getElementById('topbarRecWrap').style.display = 'none';
      document.getElementById('duoJoinScreen').style.display = 'flex';
      // Force-hide sidebar + toggle (they're not relevant on join screen)
      var sidebar = document.getElementById('duoSpeakerSidebar');
      var toggle = document.getElementById('duoToggleBtn');
      if (sidebar) { sidebar.style.display = 'none'; sidebar.classList.remove('open'); }
      if (toggle) { toggle.style.display = 'none'; toggle.classList.remove('open'); }
      // Also hide nav arrows
      var navL = document.getElementById('navLeft'), navR = document.getElementById('navRight');
      if (navL) navL.style.display = 'none';
      if (navR) navR.style.display = 'none';
      var saved = localStorage.getItem('sottotitoli-duo-speaker-name');
      if (saved) document.getElementById('duoJoinNameInput').value = saved;
      document.querySelectorAll('#duoJoinLangPills .duo-lang-pill').forEach(function(p){
        p.addEventListener('click', function(){
          document.querySelectorAll('#duoJoinLangPills .duo-lang-pill').forEach(function(pp){pp.classList.remove('selected')});
          this.classList.add('selected');
        });
      });
    }
    // Functions below must still be defined even when showing join screen
  }

  // ═══ Relay connection status ═══
  // The relay is a free Render instance that sleeps when idle: measured cold start ~23s.
  // Without this the user joined a room and simply saw nothing — and because sends were
  // guarded on readyState, their first captions were dropped in silence.
  var DUO_CONN_ESTIMATE = 25;   // seconds, matches the measured cold start
  var _duoConnTickId = null, _duoConnShowId = null, _duoConnStart = 0;

  function duoConnEl() {
    var el = document.getElementById('duoConnStatus');
    if (el) return el;
    if (!document.getElementById('duoConnStyle')) {
      var st = document.createElement('style');
      st.id = 'duoConnStyle';
      st.textContent = '@keyframes duoConnPulse{0%,100%{opacity:.35}50%{opacity:1}}';
      document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = 'duoConnStatus';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99990;' +
      'display:none;align-items:center;gap:9px;padding:10px 16px;border-radius:999px;' +
      'border:1px solid var(--line);background:var(--card);color:var(--text);' +
      'font-family:Inter,sans-serif;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.18);max-width:92vw';

    var dot = document.createElement('span');
    dot.id = 'duoConnDot';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#fbbf24;flex:0 0 auto;' +
      'animation:duoConnPulse 1s ease-in-out infinite';

    // Italian is the source string; the i18n observer translates it from data-i18n.
    var txt = document.createElement('span');
    txt.id = 'duoConnText';
    txt.setAttribute('data-i18n', 'duo_conn_waking');
    txt.textContent = 'Connessione alla stanza…';

    var tm = document.createElement('span');
    tm.id = 'duoConnTimer';
    tm.style.cssText = 'font-variant-numeric:tabular-nums;font-weight:700;color:var(--muted)';

    el.appendChild(dot); el.appendChild(txt); el.appendChild(tm);
    document.body.appendChild(el);
    return el;
  }

  function duoConnSetLabel(mode) {
    var txt = document.getElementById('duoConnText');
    var dot = document.getElementById('duoConnDot');
    var key = mode === 'retry' ? 'duo_conn_retry' : 'duo_conn_waking';
    if (txt && txt.getAttribute('data-i18n') !== key) {
      txt.setAttribute('data-i18n', key);
      txt.textContent = mode === 'retry' ? 'Riconnessione…' : 'Connessione alla stanza…';
    }
    if (dot) dot.style.background = mode === 'retry' ? '#f87171' : '#fbbf24';
  }

  function duoConnTick() {
    var tm = document.getElementById('duoConnTimer');
    var txt = document.getElementById('duoConnText');
    if (!tm) return;
    var left = DUO_CONN_ESTIMATE - Math.floor((Date.now() - _duoConnStart) / 1000);
    if (left > 0) {
      tm.textContent = '~' + left + 's';
    } else {
      tm.textContent = '';
      if (txt && txt.getAttribute('data-i18n') !== 'duo_conn_almost') {
        txt.setAttribute('data-i18n', 'duo_conn_almost');
        txt.textContent = 'Quasi pronto…';
      }
    }
  }

  function duoConnShow(mode) {
    if (_duoConnShowId) { clearTimeout(_duoConnShowId); _duoConnShowId = null; }
    duoConnEl();
    duoConnSetLabel(mode);
    _duoConnStart = Date.now();
    if (_duoConnTickId) clearInterval(_duoConnTickId);
    duoConnTick();
    _duoConnTickId = setInterval(duoConnTick, 500);
    // Do not flash the pill on a warm connection: show it only if we are still not open.
    _duoConnShowId = setTimeout(function() {
      _duoConnShowId = null;
      if (window._duoWs && window._duoWs.readyState === WebSocket.OPEN) return;
      var el = document.getElementById('duoConnStatus');
      if (el) el.style.display = 'flex';
    }, 700);
  }

  function duoConnHide() {
    if (_duoConnShowId) { clearTimeout(_duoConnShowId); _duoConnShowId = null; }
    if (_duoConnTickId) { clearInterval(_duoConnTickId); _duoConnTickId = null; }
    var el = document.getElementById('duoConnStatus');
    if (el) el.style.display = 'none';
  }

  function duoPrewarm() {
    if (window._duoPrewarmed) return;
    window._duoPrewarmed = true;
    var url = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.websocketUrl) || 'wss://sottotitoli-websocket.onrender.com';
    try {
      // no-cors on purpose: we only need the request to LEAVE so Render starts booting.
      // Reading the response is useless, and a normal fetch would log a CORS error on
      // every invite page load (the relay sends no Access-Control-Allow-Origin).
      fetch(url.replace(/^wss:/, 'https:') + '/health', { mode: 'no-cors', cache: 'no-store' }).catch(function(){});
    } catch (e) {}
  }

  // ═══ Outbound queue ═══
  // The relay is a free Render instance that sleeps (~25s cold start). Until it
  // is awake, sends used to be dropped silently: the speaker kept talking, the
  // partner received nothing, and neither of them could tell. Messages are queued
  // instead and flushed the moment the socket opens.
  window._duoOutbox = [];
  var DUO_OUTBOX_MAX = 100;

  function duoSend(payload) {
    if (window._duoWs && window._duoWs.readyState === WebSocket.OPEN) {
      try { window._duoWs.send(JSON.stringify(payload)); return true; } catch (e) {}
    }
    if (window._duoMode) {
      if (window._duoOutbox.length >= DUO_OUTBOX_MAX) window._duoOutbox.shift();
      window._duoOutbox.push(payload);
    }
    return false;
  }

  function duoFlushOutbox() {
    if (!window._duoWs || window._duoWs.readyState !== WebSocket.OPEN) return;
    var queued = window._duoOutbox.splice(0, window._duoOutbox.length);
    for (var i = 0; i < queued.length; i++) {
      try { window._duoWs.send(JSON.stringify(queued[i])); } catch (e) {}
    }
    if (queued.length && window.console) {
      console.log('[duo] flushed ' + queued.length + ' message(s) captured while the relay was waking');
    }
  }

  // ═══ Functions ═══
  window.duoConnectWebSocket = function() {
    if (window._duoReconnectTimer) { clearTimeout(window._duoReconnectTimer); window._duoReconnectTimer = null; }
    duoPrewarm();
    duoConnShow('waking');
    var url = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.websocketUrl) || 'wss://sottotitoli-websocket.onrender.com';
    try { window._duoWs = new WebSocket(url); } catch(e) { duoConnShow('retry'); duoReconnect(); return; }

    window._duoWs.onopen = function() {
      duoConnHide();
      window._duoWs.send(JSON.stringify({ join: window._duoRoomId }));
      // Announce presence
      window._duoWs.send(JSON.stringify({ type:'duo-join', name:window._duoSpeakerName, lang:window._duoSpeakerLang }));
      // Only after joining, so the partner attributes them correctly.
      duoFlushOutbox();
    };

    window._duoWs.onmessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'duo-kick') duoHandleKick(data);
        else if (data.type === 'duo-join') duoHandleJoin(data);
        else if (data.type === 'duo-speaking') duoHandleSpeaking(data);
        else if (data.msg && data.final) duoHandleCaption(data);
      } catch(e) {}
    };

    window._duoWs.onclose = function() {
      if (window._duoMode) duoConnShow('retry');
      duoReconnect();
    };
    window._duoWs.onerror = function() {
      if (window._duoMode) duoConnShow('retry');
    };
  };

  function duoReconnect() {
    // Leaving DUO closes the socket on purpose — do not leave a reconnect pill behind.
    if (!window._duoMode) { duoConnHide(); return; }
    if (window._duoReconnectTimer) return;
    window._duoReconnectTimer = setTimeout(function() {
      window._duoReconnectTimer = null;
      if (window._duoMode) window.duoConnectWebSocket(); else duoConnHide();
    }, 3000);
  }

  function duoAssignLabel(name, lang) {
    var map = window._duoSpeakerMap;
    for (var i = 0; i < DUO_LABELS.length; i++) {
      var lbl = DUO_LABELS[i];
      if (map[lbl] && map[lbl].name === name && map[lbl].lang === lang) return lbl;
    }
    for (var i = 0; i < DUO_LABELS.length; i++) {
      var lbl = DUO_LABELS[i];
      if (!map[lbl]) {
        map[lbl] = {name:name, lang:lang, speaking:false, lastHeard:0, color:DUO_COLORS[lbl]};
        duoRenderSpeakers();
        return lbl;
      }
    }
    return DUO_LABELS[DUO_LABELS.length-1];
  }

  function duoHandleJoin(data) {
    var map = window._duoSpeakerMap;
    var label = duoAssignLabel(data.name, data.lang);
    duoRenderSpeakers();
    // Toast
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = '🎙 ' + data.name + ' joined';
    t.style.opacity = '1';
    clearTimeout(t._tt); t._tt = setTimeout(function(){ t.style.opacity = '0'; }, 2000);
  }

  function duoHandleSpeaking(data) {
    var map = window._duoSpeakerMap;
    var label = duoAssignLabel(data.name, data.lang);
    if (map[label]) {
      map[label].speaking = true; map[label].lastHeard = Date.now();
      duoRenderSpeakers();
      clearTimeout(map[label]._st);
      map[label]._st = setTimeout(function(){
        if (map[label]) { map[label].speaking = false; duoRenderSpeakers(); }
      }, 2000);
    }
  }

  function duoHandleCaption(data) {
    // Skip own echoed messages (WebSocket relays back to sender)
    if (data.speaker === window._duoSpeakerName && data.lang === window._duoSpeakerLang) return;
    var label = data.label || '?';
    var name = data.speaker || label;
    var map = window._duoSpeakerMap;
    if (!map[label]) {
      map[label] = {name:name, lang:data.lang||'en', speaking:false, lastHeard:Date.now(), color:DUO_COLORS[label]};
    }
    map[label].speaking = true; map[label].lastHeard = Date.now();
    clearTimeout(map[label]._st);
    map[label]._st = setTimeout(function(){
      if (map[label]) { map[label].speaking = false; duoRenderSpeakers(); }
    }, 2000);
    duoRenderSpeakers();

    // Add to transcript with speaker tag
    var transcript = document.getElementById('captionTranscript');
    if (!transcript) return;
    var now = new Date();
    var tsStr = now.toTimeString().substring(0,8);
    var div = document.createElement('div');
    div.className = 'line';
    div.style.borderLeft = '3px solid ' + (map[label]?map[label].color:'#666');
    div.style.paddingLeft = '8px';
    div.innerHTML = '<span style="color:var(--muted2);font-size:.75em;font-family:JetBrains Mono,monospace;margin-right:6px">'+tsStr+'</span>' +
      '<span style="background:'+(map[label]?map[label].color:'#666')+';color:#000;padding:2px 6px;border-radius:3px;font-size:.7em;font-weight:700;font-family:JetBrains Mono,monospace;margin-right:6px">'+escapeHTML(name)+'</span>' +
      escapeHTML(data.final);
    transcript.appendChild(div);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function duoRenderSpeakers() {
    var list = document.getElementById('duoSpeakerList');
    var count = document.getElementById('duoSpkCount');
    if (!list || !count) return;
    var map = window._duoSpeakerMap;
    var keys = Object.keys(map);
    count.textContent = keys.length;
    if (keys.length === 0) {
      list.innerHTML = '<div style="text-align:center;font-size:11px;color:var(--muted);padding:20px 8px">No speakers yet</div>';
      return;
    }
    var html = '';
    keys.sort().forEach(function(label){
      var spk = map[label];
      html += '<div class="duo-speaker-item" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)">';
      html += '<span style="width:8px;height:8px;border-radius:50%;background:'+spk.color+'"></span>';
      html += '<span style="flex:1;font-size:11px;font-weight:600">'+spk.name+'</span>';
      if (spk.speaking) html += '<span style="font-size:9px;color:#34d399">●</span>';
      html += '</div>';
    });
    list.innerHTML = html;
  }
  window.duoRenderSpeakers = duoRenderSpeakers;

  window.duoUpdateInviteUrl = function() {
    var sb = window.sottotitoliSupabase;
    var hostName = 'Host';
    function setUrl(name) {
      var url = window.location.origin + window.location.pathname + '?join=1&room=' + window._duoRoomId + '&host=' + encodeURIComponent(name);
      // Update sidebar room info
      var roomEl = document.getElementById('duoSideRoomId');
      if (roomEl) roomEl.textContent = window._duoRoomId.substring(0,14) + '…';
      var linkEl = document.getElementById('duoSideLink');
      if (linkEl) linkEl.href = url;
      window._duoInviteUrl = url;
    }
    if (sb) {
      sb.auth.getSession().then(function(r){
        if (r.data?.session) {
          hostName = r.data.session.user.user_metadata?.full_name || r.data.session.user.email?.split('@')[0] || 'Host';
        }
        setUrl(hostName);
      });
    } else {
      setUrl(hostName);
      window._duoInviteUrl = window.location.origin + window.location.pathname + '?join=1&room=' + window._duoRoomId + '&host=' + encodeURIComponent(hostName);
    }
  };

  // ═══ Share invite from sidebar ═══
  window.duoShareInvite = function(channel) {
    var url = window._duoInviteUrl || (window.location.origin + window.location.pathname + '?join=1&room=' + window._duoRoomId + '&host=Host');
    var text = 'Join my Sottotitoli caption room';
    if (channel === 'whatsapp') window.open('https://wa.me/?text='+encodeURIComponent(text+' '+url), '_blank');
    else if (channel === 'email') window.open('mailto:?subject='+encodeURIComponent(text)+'&body='+encodeURIComponent(url), '_blank');
    else if (channel === 'copy') {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      navigator.clipboard.writeText(url).then(function(){
        var t = document.getElementById('toast'); if (!t) return;
        t.textContent = '📋 Invite link copied!'; t.style.opacity='1';
        clearTimeout(t._tt); t._tt = setTimeout(function(){ t.style.opacity='0'; }, 2000);
      }).catch(function(){});
    }
  };

  // ═══ Join Room (called from join screen) ═══
  window.duoJoinRoom = function() {
    var langPill = document.querySelector('#duoJoinLangPills .duo-lang-pill.selected');
    var lang = langPill ? langPill.getAttribute('data-lang') : 'en';
    var name = document.getElementById('duoJoinNameInput').value.trim() || 'Speaker';
    localStorage.setItem('sottotitoli-duo-speaker-name', name);

    window._duoSpeakerName = name;
    window._duoSpeakerLang = lang;
    window._duoMode = true;
    window._duoIsHost = false;
    // Host name from URL
    var params = new URLSearchParams(window.location.search);
    window._duoHostName = decodeURIComponent(params.get('host') || 'Host');
    // Set caption language to the chosen language
    captLang = lang;
    var locMap = {en:'en-US',it:'it-IT',fr:'fr-FR',de:'de-DE',es:'es-ES'};
    if (typeof setCaptionLanguage === 'function') {
      setCaptionLanguage(locMap[lang] || 'en-US', lang.charAt(0).toUpperCase()+lang.slice(1), true);
    }
    if (typeof setLang === 'function') setLang(lang);

    // Hide join screen, show normal UI
    document.getElementById('duoJoinScreen').style.display = 'none';
    document.getElementById('modeScroll').style.display = '';
    document.getElementById('themeToggle').style.display = '';
    document.getElementById('topbarSub').style.display = 'flex';
    document.getElementById('topbarRecWrap').style.display = '';

    // Set DUO+ UI
    var soloBtn = document.getElementById('modeSoloBtn');
    var duoBtn = document.getElementById('modeDuoBtn');
    if (soloBtn) soloBtn.className = 'btn-sm';
    if (duoBtn) duoBtn.className = 'mode-badge';
    setSpeakerCount('2');

    // Show sidebar — invitee view
    var sidebar = document.getElementById('duoSpeakerSidebar');
    var toggle = document.getElementById('duoToggleBtn');
    if (sidebar) { sidebar.style.display = 'flex'; sidebar.classList.add('open'); }
    if (toggle) { toggle.style.display = 'block'; toggle.classList.add('open'); }
    // Hide host section, show invitee section, hide manage button
    var hostSec = document.getElementById('duoHostSection');
    var invSec = document.getElementById('duoInviteeSection');
    if (hostSec) hostSec.style.display = 'none';
    if (invSec) invSec.style.display = 'block';
    // Hide the + manage button for invitees
    var mgmtBtn = sidebar ? sidebar.querySelector('.duo-speaker-sidebar-head button') : null;
    if (mgmtBtn) mgmtBtn.style.display = 'none';
    // Set invited-by name
    var params = new URLSearchParams(window.location.search);
    var hostName = params.get('host') || 'the host';
    var el = document.getElementById('duoInvitedBy');
    if (el) el.textContent = decodeURIComponent(hostName);

    // Update START button for invitee
    var startBtn = document.getElementById('startBtn');
    var pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) {
      startBtn.innerHTML = '<i class="fas fa-play"></i><span>Join</span>';
      startBtn.className = 't-btn t-start';
      startBtn.onclick = function() { toggleSession(); };
    }
    if (pauseBtn) {
      pauseBtn.style.display = '';
      pauseBtn.onclick = function() { togglePause(); };
    }
    // Show waiting message
    var ctrl = document.querySelector('.studio-ctrl');
    if (ctrl) {
      var waitMsg = document.createElement('span');
      waitMsg.id = 'duoWaitMsg';
      waitMsg.style.cssText = 'font-size:10px;color:var(--muted);font-style:italic;margin-left:8px';
      waitMsg.textContent = 'Waiting for host to start session…';
      ctrl.insertBefore(waitMsg, ctrl.firstChild);
    }

    duoAssignLabel(name, lang);
    window.duoConnectWebSocket();
  };

  // ═══ Send DUO messages when mic captures speech ═══
  // Hook into existing onFinal — wrap it
  var _origOnFinal = _realMic.onFinal;
  _realMic.onFinal = function(text) {
    // Call original handler (adds to transcript, stats, etc.)
    if (_origOnFinal) _origOnFinal(text);
    // In DUO mode, send a labelled message — queued if the relay is not awake yet.
    if (window._duoMode) {
      var label = duoAssignLabel(window._duoSpeakerName, window._duoSpeakerLang);
      // Override the line border color to match DUO+ speaker color
      var transcript = document.getElementById('captionTranscript');
      if (transcript && window._duoSpeakerMap[label]) {
        var lastLine = transcript.querySelector('.line:last-child');
        if (lastLine) lastLine.style.borderLeftColor = window._duoSpeakerMap[label].color;
      }
      duoSend({ type:'duo-speaking', name:window._duoSpeakerName, lang:window._duoSpeakerLang });
      duoSend({ msg:true, final:text, id:Date.now(), label:label, speaker:window._duoSpeakerName, lang:window._duoSpeakerLang });
    }
  };

  function escapeHTML(str) {
    var div = document.createElement('div'); div.textContent = str; return div.innerHTML;
  }

  // ═══ New Room ═══
  window.duoNewRoom = function() {
    showConfirmModal('Nuova stanza', 'Create a new room? This will clear all captions and disconnect current speakers.', 'Create', function(){
      if (window._duoWs) { try { window._duoWs.close(); } catch(e){} window._duoWs = null; }
      window._duoRoomId = 'cap-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2,6);
      localStorage.setItem('sottotitoli-duo-is-host-' + window._duoRoomId, '1');
      var sb2 = window.sottotitoliSupabase;
      if (sb2) {
        sb2.auth.getSession().then(function(r){
          if (r.data?.session) localStorage.setItem('sottotitoli-duo-host-' + window._duoRoomId, r.data.session.user.id);
        });
      }
      window._duoSpeakerMap = {};
      var transcript = document.getElementById('captionTranscript');
      if (transcript) transcript.innerHTML = '';
      var interim = document.getElementById('captionInterim');
      if (interim) interim.textContent = '';
      window._sessionLines = [];
      _grammarLastLineCount = 0; // reset incremental grammar line tracker
      ['statLines','statWords','liveWpm','liveLexDiv','liveFillersPerMin'].forEach(function(id){ var el=document.getElementById(id); if(el)el.textContent='0'; });
      try { var el = document.getElementById('liveLexDiv'); if (el) el.textContent = '—'; } catch(e) {}
      try { var el = document.getElementById('liveFillersPerMin'); if (el) el.textContent = '—'; } catch(e) {}
      duoRenderSpeakers();
      duoConnectWebSocket();
      duoUpdateInviteUrl();
      var t=document.getElementById('toast'); if(t){t.textContent='🔄 New room created';t.style.opacity='1';clearTimeout(t._tt);t._tt=setTimeout(function(){t.style.opacity='0'},2000);}
    });
  };

  // ═══ Refresh room (for invitees) ═══
  window.duoRefreshRoom = function() {
    window.location.reload();
  };

  // ═══ Init host in speaker list (called from outside the module) ═══
  window.duoInitHost = function() {
    duoAssignLabel(window._duoSpeakerName, window._duoSpeakerLang);
    duoRenderSpeakers();
  };

  // ═══ Speaker Management Modal ═══
  window.duoOpenSpeakerConfig = function() {
    var existing = document.querySelector('.duo-modal-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'duo-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999;display:flex;align-items:center;justify-content:center';
    var html = '<div class="duo-modal" style="background:#121620;border:1px solid #1e2430;border-radius:16px;width:400px;max-width:94vw;max-height:80vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.6)">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid #1e2430">';
    html += '<h3 style="font-family:Bebas Neue,sans-serif;font-size:20px;letter-spacing:1px;color:#e8eaed;margin:0">⚙ Manage Speakers</h3>';
    html += '<button onclick="this.closest(\'.duo-modal-overlay\').remove()" style="background:none;border:none;color:#555;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px">✕</button>';
    html += '</div>';
    html += '<div style="padding:16px 22px;display:flex;flex-direction:column;gap:6px">';
    var map = window._duoSpeakerMap;
    var keys = Object.keys(map);
    var isHost = function(spk){ return (spk.name === window._duoSpeakerName || spk.name === window._duoHostName); };
    if (keys.length === 0) {
      html += '<div style="text-align:center;font-size:13px;color:var(--muted);padding:20px">No speakers in room</div>';
    } else {
      keys.sort().forEach(function(label){
        var spk = map[label];
        var flag = (window.DUO_FLAGS && window.DUO_FLAGS[spk.lang]) ? window.DUO_FLAGS[spk.lang] : '';
        var hostIcon = isHost(spk) ? ' 👑' : '';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)">';
        html += '<span style="width:10px;height:10px;border-radius:50%;background:'+spk.color+'"></span>';
        html += '<span style="flex:1;font-size:13px;font-weight:600">'+flag+escapeHTML(spk.name)+hostIcon+'</span>';
        html += '<span style="font-size:10px;color:var(--muted);font-family:JetBrains Mono,monospace">'+spk.lang.toUpperCase()+'</span>';
        if (!isHost(spk)) {
          html += '<button onclick="duoKickSpeaker(\''+label+'\')" style="background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:#f87171;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Kick</button>';
        }
        html += '</div>';
      });
    }
    html += '</div>';
    html += '<div style="padding:12px 22px;border-top:1px solid #1e2430"><button onclick="this.closest(\'.duo-modal-overlay\').remove()" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer;font-family:Inter,sans-serif">Close</button></div>';
    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  };

  // ═══ Kick Speaker ═══
  window.duoKickSpeaker = function(label) {
    var spk = window._duoSpeakerMap[label];
    if (!spk) return;
    // Never allow kicking the host (yourself)
    var isSelf = (spk.name === window._duoSpeakerName) || (spk.name === window._duoHostName);
    if (isSelf) { showAlertModal('Manage Speakers', 'You cannot remove yourself from the room. Switch to SOLO mode instead.'); return; }
    showConfirmModal('Manage Speakers', 'Remove ' + spk.name + ' from the room?', 'Remove', function(){
      // Send kick message via WebSocket
      if (window._duoWs && window._duoWs.readyState === WebSocket.OPEN) {
        window._duoWs.send(JSON.stringify({ type:'duo-kick', label:label, name:spk.name }));
      }
      delete window._duoSpeakerMap[label];
      duoRenderSpeakers();
      // Close modal
      var modal = document.querySelector('.duo-modal-overlay');
      if (modal) modal.remove();
      var t=document.getElementById('toast'); if(t){t.textContent='🚫 '+spk.name+' removed';t.style.opacity='1';clearTimeout(t._tt);t._tt=setTimeout(function(){t.style.opacity='0'},2000);}
    });
  };

  // Handle incoming kick message
  var _origWsOnMessage = null;
  function duoHandleKick(data) {
    // If we're the one being kicked
    if (data.name === window._duoSpeakerName || (window._duoSpeakerMap[data.label] && window._duoSpeakerMap[data.label].name === window._duoSpeakerName)) {
      showAlertModal('Rimosso dalla stanza', 'You have been removed from the room by the host.');
      // Disconnect and return to solo mode
      if (window._duoWs) { try { window._duoWs.close(); } catch(e){} window._duoWs = null; }
      window._duoMode = false;
      window._duoRoomId = '';
      window._duoSpeakerMap = {};
      document.getElementById('duoSpeakerSidebar').classList.remove('open');
      document.getElementById('duoSpeakerSidebar').style.display = 'none';
      document.getElementById('duoToggleBtn').style.display = 'none';
      var soloBtn = document.getElementById('modeSoloBtn');
      var duoBtn = document.getElementById('modeDuoBtn');
      if (soloBtn) soloBtn.className = 'mode-badge';
      if (duoBtn) duoBtn.className = 'btn-sm';
      setSpeakerCount('1');
    }
  }

  // ═══ Toggle speaker sidebar ═══
  window.toggleDuoSidebar = function() {
    // Delegate to unified toggle — keeps sidebar + app-main + buttons in sync
    if (typeof togglePanel === 'function') { togglePanel('speakers'); }
    else {
      // Fallback if togglePanel not defined yet
      var sidebar = document.getElementById('duoSpeakerSidebar');
      var toggle = document.getElementById('duoToggleBtn');
      var app = document.getElementById('appMain');
      if (!sidebar) return;
      var isOpen = sidebar.classList.contains('open');
      if (isOpen) {
        sidebar.classList.remove('open');
        if (toggle) { toggle.classList.remove('open'); toggle.innerHTML = '▸'; }
        if (app) app.classList.remove('speakers-open');
      } else {
        sidebar.classList.add('open');
        if (toggle) { toggle.classList.add('open'); toggle.innerHTML = '◂'; }
        if (app) app.classList.add('speakers-open');
      }
    }
  };

  // ═══ Dynamic sidebar positioning — attached below topbar-stack ═══
  function duoUpdateSidebarPosition() {
    var stack = document.getElementById('topbarStack');
    var root = document.documentElement;
    if (stack) {
      var rect = stack.getBoundingClientRect();
      root.style.setProperty('--duo-sidebar-top', rect.bottom + 'px');
    }
  }
  window.addEventListener('resize', duoUpdateSidebarPosition);
  // Hook into rec bar toggle
  // ═══ Mode switch confirmation ═══
  var _origSetSpeakerMode = window.setSpeakerMode;
  if (typeof _origSetSpeakerMode === 'function') {
    window.setSpeakerMode = function(mode) {
      var currentMode = window._duoMode ? 'duo' : 'solo';
      if (mode !== currentMode) {
        var msg = mode === 'duo' ? 'Switch to DUO+? This will clear your captions and start a new room.' : 'Switch to SOLO? This will clear your captions and disconnect speakers.';
        showConfirmModal('Cambio modalità', msg, 'Switch', function(){
          // Clear captions
          var transcript = document.getElementById('captionTranscript');
          if (transcript) transcript.innerHTML = '';
          var interim = document.getElementById('captionInterim');
          if (interim) interim.textContent = '';
          window._sessionLines = [];
          ['statLines','statWords','liveWpm','liveLexDiv','liveFillersPerMin'].forEach(function(id){ var el=document.getElementById(id); if(el)el.textContent='0'; });
          try { var el = document.getElementById('liveLexDiv'); if (el) el.textContent = '—'; } catch(e) {}
          try { var el = document.getElementById('liveFillersPerMin'); if (el) el.textContent = '—'; } catch(e) {}
          // Reset DUO when switching to solo
          if (mode === 'solo') {
            if (window._duoWs) { try { window._duoWs.close(); } catch(e){} window._duoWs = null; }
            window._duoRoomId = '';
            window._duoSpeakerMap = {};
            duoRenderSpeakers();
          }
          _origSetSpeakerMode(mode);
        });
      } else {
        _origSetSpeakerMode(mode);
      }
    };
  }

  var _origToggleRecBar = window.toggleRecBar;
  if (typeof _origToggleRecBar === 'function') {
    window.toggleRecBar = function() {
      _origToggleRecBar();
      setTimeout(duoUpdateSidebarPosition, 350); // after transition
    };
  }
  // Initial position
  setTimeout(duoUpdateSidebarPosition, 200);
  setTimeout(duoUpdateSidebarPosition, 600);
})();

