// js/ai-voice.js — AI Voice Conversation Partner (Premium)
// WebSocket-based voice agent using Hugging Face speech-to-speech server.
// Gated behind Voice Credits (VC) — integrated with wallet.html.
(function(global){
  'use strict';

  // ── Configuration ──
  // Reads from window.SOTTOTITOLI_CONFIG.aiVoice (set in config.js)
  // Falls back to defaults below if not configured.
  var globalCfg = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.aiVoice) || {};
  var CONFIG = {
    // WebSocket endpoint for the speech-to-speech server
    serverUrl: globalCfg.serverUrl || null,

    // Voice Credits: cost per hour of conversation
    vcPerHour: globalCfg.vcPerHour || 50,

    // Minimum VC balance required to start a session
    minBalance: globalCfg.minBalance || 10,
  };

  // ── State ──
  var state = {
    active: false,
    socket: null,
    scenario: 'free-talk',
    lang: 'it',
    startTime: null,
    timerInterval: null,
    vcBalance: 0,
    messages: [],
    mediaStream: null,
    audioContext: null,
  };

  // ── DOM refs (lazy) ──
  function $(id) { return document.getElementById(id); }

  // ── Credit Balance (shared pool with AI Reports) ──
  async function fetchVCBalance() {
    // Try Supabase first (real balance — authoritative when logged in)
    try {
      if (window.SottotitoliData && window.SottotitoliData.getAITokens) {
        var tokens = await window.SottotitoliData.getAITokens();
        if (typeof tokens === 'number') {
          state.vcBalance = tokens;
          localStorage.setItem('sottotitoli-ai-balance', String(tokens));
          return state.vcBalance;
        }
      }
    } catch(e) {
      console.warn('AI Voice: could not fetch credits from Supabase:', e.message);
    }

    // Fallback: localStorage
    var stored = localStorage.getItem('sottotitoli-ai-balance');
    var localBalance = (stored !== null) ? (parseInt(stored, 10) || 0) : null;

    // For localhost dev: default to 500 demo credits if nothing stored AND not logged in
    var isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && (localBalance === null || localBalance <= 0)) {
      localBalance = 1000;
      localStorage.setItem('sottotitoli-ai-balance', '1000');
    }

    state.vcBalance = (localBalance !== null) ? localBalance : 0;
    return state.vcBalance;
  }

  function updateVCBalanceDisplay() {
    var valEl = $('aiVoiceCreditsValue');
    if (valEl) valEl.textContent = state.vcBalance;

    // Show/hide locked state
    var lockedEl = $('aiVoiceLocked');
    var startArea = $('aiVoiceStartArea');
    var creditsBar = $('aiVoiceCreditsBar');

    if (state.vcBalance < CONFIG.minBalance) {
      if (lockedEl) lockedEl.style.display = '';
      if (startArea) startArea.style.display = 'none';
      if (creditsBar) creditsBar.style.opacity = '0.5';
    } else {
      if (lockedEl) lockedEl.style.display = 'none';
      if (startArea) startArea.style.display = '';
      if (creditsBar) creditsBar.style.opacity = '1';
    }
  }

  // Deduct VC after session ends
  function deductVC(minutes) {
    var hours = minutes / 60;
    var cost = Math.ceil(hours * CONFIG.vcPerHour);
    state.vcBalance = Math.max(0, state.vcBalance - cost);

    // Persist to localStorage
    localStorage.setItem('sottotitoli-ai-balance', state.vcBalance);

    // Sync to Supabase if authenticated (via the same token system)
    try {
      if (window.sottotitoliSupabase) {
        window.sottotitoliSupabase.auth.getSession().then(function(session) {
          if (session && session.data && session.data.session) {
            var userId = session.data.session.user.id;
            window.sottotitoliSupabase
              .from('user_credits')
              .update({ balance_tokens: state.vcBalance })
              .eq('user_id', userId)
              .then(function() { /* silent */ });
          }
        });
      }
    } catch(e) { /* silent */ }

    updateVCBalanceDisplay();
    return cost;
  }

  // ── Scenario & Language Selection ──
  function initSelectors() {
    // Scenario selector
    var scenarioBtns = document.querySelectorAll('.ai-voice-scenario');
    scenarioBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        scenarioBtns.forEach(function(b){ b.classList.remove('active'); });
        this.classList.add('active');
        state.scenario = this.getAttribute('data-scenario');
      });
    });

    // Language selector
    var langBtns = document.querySelectorAll('.ai-voice-lang');
    langBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        langBtns.forEach(function(b){ b.classList.remove('active'); });
        this.classList.add('active');
        state.lang = this.getAttribute('data-lang');
      });
    });
  }

  // ── Scenario prompts (system instructions for the LLM) ──
  function getScenarioPrompt() {
    var prompts = {
      'free-talk': 'You are a friendly conversation partner helping the user practice ' + getLangName() + '. Have a natural, engaging conversation. Keep responses concise (1-3 sentences). Ask follow-up questions. Correct major grammar mistakes gently.',
      'cafe': 'You are a barista at an Italian café. The user is a customer. Stay in character. Take their order, make small talk about the weather, recommend pastries. Use casual, friendly Italian. Keep responses short and natural.',
      'hotel': 'You are a hotel receptionist. The user is checking in. Ask for their reservation name, explain amenities, give them their room key. Be professional but warm. Use polite language.',
      'interview': 'You are a job interviewer conducting an interview in ' + getLangName() + '. Ask common interview questions. Give the user time to respond. Be professional and encouraging.',
      'doctor': 'You are a doctor. The user is a patient describing symptoms. Ask follow-up questions about their condition. Use simple medical vocabulary. Be caring and professional.',
      'shopping': 'You are a shop assistant. The user is browsing. Help them find items, suggest sizes, tell them prices. Use friendly, helpful language.'
    };
    return prompts[state.scenario] || prompts['free-talk'];
  }

  function getLangName() {
    var names = { it:'Italian', en:'English', nl:'Dutch', fr:'French', de:'German', es:'Spanish', pl:'Polish' };
    return names[state.lang] || 'the language';
  }

  // ── Timer ──
  function startTimer() {
    state.startTime = Date.now();
    state.timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  function updateTimer() {
    var elapsed = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var timerEl = $('aiVoiceTimer');
    if (timerEl) {
      timerEl.textContent = String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');
    }
    // Update estimated cost
    var hours = elapsed / 3600;
    var estCost = Math.ceil(hours * CONFIG.vcPerHour);
    var costEl = $('aiVoiceCost');
    if (costEl) costEl.textContent = estCost + ' cr';
  }

  function getElapsedMinutes() {
    if (!state.startTime) return 0;
    return Math.floor((Date.now() - state.startTime) / 60000);
  }

  // ── Transcript ──
  function addMessage(role, text) {
    state.messages.push({ role: role, text: text, time: Date.now() });
    var transcriptEl = $('aiVoiceTranscript');
    if (!transcriptEl) return;

    // Remove empty state
    var emptyState = transcriptEl.querySelector('.ai-voice-empty-state');
    if (emptyState) emptyState.remove();

    var msgDiv = document.createElement('div');
    msgDiv.className = 'ai-voice-msg ' + role;

    var avatar = document.createElement('div');
    avatar.className = 'ai-voice-msg-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    var bubble = document.createElement('div');
    bubble.className = 'ai-voice-msg-bubble';
    bubble.textContent = text;

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    transcriptEl.appendChild(msgDiv);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  // ── Status indicator ──
  function setStatus(status) {
    var dot = $('aiVoiceStatusDot');
    var text = $('aiVoiceStatusText');
    if (!dot || !text) return;

    dot.className = 'ai-voice-status-dot';
    text.textContent = status;

    switch(status) {
      case 'In ascolto…':
        dot.classList.add('idle');
        text.textContent = 'In ascolto…';
        break;
      case 'Stai parlando…':
        text.textContent = 'Stai parlando…';
        break;
      case 'L\'AI sta rispondendo…':
        dot.classList.add('speaking');
        text.textContent = 'L\'AI sta rispondendo…';
        break;
      case 'Connesso':
        text.textContent = 'Connesso';
        break;
      default:
        dot.classList.add('idle');
        text.textContent = status;
    }
  }

  // ── WebSocket Connection ──
  function connectWebSocket() {
    if (!CONFIG.serverUrl) {
      addMessage('assistant', '⚠️ Server AI Voice non configurato. Aggiungi l\'URL del server speech-to-speech in CONFIG.serverUrl.');
      return null;
    }

    try {
      var ws = new WebSocket(CONFIG.serverUrl);

      ws.onopen = function() {
        setStatus('Connesso');
        // Send session configuration (OpenAI Realtime protocol)
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: getScenarioPrompt(),
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));
      };

      ws.onmessage = function(event) {
        var data;
        try { data = JSON.parse(event.data); } catch(e) { return; }

        // Handle different event types from the server
        switch(data.type) {
          case 'session.created':
          case 'session.updated':
            break;

          case 'conversation.item.input_audio_transcription.completed':
            // User's speech transcribed
            if (data.transcript && data.transcript.trim()) {
              addMessage('user', data.transcript.trim());
            }
            break;

          case 'response.audio_transcript.delta':
            // Assistant's text streaming in
            // Accumulate and show when done
            break;

          case 'response.audio_transcript.done':
            // Assistant's full response text
            if (data.transcript && data.transcript.trim()) {
              addMessage('assistant', data.transcript.trim());
            }
            break;

          case 'response.audio.delta':
            // Audio chunk — play it
            if (data.delta) {
              playAudioChunk(data.delta);
            }
            break;

          case 'input_audio_buffer.speech_started':
            setStatus('Stai parlando…');
            break;

          case 'input_audio_buffer.speech_stopped':
            setStatus('L\'AI sta rispondendo…');
            break;

          case 'response.done':
            setStatus('In ascolto…');
            break;

          case 'error':
            console.error('AI Voice server error:', data);
            addMessage('assistant', '⚠️ Errore: ' + (data.message || 'connessione persa'));
            break;
        }
      };

      ws.onerror = function(err) {
        console.error('AI Voice WebSocket error:', err);
        setStatus('Errore di connessione');
      };

      ws.onclose = function() {
        setStatus('Disconnesso');
        if (state.active) {
          addMessage('assistant', '🔌 Connessione terminata.');
          stop();
        }
      };

      return ws;
    } catch(e) {
      console.error('AI Voice: failed to create WebSocket:', e);
      return null;
    }
  }

  // ── Audio playback (PCM16 → browser speaker) ──
  var audioQueue = [];
  var isPlayingAudio = false;
  var currentSource = null;

  function playAudioChunk(base64PCM) {
    if (!state.audioContext) {
      try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      } catch(e) {
        console.warn('AI Voice: cannot create AudioContext:', e);
        return;
      }
    }

    try {
      // Decode base64 → ArrayBuffer → Int16Array → Float32Array
      var binaryStr = atob(base64PCM);
      var bytes = new Uint8Array(binaryStr.length);
      for (var i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      var int16 = new Int16Array(bytes.buffer);
      var float32 = new Float32Array(int16.length);
      for (var j = 0; j < int16.length; j++) {
        float32[j] = int16[j] / 32768.0;
      }

      var buffer = state.audioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      var source = state.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(state.audioContext.destination);
      source.start();
    } catch(e) {
      console.warn('AI Voice: audio playback error:', e);
    }
  }

  // ── Microphone capture ──
  async function startMicrophone() {
    try {
      state.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      state.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      var source = state.audioContext.createMediaStreamSource(state.mediaStream);
      var processor = state.audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(state.audioContext.destination);

      processor.onaudioprocess = function(e) {
        if (!state.active || !state.socket || state.socket.readyState !== WebSocket.OPEN) return;

        var inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 → base64
        var int16 = new Int16Array(inputData.length);
        for (var i = 0; i < inputData.length; i++) {
          var s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        var uint8 = new Uint8Array(int16.buffer);
        var binary = '';
        for (var j = 0; j < uint8.length; j++) {
          binary += String.fromCharCode(uint8[j]);
        }
        var base64 = btoa(binary);

        state.socket.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64
        }));
      };

      return true;
    } catch(e) {
      console.error('AI Voice: microphone access denied:', e);
      addMessage('assistant', '⚠️ Accesso al microfono negato. Controlla i permessi del browser.');
      return false;
    }
  }

  function stopMicrophone() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(function(t){ t.stop(); });
      state.mediaStream = null;
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close().catch(function(){});
      state.audioContext = null;
    }
  }

  // ── Public API ──
  function toggle() {
    if (state.active) {
      stop();
    } else {
      start();
    }
  }

  async function start() {
    // Check VC balance
    await fetchVCBalance();
    if (state.vcBalance < CONFIG.minBalance) {
      updateVCBalanceDisplay();
      return;
    }

    // Check server config
    if (!CONFIG.serverUrl) {
      // Demo/placeholder mode — simulate conversation locally
      addMessage('assistant', '👋 Ciao! Sono il tuo partner di conversazione AI. Al momento il server non è ancora configurato, ma l\'interfaccia è pronta. Per attivare la vera AI Voice, configura CONFIG.serverUrl con l\'URL del server speech-to-speech.');
      addMessage('assistant', '📋 Puoi già selezionare scenari e lingue. La connessione reale verrà attivata non appena il backend sarà online.');
      return;
    }

    // Connect and start
    state.active = true;
    state.messages = [];

    var startBtn = $('aiVoiceStartBtn');
    var liveArea = $('aiVoiceLive');
    var startArea = $('aiVoiceStartArea');
    var transcriptEl = $('aiVoiceTranscript');

    if (startBtn) {
      startBtn.classList.add('running');
      startBtn.querySelector('.ai-voice-start-label').textContent = 'In conversazione…';
    }
    if (liveArea) liveArea.style.display = '';
    if (startArea) startArea.style.display = 'none';

    // Clear transcript
    if (transcriptEl) {
      transcriptEl.innerHTML = '<div class="ai-voice-empty-state"><span style="font-size:48px">🎙️</span><p>In attesa di connessione…</p></div>';
    }

    // Connect WebSocket
    state.socket = connectWebSocket();
    if (!state.socket) {
      stop();
      return;
    }

    // Start mic
    var micOk = await startMicrophone();
    if (!micOk) {
      stop();
      return;
    }

    startTimer();
    setStatus('In ascolto…');

    // Send initial greeting trigger
    setTimeout(function() {
      if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify({ type: 'response.create' }));
      }
    }, 500);
  }

  function stop() {
    state.active = false;
    stopTimer();

    // Close WebSocket
    if (state.socket) {
      try { state.socket.close(); } catch(e) {}
      state.socket = null;
    }

    // Stop mic
    stopMicrophone();

    // Deduct VC
    var minutes = getElapsedMinutes();
    if (minutes > 0) {
      var cost = deductVC(minutes);
      addMessage('assistant', '⏱️ Sessione terminata. Durata: ' + minutes + ' min. Crediti usati: ' + cost + '. Saldo: ' + state.vcBalance + ' crediti.');
    }

    // Reset UI
    var startBtn = $('aiVoiceStartBtn');
    var liveArea = $('aiVoiceLive');
    var startArea = $('aiVoiceStartArea');

    if (startBtn) {
      startBtn.classList.remove('running');
      startBtn.querySelector('.ai-voice-start-label').textContent = 'Avvia conversazione';
    }
    if (startArea) startArea.style.display = '';

    setStatus('Disconnesso');
  }

  // ── Initialize on panel activation ──
  function onPanelActivated() {
    fetchVCBalance().then(function() {
      updateVCBalanceDisplay();
    });
  }

  // Listen for panel switch to refresh VC
  document.addEventListener('click', function(e) {
    var navItem = e.target.closest('.nav-item[data-panel="ai-voice"]');
    if (navItem) {
      setTimeout(onPanelActivated, 100);
    }
  });

  // Also refresh when the panel becomes visible via other means
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target.id === 'pnl-ai-voice' && mutation.target.classList.contains('active')) {
        onPanelActivated();
      }
    });
  });

  var panelEl = document.getElementById('pnl-ai-voice');
  if (panelEl) {
    observer.observe(panelEl, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Initialize selectors on load ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSelectors);
  } else {
    initSelectors();
  }

  // ── Expose ──
  global.SottotitoliAIVoice = {
    toggle: toggle,
    start: start,
    stop: stop,
    getState: function() { return state; },
    setServerUrl: function(url) { CONFIG.serverUrl = url; },
    getVCBalance: fetchVCBalance,
  };

})(window);
