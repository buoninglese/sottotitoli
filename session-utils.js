(function (w) {
  'use strict';

  function randomRoom() {
    return Math.random().toString(36).slice(2, 10);
  }

  function countWords(text) {
    const clean = (text || '').trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }

  function formatTimestamp(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  }

  function transcriptToPlainText(lines) {
    return (lines || []).map(item => {
      const ts = item.timestamp ? `[${item.timestamp}] ` : '';
      const translated = item.translated ? `\n→ ${item.translated}` : '';
      return `${ts}${item.text}${translated}`;
    }).join('\n\n');
  }

  w.SottotitoliSessionUtils = {
    randomRoom,
    countWords,
    downloadText,
    copyToClipboard,
    formatTimestamp,
    transcriptToPlainText
  };
})(window);