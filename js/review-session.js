/**
 * review-session.js — Fullscreen review/test state machine.
 * No inline onclick logic. Single controller for all session flows.
 */

import { getReviewState, setReviewSession, getQueueById, getWordById, upsertReviewWord } from './review-store.js';
import { startReviewSession, completeReviewSession, submitReviewAttempt } from './review-api.js';
import { applySrsGrade, markWordFailed, markWordReviewed, markWordShaky } from './review-engine.js';
import { buildTranslationPrompt, buildClozePrompt, scoreTypingAnswer, scoreSpeechAnswer, startSpeechCapture } from './review-input.js';

var ALLOWED_STATES = [
  'idle', 'intro', 'review_item', 'review_complete',
  'test_intro', 'test_item_typing', 'test_item_speaking',
  'results', 'submitting', 'error'
];

export function createReviewSessionController() {
  return {
    openReviewSession: openReviewSession,
    closeReviewSession: closeReviewSession,
    goToNextSessionItem: goToNextSessionItem,
    goToPrevSessionItem: goToPrevSessionItem,
    submitCurrentSessionGrade: submitCurrentSessionGrade,
    switchSessionMode: switchSessionMode,
    transitionSessionState: transitionSessionState
  };
}

export async function openReviewSession(queueId, mode) {
  mode = mode || 'review';
  var queue = getQueueById(queueId);
  if (!queue) throw new Error('Queue non trovata');

  var sessionRow = await startReviewSession(queue.id, queue.type, mode, queue.word_ids.length);

  var sessionState = {
    sessionId: sessionRow.id,
    queueId: queue.id,
    flowState: 'intro',
    wordIds: queue.word_ids.slice(),
    currentIndex: 0,
    total: queue.word_ids.length,
    mode: mode,
    completedWordIds: [],
    failedWordIds: [],
    shakyWordIds: [],
    masteredWordIds: [],
    isDirty: false,
    isSubmitting: false,
    error: null
  };

  setReviewSession(sessionState);
  renderSessionShell();
  renderSessionIntro();
}

export async function closeReviewSession(status) {
  status = status || 'abandoned';
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session || !session.sessionId) {
    setReviewSession(null);
    return;
  }

  try {
    await completeReviewSession(session.sessionId, status, {
      completedWordIds: session.completedWordIds,
      failedWordIds: session.failedWordIds,
      shakyWordIds: session.shakyWordIds,
      masteredWordIds: session.masteredWordIds
    });
  } catch (e) {
    console.warn('Failed to complete review session:', e);
  }

  var mount = document.getElementById('reviewSessionMount');
  if (mount) mount.innerHTML = '';
  setReviewSession(null);
}

export function goToNextSessionItem() {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session) return;

  if (session.currentIndex >= session.total - 1) {
    if (session.mode === 'review') {
      transitionSessionState('review_complete');
    } else {
      transitionSessionState('results');
    }
    renderSessionResults();
    return;
  }

  setReviewSession(Object.assign({}, session, { currentIndex: session.currentIndex + 1 }));
  renderCurrentSessionItem();
}

export function goToPrevSessionItem() {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session || session.currentIndex <= 0) return;

  setReviewSession(Object.assign({}, session, { currentIndex: session.currentIndex - 1 }));
  renderCurrentSessionItem();
}

