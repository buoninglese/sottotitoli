/* lazy-libs.js — fetch heavy third-party parsers only when a feature needs them.
 *
 * pdf.js, mammoth and html2canvas were three <script defer> tags in panoramica's
 * <head>, so every visit downloaded ~1.2 MB from cdnjs whether or not the user
 * ever imported a PDF, imported a .docx, or exported the wrapped summary. They
 * are now requested on first use.
 *
 * Deferred scripts still had to be fetched before load fired, so they also sat
 * in the critical path of an ordinary page view for no benefit.
 *
 * Usage: ensureLib('pdf').then(function(){ ... use pdfjsLib ... });
 *        The promise resolves with the library's global, and rejects if the
 *        download fails, so callers can show an error instead of throwing a
 *        ReferenceError.
 *
 * Integrity: the SHA-384 pins are the ones the original tags carried; they are
 * re-applied here so moving the tags did not silently drop subresource
 * integrity. cdnjs serves these origins with CORS, which integrity requires,
 * hence crossOrigin='anonymous'.
 *
 * Note on the pdf.js worker: panoramica's CSP sets worker-src 'self' blob:, so a
 * worker hosted on cdnjs is not permitted. That was already true while the tag
 * lived in the page, so pdf.js has been running its main-thread fallback all
 * along; workerSrc is deliberately left untouched here to avoid trading a
 * working fallback for a CSP violation.
 */
(function () {
  'use strict';

  var LIBS = {
    pdf: {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      integrity: 'sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e',
      globalName: 'pdfjsLib'
    },
    mammoth: {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
      integrity: 'sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz',
      globalName: 'mammoth'
    },
    html2canvas: {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      integrity: '',
      globalName: 'html2canvas'
    },
    /* Only the panoramica word-expansion flows use nlp() (tagWordPenn). The
       captioner keeps its own eager <script> in caption-s8t.html on purpose:
       there it tags words live, and waiting for a download mid-conversation
       would silently drop it to the suffix heuristics. */
    compromise: {
      /* The bare @version URL 301s to /builds/compromise.js, which cost an extra
         round trip on first use; this is the resolved path unpkg redirects to.
         Versioned unpkg paths are immutable, so pinning the deeper URL is safe. */
      url: 'https://unpkg.com/compromise@14.14.2/builds/compromise.js',
      integrity: '',
      globalName: 'nlp'
    }
  };

  /* One in-flight promise per library: two clicks on "importa" must not inject
     the same script twice, and the second caller must not resolve before the
     library exists. */
  var pending = {};

  function ensureLib(key) {
    var spec = LIBS[key];
    if (!spec) return Promise.reject(new Error('ensureLib: unknown library "' + key + '"'));

    if (window[spec.globalName]) return Promise.resolve(window[spec.globalName]);
    if (pending[key]) return pending[key];

    pending[key] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = spec.url;
      s.async = true;
      if (spec.integrity) {
        s.integrity = spec.integrity;
        s.crossOrigin = 'anonymous';
      }
      s.onload = function () {
        /* A 200 that is not the library (a captive-portal page, a proxy error
           page) fires load without defining the global. Treat that as failure
           rather than letting the caller hit an undefined reference. */
        if (window[spec.globalName]) {
          resolve(window[spec.globalName]);
        } else {
          pending[key] = null;
          reject(new Error('ensureLib: ' + spec.globalName + ' missing after load'));
        }
      };
      s.onerror = function () {
        /* Clear the cache so a retry is possible after a transient failure. */
        pending[key] = null;
        reject(new Error('ensureLib: failed to load ' + spec.url));
      };
      document.head.appendChild(s);
    });

    return pending[key];
  }

  window.ensureLib = ensureLib;
})();
