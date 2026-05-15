(function (w) {
  'use strict';

  async function generateLessonReport(finalTranscript) {
    const cleanText = (finalTranscript || '').trim();
    if (!cleanText) {
      return {
        summary: "No lesson transcript available.",
        grammar: [],
        vocabulary: [],
        notes: []
      };
    }

    const sentences = cleanText
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    const longSentences = sentences.filter(s => s.split(/\s+/).length > 12).length;
    const shortSentences = sentences.filter(s => s.split(/\s+/).length < 5).length;

    return {
      summary: `The lesson transcript contains ${sentences.length} sentence-like units. The learner showed ${longSentences > shortSentences ? 'some ability to produce longer stretches of language' : 'a tendency toward shorter utterances'}.`,
      grammar: [
        "Check tense consistency in spontaneous production.",
        "Review sentence expansion and clause linking.",
        "Look for recurring article, preposition, or agreement errors."
      ],
      vocabulary: [
        "Identify repeated high-frequency words and suggest richer alternatives.",
        "Highlight useful topic vocabulary from the lesson.",
        "Encourage wider use of connectors and discourse markers."
      ],
      notes: [
        "This is a lightweight local report scaffold.",
        "A richer AI report can be added in the next phase."
      ]
    };
  }

  w.SottotitoliLessonReport = {
    generateLessonReport
  };
})(window);