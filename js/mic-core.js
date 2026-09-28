// ═══ Mic core — the ONE home for the logic every capture path needs ═══
//
// This codebase has FIVE capture stacks: real-mic.js, record-fallback.js, system-audio.js,
// onboarding.html's inline block, and learner.js. Each grew its own copy of the same three things —
// a bounded getUserMedia, a "is this input actually a microphone?" test, and an error-name →
// message mapping.
//
// Four copies of one rule is four places to fix it and four chances to drift, and the audit found
// exactly that: the loopback detector — the only thing that CAN explain the BlackHole report — was
// present on ONE of the four stacks, so the other three fail silently in precisely the same way.
// Same for the bounded getUserMedia: onboarding has three unbounded calls and reproduces the hang
// that was already fixed here.
//
// This is the extraction, taken from the PROVEN path (the caption page + real-mic.js) and kept
// behaviour-identical so the move itself is verifiable. Consumers adopt it one at a time:
// caption-s8t.html and real-mic.js use it now; onboarding and learner in the next phase.
(function () {
  'use strict';

  /* Guarded i18n lookup. This module may load before js/i18n.js, and each page's inline block has
   * its own helper, so the fallback is what guarantees a message is never blank and never a raw
   * key name shown to a user. */
  function t(key, fallback) {
    try {
      var v = window.I18n && window.I18n.t ? window.I18n.t(key) : null;
      return (v && v !== key) ? v : fallback;
    } catch (e) { return fallback; }
  }

  /* Loopback / virtual input devices carry the COMPUTER's audio, not the user's voice, so a session
   * on one is silent while looking perfectly healthy. Nothing in the Speech or Web Audio APIs can
   * detect that — only the device NAME — which is why this is worth guessing at.
   * `(Virtual)` in a label is Chromium's own annotation, so it matches too. */
  var VIRTUAL_RE = /blackhole|loopback|soundflower|zoomaudio|krisp|sound siphon|vb-?cable|ndi|virtual|aggregate|multi-?output|obs|ecamm|existential/i;

  function looksVirtual(label) {
    return !!label && VIRTUAL_RE.test(String(label));
  }

  /* getUserMedia can hang FOREVER: an unanswered permission prompt, a wedged device, or a Bluetooth
   * handoff in progress. Observed on the live site — the UI sat at "Requesting…" with no recogniser
   * created, no error, and nothing telling the user anything. A hang there is indistinguishable from
   * a dead page, so bound it. The loser of the race may still resolve later (an orphan stream); that
   * is the lesser evil than an unexplained freeze.
   *
   * CONTRACT: rejects with an Error whose `name` is 'TimeoutError'. Callers branch on the name, so
   * that is part of the interface, not an implementation detail. */
  function gumWithTimeout(constraints, ms) {
    var limit = (typeof ms === 'number' && ms > 0) ? ms : 12000;
    return Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      new Promise(function (_, reject) {
        setTimeout(function () {
          var e = new Error('getUserMedia timed out after ' + limit + 'ms');
          e.name = 'TimeoutError';
          reject(e);
        }, limit);
      })
    ]);
  }

  /* Error name → the message to show. Kept as data rather than a switch so every consumer can
   * render the same explanation in its own way — a toast, an inline status line, a form hint.
   *
   * The fallbacks are the Italian source strings; they are only reached when the dictionary misses.
   * `no-speech` and `aborted` are deliberately NOT here: silence, and a recognition the user stopped
   * themselves, are not failures and must never raise an alarm. `isSilentError` says so explicitly
   * for callers that need to decide. */
  var FALLBACK = {
    TimeoutError: 'Il microfono non risponde: concedi il permesso o ricarica la pagina.',
    'recognition:network': 'Riconoscimento non raggiungibile (rete, VPN o proxy).',
    'recognition:audio-capture': 'Nessun audio dal sistema: cambia il microfono predefinito di macOS.',
    'recognition:service-not-allowed': 'Permesso microfono negato per il riconoscimento.',
    NotAllowedError: 'Permesso microfono negato per il riconoscimento.',
    generic: 'Microfono non disponibile.'
  };
  var KEYS = {
    TimeoutError: 'mic_gum_timeout',
    'recognition:network': 'mic_err_network',
    'recognition:audio-capture': 'mic_err_capture',
    'recognition:service-not-allowed': 'mic_err_denied',
    NotAllowedError: 'mic_err_denied',
    generic: 'mic_generic_fail'
  };

  /* Preserves the exact behaviour this replaced in real-mic.js, including the detail that an
   * UNRECOGNISED name is appended in parentheses: the name is the diagnosis, so dropping it was
   * never an option. */
  function errorMessage(name) {
    var key = KEYS[name] || KEYS.generic;
    var msg = t(key, FALLBACK[name] || FALLBACK.generic);
    if (!KEYS[name]) msg += (name ? ' (' + name + ')' : '');
    return msg;
  }

  function isSilentError(name) {
    return name === 'no-speech' || name === 'aborted';
  }

  window.MicCore = {
    looksVirtual: looksVirtual,
    VIRTUAL_RE: VIRTUAL_RE,
    gumWithTimeout: gumWithTimeout,
    errorMessage: errorMessage,
    isSilentError: isSilentError,
    t: t
  };
})();
