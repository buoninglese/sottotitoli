(function (w) {
  'use strict';

  function splitSentences(text) {
    return (text || '')
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function uniqueWords(text) {
    return new Set(
      (text || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean)
    );
  }

  async function generateLessonReport(lines) {
    const entries = Array.isArray(lines) ? lines : [];
    const fullText = entries.map(x => x.text || '').join(' ').trim();

    if (!fullText) {
      return {
        title: 'Lesson Report',
        summary: 'No usable transcript was captured in this session.',
        metrics: {
          lines: 0,
          words: 0,
          uniqueWords: 0,
          sentenceUnits: 0
        },
        observations: [
          'Start a live lesson and capture more spoken language before generating a report.'
        ],
        grammarFocus: [],
        vocabularyFocus: [],
        nextSteps: []
      };
    }

    const sentences = splitSentences(fullText);
    const words = fullText.split(/\s+/).filter(Boolean);
    const uniques = uniqueWords(fullText);

    const avgSentenceLength = sentences.length
      ? Math.round(words.length / sentences.length)
      : words.length;

    const observations = [];
    if (avgSentenceLength >= 12) {
      observations.push('The learner produced some longer stretches of connected language.');
    } else {
      observations.push('The learner relied more on shorter stretches of language.');
    }

    if (uniques.size > 80) {
      observations.push('The session showed relatively broad lexical variety for a short speaking sample.');
    } else {
      observations.push('Vocabulary use was more repetitive, suggesting room for expansion and variation.');
    }

    const report = {
      title: 'Lesson Report',
      summary: 'A first local lesson report based on the captured transcript. This version is rule-based and designed as a foundation for later AI analysis.',
      metrics: {
        lines: entries.length,
        words: words.length,
        uniqueWords: uniques.size,
        sentenceUnits: sentences.length
      },
      observations,
      grammarFocus: [
        'Review tense consistency in spontaneous speech.',
        'Check sentence expansion through connectors and subordinate clauses.',
        'Track article, preposition, and agreement patterns in the transcript.'
      ],
      vocabularyFocus: [
        'Identify repeated high-frequency words and propose stronger alternatives.',
        'Highlight useful expressions that emerged naturally in the lesson.',
        'Encourage wider use of connectors such as however, because, although, and then.'
      ],
      nextSteps: [
        'Reuse transcript extracts for correction and reformulation work.',
        'Turn 5–10 transcript lines into targeted speaking prompts.',
        'Add AI scoring and CEFR-style commentary in the next development phase.'
      ]
    };

    return report;
  }

  function formatLessonReport(report) {
    if (!report) return 'No report available.';

    return [
      report.title || 'Lesson Report',
      '',
      report.summary || '',
      '',
      'Metrics',
      `- Lines: ${report.metrics?.lines ?? 0}`,
      `- Words: ${report.metrics?.words ?? 0}`,
      `- Unique words: ${report.metrics?.uniqueWords ?? 0}`,
      `- Sentence units: ${report.metrics?.sentenceUnits ?? 0}`,
      '',
      'Observations',
      ...(report.observations || []).map(x => `- ${x}`),
      '',
      'Grammar focus',
      ...(report.grammarFocus || []).map(x => `- ${x}`),
      '',
      'Vocabulary focus',
      ...(report.vocabularyFocus || []).map(x => `- ${x}`),
      '',
      'Next steps',
      ...(report.nextSteps || []).map(x => `- ${x}`)
    ].join('\n');
  }

  w.SottotitoliLessonReport = {
    generateLessonReport,
    formatLessonReport
  };
})(window);