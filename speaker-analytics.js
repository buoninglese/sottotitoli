(function (global) {
  'use strict';

  function countWords(text) {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function analyzeSegments(segments) {
    const bySpeaker = {};
    let totalDuration = 0;
    let interruptions = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const speaker = seg.speaker || 'Unknown';
      const start = Number(seg.start || 0);
      const end = Number(seg.end || 0);
      const duration = Math.max(0, end - start);
      const words = countWords(seg.text);

      totalDuration += duration;

      if (!bySpeaker[speaker]) {
        bySpeaker[speaker] = {
          speaker,
          turns: 0,
          duration: 0,
          words: 0
        };
      }

      bySpeaker[speaker].turns += 1;
      bySpeaker[speaker].duration += duration;
      bySpeaker[speaker].words += words;

      if (i > 0) {
        const prev = segments[i - 1];
        const prevEnd = Number(prev.end || 0);
        const gap = start - prevEnd;
        if (prev.speaker !== speaker && gap < 0.35) {
          interruptions += 1;
        }
      }
    }

    const speakers = Object.values(bySpeaker)
      .map(item => ({
        ...item,
        avgTurnDuration: item.turns ? item.duration / item.turns : 0,
        shareOfTime: totalDuration ? item.duration / totalDuration : 0
      }))
      .sort((a, b) => b.duration - a.duration);

    return {
      totalDuration,
      interruptions,
      speakers
    };
  }

  global.SottotitoliSpeakerAnalytics = {
    analyzeSegments
  };
})(window);