export async function submitCurrentSessionGrade(grade) {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session) return;

  var wordId = session.wordIds[session.currentIndex];
  var word = getWordById(wordId);
  if (!word) return;

  var updatedWord = applySrsGrade(word, grade, new Date());

  if (grade === 'again') updatedWord = markWordFailed(updatedWord, { mode: session.mode });
  else if (grade === 'hard') updatedWord = markWordShaky(updatedWord);
  else updatedWord = markWordReviewed(updatedWord, { mode: session.mode });

  transitionSessionState('submitting');

  var nextCompleted = session.completedWordIds.slice();
  if (nextCompleted.indexOf(wordId) < 0) nextCompleted.push(wordId);

  var nextFailed = session.failedWordIds.slice();
  if (grade === 'again' && nextFailed.indexOf(wordId) < 0) nextFailed.push(wordId);

  var nextShaky = session.shakyWordIds.slice();
  if (grade === 'hard' && nextShaky.indexOf(wordId) < 0) nextShaky.push(wordId);

  var nextMastered = session.masteredWordIds.slice();
  if (updatedWord.review_state === 'mastered' && nextMastered.indexOf(wordId) < 0) nextMastered.push(wordId);

  var payload = {
    p_session_id: session.sessionId,
    p_word_id: wordId,
    p_mode: session.mode,
    p_prompt_type: session.mode === 'review' ? 'definition' : 'translation',
    p_user_answer: null,
    p_expected_answer: word.lemma,
    p_is_correct: grade !== 'again',
    p_grade: grade,
    p_latency_ms: null,
    p_speech_confidence: null,
    p_pronunciation_score: null,
    p_transcript_text: null,
    p_metadata: {},
    p_next_review_at: updatedWord.next_review_at,
    p_interval_days: updatedWord.interval_days,
    p_ease_factor: updatedWord.ease_factor,
    p_reps: updatedWord.reps,
    p_lapses: updatedWord.lapses,
    p_mastery_score: updatedWord.mastery_score,
    p_recognition_score: updatedWord.recognition_score,
    p_production_score: updatedWord.production_score,
    p_speech_score: updatedWord.speech_score,
    p_typing_score: updatedWord.typing_score,
    p_review_state: updatedWord.review_state,
    p_is_new: updatedWord.is_new,
    p_completed_items: nextCompleted.length,
    p_failed_items: nextFailed.length,
    p_shaky_items: nextShaky.length,
    p_mastered_items: nextMastered.length
  };

  try {
    var response = await submitReviewAttempt(payload);
    upsertReviewWord(response.word);
  } catch (e) {
    console.warn('submitReviewAttempt failed, using local state:', e);
  }

  var nextFlowState = session.mode === 'review' ? 'review_item' : session.flowState;
  setReviewSession(Object.assign({}, session, {
    flowState: nextFlowState,
    completedWordIds: nextCompleted,
    failedWordIds: nextFailed,
    shakyWordIds: nextShaky,
    masteredWordIds: nextMastered,
    isDirty: true,
    isSubmitting: false
  }));

  goToNextSessionItem();
}

export function switchSessionMode(mode) {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session) return;

  var flowState = 'review_item';
  if (mode === 'test_typing') flowState = 'test_item_typing';
  if (mode === 'test_speaking') flowState = 'test_item_speaking';

  setReviewSession(Object.assign({}, session, { mode: mode, flowState: flowState, currentIndex: 0 }));
  renderCurrentSessionItem();
}

/* ── Rendering ── */

export function renderSessionShell() {
  var mount = document.getElementById('reviewSessionMount');
  if (!mount) return;

  mount.innerHTML = '<div class="review-session-overlay">' +
    '<div class="review-session-shell">' +
    '<div class="review-session-header">' +
    '<button type="button" class="review-session-close" data-review-close>Chiudi</button>' +
    '<div class="review-session-progress" data-review-progress></div>' +
    '</div>' +
    '<div class="review-session-body" data-review-session-body></div>' +
    '</div>' +
    '</div>';

  bindSessionEvents();
}

export function renderSessionIntro() {
  var body = document.querySelector('[data-review-session-body]');
  var state = getReviewState();
  var session = state.reviewSession;
  var queue = session ? getQueueById(session.queueId) : null;
  if (!body || !session || !queue) return;

  body.innerHTML = '<div class="review-session-intro">' +
    '<h2>' + queue.title + '</h2>' +
    '<p>' + queue.rationale + '</p>' +
    '<p>' + session.total + ' parole</p>' +
    '<div class="review-session-actions">' +
    '<button type="button" data-review-start>Inizia ripasso</button>' +
    '<button type="button" data-review-start-typing>Vai al test scritto</button>' +
    '<button type="button" data-review-start-speaking>Vai al test parlato</button>' +
    '</div>' +
    '</div>';
}

export function renderSessionReviewCard(word) {
  var body = document.querySelector('[data-review-session-body]');
  if (!body || !word) return;

  body.innerHTML = '<div class="review-word-card">' +
    '<div class="review-word-meta">' + (word.pos || '') + (word.cefr ? ' \u2022 ' + word.cefr : '') + '</div>' +
    '<h2>' + word.lemma + '</h2>' +
    '<p>' + (word.translation_primary || '') + '</p>' +
    '<div class="review-session-actions">' +
    '<button type="button" data-grade="again">Rivedi dopo</button>' +
    '<button type="button" data-grade="hard">Difficile</button>' +
    '<button type="button" data-grade="good">Bene</button>' +
    '<button type="button" data-grade="easy">Perfetta</button>' +
    '</div>' +
    '</div>';
}

export function renderSessionTypingTest(word) {
  var body = document.querySelector('[data-review-session-body]');
  if (!body || !word) return;

  var prompt = buildTranslationPrompt(word);
  body.innerHTML = '<div class="review-prompt-card">' +
    '<div class="review-word-meta">Test scritto</div>' +
    '<h2>' + prompt.prompt + '</h2>' +
    '<input type="text" id="reviewTypingAnswer" placeholder="Scrivi la parola" />' +
    '<div class="review-session-actions">' +
    '<button type="button" data-submit-typing>Invia</button>' +
    '</div>' +
    '</div>';
}

