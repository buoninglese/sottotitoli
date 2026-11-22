/* extracted verbatim from caption-s8t.html so it can be loaded
   with defer: a classic external script keeps every top-level
   declaration global, so the inline onclick handlers still resolve,
   and document order is preserved. */

(function(){
  // ── State ──
  var v20q = { mode:'view', style:'cap1', tranStyle:'s1', words:[], sentences:[], timestamps:[], sIdx:0, bookmarks:[], translateOn:false };
  window.v20q = v20q; // expose for external mode checks

  // ── Helpers ──
  function v20q_fmtTime(sec){ var m=Math.floor(sec/60); var s=sec%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }
  function v20q_extractWords(s){ var w=s.match(/<span[^>]*>.*?<\/span>|\S+/g)||[]; return w.map(function(x){return x.replace(/<[^>]*>/g,'')}); }
  function v20q_makeWordHtml(words){
    // View POS mode: render each word as a POS-colored bubble (English only — Penn Treebank)
    var isEnglish = (currentCaptionLang || 'en-US').split('-')[0] === 'en';
    if (v20q.mode === 'pos' && isEnglish) {
      var colorMap = {NOUN:'#60a5fa',VERB:'#34d399',ADJ:'#f472b6',ADV:'#c084fc',PREP:'#fbbf24',CONJ:'#fb923c',PRON:'#38bdf8',AUX:'#a78bfa',DET:'#6b7280',OTHER:'#6b7280'};
      return words.map(function(w){
        var clean = w.replace(/[^a-zA-Z'-]/g, '');
        var pos = 'OTHER';
        if (clean.length >= 2 && typeof tagWord === 'function') {
          pos = tagWord(clean);
          if (pos === 'FUNC' || pos === 'WORD') pos = 'OTHER';
        }
        var color = colorMap[pos] || '#6b7280';
        return '<span class="v20q-w v20q-pos-bubble" data-pos="'+pos+'" style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:13px;font-weight:600;background:'+color+'20;color:'+color+';border:1px solid '+color+'30;margin:1px;vertical-align:middle">'+w+'<span style="opacity:.5;font-size:8px;font-weight:500">'+pos+'</span></span>';
      }).join('');
    }
    // Default: plain word spans
    return words.map(function(w){return '<span class="v20q-w">'+w+'</span>'}).join(' ');
  }

  // ── Top bar: Caption vs Translation mode ──
  window.v20q_setTopMode = function(topMode, skipConfirm){
    var isTranslate = (typeof v20q !== 'undefined' && v20q.translateOn) || (window.location.search.indexOf('mode=translate') !== -1);
    if (topMode === 'caption' && !isTranslate) return;
    if (topMode === 'translate' && isTranslate) return;

    // Check for saved defaults — skip confirm if user has prefs set
    var hasDefaults = false;
    try {
      var sd = JSON.parse(localStorage.getItem('sottotitoli-settings') || '{}');
      if (topMode === 'caption' && sd.default_caption_lang) hasDefaults = true;
      if (topMode === 'translate' && sd.default_translation_pair) hasDefaults = true;
    } catch(e) {}

    if (!skipConfirm && !hasDefaults) {
      var lang = localStorage.getItem('sottotitoli-lang') || 'en';
      var modeName = topMode === 'caption' ? (lang==='it'?'Sottotitoli':'Caption') : (lang==='it'?'Traduzione':'Translation');
      var title = lang === 'it' ? 'Cambiare modalità' : 'Switch Mode';
      var msg = lang === 'it'
        ? 'Passare a modalità '+modeName+'? Lascerai questa stanza. La trascrizione non salvata andrà persa.'
        : 'Switch to '+modeName+' mode? You will leave this room. Unsaved transcript will be lost.';
      var btn = lang === 'it' ? 'Passa a '+modeName : 'Switch to '+modeName;
      showConfirmModal(title, msg, btn, function() {
        _doTopModeSwitch(topMode);
      });
      return;
    }
    _doTopModeSwitch(topMode);
  };
  function _doTopModeSwitch(topMode) {
    // Read saved settings defaults
    var sd = {};
    try { sd = JSON.parse(localStorage.getItem('sottotitoli-settings') || '{}'); } catch(e) {}

    if (topMode === 'caption') {
      var src = sd.default_caption_lang || localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
      window.location.href = window.location.pathname + '?lang=' + src;
      return;
    }
    if (topMode === 'translate') {
      var urlParams = new URLSearchParams(window.location.search);
      var explicitSrc = urlParams.get('src');
      var pair = sd.default_translation_pair || '';
      var src2, tgt;

      if (pair && pair !== 'custom') {
        // Use saved default pair (e.g. 'en-it' → src=en, tgt=it)
        var parts = pair.split('-');
        var codeMap = { en:'en-US', it:'it-IT', nl:'nl-NL', fr:'fr-FR', de:'de-DE', es:'es-ES', pl:'pl-PL', pt:'pt-PT' };
        src2 = codeMap[parts[0]] || 'en-US';
        tgt = parts[1] || 'it';
      } else if (pair === 'custom') {
        // Custom: use explicit src from URL or native lang, tgt from saved or localStorage
        var nativeCode = localStorage.getItem('sottotitoli-native-lang');
        var captionLang = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
        src2 = captionLang;
        if (explicitSrc) {
          var codeMap = { en:'en-US', it:'it-IT', nl:'nl-NL', fr:'fr-FR', de:'de-DE', es:'es-ES', pl:'pl-PL', pt:'pt-PT' };
          src2 = codeMap[explicitSrc] || captionLang;
        } else if (nativeCode) {
          var codeMap = { en:'en-US', it:'it-IT', nl:'nl-NL', fr:'fr-FR', de:'de-DE', es:'es-ES', pl:'pl-PL', pt:'pt-PT' };
          src2 = codeMap[nativeCode] || captionLang;
        }
        tgt = sd.default_translation_tgt || localStorage.getItem('sottotitoli-translate-target') || 'it';
      } else {
        // No default set — fallback to old behavior
        var nativeCode = localStorage.getItem('sottotitoli-native-lang');
        var captionLang = localStorage.getItem('sottotitoli-caption-lang') || 'en-US';
        src2 = captionLang;
        if (explicitSrc) {
          var codeMap = { en:'en-US', it:'it-IT', nl:'nl-NL', fr:'fr-FR', de:'de-DE', es:'es-ES', pl:'pl-PL', pt:'pt-PT' };
          src2 = codeMap[explicitSrc] || captionLang;
        } else if (nativeCode) {
          var codeMap = { en:'en-US', it:'it-IT', nl:'nl-NL', fr:'fr-FR', de:'de-DE', es:'es-ES', pl:'pl-PL', pt:'pt-PT' };
          src2 = codeMap[nativeCode] || captionLang;
        }
        tgt = localStorage.getItem('sottotitoli-translate-target') || 'it';
      }
      window.location.href = window.location.pathname + '?lang=' + src2 + '&mode=translate&tgt=' + tgt;
      return;
    }
  };

  // ── Left bar: Edit / Word Save / View POS (mutually exclusive) ──
  window.v20q_setMode = function(mode){
    var prevMode = v20q.mode;
    v20q.mode = mode;
    var c = document.getElementById('captionTranscript'); if(c) c.setAttribute('data-mode', mode);
    var btns = document.querySelectorAll('#leftModeBar .mode-icon-btn');
    btns.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-mode') === mode); });
    // Re-render if switching to/from POS mode (bubble layout changes)
    if (mode === 'pos' || prevMode === 'pos') {
      if (typeof v20q_rerender === 'function') v20q_rerender();
    }
  };
  // ── Init: auto-enable translate mode if ?mode=translate in URL ──
  // (fallback — the URL params handler at the top of the script also handles this)
  if (window.location.search.indexOf('mode=translate') !== -1) {
    setTimeout(function(){ applyTranslateModeUI(); }, 350);
  } else {
    setTimeout(function(){ applyCaptionModeUI(); }, 200);
  }

  // ── Translation cache — avoids re-fetching unchanged sentences ──
  var _tranCache = {}; // key: "srcLang→tgtLang::text" → translatedText

  // ── Render translations for all lines ──
  // v20q.tranStyle: 's1' = Style 1 side-by-side (V5 Bold Gradient), 's2' = Style 2 card/dashboard (S2-V5)
  function v20q_renderTranslations(){
    var target = localStorage.getItem('sottotitoli-translate-target') || 'it';
    var srcLang = (window._currentCaptionLang || 'en-US').split('-')[0];
    var container = document.getElementById('v20qContent') || document.getElementById('captionTranscript');
    if (!container) return;
    var tranStyle = (typeof v20q !== 'undefined' && v20q.tranStyle) || 's1';
    
    // Style 2 needs the card-wrapper class on container
    if (tranStyle === 's2') {
      if (container.classList.contains('v20q-s1')) container.classList.remove('v20q-s1');
      if (!container.classList.contains('v20q-s2')) container.classList.add('v20q-s2');
    } else {
      if (container.classList.contains('v20q-s2')) container.classList.remove('v20q-s2');
      if (!container.classList.contains('v20q-s1')) container.classList.add('v20q-s1');
    }
    
    var lines = container.querySelectorAll('.v20q-line');
    lines.forEach(function(line){
      if (line.querySelector('.v20q-tran-box')) return;
      
      // Extract time from the line's time element (present in all caption styles)
      var timeEl = line.querySelector('.v20q-time');
      var time = timeEl ? timeEl.textContent.trim() : '';
      
      // Extract source text from the text element (not textContent which includes meta)
      var textEl = line.querySelector('.v20q-text');
      var text = textEl ? textEl.textContent.trim() : '';
      // Fallback: if no .v20q-text, try stripping timestamp from raw textContent (for .line divs)
      if (!text || text.length < 3) {
        text = (line.textContent || '').replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/,'').replace(/[★🗑⭐]/g,'').trim();
      }
      if (!text || text.length < 3) return;
      
      // ── Style 1: Side-by-side (V5 Bold Gradient) ──
      if (tranStyle === 's1') {
        // Wrap all existing children as the left panel
        var origWrap = document.createElement('div');
        origWrap.className = 'v20q-tran-orig';
        while (line.firstChild) { origWrap.appendChild(line.firstChild); }
        
        // Style the line as a flex pair
        line.style.cssText = 'display:flex;gap:0;align-items:stretch;border-radius:16px;overflow:hidden;padding:0;background:linear-gradient(135deg,rgba(6,182,212,.06),rgba(168,85,247,.04));border:1px solid rgba(6,182,212,.15)';
        line.appendChild(origWrap);
        
        // Translation box (right side)
        var box = document.createElement('div');
        box.className = 'v20q-tran-box';
        box.setAttribute('lang', target);   // the translation is the target language
        box.innerHTML = '<div class="v20q-tran-time">'+time+'</div><div class="v20q-tran-text v20q-tran-loading"><i class="fa-solid fa-spinner"></i> Translating…</div>';
        line.appendChild(box);
      }
      // ── Style 2: Card / Dashboard (S2-V5) ──
      else {
        line.classList.add('v20q-card');
        // Wrap existing source line content in a row
        var srcRow = document.createElement('div');
        srcRow.className = 'v20q-card-src';
        while (line.firstChild) { srcRow.appendChild(line.firstChild); }
        line.appendChild(srcRow);
        // Divider
        var div = document.createElement('div');
        div.className = 'v20q-card-div';
        line.appendChild(div);
        // Translation row
        var box = document.createElement('div');
        box.className = 'v20q-tran-box v20q-card-tran';
        box.setAttribute('lang', target);   // the translation is the target language
        box.innerHTML = '<div class="v20q-tran-text v20q-tran-loading"><i class="fa-solid fa-spinner"></i> Translating…</div>';
        line.appendChild(box);
      }
      
      // ── Trigger translation API (with cache) ──
      var T = window.SottotitoliTranslationProviders;
      var cacheKey = srcLang + '→' + target + '::' + text;
      if (_tranCache[cacheKey]) {
        v20q_writeTranText(box.querySelector('.v20q-tran-text'), _tranCache[cacheKey]);
      } else if (T && srcLang !== target) {
        T.translateText({ provider: 'auto' }, text, srcLang, target).then(function(r){
          v20q_writeTranText(box.querySelector('.v20q-tran-text'), r.translatedText);
          _tranCache[cacheKey] = r.translatedText;
        }).catch(function(){
          v20q_writeTranText(box.querySelector('.v20q-tran-text'), text + ' ⚠');
        });
      } else {
        v20q_writeTranText(box.querySelector('.v20q-tran-text'), text);
      }
    });
  }
  // ── Retranslate a single line (called after editing) ──
  window.v20q_retranslateLine = function(idx) {
    var container = document.getElementById('v20qContent');
    if (!container) return;
    var lines = container.querySelectorAll('.v20q-line');
    var line = lines[idx];
    if (!line) return;
    
    var target = localStorage.getItem('sottotitoli-translate-target') || 'it';
    var srcLang = (window._currentCaptionLang || 'en-US').split('-')[0];
    var textEl = line.querySelector('.v20q-text');
    var text = textEl ? textEl.textContent.trim() : '';
    if (!text || text.length < 3) return;
    
    // Remove old translation box
    var tranBox = line.querySelector('.v20q-tran-box');
    if (tranBox) { tranBox.innerHTML = '<div class="v20q-tran-text v20q-tran-loading"><i class="fa-solid fa-spinner"></i> Translating…</div>'; }
    
    // Clear cache for this text so it re-fetches
    var cacheKey = srcLang + '→' + target + '::' + text;
    delete _tranCache[cacheKey];
    
    var T = window.SottotitoliTranslationProviders;
    if (T && srcLang !== target) {
      T.translateText({ provider: 'auto' }, text, srcLang, target).then(function(r){
        if (tranBox) {
          v20q_writeTranText(tranBox.querySelector('.v20q-tran-text'), r.translatedText);
        }
        _tranCache[cacheKey] = r.translatedText;
      });
    }
  };

  // ── Toggle: Translation Style ──
  window.v20q_setTranStyle = function(style){
    if (typeof v20q === 'undefined') return;
    v20q.tranStyle = style;
    // Update container class
    var vc = document.getElementById('v20qContent');
    if (vc) {
      vc.classList.remove('v20q-s1', 'v20q-s2');
      vc.classList.add('v20q-' + style);
    }
    v20q_rerender();
  };
  // ── Toggle: Style ──
  window.v20q_setStyle = function(style){
    v20q.style = style;
    // Apply style class to content container (preserve tran style class)
    var vc = document.getElementById('v20qContent');
    if (vc) { vc.className = 'v20q-content v20q-'+style + ' v20q-' + (v20q.tranStyle || 's1'); }
    /* The palette button is a blind cycle: nothing on screen says which of the two
     * styles is showing. Name it, and announce the change. */
    var cycle = document.getElementById('styleCycleBtn');
    if (cycle) {
      var ledger = style === 'cap5';
      var current = ledger ? 'Ledger' : 'Broadcast';
      var other = ledger ? 'Broadcast' : 'Ledger';
      cycle.setAttribute('aria-label', 'Caption style: ' + current + '. Switch to ' + other);
      cycle.title = 'Caption style: ' + current + ' → ' + other;
    }
    var status = document.getElementById('v20qStyleStatus');
    if (status) status.textContent = 'Caption style: ' + (style === 'cap5' ? 'Ledger' : style === 'cap1' ? 'Broadcast' : style);
    v20q_rerender();
  };

  // ── Word click ──
  window.v20q_handleWord = function(e){
    if (e.target.closest('input')) return; // clicked on existing input — don't re-edit
    if (e.target.closest('.v20q-act')) return; // clicked on action buttons — ignore
    // Bookmark mode: clicking a line toggles bookmark
    if (v20q.mode === 'bookmark') {
      var line = e.target.closest('.v20q-line');
      if (!line) return;
      e.stopPropagation();
      var allLines = document.querySelectorAll('#v20qContent .v20q-line');
      var idx = Array.prototype.indexOf.call(allLines, line);
      if (idx >= 0) { v20q_toggleBookmark(idx); }
      return;
    }
    var span = e.target.closest('.v20q-w'); if (!span) return;
    e.stopPropagation();
    if (v20q.mode === 'edit') {
      if (span.querySelector('input')) return; // already editing
      var orig = span.textContent;
      var inp = document.createElement('input');
      inp.value = orig;
      inp.style.cssText = 'width:'+(orig.length+2)+'ch;background:var(--card);border:1px solid var(--accent);border-radius:3px;color:var(--text);font:inherit;font-size:13px;padding:1px 3px;outline:none';
      span.textContent = ''; span.appendChild(inp); inp.focus(); inp.select();
      inp.onblur = function(){
        span.textContent = inp.value || orig;
        inp.remove();
        var changed = (inp.value !== orig);
        if (changed) {
          span.classList.add('edited');
          // ── Propagate edit to original .line div and refresh all transcript boxes ──
          var v20Line = span.closest('.v20q-line');
          if (v20Line) {
            var allV20 = v20Line.parentNode.querySelectorAll('.v20q-line');
            var idx = Array.prototype.indexOf.call(allV20, v20Line);
            var origLines = document.querySelectorAll('#captionTranscript .line');
            if (idx >= 0 && idx < origLines.length) {
              var origLine = origLines[idx];
              var textEl = v20Line.querySelector('.v20q-text');
              if (textEl) {
                var fullText = textEl.textContent.trim();
                // Preserve timestamp span, replace text nodes after it
                var tsSpan = origLine.querySelector('span');
                if (tsSpan) {
                  // Remove all nodes after the timestamp span
                  while (origLine.lastChild && origLine.lastChild !== tsSpan) {
                    origLine.removeChild(origLine.lastChild);
                  }
                  origLine.appendChild(document.createTextNode(fullText));
                } else {
                  origLine.textContent = fullText;
                }
                origLine.setAttribute('data-raw', fullText);
              }
            }
          }
          // Refresh all transcript boxes on other slides
          _grammarLastLineCount = 0; // force full rebuild, not just new lines
          if (typeof _updateGrammarLines === 'function') {
            try { _updateGrammarLines(); } catch(e) {}
          }
          // Re-translate this specific line if in translate mode
          if (v20q.translateOn) {
            try { v20q_retranslateLine(idx); } catch(e) {}
          }
          // Re-translate this specific line if in translate mode
          if (v20q.translateOn && typeof v20q_retranslateLine === 'function') {
            try { v20q_retranslateLine(idx); } catch(e) {}
          }
        }
      };
      inp.onkeydown = function(ev){ if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape'){ inp.value = orig; inp.blur(); } };
    } else if (v20q.mode === 'collect') {
      span.classList.toggle('collected');
      var w = span.textContent.trim().toLowerCase();
      // Detect language from parent context
      var isTranWord = !!span.closest('.v20q-tran-box');
      var saveLang = isTranWord
        ? (localStorage.getItem('sottotitoli-translate-target') || 'it').split('-')[0]
        : (currentCaptionLang || 'en-US').split('-')[0];
      if (span.classList.contains('collected')) {
        if (v20q.words.indexOf(w) === -1) v20q.words.push(w);
        if (typeof addToWordBank === 'function') addToWordBank(w, saveLang);
        v20q_toast('<i class="fa-solid fa-check"></i> Added: ' + w + ' (' + saveLang + ')');
      } else {
        v20q.words = v20q.words.filter(function(x){ return x !== w; });
        if (typeof removeFromWordBank === 'function') removeFromWordBank(w);
      }
      v20q_updateBadge();
    } else {
      /* View mode used to fall through here and do nothing at all. */
      v20q_openWordCard(span);
    }
  };

  function v20q_updateBadge(){
    var badge = document.getElementById('v20qBadge');
    var n = v20q.words.length;
    if (badge){ badge.textContent = n ? '📚 '+n : ''; badge.classList.toggle('show', n > 0); }
  }

  function v20q_toast(msg){
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--good,#16a34a);color:#fff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body);display:flex;align-items:center;gap:6px';
    t.innerHTML = msg; document.body.appendChild(t);
    requestAnimationFrame(function(){ t.style.opacity = '1'; });
    setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 1600);
  }

  /* ═══════════ Reading aids ═══════════
   * The transcript is the thing people actually read, and three small things were
   * missing: it scrolled out from under anyone reading back, it never declared what
   * language its words were, and an empty one showed nothing at all. */
  var V20Q_LIVE_EDGE = 90;   // px from the bottom that still counts as "following live"

  function v20q_prefersReducedMotion(){
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  function v20q_scrollMode(){ return v20q_prefersReducedMotion() ? 'auto' : 'smooth'; }

  function v20q_atLiveEdge(){
    var s = v20q_scroller();
    if (!s) return true;
    return (s.scrollHeight - s.scrollTop - s.clientHeight) <= V20Q_LIVE_EDGE;
  }
  /* Whatever actually scrolls right now. The transcript box is the scroller (see the
   * CSS note); #v20qContent is kept as a fallback for older markup. */
  function v20q_scroller(){
    var t = document.getElementById('captionTranscript');
    if (t && t.scrollHeight > t.clientHeight + 2) return t;
    var c = document.getElementById('v20qContent');
    if (c && c.scrollHeight > c.clientHeight + 2) return c;
    return t || c;
  }

  /* Scroll to the live edge. Some engines ignore the animated form — measured here:
   * scrollTo({behavior:'smooth'}) left scrollTop at 0 while behavior:'auto' worked —
   * so the position is confirmed shortly after and forced if the animation never ran.
   * Smoothness where it works, correctness everywhere. */
  function v20q_scrollToLive(el){
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: v20q_scrollMode() });
    setTimeout(function(){
      // Re-resolve: at the first sentence nothing overflows yet, so the element that
      // scrolls now may not be the element that scrolled then.
      var s = v20q_scroller() || el;
      if (s.scrollHeight - s.scrollTop - s.clientHeight > V20Q_LIVE_EDGE) s.scrollTop = s.scrollHeight;
      v20q_syncLivePill();
    }, 520);
  }

  /* The way back down is offered, not taken. Breathing room for anyone who scrolled
   * up to re-read: the next sentence no longer yanks them to the bottom. */
  function v20q_livePill(){
    var host = document.getElementById('transcriptPanel') || document.getElementById('captionTranscript');
    if (!host) return null;
    var btn = host.querySelector('.v20q-live-pill');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v20q-live-pill';
    btn.setAttribute('aria-label', 'Jump to the newest line');
    btn.innerHTML = '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i><span>Live</span>';
    btn.addEventListener('click', function(){
      v20q_scrollToLive(v20q_scroller());
    });
    host.appendChild(btn);
    return btn;
  }
  function v20q_syncLivePill(){
    var btn = v20q_livePill();
    if (!btn) return;
    btn.classList.toggle('show', !v20q_atLiveEdge());
  }
  function v20q_bindTranscriptScroll(){
    ['captionTranscript', 'v20qContent'].forEach(function(id){
      var el = document.getElementById(id);
      if (!el || el.__v20qScroll) return;
      el.__v20qScroll = true;
      el.addEventListener('scroll', function(){ v20q_syncLivePill(); }, { passive: true });
    });
  }
  /* An empty transcript gets its own copy back (the attribute was already in the
   * markup, but nothing rendered it). */
  function v20q_syncEmpty(c){
    var host = document.getElementById('captionTranscript');
    if (!host) return;
    host.classList.toggle('v20q-empty', !(c && c.querySelector('.v20q-line')));
  }

  /* One sentence, announced once. A live region on the transcript itself would read
   * out the Copy / Delete buttons on every line and re-read the whole list on every
   * rebuild; this says only what was just said. */
  function v20q_announce(html){
    var el = document.getElementById('v20qLive');
    if (!el) return;
    var text = String(html == null ? '' : html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) el.textContent = text;
  }

  /* The transcript container is rebuilt by the self-heal path when the legacy .line
   * pipeline starts, so its semantics cannot live in the markup alone — a fresh div
   * would come back with no role, no tabindex and no reading size. */
  function v20q_prepareContainer(c){
    if (!c) return;
    if (!c.getAttribute('role')) c.setAttribute('role', 'region');
    if (!c.getAttribute('aria-label')) c.setAttribute('aria-label', 'Transcript');
    if (!c.hasAttribute('tabindex')) c.setAttribute('tabindex', '0');
    v20q_applySize();
  }

  /* A translation is words too. It used to be written with textContent, so there were
   * no .v20q-w spans inside it and the word card, collect mode and the whole word
   * machinery could not touch the learner's own language — the thing they are most
   * likely to click. */
  function v20q_writeTranText(el, text){
    if (!el) return;
    var safe = String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    el.className = 'v20q-tran-text';
    el.innerHTML = v20q_makeWordHtml(v20q_extractWords(safe));
  }

  // ── Render one sentence ──
  function v20q_render(sentence, idx, skipScroll){
    var container = document.getElementById('v20qContent'); if (!container) return;
    var words = v20q_extractWords(sentence);
    var wordHtml = v20q_makeWordHtml(words);
    var num = idx + 1;
    var time = v20q.timestamps[idx] || v20q_fmtTime(idx * 6);
    var isBm = v20q.bookmarks.indexOf(idx) !== -1;
    var bmCls = isBm ? ' v20q-bm-on' : '';
    var actIcons = '<span class="v20q-act"><button class="v20q-tiktok" title="Share to TikTok" onclick="event.stopPropagation();v20q_shareTikTok('+idx+')"><i class="fa-brands fa-tiktok"></i></button><button class="v20q-copy" title="Copy" onclick="event.stopPropagation();v20q_copySentence('+idx+')"><i class="fa-regular fa-copy"></i></button><button class="v20q-del" title="Delete" onclick="event.stopPropagation();v20q_deleteSentence('+idx+')"><i class="fa-solid fa-trash"></i></button></span>';
    var el = document.createElement('div');
    el.className = 'v20q-line' + (isBm ? ' v20q-bookmarked' : '');
    var style = v20q.style; // cap1..cap5
    if (style === 'cap1') {
      // Minimal: time + text, no number
      el.innerHTML = '<span class="v20q-meta"><span class="v20q-time">'+time+'</span></span><span class="v20q-text">'+wordHtml+'</span>'+actIcons;
    } else if (style === 'cap2') {
      // Newspaper: big serif number
      el.innerHTML = '<span class="v20q-meta"><span class="v20q-num">'+num+'</span></span><span class="v20q-text">'+wordHtml+'</span><span class="v20q-time">'+time+'</span>'+actIcons;
    } else if (style === 'cap3') {
      // Stacked Left: number+time stacked
      el.innerHTML = '<span class="v20q-meta"><span class="v20q-num">'+num.toString().padStart(2,'0')+'</span><span class="v20q-time">'+time+'</span></span><span class="v20q-text">'+wordHtml+'</span>'+actIcons;
    } else {
      // cap5 Dashboard Air: text left, meta right — icons next to #N
      el.innerHTML = '<span class="v20q-text">'+wordHtml+'</span><span class="v20q-meta"><span class="v20q-num-row"><span class="v20q-num">#'+num+'</span>'+actIcons+'</span><span class="v20q-time">'+time+'</span></span>';
    }
    container.appendChild(el);
    v20q_prepareContainer(container);
    /* Declare the language of the words themselves. Without this the page's
     * lang="it" claims an English sentence is Italian, so a screen reader reads it
     * with Italian phonetics — wrong for a language-learning tool. */
    var tEl = el.querySelector('.v20q-text');
    if (tEl) tEl.setAttribute('lang', window._currentCaptionLang || window.currentCaptionLang || 'en-US');

    if (!skipScroll) {
      if (v20q_atLiveEdge()) v20q_scrollToLive(v20q_scroller());
      v20q_announce(sentence);   // skipScroll means a rebuild, not new speech
    }
    v20q_bindTranscriptScroll();
    v20q_syncEmpty(container);
    v20q_syncLivePill();
  }

  // ── Re-render all ──
  function v20q_rerender(){
    var container = document.getElementById('v20qContent'); if (!container) return;
    // The row the card points at is about to be replaced; do not leave it floating.
    if (v20qWordCard) v20q_closeWordCard();
    // Preserve the container class (caption style + tran style)
    var cls = container.className;
    container.innerHTML = '';
    container.className = cls;
    v20q.sentences.forEach(function(s, i){ v20q_render(s, i, true); });
    v20q_applySize();
    /* v20q_render only runs per sentence, so a rebuild to zero lines has to settle the
     * empty state itself — otherwise the panel goes blank with no explanation. */
    v20q_syncEmpty(container);
    v20q_syncLivePill();
    // Re-apply translations if translate mode is on
    if (v20q.translateOn) { setTimeout(function(){ v20q_renderTranslations(); }, 50); }
  }

  // ── Bookmark toggle ──
  window.v20q_toggleBookmark = function(idx){
    var pos = v20q.bookmarks.indexOf(idx);
    if (pos === -1) { v20q.bookmarks.push(idx); }
    else { v20q.bookmarks.splice(pos, 1); }
    // Toggle bookmark class on the specific line without full re-render
    var container = document.getElementById('v20qContent');
    if (container) {
      var lines = container.querySelectorAll('.v20q-line');
      var line = lines[idx];
      if (line) {
        var isBm = v20q.bookmarks.indexOf(idx) !== -1;
        line.classList.toggle('v20q-bookmarked', isBm);
      }
    }
    v20q_updateBookmarkBadge();
    v20q_refreshBookmarkPanel();
  };
  // ── Scroll to sentence + highlight (used by bookmark panel clicks) ──
  window.v20q_scrollToSentence = function(idx){
    v20q_hideBookmarkPanel();
    // Find the v20q-line at this index
    var container = document.getElementById('v20qContent');
    if (!container) return;
    var lines = container.querySelectorAll('.v20q-line');
    var target = lines[idx];
    if (!target) return;
    // Scroll it into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Brief highlight animation
    target.classList.add('v20q-flash');
    setTimeout(function(){ target.classList.remove('v20q-flash'); }, 1200);
  };
  // ── Mark end-of-session favorites in transcript ──
  window.v20q_markFinalFavorites = function(){
    if (!v20q.bookmarks || v20q.bookmarks.length === 0) return;
    var container = document.getElementById('v20qContent');
    if (!container) return;
    var lines = container.querySelectorAll('.v20q-line');
    v20q.bookmarks.forEach(function(idx){
      if (lines[idx]) {
        lines[idx].classList.add('v20q-final-fav');
      }
    });
  };
  // ── Copy sentence to clipboard ──
  // ── TikTok Share ──
  window.v20q_shareTikTok = function(idx){
    var text = v20q.sentences[idx]; if (!text) return;
    var overlay = document.createElement('div');
    overlay.className = 'tiktok-share-overlay';
    overlay.onclick = function(e){ if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="tiktok-share-popup">'+
      '<div class="tiktok-badge"><i class="fa-brands fa-tiktok"></i> Share Kit</div>'+
      '<h3>Post to TikTok</h3>'+
      '<p style="color:var(--muted2);font-size:13px;margin-bottom:4px">Your subtitle moment is ready:</p>'+
      '<div class="tiktok-preview">'+v20q_escapeHtml(text)+'</div>'+
      '<div class="tiktok-actions">'+
        '<button class="btn-copy-post" onclick="v20q_copyToClipboard(\''+v20q_escapeAttr(text)+'\', this)"><i class="fa-regular fa-copy"></i> Copy &amp; Open TikTok</button>'+
        '<button class="btn-close-popup" onclick="this.closest(\'.tiktok-share-overlay\').remove()">Close</button>'+
      '</div>'+
    '</div>';
    document.body.appendChild(overlay);
  };
  // ── Copy to clipboard helper ──
  window.v20q_copyToClipboard = function(text, btn){
    // Open TikTok synchronously — iOS blocks window.open inside async callbacks
    window.open('https://www.tiktok.com/upload?lang=en','_blank');
    var done = function(){
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(function(){ btn.innerHTML = '<i class="fa-brands fa-tiktok"></i> Open TikTok'; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function(){ done(); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch(e) {}
      document.body.removeChild(ta);
      done();
    }
  };
  window.v20q_escapeHtml = function(s){ var d=document.createElement('div');d.textContent=s;return d.innerHTML; };
  window.v20q_escapeAttr = function(s){ return s.replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/\\/g,'\\\\'); };

  window.v20q_copySentence = function(idx){
    var text = v20q.sentences[idx];
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){
        v20q_toast('<i class="fa-regular fa-copy"></i> Copied');
      }).catch(function(){
        _fallbackCopy(text);
      });
    } else {
      _fallbackCopy(text);
    }
    function _fallbackCopy(t){
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); v20q_toast('<i class="fa-regular fa-copy"></i> Copied'); } catch(e) {}
      document.body.removeChild(ta);
    }
  };
  // ── Delete sentence ──
  /* The legacy .line mirror inside #captionTranscript is what every report reads —
   * the CEFR report, the grammar view, the metrics, the word cache. Deleting only from
   * v20q.sentences left a sentence the learner had removed still counting in their own
   * reports, so it has to leave both layers. */
  function v20q_mirrorLines(){ return document.querySelectorAll('#captionTranscript .line'); }
  function v20q_oneLine(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function v20q_dropMirrorLine(idx, text){
    var lines = v20q_mirrorLines();
    var el = lines[idx];
    /* Refuse to cut when the index has drifted: the mirror is the app's source of
     * truth, so a wrong removal is worse than a stale one. */
    if (!el || v20q_oneLine(el.textContent).indexOf(v20q_oneLine(text)) === -1) return null;
    el.parentNode.removeChild(el);
    return el;
  }
  function v20q_restoreMirrorLine(el, idx){
    if (!el) return;
    var ct = document.getElementById('captionTranscript');
    if (!ct) return;
    /* The bootstrap observer treats any added .line as new speech. Re-inserting one
     * would push the sentence into v20q.sentences a second time, so mark it and let
     * the observer skip it. */
    el.setAttribute('data-v20q-mirror-restore', '1');
    var after = v20q_mirrorLines()[idx] || null;
    if (after && after.parentNode === ct) ct.insertBefore(el, after);
    else ct.appendChild(el);
    el.style.display = 'none';   // the mirror stays hidden; v20q draws what you see
  }
  function v20q_reportsStale(){
    if (typeof _grammarLastLineCount !== 'undefined') _grammarLastLineCount = 0;
    if (typeof _updateGrammarLines === 'function') { try { _updateGrammarLines(); } catch (e) {} }
  }

  window.v20q_deleteSentence = function(idx){
    var goneText = v20q.sentences[idx];
    if (goneText === undefined) return;
    var goneTime = v20q.timestamps[idx];
    var bmBefore = v20q.bookmarks.slice();   // indices shift, so undo restores the whole list
    var goneMirror = v20q_dropMirrorLine(idx, goneText);
    v20q.sentences.splice(idx, 1);
    v20q.timestamps.splice(idx, 1);
    // Remove from bookmarks and shift higher indices down
    v20q.bookmarks = v20q.bookmarks.filter(function(b){ return b !== idx; }).map(function(b){ return b > idx ? b - 1 : b; });
    v20q.sIdx = v20q.sentences.length;
    v20q_rerender();
    v20q_reportsStale();
    v20q_updateBookmarkBadge();      // indices shifted
    v20q_refreshBookmarkPanel();
    /* Deleting is one tap on a phone, next to Copy — so it gets a way back. */
    v20q_toastAction('Line deleted', 'Undo', function(){
      v20q.sentences.splice(idx, 0, goneText);
      v20q.timestamps.splice(idx, 0, goneTime || v20q_fmtTime(idx * 6));
      v20q.bookmarks = bmBefore;
      v20q.sIdx = v20q.sentences.length;
      v20q_restoreMirrorLine(goneMirror, idx);
      v20q_rerender();
      v20q_reportsStale();
      v20q_updateBookmarkBadge();
      v20q_refreshBookmarkPanel();
    }, 7000);
  };
  // ── Refresh bookmarks panel content (no toggle) ──
  /* Everything here already existed except the panel itself: v20q_showBookmarks
   * returned early because #v20qBookmarkPanel was never in the DOM, so Save Lines
   * mode marked lines that could never be looked at again. The rows are buttons now
   * (they were divs with onclick, which no keyboard can reach). */
  function v20q_ensureBookmarkPanel(){
    var panel = document.getElementById('v20qBookmarkPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'v20qBookmarkPanel';
    panel.className = 'v20q-bm-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Saved lines');
    panel.style.display = 'none';
    document.body.appendChild(panel);
    return panel;
  }
  function v20q_updateBookmarkBadge(){
    var btn = document.getElementById('bookmarksBtn');
    if (!btn) return;
    var n = v20q.bookmarks.length;
    var badge = btn.querySelector('.v20q-bm-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'v20q-bm-badge';
      btn.appendChild(badge);
    }
    badge.textContent = n ? String(n) : '';
    btn.classList.toggle('has-marks', n > 0);
    btn.setAttribute('aria-label', n ? 'Saved lines (' + n + ')' : 'Saved lines');
    var panel = document.getElementById('v20qBookmarkPanel');
    btn.setAttribute('aria-expanded', (panel && panel.style.display === 'block') ? 'true' : 'false');
  }
  function v20q_placeBookmarkPanel(panel){
    var btn = document.getElementById('bookmarksBtn');
    if (!btn) return;
    var r = btn.getBoundingClientRect();
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var left = Math.min(Math.max(8, r.right - pw), Math.max(8, window.innerWidth - pw - 8));
    var top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(top) + 'px';
  }
  function v20q_bookmarkKeys(e){
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var panel = document.getElementById('v20qBookmarkPanel');
    if (!panel || panel.style.display !== 'block') return;
    e.stopPropagation();
    v20q_hideBookmarkPanel();
  }
  function v20q_hideBookmarkPanel(){
    var panel = document.getElementById('v20qBookmarkPanel');
    if (panel) panel.style.display = 'none';
    document.removeEventListener('keydown', v20q_bookmarkKeys, true);
    v20q_updateBookmarkBadge();
  }
  function v20q_refreshBookmarkPanel(){
    var panel = document.getElementById('v20qBookmarkPanel');
    if (!panel || panel.style.display !== 'block') return;
    var n = v20q.bookmarks.length;
    var html = '<div class="v20q-bm-head"><span>Saved lines' + (n ? ' · ' + n : '') + '</span>' +
      '<button type="button" class="v20q-bm-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div>';
    if (!n) {
      html += '<div class="v20q-bm-empty">Nothing saved yet. Turn on <b>Save Lines</b> and click a line to keep it here.</div>';
    } else {
      html += '<div class="v20q-bm-list">';
      v20q.bookmarks.slice().sort(function(a, b){ return a - b; }).forEach(function(bi){
        var text = v20q_extractWords(v20q.sentences[bi] || '').join(' ');
        var time = v20q.timestamps[bi] || v20q_fmtTime(bi * 6);
        html += '<button type="button" class="v20q-bm-row" data-idx="' + bi + '" title="' + v20q_escHtml(text) + '">' +
          '<i class="fa-solid fa-star" aria-hidden="true"></i>' +
          '<span class="v20q-bm-time">' + v20q_escHtml(time) + '</span>' +
          '<span class="v20q-bm-text">' + v20q_escHtml(text) + '</span></button>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;
    Array.prototype.forEach.call(panel.querySelectorAll('.v20q-bm-row'), function(row){
      row.addEventListener('click', function(){
        v20q_scrollToSentence(parseInt(row.getAttribute('data-idx'), 10));
      });
    });
    var close = panel.querySelector('.v20q-bm-close');
    if (close) close.addEventListener('click', v20q_hideBookmarkPanel);
  }
  // ── Show bookmarks panel ──
  window.v20q_showBookmarks = function(){
    var panel = v20q_ensureBookmarkPanel();
    if (panel.style.display === 'block') { v20q_hideBookmarkPanel(); return; }
    panel.style.display = 'block'; // must be visible before refresh checks it
    v20q_refreshBookmarkPanel();
    v20q_placeBookmarkPanel(panel);
    v20q_updateBookmarkBadge();
    document.addEventListener('keydown', v20q_bookmarkKeys, true);
  };

  // ── V20quint: watch DOM for .line divs added by speech pipeline ──
  // Self-healing: if #v20qContent is destroyed (by innerHTML clear), recreates it.
  // Does NOT wrap toggleSession — leaves the original mic flow untouched.
  function v20q_bootstrap(){
    var ct = document.getElementById('captionTranscript');
    if (!ct) { setTimeout(v20q_bootstrap, 200); return; }
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType !== 1 || !node.classList || !node.classList.contains('line')) return;
          /* Put back by an undo — not new speech. */
          if (node.hasAttribute('data-v20q-mirror-restore')) {
            node.removeAttribute('data-v20q-mirror-restore');
            return;
          }
          // Self-heal: ensure #v20qContent exists
          var vc = document.getElementById('v20qContent');
          if (!vc) {
            vc = document.createElement('div');
            vc.className = 'v20q-content v20q-'+v20q.style + ' v20q-' + (v20q.tranStyle || 's1');
            vc.id = 'v20qContent';
            ct.appendChild(vc);
            v20q_prepareContainer(vc);
            v20q.sentences = []; v20q.timestamps = []; v20q.sIdx = 0;
          }
          // Hide the original .line (keep in DOM for grammar/stats/CEFR)
          node.style.display = 'none';
          // Extract sentence text + timestamp from the .line's inner span
          var text = '';
          var tsText = '';
          var children = node.childNodes;
          for (var i = 0; i < children.length; i++) {
            var c = children[i];
            if (c.nodeType === 3) { text += c.textContent; }
            else if (c.nodeType === 1) {
              var isTs = c.tagName === 'SPAN' && c.style && c.style.fontFamily && c.style.fontFamily.indexOf('mono') !== -1;
              if (isTs) { tsText = c.textContent.trim(); }
              else { text += c.textContent; }
            }
          }
          text = text.trim();
          if (text) {
            v20q.sentences.push(text);
            v20q.timestamps.push(tsText || v20q_fmtTime(v20q.sIdx * 6));
            v20q_render(text, v20q.sIdx);
            v20q.sIdx++;
            // Render translation for this new line if translate mode is on
            if (v20q.translateOn) { setTimeout(function(){ v20q_renderTranslations(); }, 100); }
          }
        });
      });
    });
    observer.observe(ct, { childList: true });
  }
  /* ═══════════ Word card — click a word, see what it means ═══════════
   * View mode used to do nothing on a word click: the delegated handler only had
   * bookmark / edit / collect branches. Everything this card shows is already on
   * the page — EN_NGSL is a 2,800-word dictionary carrying rank, part of speech,
   * IPA and a definition; IT_KELLY and S8T_IT_LEXICON carry Italian level and POS;
   * the translation provider covers the second language — so the card opens
   * instantly and only the gloss has to wait on the network. */

  var V20Q_POS_LABEL = {
    n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb',
    prep: 'preposition', pron: 'pronoun', conj: 'conjunction',
    det: 'article', aux: 'auxiliary'
  };
  var v20qGlossCache = {};
  var v20qWordCard = null;
  var v20qWordFrom = null;

  function v20q_escHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  /* A word in a translation box is the target language; anywhere else it is the
   * language being captioned. */
  function v20q_wordLang(span){
    if (span && span.closest && span.closest('.v20q-tran-box')) {
      return localStorage.getItem('sottotitoli-translate-target') || 'it';
    }
    return window._currentCaptionLang || window.currentCaptionLang || 'en-US';
  }
  function v20q_cleanWord(raw){
    return String(raw == null ? '' : raw)
      .replace(/^[^A-Za-zÀ-ÿ']+/, '')
      .replace(/[^A-Za-zÀ-ÿ']+$/, '')
      .toLowerCase();
  }
  function v20q_wordFacts(word, langTag){
    var out = { pos:'', posLabel:'', ipa:'', def:'', level:'', band:'' };
    var L = String(langTag || '').split('-')[0];
    if (L === 'en' && window.EN_NGSL && window.EN_NGSL[word]) {
      var e = window.EN_NGSL[word];
      out.pos = e[1] || ''; out.ipa = e[2] || ''; out.def = e[3] || '';
      var rank = e[0];
      if (rank) out.band = rank <= 1000 ? 'Top 1000 English words' : rank <= 2000 ? 'Top 2000 English words' : 'NGSL 2,800';
    } else if (window.IT_KELLY && window.IT_KELLY[word]) {
      var bits = String(window.IT_KELLY[word]).split('|');
      out.pos = bits[0] || ''; out.level = String(bits[1] || '').toUpperCase();
    } else if (L === 'it' && window.S8T_IT_LEXICON) {
      try {
        out.pos = window.S8T_IT_LEXICON.getPOS(word, 'it') || '';
        out.level = String(window.S8T_IT_LEXICON.getCEFR(word, 'it') || '').toUpperCase();
      } catch (e) {}
    }
    if (out.pos === 'other') out.pos = '';
    out.posLabel = V20Q_POS_LABEL[out.pos] || out.pos;
    return out;
  }
  function v20q_speakWord(word, langTag){
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(word);
      u.lang = langTag || 'en-US';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function v20q_wordGloss(word, from, cb){
    var to = (localStorage.getItem('sottotitoli-translate-target') || 'it').split('-')[0];
    var src = String(from || '').split('-')[0];
    if (!src || src === to) return cb('');
    var key = src + '>' + to + '::' + word;
    if (v20qGlossCache[key] !== undefined) return cb(v20qGlossCache[key]);
    var T = window.SottotitoliTranslationProviders;
    if (!T || typeof T.translateText !== 'function') return cb('');
    try {
      T.translateText({ provider: 'auto' }, word, src, to).then(function(r){
        var txt = (r && r.translatedText) ? String(r.translatedText).trim() : '';
        v20qGlossCache[key] = txt;
        cb(txt);
      }).catch(function(){ cb(''); });
    } catch (e) { cb(''); }
  }

  function v20q_closeWordCard(){
    if (v20qWordCard && v20qWordCard.parentNode) v20qWordCard.parentNode.removeChild(v20qWordCard);
    v20qWordCard = null;
    document.removeEventListener('mousedown', v20q_wordCardOutside, true);
    document.removeEventListener('keydown', v20q_wordCardKeys, true);
    var back = document.getElementById('v20qContent');
    if (v20qWordFrom && back) { try { back.focus({ preventScroll: true }); } catch (e) {} }
    v20qWordFrom = null;
  }
  function v20q_wordCardOutside(e){
    if (!v20qWordCard) return;
    if (v20qWordCard.contains(e.target)) return;
    if (v20qWordFrom && v20qWordFrom.contains(e.target)) return;
    v20q_closeWordCard();
  }
  function v20q_wordCardKeys(e){
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.stopPropagation();
      v20q_closeWordCard();
    }
  }

  function v20q_openWordCard(span){
    if (!span) return;
    var word = v20q_cleanWord(span.textContent);
    if (!word) return;
    v20q_closeWordCard();

    var langTag = v20q_wordLang(span);
    var f = v20q_wordFacts(word, langTag);
    var chips = '';
    if (f.posLabel) chips += '<span class="v20q-wc-chip">' + v20q_escHtml(f.posLabel) + '</span>';
    if (f.level) chips += '<span class="v20q-wc-chip">' + v20q_escHtml(f.level) + '</span>';
    if (f.band) chips += '<span class="v20q-wc-chip">' + v20q_escHtml(f.band) + '</span>';

    var card = document.createElement('div');
    card.className = 'v20q-wcard';
    card.id = 'v20qWordCard';
    card.tabIndex = -1;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Meaning of ' + word);
    card.innerHTML =
      '<div class="v20q-wc-top">' +
        '<span class="v20q-wc-word">' + v20q_escHtml(word) + '</span>' +
        (f.ipa ? '<span class="v20q-wc-ipa">' + v20q_escHtml(f.ipa) + '</span>' : '') +
        '<button type="button" class="v20q-wc-icon" data-act="say" aria-label="Pronounce ' + v20q_escHtml(word) + '" title="Pronounce"><i class="fa-solid fa-volume-high"></i></button>' +
        '<button type="button" class="v20q-wc-icon" data-act="close" aria-label="Close" title="Close"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="v20q-wc-gloss" data-part="gloss" aria-live="polite"></div>' +
      (f.def ? '<div class="v20q-wc-def">' + v20q_escHtml(f.def) + '</div>' : '') +
      (chips ? '<div class="v20q-wc-chips">' + chips + '</div>' : '') +
      '<div class="v20q-wc-acts">' +
        '<button type="button" class="v20q-wc-btn" data-act="save">Save word</button>' +
        '<button type="button" class="v20q-wc-btn" data-act="copy">Copy</button>' +
      '</div>';

    document.body.appendChild(card);
    v20qWordCard = card;
    v20qWordFrom = span;

    /* Place it above the word, or below when there is no room, and never off-screen. */
    var r = span.getBoundingClientRect();
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), Math.max(8, vw - cw - 8));
    var top = r.top - ch - 10;
    if (top < 8) top = Math.min(r.bottom + 10, Math.max(8, vh - ch - 8));
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';

    /* The gloss is the only part that needs the network. */
    var glossEl = card.querySelector('[data-part="gloss"]');
    if (glossEl && !glossEl.textContent) {
      v20q_wordGloss(word, langTag, function(txt){
        if (glossEl && v20qWordCard === card) glossEl.textContent = txt || '';
      });
    }

    card.addEventListener('click', function(ev){
      var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'close') { v20q_closeWordCard(); return; }
      if (act === 'say') { v20q_speakWord(word, langTag); return; }
      if (act === 'copy') {
        var text = word + (glossEl && glossEl.textContent ? ' — ' + glossEl.textContent : '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function(){});
        }
        v20q_toast('<i class="fa-regular fa-copy"></i> Copied');
        return;
      }
      if (act === 'save') {
        var savedLang = String(langTag).split('-')[0];
        if (v20q.words.indexOf(word) === -1) v20q.words.push(word);
        if (typeof addToWordBank === 'function') addToWordBank(word, savedLang);
        v20q_updateBadge();
        v20q_toast('<i class="fa-solid fa-check"></i> Added: ' + v20q_escHtml(word) + ' (' + savedLang + ')');
        btn.textContent = 'Saved';
        btn.disabled = true;
        return;
      }
    });

    try { card.focus({ preventScroll: true }); } catch (e) {}

    /* Dismissals: click away, Escape, or scrolling the transcript out from under it.
       Attached a tick later so the click that opened the card cannot close it. */
    setTimeout(function(){
      if (v20qWordCard !== card) return;
      document.addEventListener('mousedown', v20q_wordCardOutside, true);
      document.addEventListener('keydown', v20q_wordCardKeys, true);
      var sc = v20q_scroller();
      if (sc) sc.addEventListener('scroll', v20q_closeWordCard, { passive: true, once: true });
    }, 0);
  }

  /* ═══════════ Taking the transcript out, and reading it at your size ═══════════
   * Per-sentence copy existed; nothing could leave the page as a whole, and the
   * transcript's size was fixed by CSS. Both are small additions on data the
   * transcript already holds (v20q.sentences and v20q.timestamps). */

  /* A toast that can hold a button. The plain one is pointer-events:none and lives
   * 1.6s — right for "Copied", useless for "Undo". */
  function v20q_toastAction(message, label, onAction, ms){
    var t = document.createElement('div');
    t.className = 'v20q-toast-action';
    var span = document.createElement('span');
    span.textContent = message;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', function(){
      if (t.__done) return;
      t.__done = true;
      try { onAction(); } catch (e) {}
      v20q_dismissToast(t);
    });
    t.appendChild(span);
    t.appendChild(btn);
    document.body.appendChild(t);
    requestAnimationFrame(function(){ t.classList.add('show'); });
    t.__timer = setTimeout(function(){ v20q_dismissToast(t); }, ms || 6000);
    return t;
  }
  function v20q_dismissToast(t){
    if (!t || t.__closing) return;
    t.__closing = true;
    clearTimeout(t.__timer);
    t.classList.remove('show');
    setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 320);
  }

  function v20q_plainText(s){
    return String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function v20q_download(name, text, mime){
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1200);
      return true;
    } catch (e) { return false; }
  }
  /* "00:12" → "00:00:12,000". SRT wants HH:MM:SS,mmm, and the transcript only ever
   * stores MM:SS. */
  function v20q_timecode(stamp, addSec){
    var parts = String(stamp || '0:00').split(':').map(Number);
    var sec = (parts.length >= 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : (parts.length === 2 ? parts[0] * 60 + parts[1] : (parts[0] || 0))) + (addSec || 0);
    if (!isFinite(sec) || sec < 0) sec = 0;
    function p2(n){ return (n < 10 ? '0' : '') + n; }
    return p2(Math.floor(sec / 3600)) + ':' + p2(Math.floor((sec % 3600) / 60)) + ':' + p2(sec % 60) + ',000';
  }

  /* ═══════════ Export — the session, not just the words ═══════════
   * The old export wrote the source sentences and nothing else: no translation, no
   * saved lines, no saved words, no sign of where it came from. A learner who keeps a
   * session wants the whole thing, so every format carries a sottotitoli.pro header
   * (date, language pair, length, counts) and each does one job:
   *
   *   .srt — subtitles, two lines per cue when translation is on (the standard shape
   *          for bilingual subs, and what a player will render under the video)
   *   .txt — the transcript to read, translations indented beneath each line
   *   .md  — a study sheet: session table, transcript table, glossary with levels,
   *          saved lines, saved words
   *   .csv — one row per line, for a spreadsheet or a flashcard import
   *
   * Translations are the ones on screen; with translate off the files are
   * monolingual and say so, rather than promising a language pair they lack. */

  var V20Q_LANG_NAME = {
    en: 'English', it: 'Italiano', es: 'Español', fr: 'Français',
    de: 'Deutsch', pt: 'Português', nl: 'Nederlands'
  };
  function v20q_langName(code){
    var c = String(code || '').split('-')[0].toLowerCase();
    return V20Q_LANG_NAME[c] || c.toUpperCase();
  }
  function v20q_exportData(){
    var srcCode = String(window._currentCaptionLang || window.currentCaptionLang || 'en-US').split('-')[0].toLowerCase();
    var tgtCode = (localStorage.getItem('sottotitoli-translate-target') || 'it').split('-')[0].toLowerCase();
    var nodes = document.querySelectorAll('#v20qContent .v20q-line');
    var rows = v20q.sentences.map(function(s, i){
      var el = nodes[i];
      var tr = el ? el.querySelector('.v20q-tran-text') : null;
      return {
        n: i + 1,
        time: v20q.timestamps[i] || v20q_fmtTime(i * 6),
        src: v20q_plainText(s),
        tr: tr ? v20q_plainText(tr.textContent) : '',
        saved: v20q.bookmarks.indexOf(i) !== -1
      };
    });
    var withTr = rows.filter(function(r){ return r.tr; }).length;
    return {
      rows: rows,
      srcCode: srcCode,
      tgtCode: tgtCode,
      bilingual: withTr > 0 && srcCode !== tgtCode,
      first: rows.length ? rows[0].time : '00:00',
      last: rows.length ? rows[rows.length - 1].time : '00:00',
      savedLines: rows.filter(function(r){ return r.saved; }),
      savedWords: v20q.words.slice()
    };
  }
  function v20q_exportWhen(){
    var d = new Date();
    function p2(n){ return (n < 10 ? '0' : '') + n; }
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }
  function v20q_exportName(data, ext){
    var d = new Date();
    function p2(n){ return (n < 10 ? '0' : '') + n; }
    return 'sottotitoli-' + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' +
      p2(d.getHours()) + p2(d.getMinutes()) + '-' + data.srcCode +
      (data.bilingual ? '-' + data.tgtCode : '') + '.' + ext;
  }
  /* Glossary of the words actually said, with whatever the local lexicons know.
   * Words the lexicons have nothing to say about are left out rather than written as
   * empty rows. */
  function v20q_glossary(data){
    var seen = {}, out = [];
    data.rows.forEach(function(r){
      v20q_extractWords(r.src).forEach(function(raw){
        var w = v20q_cleanWord(raw);
        if (!w || w.length < 2 || seen[w]) return;
        seen[w] = 1;
        var f = v20q_wordFacts(w, data.srcCode);
        if (!f.posLabel && !f.level && !f.band && !f.def) return;
        out.push({ w: w, pos: f.posLabel, level: f.level, band: f.band, ipa: f.ipa, def: f.def });
      });
    });
    return out.slice(0, 300);
  }
  function v20q_wordDetail(word, primaryLang, data){
    var f = v20q_wordFacts(word, primaryLang);
    if (!f.posLabel && !f.level && !f.band && !f.def && data) f = v20q_wordFacts(word, data.tgtCode);
    return [f.posLabel, f.level || f.band].filter(Boolean).join(' · ');
  }
  function v20q_plural(n, one, many){ return n + ' ' + (n === 1 ? one : many); }
  function v20q_levelCounts(gloss){
    var order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], c = {};
    gloss.forEach(function(g){ if (g.level && order.indexOf(g.level) !== -1) c[g.level] = (c[g.level] || 0) + 1; });
    return order.filter(function(l){ return c[l]; }).map(function(l){ return l + ' ' + c[l]; });
  }
  function v20q_header(data){
    return [
      'sottotitoli.pro',
      v20q_exportWhen(),
      v20q_langName(data.srcCode) + (data.bilingual ? ' → ' + v20q_langName(data.tgtCode) : ''),
      v20q_plural(data.rows.length, 'line', 'lines') + ' · ' + data.first + '–' + data.last,
      v20q_plural(data.savedLines.length, 'saved line', 'saved lines') + ' · ' +
        v20q_plural(data.savedWords.length, 'saved word', 'saved words')
    ];
  }

  function v20q_buildTxt(data){
    var L = v20q_header(data);
    var rule = '────────────────────────────────────────';
    L.push('', rule, '');
    data.rows.forEach(function(r){
      L.push('[' + r.time + '] ' + r.src);
      if (r.tr) L.push('           ' + r.tr);
    });
    if (data.savedLines.length) {
      L.push('', rule, 'SAVED LINES', '');
      data.savedLines.forEach(function(r){
        L.push('[' + r.time + '] ' + r.src);
        if (r.tr) L.push('           ' + r.tr);
      });
    }
    if (data.savedWords.length) {
      L.push('', rule, 'SAVED WORDS', '');
      data.savedWords.forEach(function(w){
        var bits = v20q_wordDetail(w, data.srcCode, data);
        L.push('· ' + w + (bits ? '  —  ' + bits : ''));
      });
    }
    return L.join('\n');
  }

  function v20q_buildSrt(data){
    var out = [];
    data.rows.forEach(function(r, i){
      var next = data.rows[i + 1];
      var end = next ? v20q_timecode(next.time, 0) : v20q_timecode(r.time, 3);
      var body = r.src + (r.tr ? '\r\n' + r.tr : '');
      out.push(r.n + '\r\n' + v20q_timecode(r.time, 0) + ' --> ' + end + '\r\n' + body + '\r\n');
    });
    return out.join('\r\n');
  }

  function v20q_mdCell(s){
    return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
  }
  function v20q_buildMd(data, gloss){
    var nameS = v20q_langName(data.srcCode), nameT = v20q_langName(data.tgtCode);
    var L = ['# Transcript', '', '**sottotitoli.pro** · ' + v20q_exportWhen(), ''];
    L.push('| Item | Value |', '|---|---|');
    L.push('| Languages | ' + nameS + (data.bilingual ? ' → ' + nameT : '') + ' |');
    L.push('| Length | ' + v20q_plural(data.rows.length, 'line', 'lines') + ' · ' + data.first + '–' + data.last + ' |');
    L.push('| Saved lines | ' + data.savedLines.length + ' |');
    L.push('| Saved words | ' + data.savedWords.length + ' |');
    var lv = v20q_levelCounts(gloss);
    if (lv.length) L.push('| Vocabulary levels | ' + lv.join(' · ') + ' |');
    L.push('', '## Transcript', '');
    if (data.bilingual) {
      L.push('| # | Time | ' + nameS + ' | ' + nameT + ' |', '|---|---|---|---|');
      data.rows.forEach(function(r){
        L.push('| ' + r.n + ' | ' + r.time + ' | ' + v20q_mdCell(r.src) + ' | ' + v20q_mdCell(r.tr) + ' |');
      });
    } else {
      L.push('| # | Time | ' + nameS + ' |', '|---|---|---|');
      data.rows.forEach(function(r){
        L.push('| ' + r.n + ' | ' + r.time + ' | ' + v20q_mdCell(r.src) + ' |');
      });
    }
    if (gloss.length) {
      L.push('', '## Glossary', '', '| Word | Type | Level | Meaning |', '|---|---|---|---|');
      gloss.forEach(function(g){
        L.push('| ' + v20q_mdCell(g.w) + ' | ' + v20q_mdCell(g.pos) + ' | ' +
          v20q_mdCell(g.level || g.band) + ' | ' + v20q_mdCell(g.def || g.ipa) + ' |');
      });
    }
    if (data.savedLines.length) {
      L.push('', '## Saved lines', '');
      data.savedLines.forEach(function(r){
        L.push('- **' + r.time + '** ' + r.src + (r.tr ? '  \n  _' + r.tr + '_' : ''));
      });
    }
    if (data.savedWords.length) {
      L.push('', '## Saved words', '');
      data.savedWords.forEach(function(w){
        var bits = v20q_wordDetail(w, data.srcCode, data);
        L.push('- ' + w + (bits ? ' — ' + bits : ''));
      });
    }
    return L.join('\n');
  }

  function v20q_csvCell(s){
    var v = String(s == null ? '' : s);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function v20q_buildCsv(data){
    var L = ['#,time,source,translation,saved'];
    data.rows.forEach(function(r){
      L.push([r.n, r.time, v20q_csvCell(r.src), v20q_csvCell(r.tr), r.saved ? 'yes' : ''].join(','));
    });
    // BOM, so Excel opens the accents instead of mojibake.
    return '\uFEFF' + L.join('\r\n');
  }

  function v20q_exportKind(kind){
    if (!v20q.sentences.length) { v20q_toast('Nothing to export yet'); return; }
    var data = v20q_exportData();
    var gloss = kind === 'md' ? v20q_glossary(data) : [];
    var payload, mime;
    if (kind === 'srt') { payload = v20q_buildSrt(data); mime = 'application/x-subrip;charset=utf-8'; }
    else if (kind === 'md') { payload = v20q_buildMd(data, gloss); mime = 'text/markdown;charset=utf-8'; }
    else if (kind === 'csv') { payload = v20q_buildCsv(data); mime = 'text/csv;charset=utf-8'; }
    else { kind = 'txt'; payload = v20q_buildTxt(data); mime = 'text/plain;charset=utf-8'; }
    if (v20q_download(v20q_exportName(data, kind), payload, mime)) {
      v20q_toast('<i class="fa-solid fa-check"></i> ' + kind.toUpperCase() + ' saved' +
        (data.bilingual ? ' · ' + v20q_langName(data.srcCode) + '/' + v20q_langName(data.tgtCode) : ''));
    } else {
      v20q_toast('Could not save the file');
    }
  }
  window.v20q_exportTxt = function(){ v20q_exportKind('txt'); };
  window.v20q_exportSrt = function(){ v20q_exportKind('srt'); };
  window.v20q_exportMd  = function(){ v20q_exportKind('md'); };
  window.v20q_exportCsv = function(){ v20q_exportKind('csv'); };
  /* The Clipboard API rejects without a user gesture, in a non-secure context, or when
   * permission is refused. The per-sentence copy in this file already falls back to
   * execCommand; the whole-transcript copy now does the same instead of just giving up. */
  function v20q_copyFallback(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  window.v20q_copyTranscript = function(){
    if (!v20q.sentences.length) { v20q_toast('Nothing to copy yet'); return; }
    var text = v20q_buildTxt(v20q_exportData());
    function done(){ v20q_toast('<i class="fa-regular fa-copy"></i> Transcript copied'); }
    function failed(){ v20q_toast('Could not copy'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function(){
        if (v20q_copyFallback(text)) done(); else failed();
      });
    } else if (v20q_copyFallback(text)) done();
    else failed();
  };

  /* ── Export menu ── */
  var V20Q_EXPORT_ITEMS = [
    { kind: 'srt', label: 'Subtitles', ext: '.srt', hint: 'One cue per line, bilingual when translation is on' },
    { kind: 'txt', label: 'Transcript', ext: '.txt', hint: 'To read — translations sit under each line' },
    { kind: 'md',  label: 'Study sheet', ext: '.md', hint: 'Table, glossary with levels, what you saved' },
    { kind: 'csv', label: 'Spreadsheet', ext: '.csv', hint: 'One row per line, for Excel or Anki' }
  ];
  function v20q_exportMenuEl(){
    var menu = document.getElementById('v20qExportMenu');
    if (menu) return menu;
    menu = document.createElement('div');
    menu.id = 'v20qExportMenu';
    menu.className = 'v20q-xm-panel';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Export the transcript');
    menu.style.display = 'none';
    document.body.appendChild(menu);
    return menu;
  }
  function v20q_hideExportMenu(){
    var menu = document.getElementById('v20qExportMenu');
    if (menu) menu.style.display = 'none';
    var btn = document.getElementById('exportBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', v20q_exportMenuOutside, true);
    document.removeEventListener('keydown', v20q_exportMenuKeys, true);
  }
  function v20q_exportMenuOutside(e){
    var menu = document.getElementById('v20qExportMenu');
    var btn = document.getElementById('exportBtn');
    if (!menu || menu.style.display !== 'block') return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    v20q_hideExportMenu();
  }
  function v20q_exportMenuKeys(e){
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.stopPropagation();
      v20q_hideExportMenu();
      var btn = document.getElementById('exportBtn');
      if (btn) { try { btn.focus(); } catch (err) {} }
    }
  }
  window.v20q_showExportMenu = function(){
    var menu = v20q_exportMenuEl();
    var btn = document.getElementById('exportBtn');
    if (menu.style.display === 'block') { v20q_hideExportMenu(); return; }
    var n = v20q.sentences.length;
    var html = '<div class="v20q-xm-head">Export · ' + n + ' line' + (n === 1 ? '' : 's') + '</div>';
    V20Q_EXPORT_ITEMS.forEach(function(it){
      html += '<button type="button" class="v20q-xm-item" role="menuitem" data-kind="' + it.kind + '">' +
        '<span class="v20q-xm-label">' + it.label + ' <em>' + it.ext + '</em></span>' +
        '<span class="v20q-xm-hint">' + it.hint + '</span></button>';
    });
    html += '<button type="button" class="v20q-xm-item v20q-xm-copy" role="menuitem" data-kind="copy">' +
      '<span class="v20q-xm-label">Copy to clipboard</span>' +
      '<span class="v20q-xm-hint">The whole transcript as text</span></button>';
    menu.innerHTML = html;
    Array.prototype.forEach.call(menu.querySelectorAll('.v20q-xm-item'), function(item){
      item.addEventListener('click', function(){
        var kind = item.getAttribute('data-kind');
        v20q_hideExportMenu();
        if (kind === 'copy') window.v20q_copyTranscript();
        else v20q_exportKind(kind);
      });
    });
    menu.style.display = 'block';
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      var r = btn.getBoundingClientRect();
      var mw = menu.offsetWidth, mh = menu.offsetHeight;
      var left = Math.min(Math.max(8, r.right - mw), Math.max(8, window.innerWidth - mw - 8));
      var top = r.bottom + 8;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 8);
      menu.style.left = Math.round(left) + 'px';
      menu.style.top = Math.round(top) + 'px';
    }
    document.addEventListener('mousedown', v20q_exportMenuOutside, true);
    document.addEventListener('keydown', v20q_exportMenuKeys, true);
  };

  /* Transcript size — a scale, so each caption style keeps its own base size. */
  var V20Q_SIZES = [0.9, 1, 1.15];
  var V20Q_SIZE_KEY = 'sottotitoli-transcript-size';
  var v20qSize = 1;
  function v20q_readSize(){
    try {
      var v = parseFloat(localStorage.getItem(V20Q_SIZE_KEY));
      if (isFinite(v) && v > 0.5 && v < 2.5) return v;
    } catch (e) {}
    return 1;
  }
  function v20q_applySize(scale){
    if (typeof scale === 'number') v20qSize = scale;
    var c = document.getElementById('v20qContent');
    if (c) c.style.setProperty('--v20q-scale', String(v20qSize));
    var out = document.getElementById('v20qSizeOut');
    if (out) out.textContent = Math.round(v20qSize * 100) + '%';
  }
  window.v20q_sizeStep = function(dir){
    var i = 0, best = 1e9;
    for (var k = 0; k < V20Q_SIZES.length; k++) {
      var d = Math.abs(V20Q_SIZES[k] - v20qSize);
      if (d < best) { best = d; i = k; }
    }
    i = Math.min(V20Q_SIZES.length - 1, Math.max(0, i + (dir < 0 ? -1 : 1)));
    v20qSize = V20Q_SIZES[i];
    try { localStorage.setItem(V20Q_SIZE_KEY, String(v20qSize)); } catch (e) {}
    v20q_applySize();
  };
  v20qSize = v20q_readSize();
  v20q_applySize();
  v20q_updateBookmarkBadge();
  /* Nothing has been said yet, so there is no #v20qContent to inspect — the empty
   * state has to be settled on the transcript box itself at start-up. */
  v20q_syncEmpty(document.getElementById('v20qContent'));
  document.addEventListener('DOMContentLoaded', function(){
    v20q_applySize();
    v20q_syncEmpty(document.getElementById('v20qContent'));
  });

  v20q_bootstrap();
})();
