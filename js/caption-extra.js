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
        box.innerHTML = '<div class="v20q-tran-text v20q-tran-loading"><i class="fa-solid fa-spinner"></i> Translating…</div>';
        line.appendChild(box);
      }
      
      // ── Trigger translation API (with cache) ──
      var T = window.SottotitoliTranslationProviders;
      var cacheKey = srcLang + '→' + target + '::' + text;
      if (_tranCache[cacheKey]) {
        var txtEl = box.querySelector('.v20q-tran-text');
        if (txtEl) { txtEl.className = 'v20q-tran-text'; txtEl.textContent = _tranCache[cacheKey]; }
      } else if (T && srcLang !== target) {
        T.translateText({ provider: 'auto' }, text, srcLang, target).then(function(r){
          var txtEl = box.querySelector('.v20q-tran-text');
          if (txtEl) { txtEl.className = 'v20q-tran-text'; txtEl.textContent = r.translatedText; }
          _tranCache[cacheKey] = r.translatedText;
        }).catch(function(){
          var txtEl = box.querySelector('.v20q-tran-text');
          if (txtEl) { txtEl.className = 'v20q-tran-text'; txtEl.textContent = text + ' ⚠'; }
        });
      } else {
        var txtEl = box.querySelector('.v20q-tran-text');
        if (txtEl) { txtEl.className = 'v20q-tran-text'; txtEl.textContent = text; }
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
          var txtEl = tranBox.querySelector('.v20q-tran-text');
          if (txtEl) { txtEl.className = 'v20q-tran-text'; txtEl.textContent = r.translatedText; }
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
    // Update buttons in caption settings popup
    var btns = document.querySelectorAll('#captionSettingsPopup .v20q-tbtn');
    btns.forEach(function(b){ b.classList.toggle('active', b.dataset.val === style); });
    // Apply style class to content container (preserve tran style class)
    var vc = document.getElementById('v20qContent');
    if (vc) { vc.className = 'v20q-content v20q-'+style + ' v20q-' + (v20q.tranStyle || 's1'); }
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
    if (!skipScroll) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }

  // ── Re-render all ──
  function v20q_rerender(){
    var container = document.getElementById('v20qContent'); if (!container) return;
    // Preserve the container class (caption style + tran style)
    var cls = container.className;
    container.innerHTML = '';
    container.className = cls;
    v20q.sentences.forEach(function(s, i){ v20q_render(s, i, true); });
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
  };
  // ── Scroll to sentence + highlight (used by bookmark panel clicks) ──
  window.v20q_scrollToSentence = function(idx){
    // Close the bookmark panel
    var panel = document.getElementById('v20qBookmarkPanel');
    if (panel) panel.style.display = 'none';
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
  window.v20q_deleteSentence = function(idx){
    v20q.sentences.splice(idx, 1);
    v20q.timestamps.splice(idx, 1);
    // Remove from bookmarks and shift higher indices down
    v20q.bookmarks = v20q.bookmarks.filter(function(b){ return b !== idx; }).map(function(b){ return b > idx ? b - 1 : b; });
    v20q.sIdx = v20q.sentences.length;
    v20q_rerender();
  };
  // ── Refresh bookmarks panel content (no toggle) ──
  function v20q_refreshBookmarkPanel(){
    var panel = document.getElementById('v20qBookmarkPanel');
    if (!panel || panel.style.display !== 'block') return;
    var html = '';
    if (v20q.bookmarks.length === 0) {
      html = '<div style="text-align:center;padding:16px;color:var(--muted2);font-size:12px">No bookmarked sentences yet.<br>Enable <b>Save Lines</b> mode and click a line to save it here.</div>';
    } else {
      html = '<div style="font-size:10px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📌 Bookmarked (' + v20q.bookmarks.length + ')</div>';
      v20q.bookmarks.forEach(function(bi){
        var s = v20q.sentences[bi] || '';
        var words = v20q_extractWords(s);
        var text = words.join(' ');
        var time = v20q.timestamps[bi] || v20q_fmtTime(bi * 6);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--line);font-size:13px;cursor:pointer" onmouseover="this.style.background=\'rgba(255,255,255,.02)\'" onmouseout="this.style.background=\'transparent\'" onclick="v20q_scrollToSentence('+bi+')">';
        html += '<span style="color:#f59e0b;flex-shrink:0"><i class="fa-solid fa-star"></i></span>';
        html += '<span style="color:var(--muted2);font-family:var(--font-mono);font-size:10px;flex-shrink:0">'+time+'</span>';
        html += '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">'+text+'</span>';
        html += '<span style="color:var(--muted2);font-size:9px;flex-shrink:0">#'+(bi+1)+'</span>';
        html += '</div>';
      });
    }
    panel.innerHTML = html;
  }
  // ── Show bookmarks panel ──
  window.v20q_showBookmarks = function(){
    var panel = document.getElementById('v20qBookmarkPanel');
    if (!panel) return;
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.style.display = 'block'; // must set visible BEFORE refresh checks it
    v20q_refreshBookmarkPanel();
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
          // Self-heal: ensure #v20qContent exists
          var vc = document.getElementById('v20qContent');
          if (!vc) {
            vc = document.createElement('div');
            vc.className = 'v20q-content v20q-'+v20q.style + ' v20q-' + (v20q.tranStyle || 's1');
            vc.id = 'v20qContent';
            ct.appendChild(vc);
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
  v20q_bootstrap();
})();
