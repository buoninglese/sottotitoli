/**
 * review-input.js — Answer validation, normalization, speech capture.
 * Pure logic + browser speech API. No DOM rendering.
 */

export function normalizeAnswer(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim()
    .toLowerCase();
}

export function buildAcceptedAnswers(word) {
  var answers = [];

  if (word && word.lemma) answers.push(normalizeAnswer(word.lemma));
  if (word && word.normalized) answers.push(normalizeAnswer(word.normalized));
  if (word && Array.isArray(word.accepted_answers)) {
    for (var i = 0; i < word.accepted_answers.length; i++) {
      answers.push(normalizeAnswer(word.accepted_answers[i]));
    }
  }

  // Deduplicate
  var seen = {};
  return answers.filter(function (a) {
    if (!a || seen[a]) return false;
    seen[a] = true;
    return true;
  });
}

export function compareAnswers(userAnswer, acceptedAnswers, options) {
  options = options || {};
  var normalizedUser = normalizeAnswer(userAnswer);
  var normalizedAccepted = [];
  for (var i = 0; i < acceptedAnswers.length; i++) {
    normalizedAccepted.push(normalizeAnswer(acceptedAnswers[i]));
  }
  normalizedAccepted = normalizedAccepted.filter(Boolean);

  if (normalizedAccepted.indexOf(normalizedUser) >= 0) {
    return { isCorrect: true, matched: normalizedUser, reason: 'exact' };
  }

  if (options.allowPluralTolerance) {
    var singularized = normalizedUser.replace(/s$/i, '');
    if (normalizedAccepted.indexOf(singularized) >= 0) {
      return { isCorrect: true, matched: singularized, reason: 'plural-tolerance' };
    }
  }

  return { isCorrect: false, matched: null, reason: 'no-match' };
}

export function scoreTypingAnswer(userAnswer, word) {
  var accepted = buildAcceptedAnswers(word);
  var result = compareAnswers(userAnswer, accepted, { allowPluralTolerance: true });

  return {
    isCorrect: result.isCorrect,
    acceptedAnswers: accepted,
    normalizedUserAnswer: normalizeAnswer(userAnswer),
    reason: result.reason,
    grade: result.isCorrect ? 'good' : 'again'
  };
}

export function buildClozePrompt(word) {
  var example = (word && word.metadata && word.metadata.example_sentence) || '';
  if (!example || !word || !word.lemma) {
    return {
      type: 'cloze',
      prompt: 'Completa la parola mancante per: ' + (word ? word.translation_primary || '' : '')
    };
  }

  var regex = new RegExp('\\b' + word.lemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  return {
    type: 'cloze',
    prompt: example.replace(regex, '_____')
  };
}

export function buildTranslationPrompt(word) {
  return {
    type: 'translation',
    prompt: (word && word.translation_primary) ? word.translation_primary : 'Inserisci la parola corretta'
  };
}

export async function startSpeechCapture() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    var recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    return new Promise(function (resolve, reject) {
      recognition.onresult = function (event) {
        var transcript = '';
        var confidence = null;
        if (event.results && event.results[0] && event.results[0][0]) {
          transcript = event.results[0][0].transcript || '';
          confidence = event.results[0][0].confidence;
        }
        resolve({ transcript: transcript, confidence: confidence, engine: 'browser-speech-recognition' });
      };
      recognition.onerror = reject;
      recognition.start();
    });
  }

  return { transcript: '', confidence: null, engine: 'manual-fallback' };
}

export function stopSpeechCapture() {
  return true;
}

export async function transcribeSpeechBlob(blob) {
  return {
    transcript: '',
    confidence: null,
    engine: 'server-transcription-not-implemented',
    blob: blob
  };
}

export function scoreSpeechAnswer(transcript, word, confidence) {
  var typingResult = scoreTypingAnswer(transcript, word);
  typingResult.speechConfidence = confidence || null;
  return typingResult;
}
