(function (global) {
  'use strict';

  function pickMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    for (const type of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  function extensionFromMimeType(mimeType) {
    if (!mimeType) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'webm';
  }

  function createAudioRecorder() {
    let mediaRecorder = null;
    let stream = null;
    let chunks = [];
    let startedAt = null;
    let mimeType = '';

    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mimeType = pickMimeType();

      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      startedAt = Date.now();

      mediaRecorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.start(1000);
    }

    async function stop() {
      if (!mediaRecorder) return null;

      return new Promise((resolve) => {
        mediaRecorder.onstop = function () {
          const finalMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
          const ext = extensionFromMimeType(finalMimeType);
          const blob = new Blob(chunks, { type: finalMimeType });
          const file = new File([blob], `session-${Date.now()}.${ext}`, { type: finalMimeType });

          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }

          const result = {
            blob,
            file,
            mimeType: finalMimeType,
            durationMs: startedAt ? Date.now() - startedAt : 0,
            objectUrl: URL.createObjectURL(blob)
          };

          mediaRecorder = null;
          stream = null;
          chunks = [];
          startedAt = null;
          mimeType = '';

          resolve(result);
        };

        mediaRecorder.stop();
      });
    }

    function isRecording() {
      return !!mediaRecorder && mediaRecorder.state === 'recording';
    }

    return {
      start,
      stop,
      isRecording
    };
  }

  global.SottotitoliAudioRecorder = {
    createAudioRecorder
  };
})(window);