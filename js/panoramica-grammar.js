(function(){
  'use strict';
  var FLAGS = { en:'🇬🇧', it:'🇮🇹', nl:'🇳🇱', fr:'🇫🇷', de:'🇩🇪', es:'🇪🇸', pl:'🇵🇱' };
  var NAMES = { en:'English', it:'Italiano', nl:'Nederlands', fr:'Français', de:'Deutsch', es:'Español', pl:'Polski' };

  function renderTranslationBanks(){
    var grid = document.getElementById('wbTranslationGrid');
    if (!grid) return; // Translation tab removed — banks integrated into Collections
    
    // ── Collect language-specific banks (sottotitoli_wb_*) ──
    var langBanks = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      var m = key.match(/^sottotitoli_wb_([a-z]{2})$/);
      if (m) {
        var lang = m[1];
        try {
          var words = JSON.parse(localStorage.getItem(key) || '[]');
          langBanks[lang] = words;
        } catch(e) { langBanks[lang] = []; }
      }
    }
    
    // ── Also collect translation pairs for word counts ──
    var pairs = [];
    try { pairs = JSON.parse(localStorage.getItem('sottotitoli_translation_words') || '[]'); } catch(e) {}
    var pairByLang = {};
    pairs.forEach(function(w){
      var key = w.tgtLang || 'it';
      if (!pairByLang[key]) pairByLang[key] = [];
      pairByLang[key].push(w);
    });

    // ── Get user languages from onboarding ──
    var userLangs = [];
    try {
      var ob = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}');
      var native = ob['native_lang'] || '';
      var spoken = ob['spoken_languages'] || [];
      var improve = ob['improve_languages'] || [];
      // Build ordered list: native first, then spoken, then improve (deduplicated)
      var seenLangs = {};
      if (native) { userLangs.push({ code: native, label: 'madrelingua' }); seenLangs[native] = true; }
      spoken.forEach(function(l) {
        var code = l.toLowerCase().trim();
        if (code && !seenLangs[code] && code !== native) { userLangs.push({ code: code, label: 'parlata' }); seenLangs[code] = true; }
      });
      improve.forEach(function(l) {
        var code = l.toLowerCase().trim();
        if (code && !seenLangs[code] && code !== native) { userLangs.push({ code: code, label: 'in apprendimento' }); seenLangs[code] = true; }
      });
    } catch(e) {}
    
    // ── Merge: user languages + existing data ──
    var allLangs = {};
    userLangs.forEach(function(l){ allLangs[l.code] = l; });
    Object.keys(langBanks).forEach(function(l){ if (!allLangs[l]) allLangs[l] = { code: l, label: '' }; });
    Object.keys(pairByLang).forEach(function(l){ if (!allLangs[l]) allLangs[l] = { code: l, label: '' }; });
    var langList = Object.keys(allLangs);
    
    if (langList.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-faint);grid-column:1/-1">Completa l\'onboarding per vedere le tue lingue qui.</div>';
      return;
    }
    
    var html = '';
    
    // ── Language boxes ──
    langList.forEach(function(lang){
      var info = allLangs[lang];
      var bankWords = langBanks[lang] || [];
      var pairCount = (pairByLang[lang] || []).length;
      var total = bankWords.length + pairCount;
      var recent = bankWords.slice(-5).reverse();
      var flag = FLAGS[lang] || '';
      var name = NAMES[lang] || lang.toUpperCase();
      var labelText = info.label || '';
      html += '<div class="alt-card" style="padding:16px;cursor:default">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:28px">'+flag+'</span><h3 style="font-size:15px;margin:0">'+name+'</h3>';
      if (labelText) html += '<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:var(--card2);color:var(--text-muted)">'+labelText+'</span>';
      html += '<span style="font-size:11px;color:var(--text-faint);margin-left:auto">'+total+' parole</span></div>';
      if (recent.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
        recent.forEach(function(w){
          html += '<span class="wordbank-chip" style="font-size:11px;padding:4px 10px;border-radius:99px;background:var(--card2);border:1px solid var(--line);color:var(--text)">'+w+'</span>';
        });
        html += '</div>';
      } else if (total === 0) {
        html += '<div style="font-size:11px;color:var(--text-faint);font-style:italic">Usa la modalità Traduzione per aggiungere parole</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--text-faint)">'+pairCount+' traduzioni salvate</div>';
      }
      html += '</div>';
    });
    
    // ── Create new bank ──
    html += '<div class="alt-card" style="border:2px dashed var(--line);background:transparent;display:flex;align-items:center;justify-content:center;min-height:80px;cursor:pointer;grid-column:1/-1" onclick="newWordbank()"><div style="text-align:center;color:var(--text-faint);font-size:15px;font-weight:600"><i class="fa-solid fa-plus" style="margin-right:6px;font-size:13px"></i> Crea nuova banca</div></div>';

    grid.innerHTML = html;
  }

  // Translation banks now integrated into English/Italian Collections
  // (renderTranslationBanks still runs to populate language boxes if needed)
  setTimeout(renderTranslationBanks, 500);

  // VB subtab switching handler (English / Italian)
  document.querySelectorAll('#pnl-vocabulary-builder .tab-link[data-subtab]').forEach(function(tab){
    tab.addEventListener('click', function(){
      var subtab = this.getAttribute('data-subtab');
      // Update active tab
      this.parentElement.querySelectorAll('.tab-link').forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      this.classList.add('active'); this.setAttribute('aria-selected','true');
      // Show matching pane, hide others
      var panel = document.getElementById('pnl-vocabulary-builder');
      if (panel) {
        panel.querySelectorAll('.subtab-pane').forEach(function(p){ p.classList.remove('active'); });
        var pane = document.getElementById('sub-' + subtab);
        if (pane) { pane.classList.add('active'); }
      }
    });
  });

  // ═══ Grammar Error Bank — saved errors from caption-s8t ═══
  var gebAllErrors = [];
  
  function deriveCategory(explanation) {
    if (!explanation) return 'Altro';
    var ex = explanation.toLowerCase();
    // Italian triggers
    if (ex.indexOf('preposizion') !== -1) return 'Preposizioni';
    if (ex.indexOf('verbo') !== -1 || ex.indexOf('tempo') !== -1 || ex.indexOf('congiuntiv') !== -1 || ex.indexOf('condizional') !== -1) return 'Tempi verbali';
    if (ex.indexOf('articolo') !== -1) return 'Articoli';
    if (ex.indexOf('ordine') !== -1 || ex.indexOf('word order') !== -1) return 'Ordine parole';
    if (ex.indexOf('ortograf') !== -1 || ex.indexOf('spelling') !== -1 || ex.indexOf('accent') !== -1) return 'Ortografia';
    // English triggers (same categories — different keywords)
    if (ex.indexOf('preposition') !== -1) return 'Preposizioni';
    if (ex.indexOf('verb') !== -1 || ex.indexOf('tense') !== -1 || ex.indexOf('conjugation') !== -1) return 'Tempi verbali';
    if (ex.indexOf('article') !== -1) return 'Articoli';
    return 'Altro';
  }

  async function loadGrammarErrors() {
    var listEl = document.getElementById('geb-list');
    var emptyEl = document.getElementById('geb-empty');
    if (!listEl) return;
    listEl.innerHTML = '<div class="geb-skeleton">Caricamento…</div>';
    if (emptyEl) emptyEl.style.display = 'none';

    var sb = window.sottotitoliSupabase;
    if (!sb) { listEl.innerHTML = '<div class="geb-state">Accedi per vedere i tuoi errori.</div>'; return; }

    try {
      var resp = await sb.from('grammar_errors').select('*').order('saved_at', { ascending: false });
      if (resp.error) throw resp.error;

      gebAllErrors = (resp.data || []).map(function(r) {
        return Object.assign({}, r, { category: r.error_category || r.error_type || deriveCategory(r.explanation) });
      });

      if (gebAllErrors.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = '';
        renderErrorStats([]);
        return;
      }

      renderErrorStats(gebAllErrors);
      renderBreakdown(gebAllErrors);
      renderErrorList(gebAllErrors, 'all');

    } catch(e) {
      console.error('Grammar Error Bank load failed:', e);
      listEl.innerHTML = '<div class="geb-state">Errore di caricamento. Riprova.</div>';
    }
  }

  function renderErrorStats(rows) {
    var count = rows.length;
    var cats = {}; rows.forEach(function(r) { cats[r.category] = true; });
    var typeCount = Object.keys(cats).length;
    var freq = {}; rows.forEach(function(r) { freq[r.category] = (freq[r.category] || 0) + 1; });
    var topCat = '—', topN = 0;
    Object.keys(freq).forEach(function(c) { if (freq[c] > topN) { topN = freq[c]; topCat = c; } });

    var countEl = document.getElementById('geb-count'); if (countEl) countEl.textContent = count;
    var typesEl = document.getElementById('geb-types'); if (typesEl) typesEl.textContent = typeCount;
    var topEl = document.getElementById('geb-top'); if (topEl) topEl.textContent = topN > 0 ? topCat + ' (' + topN + ')' : '—';
  }

  function renderBreakdown(rows) {
    var barsEl = document.getElementById('geb-bars');
    if (!barsEl) return;
    barsEl.innerHTML = '';
    var freq = {}; rows.forEach(function(r) { freq[r.category] = (freq[r.category] || 0) + 1; });
    var sorted = Object.keys(freq).map(function(k) { return [k, freq[k]]; }).sort(function(a, b) { return b[1] - a[1]; });
    var max = Math.max.apply(null, sorted.map(function(x) { return x[1]; }).concat([1]));

    if (sorted.length === 0) {
      barsEl.innerHTML = '<p class="geb-empty">Nessun dato di categoria disponibile.</p>';
      return;
    }
    sorted.forEach(function(entry) {
      var cat = entry[0], n = entry[1];
      var pct = (n / max) * 100;
      var row = document.createElement('div');
      row.className = 'geb-bar-row';
      row.innerHTML = '<div class="geb-bar-label">' + cat + '</div><div class="geb-bar-track"><div class="geb-bar-fill" style="width:' + pct + '%"></div></div><div class="geb-bar-count">' + n + '</div>';
      barsEl.appendChild(row);
    });
  }

  function renderErrorList(rows, filter) {
    var listEl = document.getElementById('geb-list');
    var filtersEl = document.getElementById('geb-filters');
    if (!listEl) return;

    // Rebuild filter pills
    if (filtersEl) {
      var cats = {}; gebAllErrors.forEach(function(r) { cats[r.category] = true; });
      var catList = Object.keys(cats).sort();
      var pillsHtml = '<span style="color:var(--text-soft);font-size:15px;margin-right:8px">Filtra:</span>';
      pillsHtml += '<button class="geb-pill geb-pill--active" data-filter="all" onclick="filterErrors(\'all\')">Mostra tutti</button>';
      catList.forEach(function(c) {
        pillsHtml += '<button class="geb-pill' + (filter === c ? ' geb-pill--active' : '') + '" data-filter="' + c + '" onclick="filterErrors(\'' + c.replace(/'/g, "\\'") + '\')">' + c + '</button>';
      });
      filtersEl.innerHTML = pillsHtml;
      filtersEl.style.display = '';
    }

    var filtered = filter === 'all' ? rows : rows.filter(function(r) { return r.category === filter; });
    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="geb-state">Nessun errore per questa categoria.</div>';
      return;
    }

    filtered.forEach(function(r) {
      var dateStr = r.saved_at ? new Date(r.saved_at).toLocaleDateString('it-IT') : '';
      var card = document.createElement('div');
      card.className = 'geb-card';
      card.innerHTML = '<div class="geb-card-header"><span class="geb-meta">' + dateStr + '</span><button class="geb-action" onclick="deleteGrammarError(\'' + r.id + '\', this)" title="Elimina">×</button></div>' +
        '<div class="geb-phrase"><span class="geb-original">' + escapeHtml(r.original_text || '') + '</span><span class="geb-arrow">→</span><span class="geb-corrected">' + escapeHtml(r.corrected_text || '') + '</span></div>' +
        '<div class="geb-explanation">' + escapeHtml(r.explanation || '') + '</div>';
      listEl.appendChild(card);
    });
  }

  function filterErrors(cat) {
    document.querySelectorAll('.geb-pill').forEach(function(b) {
      b.classList.toggle('geb-pill--active', b.getAttribute('data-filter') === cat);
    });
    renderErrorList(gebAllErrors, cat);
  }

  async function deleteGrammarError(id, btn) {
    appConfirm('Eliminare questo errore?', async function(){
      btn.disabled = true;
      try {
        var sb = window.sottotitoliSupabase;
        if (!sb) throw new Error('Not signed in');
        var resp = await sb.from('grammar_errors').delete().eq('id', id);
        if (resp.error) throw resp.error;
        loadGrammarErrors();
      } catch(e) {
        console.error('Delete failed:', e);
        appAlert('Eliminazione non riuscita.', 'Errore', '❌');
        btn.disabled = false;
      }
    }, 'Elimina errore', '🗑️');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' })[m]; });
  }

  // Hook into tab switching — when the "Errori" subtab under VT is activated
  document.addEventListener('click', function(e) {
    var tab = e.target.closest('.tab-link[data-subtab="vt-errors"]');
    if (tab) loadGrammarErrors();
  });

  // ── Hash navigation: #report-ai → open Report AI panel ──
  (function(){
    var hash = window.location.hash;
    if (!hash) return;
    var panelMap = {
      '#learner': 'learner',
      '#report-ai': 'report-ai',
      '#impostazioni': 'impostazioni',
      '#aiuto': 'aiuto'
    };
    var panel = panelMap[hash];
    if (panel) {
      setTimeout(function(){
        var nav = document.querySelector('[data-panel="' + panel + '"]');
        if (nav) nav.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, 400);
    }
  })();

  // ── Close outer IIFE ──
})();