export function renderSessionSpeakingTest(word) {
  var body = document.querySelector('[data-review-session-body]');
  if (!body || !word) return;

  var prompt = buildClozePrompt(word);
  body.innerHTML = '<div class="review-prompt-card">' +
    '<div class="review-word-meta">Test parlato</div>' +
    '<h2>' + prompt.prompt + '</h2>' +
    '<div class="review-session-actions">' +
    '<button type="button" data-start-speaking>Parla ora</button>' +
    '</div>' +
    '<div id="reviewSpeechResult"></div>' +
    '</div>';
}

export function renderSessionResults() {
  var body = document.querySelector('[data-review-session-body]');
  var state = getReviewState();
  var session = state.reviewSession;
  if (!body || !session) return;

  body.innerHTML = '<div class="review-session-results">' +
    '<h2>Sessione completata</h2>' +
    '<p>Completate: ' + session.completedWordIds.length + '</p>' +
    '<p>Da riprendere: ' + session.failedWordIds.length + '</p>' +
    '<p>Incerte: ' + session.shakyWordIds.length + '</p>' +
    '<p>Padroneggiate: ' + session.masteredWordIds.length + '</p>' +
    '<div class="review-session-actions">' +
    '<button type="button" data-session-finish>Chiudi sessione</button>' +
    '</div>' +
    '</div>';
}

export function bindSessionEvents() {
  var mount = document.getElementById('reviewSessionMount');
  if (!mount) return;

  mount.onclick = async function (event) {
    var closeBtn = event.target.closest('[data-review-close]');
    if (closeBtn) {
      await closeReviewSession('abandoned');
      return;
    }

    var startBtn = event.target.closest('[data-review-start]');
    if (startBtn) {
      transitionSessionState('review_item');
      renderCurrentSessionItem();
      return;
    }

    var startTyping = event.target.closest('[data-review-start-typing]');
    if (startTyping) {
      switchSessionMode('test_typing');
      return;
    }

    var startSpeaking = event.target.closest('[data-review-start-speaking]');
    if (startSpeaking) {
      switchSessionMode('test_speaking');
      return;
    }

    var gradeBtn = event.target.closest('[data-grade]');
    if (gradeBtn) {
      await submitCurrentSessionGrade(gradeBtn.getAttribute('data-grade'));
      return;
    }

    var speakBtn = event.target.closest('[data-start-speaking]');
    if (speakBtn) {
      var session = getReviewState().reviewSession;
      var word = session ? getWordById(session.wordIds[session.currentIndex]) : null;
      if (word) {
        try {
          var result = await startSpeechCapture();
          var score = scoreSpeechAnswer(result.transcript, word, result.confidence);
          var resultEl = document.getElementById('reviewSpeechResult');
          if (resultEl) {
            resultEl.innerHTML = '<p>Trascrizione: ' + result.transcript + '</p>' +
              '<p>' + (score.isCorrect ? 'Corretto!' : 'Da rivedere') + '</p>';
          }
          await submitCurrentSessionGrade(score.isCorrect ? 'good' : 'again');
        } catch (e) {
          console.warn('Speech capture failed:', e);
        }
      }
      return;
    }

    var submitTypingBtn = event.target.closest('[data-submit-typing]');
    if (submitTypingBtn) {
      var session = getReviewState().reviewSession;
      var word = session ? getWordById(session.wordIds[session.currentIndex]) : null;
      var input = document.getElementById('reviewTypingAnswer');
      if (!word || !input) return;
      var result = scoreTypingAnswer(input.value, word);
      await submitCurrentSessionGrade(result.isCorrect ? 'good' : 'again');
      return;
    }

    var finishBtn = event.target.closest('[data-session-finish]');
    if (finishBtn) {
      await closeReviewSession('completed');
    }
  };
}

export function transitionSessionState(nextState) {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session) return;

  assertValidTransition(session.flowState, nextState);
  setReviewSession(Object.assign({}, session, { flowState: nextState }));
}

export function assertValidTransition(currentState, nextState) {
  if (ALLOWED_STATES.indexOf(nextState) < 0) {
    throw new Error('Stato review non valido: ' + nextState);
  }
  return true;
}

function renderCurrentSessionItem() {
  var state = getReviewState();
  var session = state.reviewSession;
  if (!session) return;

  var progress = document.querySelector('[data-review-progress]');
  if (progress) {
    progress.textContent = (session.currentIndex + 1) + ' / ' + session.total;
  }

  var wordId = session.wordIds[session.currentIndex];
  var word = getWordById(wordId);
  if (!word) return;

  if (session.mode === 'review') renderSessionReviewCard(word);
  if (session.mode === 'test_typing') renderSessionTypingTest(word);
  if (session.mode === 'test_speaking') renderSessionSpeakingTest(word);
}
